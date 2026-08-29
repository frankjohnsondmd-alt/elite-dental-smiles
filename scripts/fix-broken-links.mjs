import { readFile, writeFile } from "node:fs/promises";

async function replaceInFile(file, replacements) {
  let source = await readFile(file, "utf8");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) throw new Error(`${file}: missing ${before}`);
    source = source.replaceAll(before, after);
  }
  await writeFile(file, source);
}

for (const file of [
  "blog-acid-reflux-tooth-enamel-east-tennessee.html",
  "blog-full-mouth-reconstruction-east-tennessee.html",
  "blog-night-guard-teeth-grinding-dandridge-tn.html"
]) {
  await replaceInFile(file, [
    ["tel:+18658044366", "tel:+18654758331"],
    ["(865) 804-4366", "(865) 475-8331"],
    ['href="/contact"', 'href="/#contact-form"']
  ].filter(([before]) => file === "blog-full-mouth-reconstruction-east-tennessee.html" || before !== 'href="/contact"' || true));
}

await replaceInFile("blog-mouth-breathing-dental-health.html", [
  [
    '<link rel="stylesheet" href="styles.css">',
    '<style>body{margin:0;font-family:Arial,sans-serif;color:#243b53;line-height:1.7}header{background:#102a43;padding:18px 24px}nav{max-width:960px;margin:auto;display:flex;gap:24px;align-items:center}nav a{color:#fff;text-decoration:none}.logo{font-size:1.3rem;font-weight:700;margin-right:auto}.blog-post{max-width:760px;margin:56px auto;padding:0 24px}h1,h2{color:#102a43}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.15}.eyebrow,.post-meta{color:#486581}.eyebrow{font-weight:700;text-transform:uppercase;letter-spacing:.08em}</style>'
  ],
  ['href="contact.html"', 'href="/#contact-form"']
]);

await replaceInFile("blog-plaque-vs-tartar-east-tennessee.html", [
  ['href="gum-disease-treatment.html"', 'href="blog-gum-disease-treatment-east-tennessee.html"']
]);

await replaceInFile("blog-snoring-sleep-apnea-dentist-east-tennessee.html", [
  ['href="preventive-dentistry.html"', 'href="dandridge-dentist.html"'],
  ['href="family-dentistry.html"', 'href="jefferson-city-dentist.html"']
]);

await replaceInFile("blog-temporary-crown-care-east-tennessee.html", [
  ['href="dental-crowns.html"', 'href="crowns-bridges.html"'],
  ['href="restorative-dentistry.html"', 'href="crowns-bridges.html"']
]);

for (const file of ["membership.html", "membership-admin.html", "membership-portal.html", "membership-signup.html"]) {
  await replaceInFile(file, [['images/favicon.svg', 'images/favicon-32.png']]);
}

await replaceInFile("thank-you.html", [['images/favicon.png', 'images/favicon-32.png']]);

process.stdout.write("Corrected staged internal links, stale phone numbers, and missing assets.\n");
