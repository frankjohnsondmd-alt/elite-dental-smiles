import { readdir, readFile, writeFile } from "node:fs/promises";

const ignoredFiles = new Set([
  "sedation-dentistry-for-dental-anxiety-dandridge-tn.html"
]);
const files = (await readdir(".")).filter(
  (file) => file.endsWith(".html") && !ignoredFiles.has(file)
);
const tag = '  <script src="/site-tracking.js" defer></script>';
let changed = 0;
let skipped = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  if (source.includes('/site-tracking.js')) continue;
  if (!source.includes("</head>")) {
    skipped += 1;
    continue;
  }
  const updated = source.replace("</head>", `${tag}\n</head>`);
  await writeFile(file, updated);
  changed += 1;
}

process.stdout.write(`Injected shared tracking into ${changed} HTML files; skipped ${skipped} non-page files.\n`);
