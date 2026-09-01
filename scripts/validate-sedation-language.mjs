import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const names = fs.readdirSync(root).filter((name) =>
  name === "index.html" ||
  name === "sedation-dentistry.html" ||
  name === "dental-implants.html" ||
  name.startsWith("sedation-dentist-") ||
  name === "blog-iv-sedation-dentistry-east-tennessee.html" ||
  name === "blog-how-to-choose-sedation-dentist-east-tennessee.html"
);

const prohibited = [
  /deep calm/i,
  /sleep[- ]like state/i,
  /sleep through/i,
  /sleep dentistry/i,
  /sleep dentist/i,
  /painless dentist/i,
  /drift off/i,
  /come around/i,
  /board[- ]certified/i,
  /Tennessee Board Certified/i,
  /sedation dentistry specialists/i,
  /full IV sedation/i,
  /near[- ]sleep/i,
  /completely pain[- ]free/i,
  /sedation ensures/i,
  /trained to manage any situation/i,
  /IV Sedation Certified Tennessee Board/i,
];

const failures = [];
for (const name of names) {
  const lines = fs.readFileSync(path.join(root, name), "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of prohibited) {
      if (pattern.test(line)) failures.push(`${name}:${index + 1}: ${pattern}`);
    }
  });
}

if (failures.length) {
  console.error(`Sedation-language validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log(`Sedation-language validation passed across ${names.length} high-risk pages.`);

const sedationHtml = fs.readFileSync(path.join(root, "sedation-dentistry.html"), "utf8");
const visibleFaq = new Map();
for (const match of sedationHtml.matchAll(/<div class="faq-item">\s*<button[^>]*>([^<]+)[\s\S]*?<div class="faq-answer">([\s\S]*?)<\/div>\s*<\/div>/g)) {
  const question = match[1].replace(/\s+/g, " ").trim();
  const answer = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  visibleFaq.set(question, answer);
}

const schemaFaq = new Map();
for (const match of sedationHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  let data;
  try { data = JSON.parse(match[1]); } catch { continue; }
  if (data["@type"] !== "FAQPage") continue;
  for (const entry of data.mainEntity || []) schemaFaq.set(entry.name, entry.acceptedAnswer?.text || "");
}

for (const [question, answer] of visibleFaq) {
  if (schemaFaq.get(question) !== answer) {
    console.error(`Visible FAQ/schema mismatch: ${question}`);
    process.exit(1);
  }
}
console.log(`Visible FAQ/schema parity passed for ${visibleFaq.size} sedation questions.`);
