import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("site-tracking.js", "utf8");

function makeContext({ existingLoader = false, existingGaConfig = false } = {}) {
  const appended = [];
  const listeners = {};
  const storage = new Map();
  const dataLayer = existingGaConfig ? [["config", "G-R2EVNKP5X2"]] : [];
  const document = {
    head: { appendChild(node) { appended.push(node); } },
    createElement() { return {}; },
    querySelector(selector) {
      if (selector.includes("googletagmanager.com/gtag/js") && existingLoader) return {};
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(name, handler) { listeners[name] = handler; }
  };
  const window = {
    dataLayer,
    location: { pathname: "/test-page", origin: "https://preview.example" },
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    }
  };
  const context = vm.createContext({ window, document, Date, JSON, Boolean, Number, String, encodeURIComponent });
  vm.runInContext(source, context);
  return { window, document, dataLayer, appended, listeners, storage };
}

function entries(layer) {
  return layer.map((entry) => Array.from(entry));
}

{
  const env = makeContext();
  const calls = entries(env.dataLayer);
  assert.equal(env.appended.length, 1, "pages without gtag should receive one loader");
  assert.equal(calls.filter((call) => call[0] === "config" && call[1] === "G-R2EVNKP5X2").length, 1);
  assert.equal(calls.filter((call) => call[0] === "config" && call[1] === "AW-17413230320").length, 1);
  assert.equal(calls.filter((call) => call[0] === "config" && call[1] === "AW-17413230320/P9ykCKOM5ukcEPCdo-9A").length, 2);

  env.window.EliteDentalTracking.prepareFormSuccess("appointment_request", "Dandridge");
  const beforeConfirmation = entries(env.dataLayer).filter((call) => call[0] === "event" && call[1] === "conversion");
  assert.equal(beforeConfirmation.length, 0, "submit preparation must not record a conversion");
  const marker = env.window.EliteDentalTracking.consumePendingForm();
  assert.equal(marker.form_identifier, "appointment_request");
  assert.equal(marker.office_location, "Dandridge");
  assert.equal(env.window.EliteDentalTracking.recordConfirmedForm(marker), true);
  assert.equal(env.window.EliteDentalTracking.consumePendingForm(), null, "marker must be one use");
  assert.equal(env.window.EliteDentalTracking.recordConfirmedForm(null), false, "direct thank-you visits must not convert");

  const confirmedCalls = entries(env.dataLayer);
  assert.equal(confirmedCalls.filter((call) => call[0] === "event" && call[1] === "generate_lead").length, 1);
  assert.equal(confirmedCalls.filter((call) => call[0] === "event" && call[1] === "conversion" && call[2].send_to === "AW-17413230320/RHn1CIDT7NccEPCdo-9A").length, 1);

  env.listeners.click({
    target: {
      closest() {
        return { getAttribute() { return "tel:+18654758331"; } };
      }
    }
  });
  const phoneCalls = entries(env.dataLayer);
  assert.equal(phoneCalls.filter((call) => call[0] === "event" && call[1] === "phone_call_click" && call[2].office_location === "Jefferson City").length, 1);
  assert.equal(phoneCalls.filter((call) => call[0] === "event" && call[1] === "conversion" && call[2].send_to === "AW-17413230320/Ah5MCIPT7NccEPCdo-9A").length, 1);
}

{
  const env = makeContext({ existingLoader: true, existingGaConfig: true });
  const calls = entries(env.dataLayer);
  assert.equal(env.appended.length, 0, "existing gtag loader must be reused");
  assert.equal(calls.filter((call) => call[0] === "config" && call[1] === "G-R2EVNKP5X2").length, 1, "existing GA4 config must not be duplicated");
  assert.equal(calls.filter((call) => call[0] === "config" && call[1] === "AW-17413230320").length, 1);
}

process.stdout.write("Tracking tests passed: loader reuse, Ads labels, success gate, one-use conversion, and phone-click context.\n");
