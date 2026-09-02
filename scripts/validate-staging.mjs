import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const htmlFiles = (await readdir(root)).filter((file) => file.endsWith(".html"));
const errors = [];
let jsonLdCount = 0;

function fail(message) { errors.push(message); }

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

for (const file of htmlFiles) {
  if (file === "sedation-dentistry-for-dental-anxiety-dandridge-tn.html") continue;
  const source = await readFile(file, "utf8");
  if (!source.includes("</head>")) continue;

  const trackingTags = source.match(/<script src="\/site-tracking\.js" defer><\/script>/g) || [];
  if (file !== "sedation-dentistry-for-dental-anxiety-dandridge-tn.html" && trackingTags.length !== 1) {
    fail(`${file}: expected one shared tracking script, found ${trackingTags.length}`);
  }
  if (/GTM-[A-Z0-9]+/.test(source) || source.includes("googletagmanager.com/gtm")) {
    fail(`${file}: unexpected Google Tag Manager container`);
  }

  const blocks = source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const match of blocks) {
    jsonLdCount += 1;
    try { JSON.parse(match[1]); } catch (error) { fail(`${file}: invalid JSON-LD: ${error.message}`); }
  }

  const hrefs = source.matchAll(/href=["']([^"']+)["']/g);
  for (const match of hrefs) {
    let href = match[1];
    if (/^(?:https?:|mailto:|tel:|javascript:|#)/i.test(href)) continue;
    href = href.split(/[?#]/)[0];
    if (!href) continue;
    const relative = href.startsWith("/") ? href.slice(1) : href;
    const candidates = [relative];
    if (!path.extname(relative)) candidates.push(`${relative}.html`, path.join(relative, "index.html"));
    const valid = await Promise.all(candidates.map((candidate) => exists(path.join(root, candidate))));
    if (!valid.some(Boolean)) fail(`${file}: broken internal link ${match[1]}`);
  }
}

const tracking = await readFile("site-tracking.js", "utf8");
for (const required of [
  "AW-17413230320",
  "AW-17413230320/RHn1CIDT7NccEPCdo-9A",
  "AW-17413230320/Ah5MCIPT7NccEPCdo-9A",
  "AW-17413230320/P9ykCKOM5ukcEPCdo-9A",
  "phone_call_click",
  "generate_lead",
  "(865) 397-5422",
  "(865) 475-8331"
]) {
  if (!tracking.includes(required)) fail(`site-tracking.js: missing ${required}`);
}
for (const forbidden of ["user_data", "transaction_id", "email_address", "sha256_"]) {
  if (tracking.includes(forbidden)) fail(`site-tracking.js: forbidden analytics field ${forbidden}`);
}

const homepage = await readFile("index.html", "utf8");
if (homepage.includes("aggregateRating")) fail("index.html: unsupported aggregateRating remains");
if (homepage.includes("SearchAction")) fail("index.html: nonfunctional SearchAction remains");
if (homepage.includes('"dayOfWeek":"Friday"')) fail("index.html: Friday schema hours remain");
if (!homepage.includes("4.9 average &middot; 830+ Google reviews across both locations")) fail("index.html: accurate rating and review-count wording missing");
if (homepage.includes("830+ Five Star Google Reviews")) fail("index.html: review count incorrectly described as all five-star");
if (homepage.includes("dandridge-dentist.html") || homepage.includes("jefferson-city-dentist.html")) fail("index.html: legacy .html location schema URL remains");

const jeffersonCity = await readFile(path.join(root, "jefferson-city-dentist.html"), "utf8");
if (jeffersonCity.includes("easy to find off Highway 92")) fail("jefferson-city-dentist.html: stale Highway 92 FAQ schema remains");
if (jeffersonCity.includes("Talbott, Newport, Sevierville")) fail("jefferson-city-dentist.html: stale FAQ catchment remains");
if (!jeffersonCity.includes("on E Broadway/US-11E")) fail("jefferson-city-dentist.html: corrected FAQ location schema missing");
if (!homepage.includes('data-elite-form="appointment_request"')) fail("index.html: form success marker missing");

const sedation = await readFile("sedation-dentistry.html", "utf8");
if (!sedation.includes('data-elite-form="sedation_consultation"')) fail("sedation form success marker missing");
if (sedation.includes("sedation_form_submit")) fail("sedation page: pre-success form analytics remains");

const thankYou = await readFile("thank-you.html", "utf8");
if (!thankYou.includes('name="robots" content="noindex,follow"')) fail("thank-you.html: noindex missing");
if (!thankYou.includes("consumePendingForm")) fail("thank-you.html: confirmation gate missing");

const jefferson = await readFile("jefferson-city-dentist.html", "utf8");
for (const stale of ["accepts most major insurance plans practice", "Most insurance accepted", "All Sedation Levels Available"] ) {
  if (jefferson.includes(stale)) fail(`jefferson-city-dentist.html: stale copy remains: ${stale}`);
}

if (errors.length) {
  process.stderr.write(`${errors.length} validation error(s):\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(`Validated ${htmlFiles.length} HTML files and ${jsonLdCount} JSON-LD blocks.\n`);
