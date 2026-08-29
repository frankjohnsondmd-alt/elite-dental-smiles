# Elite Dental Google Ads staging handoff

Prepared August 29, 2026 on branch `staging/google-ads-measurement-20260829`.

## Preflight

- Google Tag Manager is not present. No GTM container ID exists in the site source.
- The site uses direct `gtag.js` on a subset of pages. The staged shared layer reuses that loader when present and creates one loader only when absent.
- No production deployment or Google Ads account change was made.

## Staged changes

- Added one shared tracking layer to all public HTML pages.
- Added GA4 `G-R2EVNKP5X2` to pages that lacked it without duplicating existing configurations.
- Added Google Ads base configuration `AW-17413230320`.
- Added confirmed-success form conversion `AW-17413230320/RHn1CIDT7NccEPCdo-9A`.
- Added Secondary telephone-click conversion `AW-17413230320/Ah5MCIPT7NccEPCdo-9A` and GA4 `phone_call_click`.
- Added separate website-call replacement configuration for the displayed Dandridge and Jefferson City numbers using `AW-17413230320/P9ykCKOM5ukcEPCdo-9A`.
- Added a noindex thank-you page with a one-use, 30-minute session confirmation gate. Direct visits, refreshes, and failed submissions do not record a form conversion.
- Added GA4 `generate_lead` only after the controlled success return.
- Analytics context is restricted to page path, form identifier, and office location. No patient name, email, phone, procedure selection, free text, `user_data`, or `transaction_id` is sent.
- Corrected provider-specific insurance language for both locations.
- Corrected Monday–Thursday structured hours and removed Friday schema hours.
- Replaced the homepage single-office schema with an organization and two location records.
- Removed unsupported `aggregateRating` and the nonfunctional `SearchAction`.
- Added urgent-care and appointment pathways above the fold on both location pages without promising same-day availability.
- Reduced duplicated location copy with Dandridge- and Jefferson City-specific introductions.
- Softened unverified provider-location, sedation, implant, guaranteed-comfort, and scheduling claims.
- Corrected broken internal links, missing favicon references, a missing stylesheet reference, and three instances of an obsolete Jefferson City telephone number.
- Expanded Content Security Policy destinations required by Google Ads measurement.

## Automated evidence

- Static validation: 173 HTML files and 370 JSON-LD blocks passed.
- Internal link validation: passed for tracked public pages.
- Tracking unit tests: loader reuse, non-duplication, exact Ads labels, one-use form-success gate, failed/direct thank-you behavior, GA4 context, and telephone-click routing passed.
- JavaScript syntax check: passed.
- `vercel.json` parse: passed.
- Git whitespace/error check: passed.

## Unresolved / manual verification

- The veneers filename/label conflict is documented but images were not swapped. Ownership must confirm the true before and after images.
- Provider/location expansion for sedation and implants remains intentionally held until the provider matrix is confirmed.
- Google Tag Assistant and GA4 Realtime/DebugView evidence require testing the deployed preview.
- Forwarding-number replacement must be tested through an actual Google ad click on desktop and mobile for both office numbers. Each number must ring the correct office.
- Form delivery should be retested from the preview for both locations after stakeholder approval because the test sends external email.

## Landing URL finding

The URLs supplied in the Ads handoff with `.html` currently return a 308 redirect because Vercel uses clean URLs:

- `/dandridge-dentist.html` redirects to `/dandridge-dentist`
- `/jefferson-city-dentist.html` redirects to `/jefferson-city-dentist`

The canonical extensionless URLs return HTTP 200 directly and should be used as the eventual Ads final URLs:

- `https://www.elitedentalsmiles.com/dandridge-dentist`
- `https://www.elitedentalsmiles.com/jefferson-city-dentist`

This avoids changing the site's established clean-URL architecture solely to accommodate an incorrect final-URL format.
