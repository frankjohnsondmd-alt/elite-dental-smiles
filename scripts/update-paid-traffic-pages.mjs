import { readFile, writeFile } from "node:fs/promises";

async function updateFile(file, updater) {
  const source = await readFile(file, "utf8");
  const updated = updater(source);
  if (updated === source) return;
  await writeFile(file, updated);
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing expected content: ${label}`);
  return source.replace(before, after);
}

function updateJsonLd(source, type, updater, occurrence = 0) {
  let seen = 0;
  let changed = false;
  const result = source.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    (whole, raw) => {
      let data;
      try { data = JSON.parse(raw); } catch { return whole; }
      if (data["@type"] !== type || seen++ !== occurrence) return whole;
      changed = true;
      const next = updater(data);
      return `<script type="application/ld+json">${JSON.stringify(next)}</script>`;
    }
  );
  if (!changed) throw new Error(`JSON-LD ${type} occurrence ${occurrence} not found`);
  return result;
}

const hours = [{
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
  opens: "08:00",
  closes: "17:00"
}];

await updateFile("index.html", (original) => {
  if (original.includes('data-elite-form="appointment_request"')) return original;
  let source = updateJsonLd(original, "Dentist", () => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.elitedentalsmiles.com/#organization",
        name: "Elite Dental",
        url: "https://www.elitedentalsmiles.com/",
        logo: "https://www.elitedentalsmiles.com/images/logo.png",
        image: "https://www.elitedentalsmiles.com/images/og-image.jpg",
        sameAs: ["https://www.facebook.com/EliteDentalSmiles"],
        department: [
          { "@id": "https://www.elitedentalsmiles.com/#dandridge" },
          { "@id": "https://www.elitedentalsmiles.com/#jefferson-city" }
        ]
      },
      {
        "@type": "Dentist",
        "@id": "https://www.elitedentalsmiles.com/#dandridge",
        name: "Elite Dental Dandridge",
        url: "https://www.elitedentalsmiles.com/dandridge-dentist.html",
        telephone: "+18653975422",
        email: "dandridge@elitedentalsmiles.com",
        priceRange: "$$",
        image: "https://www.elitedentalsmiles.com/images/og-image.jpg",
        parentOrganization: { "@id": "https://www.elitedentalsmiles.com/#organization" },
        address: {
          "@type": "PostalAddress",
          streetAddress: "334 TN-92 #1",
          addressLocality: "Dandridge",
          addressRegion: "TN",
          postalCode: "37725",
          addressCountry: "US"
        },
        openingHoursSpecification: hours
      },
      {
        "@type": "Dentist",
        "@id": "https://www.elitedentalsmiles.com/#jefferson-city",
        name: "Elite Dental Jefferson City",
        url: "https://www.elitedentalsmiles.com/jefferson-city-dentist.html",
        telephone: "+18654758331",
        email: "jeffersoncity@elitedentalsmiles.com",
        priceRange: "$$",
        image: "https://www.elitedentalsmiles.com/images/og-image.jpg",
        parentOrganization: { "@id": "https://www.elitedentalsmiles.com/#organization" },
        address: {
          "@type": "PostalAddress",
          streetAddress: "683 E Broadway Blvd",
          addressLocality: "Jefferson City",
          addressRegion: "TN",
          postalCode: "37760",
          addressCountry: "US"
        },
        openingHoursSpecification: hours
      }
    ]
  }));

  source = updateJsonLd(source, "FAQPage", (data) => {
    for (const item of data.mainEntity || []) {
      if (item.name === "Do you accept dental insurance?") {
        item.acceptedAnswer.text = "Insurance participation is provider-specific. Dr. Rachel Chaney at Jefferson City is in network with Cigna, Delta Dental, and BCBS. Dr. Jason Chaney and Dr. Frank Johnson are fee-for-service and out of network. Dr. Winslow at Dandridge is in network with Cigna. Our team can explain how your benefits apply before treatment.";
      }
      if (item.name === "What if I have dental anxiety?") {
        item.acceptedAnswer.text = "We offer comfort and sedation options that may include nitrous oxide, oral sedation, and IV sedation. The safest option depends on your health history, procedure, provider availability, and location.";
      }
      if (item.name === "What makes Elite Dental different from other practices?") {
        item.acceptedAnswer.text = "We take time to explain your options, answer your questions, and build a treatment plan around your goals. Comfort and sedation options can be discussed when appropriate, and we treat patients the way we would want our own families treated.";
      }
    }
    return data;
  });

  source = updateJsonLd(source, "WebSite", (data) => {
    delete data.potentialAction;
    return data;
  });

  source = replaceRequired(
    source,
    "We welcome patients with all insurance plans at both locations. Our Jefferson City office is in network with most major providers. At our Dandridge location, most of our doctors are non restricted providers, meaning your care is never limited by insurance networks. Dr. Winslow is an in network provider with Cigna at our Dandridge office. For all other plans, we are happy to submit claims on your behalf so you can take advantage of any out of network benefits your plan offers. We always provide a detailed estimate before treatment begins.",
    "Insurance participation is provider-specific. Dr. Rachel Chaney at Jefferson City is in network with Cigna, Delta Dental, and BCBS. Dr. Jason Chaney and Dr. Frank Johnson are fee-for-service and out of network. Dr. Winslow at Dandridge is in network with Cigna. Our team can explain how your benefits apply before treatment.",
    "homepage insurance FAQ"
  );
  source = replaceRequired(
    source,
    '<form id="contactForm" action="https://formsubmit.co/dandridge@elitedentalsmiles.com" method="POST">',
    '<form id="contactForm" action="https://formsubmit.co/dandridge@elitedentalsmiles.com" method="POST" data-elite-form="appointment_request" data-location-select="contact-location">',
    "homepage form tracking attributes"
  );
  source = replaceRequired(
    source,
    '<input type="hidden" name="_next" value="https://www.elitedentalsmiles.com/#cta"/>',
    '<input type="hidden" name="_next" value="https://www.elitedentalsmiles.com/thank-you"/>',
    "homepage success URL"
  );
  return source;
});

async function updateLocationPage(file, location) {
  const isDandridge = location === "Dandridge";
  const phone = isDandridge ? "(865) 397-5422" : "(865) 475-8331";
  const schemaInsurance = isDandridge
    ? "Dr. Winslow is in network with Cigna at Dandridge. Dr. Frank Johnson and Dr. Jason Chaney are fee-for-service and out of network. Our team can explain how your benefits apply and provide estimates before treatment."
    : "Dr. Rachel Chaney is in network with Cigna, Delta Dental, and BCBS at Jefferson City. Dr. Jason Chaney is fee-for-service and out of network. Our team can explain how your benefits apply and provide estimates before treatment.";
  const visibleInsurance = schemaInsurance + " Our in-house membership and financing options are also available.";

  await updateFile(file, (original) => {
    let source = updateJsonLd(original, "Dentist", (data) => {
      data.url = `https://www.elitedentalsmiles.com/${file}`;
      data.email = isDandridge ? "dandridge@elitedentalsmiles.com" : "jeffersoncity@elitedentalsmiles.com";
      data.openingHoursSpecification = hours;
      return data;
    });
    source = updateJsonLd(source, "FAQPage", (data) => {
      for (const item of data.mainEntity || []) {
        if (item.name.includes("accept dental insurance")) item.acceptedAnswer.text = schemaInsurance;
        if (item.name.includes("accept new patients")) item.acceptedAnswer.text = `Yes. We are accepting new patients at our ${location} office. Call ${phone} for current scheduling availability.`;
        if (item.name.includes("services are offered")) item.acceptedAnswer.text = `Our ${location} office provides preventive, restorative, cosmetic, and urgent dental care. Sedation and implant options depend on clinical needs, provider availability, and location; call the office so our team can guide you to the appropriate visit.`;
      }
      return data;
    });

    source = source.replaceAll("Same-Week Appointments", "Call for Current Availability");
    source = source.replaceAll("All Sedation Levels Available", "Sedation Options Available");
    source = source.replaceAll("Same-week appointments available. Accepting new patients now.", "Accepting new patients. Call for current availability.");
    source = source.replaceAll("we'll typically get you in within the same week", "we'll explain the current scheduling options");

    if (isDandridge) {
      source = replaceRequired(
        source,
        '<a href="index.html#contact-form" class="btn btn-white btn-lg">Send a Message</a>',
        '<a href="index.html#contact-form" class="btn btn-white btn-lg">Request an Appointment</a>\n          <a href="emergency-dentistry.html" class="btn btn-outline-white btn-lg">Urgent Dental Care</a>',
        "Dandridge urgent pathway"
      );
      source = replaceRequired(
        source,
        "Fee-for-service · In-house membership available · Financing available",
        "Dr. Winslow: Cigna in network · Other doctors: fee-for-service/out of network",
        "Dandridge insurance card"
      );
    } else {
      source = replaceRequired(
        source,
        '<a href="tel:+18654758331" class="btn btn-white btn-lg">📞 (865) 475-8331</a>\n          <a href="index.html#membership" class="btn btn-outline-white btn-lg">View Membership Plans</a>',
        '<a href="tel:+18654758331" class="btn btn-white btn-lg">📞 (865) 475-8331</a>\n          <a href="index.html#contact-form" class="btn btn-white btn-lg">Request an Appointment</a>\n          <a href="emergency-dentistry.html" class="btn btn-outline-white btn-lg">Urgent Dental Care</a>',
        "Jefferson City appointment pathways"
      );
      source = replaceRequired(
        source,
        "Most insurance accepted · In-house membership · Financing available",
        "Dr. Rachel: Cigna, Delta Dental & BCBS · Dr. Jason: fee-for-service/out of network",
        "Jefferson City insurance card"
      );
    }

    source = replaceRequired(
      source,
      "Nitrous oxide, oral sedation, and IV sedation for anxious patients. Dr. Johnson is certified by the Tennessee Board of Dentistry.",
      "Comfort and sedation options are available for anxious patients. The safest option depends on health history, procedure, provider availability, and location.",
      `${location} sedation service card`
    );
    source = replaceRequired(
      source,
      "Permanent tooth replacement with Nobel Biocare implants. Dr. Johnson holds Nobel Biocare implant surgery certification.",
      "Implant consultations and tooth-replacement options are available. Treatment recommendations and provider availability are confirmed after evaluation.",
      `${location} implant service card`
    );
    source = replaceRequired(
      source,
      "<h3>Sedation for Everyone</h3>",
      "<h3>Options for Dental Anxiety</h3>",
      `${location} anxiety heading`
    );
    source = replaceRequired(
      source,
      "Anxious about the dentist? Nearly half our patients are. We offer three levels of sedation so you can relax through any procedure cleanings included.",
      "If dental anxiety has kept you away, tell us when you call. We will explain comfort and sedation options that may be appropriate for your visit.",
      `${location} anxiety copy`
    );
    source = replaceRequired(
      source,
      "<h3>Call for Current Availability</h3>",
      "<h3>Responsive Scheduling</h3>",
      `${location} scheduling heading`
    );
    source = replaceRequired(
      source,
      "We keep room in our schedule for new patients and urgent needs. You shouldn't have to wait six weeks to see a dentist in your own community.",
      "Call during business hours for current new-patient and urgent-care availability. Our team will help determine the right type of visit.",
      `${location} scheduling copy`
    );

    const oldInsurance = isDandridge
      ? "We welcome patients with all insurance plans. Most of our Dandridge doctors are non restricted providers, meaning your care is never limited by insurance networks. Dr. Winslow is an in network provider with Cigna. We are happy to submit claims on your behalf so you can take advantage of any out of network benefits your plan offers. We also offer an affordable in-house membership plan that covers cleanings, exams, and X-rays with no waiting periods or claim denials, plus 15% off all other services. Financing is also available for larger procedures."
      : "Our Jefferson City location is a accepts most major insurance plans practice we do not accept dental insurance. However, we offer an affordable in-house membership plan that covers cleanings, exams, and X-rays with no waiting periods or claim denials, plus 15% off all other services. Financing is also available for larger procedures.";
    source = replaceRequired(source, oldInsurance, visibleInsurance, `${location} visible insurance FAQ`);

    const oldSedation = isDandridge
      ? "Yes sedation dentistry is one of our specialties. Dr. Johnson is certified by the Tennessee Board of Dentistry and offers nitrous oxide, oral sedation, and IV sedation at our Dandridge office. Many patients drive from across East Tennessee specifically for our sedation services."
      : "Yes sedation dentistry is one of our specialties. Dr. Johnson is certified by the Tennessee Board of Dentistry and offers nitrous oxide, oral sedation, and IV sedation at our Jefferson City office. Many patients drive from across East Tennessee specifically for our sedation services.";
    source = replaceRequired(
      source,
      oldSedation,
      `We offer comfort and sedation options for anxious patients. Availability at ${location} depends on health history, procedure, provider schedule, and clinical evaluation. Call ${phone} to discuss the appropriate next step.`,
      `${location} visible sedation FAQ`
    );

    const oldImplants = `Yes. Dr. Johnson holds Nobel Biocare implant surgery certification and performs dental implant procedures at our ${location} location. Implants can be done under sedation for a completely comfortable experience. Call us to schedule a consultation.`;
    source = replaceRequired(
      source,
      oldImplants,
      `Implant consultations and tooth-replacement options are available. Recommendations depend on an examination, imaging, and provider availability. Call ${phone} to request a consultation.`,
      `${location} visible implant FAQ`
    );
    return source;
  });
}

