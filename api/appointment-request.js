// Website appointment requests. Sends through Microsoft Graph from each office's own
// Microsoft 365 mailbox (app-only Mail.Send), replacing the formsubmit.co relay.

const MAX_BODY_BYTES = 20_000;
const MIN_FILL_MS = 4_000;
const GRAPH = "https://graph.microsoft.com/v1.0";

const OFFICES = {
  "Dandridge": { mailbox: "dandridge@elitedentalsmiles.com", phone: "(865) 397-5422" },
  "Jefferson City": { mailbox: "jeffersoncity@elitedentalsmiles.com", phone: "(865) 475-8331" },
};

const FORM_TYPES = {
  appointment_request: "Appointment request",
  location_page_request: "Location page request",
  sedation_consultation: "Sedation consultation",
};

const COMFORT_OPTIONS = ["No preference", "Nitrous oxide", "Oral sedation", "Moderate IV sedation"];
const CALL_TIMES = ["No preference", "Morning", "Afternoon"];

const URGENT_WORDS =
  /\b(pain|painful|hurts?|hurting|ache|aching|toothache|emergency|urgent|asap|swell(ing|ed)?|swollen|bleed(ing)?|abscess|infect(ed|ion)|broken|broke|cracked|knocked)\b/i;

const PENDING_FORM_KEY = "eliteDentalConfirmedFormPending";

function clean(value, max = 200) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function phoneDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits;
}

function formatPhone(digits) {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function validEmail(value) {
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(value);
}

function looksLikeSpam(text) {
  return /https?:\/\/|www\.|<a\s|\[url/i.test(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request is too large."));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readPayload(req) {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  let parsed;
  // Vercel pre-parses JSON and urlencoded bodies; fall back to the raw stream elsewhere.
  try {
    parsed = req.body;
  } catch {
    return null;
  }
  if (parsed === undefined || parsed === null || parsed === "") {
    const raw = await readBody(req);
    if (type.includes("application/json")) parsed = JSON.parse(raw || "{}");
    else parsed = Object.fromEntries(new URLSearchParams(raw));
  } else if (typeof parsed === "string" || Buffer.isBuffer(parsed)) {
    const raw = String(parsed);
    parsed = type.includes("application/json") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  // Repeated keys arrive as arrays; keep the first value.
  const out = {};
  for (const [key, value] of Object.entries(parsed)) out[key] = Array.isArray(value) ? value[0] : value;
  return out;
}

function wantsJson(req) {
  const accept = String(req.headers.accept || "").toLowerCase();
  const type = String(req.headers["content-type"] || "").toLowerCase();
  return type.includes("application/json") || (accept.includes("application/json") && !accept.includes("text/html"));
}

function sourcePath(payload, req) {
  let value = clean(payload.source_page, 200);
  if (!value) {
    try {
      value = new URL(String(req.headers.referer || "")).pathname;
    } catch {
      value = "";
    }
  }
  return /^\/[\w\-./]*$/.test(value) ? value : "";
}

function parseRequest(payload, req) {
  const r = {
    office: clean(payload.location || payload.preferred_location || payload.office, 40),
    formType: FORM_TYPES[clean(payload.form_type, 40)] ? clean(payload.form_type, 40) : "appointment_request",
    name: clean(payload.name, 100),
    phone: phoneDigits(payload.phone),
    email: clean(payload.email, 160),
    message: String(payload.message ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 2000),
    comfortOption: clean(payload.comfort_option, 40),
    bestTime: clean(payload.best_time_to_call, 40),
    sourcePage: sourcePath(payload, req),
  };

  if (!OFFICES[r.office]) return { error: "Please choose the Dandridge or Jefferson City office." };
  if (!r.name) return { error: "Please enter your name." };
  if (r.phone.length !== 10) return { error: "Please enter a 10-digit phone number." };
  if (r.email && !validEmail(r.email)) r.email = "";
  if (r.comfortOption && !COMFORT_OPTIONS.includes(r.comfortOption)) r.comfortOption = "";
  if (r.bestTime && !CALL_TIMES.includes(r.bestTime)) r.bestTime = "";

  r.urgent = URGENT_WORDS.test(r.message);
  r.spam = looksLikeSpam(`${r.name} ${r.message}`);
  return { request: r };
}

function buildSubject(r, testMode) {
  const parts = [];
  if (testMode) parts.push("TEST, please ignore:");
  if (r.urgent) parts.push("[URGENT/PAIN]");
  parts.push(`🦷 New appointment request: ${r.office} (${FORM_TYPES[r.formType]})`);
  return parts.join(" ");
}

function buildEmail(r, submittedAt) {
  const rows = [
    ["Office", r.office],
    ["Form", FORM_TYPES[r.formType]],
    ["Name", r.name],
    ["Phone", formatPhone(r.phone)],
  ];
  if (r.email) rows.push(["Email", r.email]);
  if (r.comfortOption) rows.push(["Comfort option to discuss", r.comfortOption]);
  if (r.bestTime) rows.push(["Best time to call", r.bestTime]);
  if (r.message) rows.push(["Message", r.message]);
  rows.push(["Source page", r.sourcePage ? `https://www.elitedentalsmiles.com${r.sourcePage}` : "Unknown"]);
  rows.push(["Submitted", submittedAt]);

  const banners = [];
  if (r.urgent) banners.push("Message mentions pain or an emergency: call back today");
  if (r.spam) banners.push("Possible spam (contains a link)");

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#555;white-space:nowrap;border-bottom:1px solid #eee;">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;vertical-align:top;border-bottom:1px solid #eee;">${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;">
<div style="font-family:Arial,Helvetica,sans-serif;color:#000;max-width:640px;font-size:14px;">
  <div style="font-size:18px;font-weight:bold;margin-bottom:4px;">Elite Dental: Online Appointment Request</div>
  <div style="color:#555;margin-bottom:10px;">Please call the patient back during office hours.</div>
  ${banners.map((b) => `<div style="border:2px solid #B00000;color:#B00000;font-weight:bold;padding:4px 8px;margin:4px 0;">${escapeHtml(b)}</div>`).join("")}
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.4;">${tableRows}</table>
  ${r.email ? "" : '<div style="color:#777;font-size:12px;margin-top:10px;">No email address was provided. Replying to this email will not reach the patient.</div>'}
</div>
</body></html>`;
}

// App-only token, cached per warm instance until shortly before it expires.
let cachedToken = null;
async function graphToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 120_000) return cachedToken.value;
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(process.env.MS_GRAPH_TENANT_ID)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error("token request failed");
    err.stage = "token";
    err.status = res.status;
    err.code = data.error || "";
    throw err;
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

async function sendMail(mailbox, message) {
  const token = await graphToken();
  const res = await fetch(`${GRAPH}/users/${encodeURIComponent(mailbox)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message, saveToSentItems: false }),
  });
  if (res.status === 202 || res.ok) return res.status;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) cachedToken = null;
  const err = new Error("sendMail failed");
  err.stage = "sendMail";
  err.status = res.status;
  err.code = (data.error && data.error.code) || "";
  throw err;
}

