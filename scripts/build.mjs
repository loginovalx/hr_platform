import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

const built = new URL("../dist/", import.meta.url);
await Promise.all([mkdir(new URL("server/", built), { recursive: true }), mkdir(new URL(".openai/", built), { recursive: true })]);
const sources = ["core", "documents", "recruiting", "triage", "gigachat", "interview-draft", "hiring", "demo", "http"];
const files = { "/": "index.html", "/app.js": "app.js", "/style.css": "style.css", "/mark.svg": "mark.svg" };
const assets = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([path, filename]) => [path, await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8")])));
const source = await Promise.all(sources.map(name => readFile(new URL(`../src/${name}.mjs`, import.meta.url), "utf8")));
await writeFile(new URL("server/index.js", built), source.join("\n\n") + "\nconst assets = " + JSON.stringify(assets) + ";\nexport default { fetch: siteFetch };\n");
await copyFile(new URL("../.openai/hosting.json", import.meta.url), new URL(".openai/hosting.json", built));