await updateLocationPage("dandridge-dentist.html", "Dandridge");
await updateLocationPage("jefferson-city-dentist.html", "Jefferson City");

await updateFile("sedation-dentistry.html", (original) => {
  let source = replaceRequired(
    original,
    '<form class="sedation-form" id="sedationConsultForm" action="https://formsubmit.co/dandridge@elitedentalsmiles.com" method="POST">',
    '<form class="sedation-form" id="sedationConsultForm" action="https://formsubmit.co/dandridge@elitedentalsmiles.com" method="POST" data-elite-form="sedation_consultation" data-location-select="sedation-location">',
    "sedation form tracking attributes"
  );
  source = replaceRequired(
    source,
    '<input type="hidden" name="_next" value="https://www.elitedentalsmiles.com/sedation-dentistry#sedation-consult-form"/>',
    '<input type="hidden" name="_next" value="https://www.elitedentalsmiles.com/thank-you"/>',
    "sedation success URL"
  );
  source = replaceRequired(
    source,
    `  function trackSedationEvent(name, params){
    if(typeof gtag === "function"){gtag("event", name, params || {})}
  }
  document.querySelectorAll("[data-conversion]").forEach(function(el){
    el.addEventListener("click",function(){trackSedationEvent(this.getAttribute("data-conversion"),{page:"sedation-dentistry",location:this.getAttribute("data-location")||undefined})});
  });
`,
    "",
    "pre-success sedation analytics"
  );
  source = replaceRequired(
    source,
    `    sedationForm.addEventListener("submit",function(){trackSedationEvent("sedation_form_submit",{page:"sedation-dentistry",location:sedationLocation.value,interest:(document.getElementById("sedation-interest")||{}).value})});
`,
    "",
    "sedation submit analytics"
  );
  return source;
});

process.stdout.write("Updated homepage, location pages, and sedation form for staged paid-traffic work.\n");