function respond(req, res, status, payload) {
  if (wantsJson(req)) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(JSON.stringify(payload));
  }
  if (payload.ok) {
    res.statusCode = 303;
    res.setHeader("Location", "/thank-you");
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(errorPage(payload.error));
}

function errorPage(message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>We could not send your request | Elite Dental</title><meta name="robots" content="noindex">
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:#1a1a1a}main{max-width:560px;margin:60px auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:24px;margin:0 0 12px}p{line-height:1.5}a.call{display:block;margin:10px 0;padding:14px 16px;background:#0b5c7a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;text-align:center}a.back{color:#0b5c7a}</style>
<script>try{sessionStorage.removeItem(${JSON.stringify(PENDING_FORM_KEY)})}catch(e){}</script></head>
<body><main><h1>We could not send your request</h1>
<p>${escapeHtml(message)}</p>
<p>Please call the office and our team will help you right away:</p>
<a class="call" href="tel:+18653975422">Dandridge: (865) 397-5422</a>
<a class="call" href="tel:+18654758331">Jefferson City: (865) 475-8331</a>
<p><a class="back" href="javascript:history.back()">Go back to the form</a></p></main></body></html>`;
}

const CALL_US = "Please call Dandridge at (865) 397-5422 or Jefferson City at (865) 475-8331.";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(req, res, 405, { ok: false, error: `This page only accepts form submissions. ${CALL_US}` });
  }

  let payload;
  try {
    payload = await readPayload(req);
  } catch {
    payload = null;
  }
  if (!payload) return respond(req, res, 400, { ok: false, error: `We could not read your request. ${CALL_US}` });

  // Spam: honeypot filled, or posted faster than a person could fill the form. Pretend success.
  let elapsed = Number(payload.elapsed_ms);
  if (!Number.isFinite(elapsed) || elapsed <= 0) elapsed = Date.now() - Number(payload.form_started);
  if (clean(payload.website) || !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    console.log("appointment-request: spam check rejected");
    return respond(req, res, 200, { ok: true });
  }

  const { request, error } = parseRequest(payload, req);
  if (error) return respond(req, res, 400, { ok: false, error: `${error} ${CALL_US}` });

  const office = OFFICES[request.office];
  const logTag = `office=${request.office} form=${request.formType}`;

  const { MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET } = process.env;
  if (!MS_GRAPH_TENANT_ID || !MS_GRAPH_CLIENT_ID || !MS_GRAPH_CLIENT_SECRET) {
    console.error(`appointment-request: ${logTag} failed, Graph env not configured`);
    return respond(req, res, 503, { ok: false, error: `Online requests are temporarily unavailable. ${CALL_US}` });
  }

  const testKey = String(req.headers["x-form-test"] || "");
  const testMode =
    clean(payload.test || (req.query && req.query.test), 5) === "1" &&
    testKey.length === 8 &&
    testKey === MS_GRAPH_CLIENT_ID.slice(0, 8);

  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "long",
  });

  const message = {
    subject: buildSubject(request, testMode),
    body: { contentType: "HTML", content: buildEmail(request, submittedAt) },
    from: { emailAddress: { address: office.mailbox } },
    toRecipients: [{ emailAddress: { address: office.mailbox } }],
  };
  if (request.email) message.replyTo = [{ emailAddress: { address: request.email, name: request.name } }];

  try {
    const status = await sendMail(office.mailbox, message);
    console.log(`appointment-request: ${logTag} sent, graph=${status}${testMode ? " test" : ""}`);
  } catch (err) {
    console.error(
      `appointment-request: ${logTag} failed, stage=${err.stage || "network"} graph=${err.status || "none"} code=${err.code || "none"}`,
    );
    return respond(req, res, 502, { ok: false, error: `Sorry, we could not send your request just now. ${CALL_US}` });
  }

  return respond(req, res, 200, { ok: true });
};
