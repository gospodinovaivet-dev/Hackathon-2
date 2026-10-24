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
