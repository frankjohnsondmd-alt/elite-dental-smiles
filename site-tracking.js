(function () {
  "use strict";

  if (window.__eliteDentalTrackingLoaded) return;
  window.__eliteDentalTrackingLoaded = true;

  var GA4_ID = "G-R2EVNKP5X2";
  var ADS_ID = "AW-17413230320";
  var FORM_SEND_TO = "AW-17413230320/RHn1CIDT7NccEPCdo-9A";
  var PHONE_CLICK_SEND_TO = "AW-17413230320/Ah5MCIPT7NccEPCdo-9A";
  var WEBSITE_CALL_SEND_TO = "AW-17413230320/P9ykCKOM5ukcEPCdo-9A";
  var FORM_MARKER_KEY = "eliteDentalConfirmedFormPending";
  var FORM_MARKER_MAX_AGE_MS = 30 * 60 * 1000;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var hasGtagLoader = Boolean(document.querySelector('script[src*="googletagmanager.com/gtag/js"]'));
  var hasGa4Config = window.dataLayer.some(function (entry) {
    return entry && entry[0] === "config" && entry[1] === GA4_ID;
  });

  if (!hasGtagLoader) {
    var loader = document.createElement("script");
    loader.async = true;
    loader.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(loader);
    window.gtag("js", new Date());
  }

  if (!hasGa4Config) window.gtag("config", GA4_ID);
  window.gtag("config", ADS_ID);

  // Google Ads replaces these exact displayed numbers only for eligible ad sessions.
  // Separate calls preserve correct routing for both offices.
  window.gtag("config", WEBSITE_CALL_SEND_TO, {
    phone_conversion_number: "(865) 397-5422"
  });
  window.gtag("config", WEBSITE_CALL_SEND_TO, {
    phone_conversion_number: "(865) 475-8331"
  });

  function currentPath() {
    return window.location.pathname || "/";
  }

  function officeFromTelephone(href) {
    var digits = String(href || "").replace(/\D/g, "");
    if (digits.slice(-10) === "8653975422") return "Dandridge";
    if (digits.slice(-10) === "8654758331") return "Jefferson City";
    return "Unspecified";
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href^="tel:"]');
    if (!link) return;

    var office = officeFromTelephone(link.getAttribute("href"));
    window.gtag("event", "phone_call_click", {
      office_location: office,
      page_path: currentPath()
    });
    window.gtag("event", "conversion", {
      send_to: PHONE_CLICK_SEND_TO
    });
  });

  function storePendingForm(formIdentifier, officeLocation) {
    var marker = {
      form_identifier: formIdentifier || "appointment_request",
      office_location: officeLocation || "Unspecified",
      submitted_at: Date.now()
    };
    try {
      window.sessionStorage.setItem(FORM_MARKER_KEY, JSON.stringify(marker));
    } catch (_) {
      // Storage can be unavailable in hardened browsers. The form still submits normally.
    }
  }

  function consumePendingForm() {
    var raw;
    try {
      raw = window.sessionStorage.getItem(FORM_MARKER_KEY);
      window.sessionStorage.removeItem(FORM_MARKER_KEY);
    } catch (_) {
      return null;
    }
    if (!raw) return null;

    try {
      var marker = JSON.parse(raw);
      var age = Date.now() - Number(marker.submitted_at || 0);
      if (age < 0 || age > FORM_MARKER_MAX_AGE_MS) return null;
      return marker;
    } catch (_) {
      return null;
    }
  }

  window.EliteDentalTracking = {
    prepareFormSuccess: storePendingForm,
    consumePendingForm: consumePendingForm,
    recordConfirmedForm: function (marker) {
      if (!marker) return false;
      var context = {
        form_identifier: marker.form_identifier,
        office_location: marker.office_location,
        page_path: currentPath()
      };
      window.gtag("event", "generate_lead", context);
      window.gtag("event", "conversion", {
        send_to: FORM_SEND_TO
      });
      return true;
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-elite-form]").forEach(function (form) {
      form.addEventListener("submit", function () {
        var selectorId = form.getAttribute("data-location-select");
        var selector = selectorId ? document.getElementById(selectorId) : null;
        var office = selector && selector.value ? selector.value : "Unspecified";
        var nextInput = form.querySelector('input[name="_next"]');
        if (nextInput) nextInput.value = window.location.origin + "/thank-you";
        storePendingForm(form.getAttribute("data-elite-form"), office);
      });
    });
  });
})();
