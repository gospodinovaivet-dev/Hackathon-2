# Prompt: configure ChillCheck's live AI integration

Copy the text below into the AI coding assistant that has access to this repository and your Supabase project. Supply credentials through the Supabase dashboard or a secure secret-entry mechanism, never in the conversation.

---

Finish deployment of the existing ChillCheck AI integration. The repository already contains a React frontend, a Supabase Auth/Postgres backend, and an Edge Function replacing the original Claude embedded API. Do not replace the app, remove the demo, or reintroduce `window.claude` dependencies. Do not commit or push until I approve the finished changes.

First inspect these files:

- `supabase/functions/chill-ai/index.ts`
- `supabase/config.toml`
- `supabase/migrations/202610250004_scan_integration.sql`
- `src/ai.js`, `src/api.js`, `src/dashboard.js`, `src/app.js`
- `js/scanner.js` (reused scanning, receipt/date validation and bounding-box logic)
- `README.md`, `supabase/README.md`

The user cannot use `npm install`. Keep the standard-library Python startup scripts and browser dependencies. Prefer the Supabase Dashboard editor, an already installed Supabase CLI, or a supported connected Supabase tool for deployment. Check which tools are available before asking me to do manual work.

1. Identify the correct project from the existing `.env` URL without displaying any key values. Inspect its current migration state. Apply only missing migrations in order, ending with migration 004. Do not reset the database or remove user data. Migration 004 adds owner-only phone scan handoff, a 30-per-hour authenticated-user AI quota, and a source parameter for atomic scan saving.
2. Ask me to securely set `ANTHROPIC_API_KEY` in Supabase Edge Function secrets if absent. An Anthropic API account with billing/credits is needed; a Claude chat subscription is not the integration credential. Never put the key in frontend code, `NEXT_PUBLIC_*`, public files, QR URLs, commits, logs or chat. Do not invent a key or send it anywhere except the provider API.
3. Verify a currently available vision-capable Anthropic Messages API model using official documentation and project access. Set `ANTHROPIC_MODEL` to that exact model ID in Edge Function secrets. Verify the function's API version and request headers against current official docs. Change them only if required.
4. Deploy the existing function under the exact name `chill-ai`. Its configuration sets `verify_jwt=false` because the handler explicitly validates the bearer token through Supabase Auth before using the provider key. Preserve that authentication check; an anonymous or invalid-token request must never reach Anthropic. Preserve database-backed quota, request size validation, timeouts and generic error handling. Do not expose a service-role key to the browser.
5. Confirm that CORS preflight works from the app's origin and `supabase.functions.invoke('chill-ai')` carries the signed-in user's token. Diagnose auth failures instead of bypassing token validation. Restrict allowed origins if appropriate for the final deployment without breaking local development.
6. Use a test account and explicit test photos to verify: fridge/food scan; receipt scan with purchase-date handling; package date/barcode reading; unknown container and ice-cream-tub-with-peppers edge cases; optional bounding-box refinement; recipe generation with selected ingredient, preferences and shopping mode; general food information. Never treat an unreadable date as known or claim that a photo proves food safety. Keep all detections in review until the user confirms.
7. Confirm that reviewed results are saved to Supabase and available in “View saved fridge.” Default demo inventory must return after a page refresh without deleting saved inventory. Keep simulated temperature/door logs labeled as simulated.
8. Test phone scanning using an accessible HTTPS deployment URL. Desktop QR contains only the app URL, fridge ID and phone-mode flag, never credentials. Sign in to the same account on both devices. Send from the phone, receive in the desktop review, confirm once and verify the phone record becomes reviewed. Another account must not see or write this fridge's phone scans. On HTTP LAN URLs the file/photo picker is supported; live camera preview generally requires HTTPS. Do not claim a physical-device test if you only simulated one.
9. Fix image hosting if still missing: create a public `mock-photos` bucket for the 15 shared illustrations only and upload the JPGs in `assets/products` at its root, using `scripts/upload_mock_photos.py` or dashboard uploads. Verify real public object URLs. Keep local fallback images. Do not put private camera photos in this public bucket.
10. Run existing setup, SQL, browser and Edge Function tests; document which tests used stubs versus real services. Test missing secrets, expired sessions, provider failures, quota exhaustion, and invalid JSON. Do not silently replace failed live scans with mock results.

Report the deployed function/project, applied migrations, model ID (not keys), actual test results and any remaining manual steps. Make no unsupported claim that live AI, phone camera or hardware works. Ask before committing/pushing.
