import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const built = new URL("../dist/", import.meta.url);
await Promise.all([mkdir(new URL("server/", built), { recursive: true }), mkdir(new URL(".openai/", built), { recursive: true })]);
const sources = ["core", "documents", "archive", "recruiting", "triage", "gigachat", "interview-draft", "hiring", "analytics", "operations", "demo", "http"];
const files = { "/": "index.html", "/app.js": "app.js", "/style.css": "style.css", "/mark.svg": "mark.svg" };
const assets = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([path, filename]) => [path, await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8")])));
for (const font of ["inter-cyrillic.woff2","inter-latin.woff2"]) {
  assets["/"+font]=await readFile(new URL(`../public/${font}`,import.meta.url),"base64");
}
const source = await Promise.all(sources.map(name => readFile(new URL(`../src/${name}.mjs`, import.meta.url), "utf8")));
await writeFile(new URL("server/index.js", built), source.join("\n\n") + "\nconst assets = " + JSON.stringify(assets) + ";\nconst buildVersion = " + JSON.stringify(version) + ";\nexport default { fetch: siteFetch };\n");
await copyFile(new URL("../.openai/hosting.json", import.meta.url), new URL(".openai/hosting.json", built));
