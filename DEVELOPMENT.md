# ChillCheck development

Current implementation: React browser components and Supabase Auth/PostgreSQL, with no npm requirement. Start with `python3 scripts/start.py`; configuration and database steps are in [README.md](README.md).

The previous vanilla JavaScript implementation remains at `legacy.html`. Do not use its `Store`/Claude integration in new React code. `src/api.js` owns the new database boundary; `js/food.js` and `js/dates.js` remain shared pure rules.

## Verification

- `python3 -m unittest discover -s scripts -p 'test_*.py'`: configuration parsing, alias precedence, downloader caching, secret-key rejection and blocked file serving.
- `node --check src/app.js` and the other JS sources: syntax.
- `tests/browser.cjs`: sign-in, create fridge, add/edit, example review, filter, failed-write recovery, eaten/history, recipes, mobile layout and sign-out, using a test double. Provide Playwright through the developer environment; no app dependency install is necessary.
- `supabase/tests/access.sql` and `supabase/tests/inventory.sql`: access control and atomic operations. Use disposable databases only. See `supabase/README.md`.
- `node build.js` and `node build.js --configured`: preview and configured local bundle.

Hosted verification still requires an actual user to sign up/confirm/sign in and exercise saved data. Do not create test accounts or send confirmation emails without authorization. Read-only anonymous table checks demonstrate the exposed schema and denied anonymous access, not full authenticated end-to-end behavior.

## Next phase

Add private photo storage and server-side AI functions for recognition and recipe generation. Keep provider keys on the server. Add shared fridge membership in a separate migration if required. Preserve manual date overrides and review uncertain/reused containers before accepting detections.


## Dashboard integration (October 25)

`src/dashboard.js` owns the dashboard, camera/photo controls, authenticated phone inbox and simulated sensor/mascot components. `src/ai.js` adapts the old Scanner contract to `chill-ai`; do not call `Scanner.init()` in the React app, since that initializer belongs to the legacy embedded runtime. Keep UUID container matches intact.

Run migrations through 004. Demo view state lives in memory and resets on reload; saved inventory is selected with View saved fridge. The phone inbox only exposes records to the owning account. Original image blobs are used in local review and sent to the AI function, but not stored as public photos. The catalog bucket is only for shared illustrations.

Run `tests/dashboard.cjs` and `tests/browser.cjs` with Playwright/Chrome, `tests/edge.cjs` with Node 24, and `supabase/tests/scan_integration.sql` against a disposable database after migrations. The edge and browser tests mock network services; they do not prove live deployment or real phone connectivity. The AI deployment handoff is in `docs/AI_SETUP_PROMPT.md`.

## Legacy app with AI (local)

`legacy.html` also has the chef button and an AI connection (`js/ai.js`) through a small local Node server that keeps the Claude key off the browser: put `ANTHROPIC_API_KEY=sk-ant-...` in `.env`, run `npm install` once, then `npm start` (in PowerShell: `npm.cmd start`) and open http://localhost:3000/legacy.html. The React app at http://localhost:3000 uses it too instead of the `chill-ai` Supabase function, so AI requests there use the key in `.env`, not the Supabase secrets. `ANTHROPIC_MODEL` sets the model (default `claude-haiku-5-5`). The server listens on this computer only; set `HOST=0.0.0.0` for the phone QR on trusted Wi-Fi, where anyone on that network can then use the key.
