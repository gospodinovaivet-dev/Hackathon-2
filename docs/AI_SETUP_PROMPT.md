# Claude integration handoff for ChillCheck

Copy the prompt below into an AI coding assistant with repository and Supabase access. Enter credentials only through a secure secret-entry mechanism, never in chat. This handoff is based on the checked-in code; hosted deployment and live provider access have not been verified.

---

Finish and verify ChillCheck’s Anthropic Claude integration in this existing repository. Implement and deploy the missing pieces, preserving the current design and working features. Inspect the code and hosted state first: do not rebuild functionality that already exists or claim that mocked tests prove live integration.

## Existing implementation

Read `src/ai.js`, `supabase/functions/chill-ai/index.ts`, `supabase/config.toml`, `js/scanner.js`, `src/app.js`, `src/dashboard.js`, `src/api.js`, `src/shopping.js`, the migrations, README and tests before editing.

The frontend already calls `supabase.functions.invoke('chill-ai')` with `{prompt,image}`. The image is an optional resized JPEG encoded as base64. The Edge Function validates the user token through Supabase Auth, claims a database-backed quota, calls the Anthropic Messages API and returns parsed JSON. Its deployment, secrets and live operation still need verification.

Existing Claude call sites cover:
- Food/fridge-photo and receipt recognition.
- Package date/barcode reading and optional bounding-box refinement.
- Recipe suggestions with fridge ingredients, preferences, pantry staples and optional shopping.
- General food/nutrition information.

Recipes now has a stationary Chef Byte, message bubbles, request history and follow-up context. It passes recent messages and previous recipe details in the prompt. Replies currently use a fixed frontend sentence around recipe results, rather than a natural Claude-authored conversational reply. The floating helper elsewhere uses curated jokes/tips, not live AI.

The user cannot use npm install. Preserve the Python standard-library startup scripts, vendored browser dependencies and existing build flow. Use an installed CLI, connected tool or Supabase Dashboard where possible.

## Work to complete

1. **Inspect hosted configuration and migrations.** Identify the project from the ignored `.env` URL without printing keys. Compare actual schema and migration history; apply only missing compatible migrations in order through `202610250005_shopping_consumption.sql`. Migration 004 provides scan handoff and `claim_ai_request`; 005 supports consumption/shopping. Never reset or delete existing user data. Do not run the local auth stub on hosted Supabase.

2. **Configure and deploy Claude securely.** Check for `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in Edge Function secrets without revealing values. If missing, request secure entry by the owner. Verify the current vision-capable model ID, access, API headers and request format against official Anthropic documentation; do not assume a model ID from memory. Deploy the existing function as `chill-ai`. Keep provider credentials server-side. Preserve explicit Supabase token validation even though `verify_jwt=false` is configured. Anonymous/invalid sessions must not reach Anthropic. Preserve quota, limits, timeouts and safe errors. Verify CORS and signed-in browser invocation; do not bypass authentication to fix failures.

3. **Complete Chef Byte’s real conversation.** Extend the recipe response contract to include a Claude-authored `reply` plus `recipes`, rather than only a fixed introduction. Permit clarification or cooking follow-up replies without forcing three new recipes on every turn. Preserve existing recipe cards when a reply contains no replacements. Keep backwards compatibility with existing consumers. Validate the reply and recipe fields before rendering; render text safely. Retain bounded conversation context, previous recipes and ingredient/preferences/shopping constraints. Handle messages such as “something with spinach”, “make it dairy-free”, “for two people”, and “explain step two”. Keep Chef Byte stationary inside Recipes and hide the floating walking helper there. Do not enable unsolicited provider calls for the other helper’s rotating jokes.

4. **Verify all live scanning paths.** Test uploaded fridge/food photos, receipt scanning with purchase-date handling, package dates/barcodes and outline refinement. Unknown contents and unreadable dates must remain unknown. An ice cream tub containing peppers must be classified by confirmed contents, not its branding or printed expiry. Do not claim food safety from a photograph. Validate returned objects, categories, quantities, dates and bounding-box ranges; handle malformed, truncated and unexpected output. Keep review/confirmation before inventory writes and preserve manually confirmed values. The digital fridge map uses reviewed shelf locations; do not claim precise automatic localization where it is not established.

5. **Verify recipes and food information.** Exclude expired items, respect available quantities and selected ingredient/preferences, and enforce shopping-disabled behavior. Do not rely solely on prompt instructions for these checks. Nutrition must stay general and avoid invented precision or health judgments based on door openings. Treat food names, OCR text and user content as data, not instructions that override server rules. Show actionable errors without silently substituting demo results for failed live calls.

6. **Verify saved inventory and phone scanning.** Confirm scan review saves once to the selected owned fridge and persists after refresh. Use the fridge dropdown to switch between demo and saved inventory; there is no longer a “View saved fridge” button. Check phone QR/inbox using an accessible HTTPS URL and the same signed-in account. QR URLs contain no credentials. Verify cross-account denial and reviewed handoff status. Report physical-device tests separately from browser simulations. Never upload private camera photos to the public illustration bucket. Private original-photo retention is not implemented; do not introduce it merely to make scanning work.

7. **Test failures and regressions.** Extend `tests/edge.cjs` and browser tests for the conversation contract and follow-ups. Test missing secrets, expired sessions, quota exhaustion, provider errors/timeouts, invalid JSON and stale replies after leaving Recipes. Keep earlier recipes/messages usable after a failed request. Run relevant existing tests, `python3 scripts/setup.py`, `node build.js` and `node build.js --configured`; keep configured output/secrets ignored. Validate desktop and mobile layouts. Perform a small explicitly identified live smoke test with test images/account; report provider-backed results separately from mocks.

## Scope boundaries

Consumption rates, days of stock, shopping priorities, history statistics and shelf recommendations already have deterministic implementations. Keep their calculations grounded in recorded data; Claude must not invent consumption history or sensor readings. Shopping browser notifications currently run only while the app is open. Closed-app push needs a separate scheduler, subscriptions and delivery backend; an Anthropic key alone does not enable it. Physical fridge sensors also require separate hardware integration. Do not expand this task into those systems.

Keep the existing curated Chef Byte jokes, including “No judgement. I also need a snack before deciding on a snack.” Do not redesign the app or change the branding while completing this integration.

## Delivery

Produce a concise implementation/deployment report listing:
- What already existed, what you changed and what remains blocked.
- Project/function deployed, migration versions applied and exact model ID; never keys.
- Tests passed, explicitly marked mocked versus live, and any physical phone test.
- Exact remaining owner actions if secure credentials or deployment access are unavailable.

Complete all work possible with available access before requesting manual steps. Never pretend that secrets, migrations or deployment have been completed. Leave code changes reviewable and ask before committing or pushing in this new task.
