import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../dist/server/index.js";

const location = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(join(location, "../drizzle/0000_core.sql"), "utf8");

export async function localRuntime(options = {}) {
  const dir = resolve(options.directory || process.env.DATA_DIR || join(location, "../data"));
  const blobDir = join(dir, "attachments");
  await mkdir(blobDir, { recursive: true });
  const database = new DatabaseSync(join(dir, "kadry.sqlite"));
  database.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
  database.exec("CREATE TABLE IF NOT EXISTS migrations(id TEXT PRIMARY KEY);");
  database.exec("BEGIN IMMEDIATE");
  try {
    if (!database.prepare("SELECT id FROM migrations WHERE id=?").get("0000_core")) {
      database.exec(migration);
      database.prepare("INSERT INTO migrations(id) VALUES(?)").run("0000_core");
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.close();
    throw error;
  }
  class Statement {
    constructor(sql, args = []) { this.sql = sql; this.args = args; }
    bind(...args) { return new Statement(this.sql, args); }
    async first() { return database.prepare(this.sql).get(...this.args) ?? null; }
    async all() { return { results: database.prepare(this.sql).all(...this.args) }; }
    run() { return database.prepare(this.sql).run(...this.args); }
  }
  const env = {
    LOCAL_RUNTIME: true,
    DEMO_MODE: options.demo === true || process.env.DEMO_MODE === "1",
    ADMIN_PASSWORD: options.adminPassword ?? process.env.ADMIN_PASSWORD,
    HR_PASSWORD: options.hrPassword ?? process.env.HR_PASSWORD,
    SEED_DEMO: options.seed ?? process.env.SEED_DEMO,
    YANDEX_FOLDER_ID: options.yandex?.folderId ?? process.env.YANDEX_FOLDER_ID,
    YANDEX_API_KEY: options.yandex?.apiKey ?? process.env.YANDEX_API_KEY,
    YANDEX_MODEL: options.yandex?.model ?? process.env.YANDEX_MODEL,
    YANDEX_FETCH: options.yandex?.fetch,
    DB: {
      prepare: (sql) => new Statement(sql),
      async batch(statements) {
        database.exec("BEGIN IMMEDIATE");
        try {
          const done = statements.map(statement => statement.run());
          database.exec("COMMIT");
          return done;
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      }
    },
    BUCKET: {
      put: (id, bytes) => writeFile(join(blobDir, id), bytes, { flag: "wx", mode: 0o600 }),
      async get(id) {
        try { return { body: await readFile(join(blobDir, id)) }; }
        catch (error) { if (error.code === "ENOENT") return null; throw error; }
      },
      delete: (id) => rm(join(blobDir, id), {force: true})
    },
    extractPdf
  };
  return { env, close: () => database.close() };
}
function extractPdf(bytes) {
  return new Promise((resolveText, reject) => {
    const child = spawn("pdftotext", ["-f", "1", "-l", "10", "-enc", "UTF-8", "-", "-"], { stdio: ["pipe", "pipe", "ignore"], timeout: 3000 });
    const pieces = [];
    let size = 0;
    child.stdout.on("data", chunk => {
      size += chunk.length;
      if (size > 256 * 1024) child.kill();
      else pieces.push(chunk);
    });
    child.on("error", reject);
    child.stdin.on("error", () => {});
    child.on("close", code => {
      if (code === 0 || size > 256 * 1024) resolveText(Buffer.concat(pieces).toString("utf8"));
      else reject(new Error("PDF text unavailable"));
    });
    child.stdin.end(bytes);
  });
}
export async function openServer(options = {}) {
  const runtime = await localRuntime(options);
  const running = new Set();
  const server = createServer({ requestTimeout: 25000, headersTimeout: 12000, maxHeaderSize: 16384 }, async (incoming, outgoing) => {
    try {
      const origin = options.origin || process.env.PUBLIC_ORIGIN || `http://${incoming.headers.host || "localhost"}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (typeof value === "string" && !key.startsWith("oai-authenticated-")) headers.set(key, value);
      }
      const init = { method: incoming.method, headers };
      if (!["GET", "HEAD"].includes(incoming.method)) {
        init.body = Readable.toWeb(incoming);
        init.duplex = "half";
      }
      if (!incoming.url.startsWith("/") || incoming.url.startsWith("//")) {
        outgoing.writeHead(400).end();
        return;
      }
      const request = new Request(origin + incoming.url, init);
      const response = await worker.fetch(request, runtime.env, {
        waitUntil(promise) {
          running.add(promise);
          promise.finally(() => running.delete(promise));
        }
      });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body && incoming.method !== "HEAD") Readable.fromWeb(response.body).pipe(outgoing);
      else outgoing.end();
    } catch (error) {
      console.error("HTTP error:", error.message);
      if (!outgoing.headersSent) outgoing.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      outgoing.end('{"code":"internal_error","message":"Внутренняя ошибка."}');
    }
  });
  const host = options.host || process.env.HOST || "127.0.0.1";
  const port = options.port ?? Number(process.env.PORT || 3000);
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolveListen);
  });
  return {
    url: `http://${host}:${server.address().port}`,
    env: runtime.env,
    async close() {
      await new Promise(resolveClose => server.close(resolveClose));
      await Promise.allSettled([...running]);
      runtime.close();
    }
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const argument = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const instance = await openServer({
    demo: args.includes("--demo"),
    host: argument("--host"),
    port: argument("--port") ? Number(argument("--port")) : undefined
  });
  console.log(`Кадры · Горький: ${instance.url}`);
}
