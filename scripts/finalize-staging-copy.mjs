import { readFile, writeFile } from "node:fs/promises";

async function replaceInFile(file, replacements) {
  let source = await readFile(file, "utf8");
  for (const [before, after, label] of replacements) {
    if (!source.includes(before)) throw new Error(`${file}: missing ${label}`);
    source = source.replace(before, after);
  }
  await writeFile(file, source);
}

await replaceInFile("dandridge-dentist.html", [
  [
    '"url":"https://www.elitedentalsmiles.com/dandridge-dentist.html"',
    '"url":"https://www.elitedentalsmiles.com/dandridge-dentist"',
    "canonical schema URL"
  ],
  [
    "Elite Dental has been caring for Dandridge families since 2007. We offer everything from routine cleanings to sedation dentistry and dental implants all in one comfortable, welcoming office.",
    "Located on Highway 92, our Dandridge office serves families from Dandridge, Newport, White Pine, and nearby Jefferson County communities with preventive, restorative, cosmetic, and urgent dental care.",
    "local hero copy"
  ],
  [
    "From your first cleaning to a complete smile transformation we handle it all right here in Dandridge.",
    "Find preventive and restorative care close to home, with clear pathways to sedation, implant, cosmetic, and urgent dental services when appropriate.",
    "local service intro"
  ],
  [
    "We've been serving Jefferson County and surrounding communities for nearly 20 years. Here's what sets us apart.",
    "Our Highway 92 office has served Dandridge and surrounding Jefferson County communities since 2007. Here's what patients can expect.",
    "local why-us intro"
  ]
]);

await replaceInFile("jefferson-city-dentist.html", [
  [
    '"url":"https://www.elitedentalsmiles.com/jefferson-city-dentist.html"',
    '"url":"https://www.elitedentalsmiles.com/jefferson-city-dentist"',
    "canonical schema URL"
  ],
  [
    "Elite Dental has been caring for Jefferson City families since 2007. We offer everything from routine cleanings to sedation dentistry and dental implants all in one comfortable, welcoming office.",
    "Our East Broadway office serves Jefferson City, Talbott, White Pine, Morristown, and nearby communities with preventive, restorative, cosmetic, and urgent dental care.",
    "local hero copy"
  ],
  [
    "From your first cleaning to a complete smile transformation we handle it all right here in Jefferson City.",
    "Choose local preventive and restorative care with provider-specific insurance guidance and clear pathways to cosmetic, implant, sedation, and urgent services when appropriate.",
    "local service intro"
  ],
  [
    "We've been serving Jefferson County and surrounding communities for nearly 20 years. Here's what sets us apart.",
    "Our East Broadway team serves Jefferson City and nearby Hamblen, Grainger, and Jefferson County communities. Here's what patients can expect.",
    "local why-us intro"
  ]
]);

await replaceInFile("index.html", [
  [
    "Dr. Johnson is certified by the Tennessee Board of Dentistry. Your vitals are monitored continuously throughout.",
    "Dr. Johnson holds a comprehensive sedation permit issued by the Tennessee Board of Dentistry. Monitoring is tailored to the sedation method and procedure.",
    "homepage sedation credential"
  ]
]);

await replaceInFile("sedation-dentistry.html", [
  [
    "Our IV sedation dentist is certified by the Tennessee Board of Dentistry, which requires specific training, ongoing education, and safety protocols beyond a standard dental license.",
    "Our IV sedation dentist holds a comprehensive sedation permit issued by the Tennessee Board of Dentistry, with required training, ongoing education, and safety protocols.",
    "sedation credential schema"
  ],
  [
    "Our IV sedation dentist is certified by the Tennessee Board of Dentistry, which requires specific training, ongoing education, and safety protocols beyond a standard dental license.",
    "Our IV sedation dentist holds a comprehensive sedation permit issued by the Tennessee Board of Dentistry, with required training, ongoing education, and safety protocols.",
    "sedation credential visible"
  ],
  [
    " Millions of dental sedation procedures are performed safely every year.",
    "",
    "unsupported procedure-volume claim"
  ]
]);

process.stdout.write("Finalized local and credential copy for staging.\n");
