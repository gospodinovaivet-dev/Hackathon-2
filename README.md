# ChillCheck

ChillCheck helps households remember what is in the fridge and use food before it goes to waste. An **Eat Me First** list highlights urgent items, shelf/category filters make them easy to find, and recipe ideas help use what is already there.

The app is being migrated from a vanilla JavaScript hackathon prototype to **React + Supabase**. The Strawberry Matcha palette, realistic product/recipe photos and Balkan leftovers examples are preserved—including rice-stuffed peppers in a reused ice cream tub.

## Current features

- Real Supabase email/password sign-up, sign-in and sign-out.
- Fridge creation and owner-scoped inventory stored in PostgreSQL.
- Add/edit food, quantities, expiry dates, shelf, category, cooking date and container notes.
- Eat Me First groups, food-type filters and shelf navigation.
- Example scan review with editable names/dates and explicit keep/remove choices for missing items.
- Atomic scan saving and eaten/discarded actions, with food history.
- Example recipes with photos and example food information.
- Responsive React UI, error messages and loading states.

The React app does not use the Claude artifact link. Live AI photo recognition, generated recipes, photo storage and real hardware integration are still future steps. Recipes and scan detections are clearly labelled examples. Generated food photos are illustrative, not camera evidence. The original prototype remains available at `legacy.html` for reference.

## Technology choices

| Technology | What and why |
| --- | --- |
| React 18.3.1 + React DOM | Component-based UI with state-driven rendering. Pinned browser builds run without npm or JSX compilation. |
| JavaScript + `React.createElement` | Keeps startup compatible with environments where npm installation is disabled. No build step is required to develop locally. |
| CSS Grid/Flexbox and custom properties | Responsive layouts and a shared Strawberry Matcha theme. |
| Supabase Auth | Accounts, password authentication and persistent sessions. |
| Supabase PostgreSQL + Row Level Security | Persistent inventory and owner-based access enforced in the database. |
| PostgreSQL functions | Save scan reviews and record eaten/discarded actions atomically. |
| Supabase JavaScript SDK | Browser API client; the only frontend credential is a publishable key. |
| Python 3 standard library | Downloads browser libraries and serves the app locally without npm or pip dependencies. |
| Node.js (optional) | Generates a self-contained HTML bundle using built-in modules only. |
| Git / GitHub | Source control. |

Food records are no longer stored in browser localStorage in the React app. Supabase Auth may persist its session there. Old prototype data is not automatically imported or uploaded.

## Prerequisites

- Python **3.9+** and a modern browser.
- A Supabase project with email authentication enabled.
- Internet access for initial library downloads and hosted database operations.
- Git, or a downloaded ZIP of the repository.
- Optional Node.js to generate the shareable bundle.

You do not need npm, pip packages, Docker or a locally installed database to run the app. `requirements.txt` documents the standard-library-only Python setup; `dependencies.json` pins browser libraries. Optional fonts load from Google Fonts, with system-font fallbacks.

## 1. Get the app

```sh
git clone https://github.com/gospodinovaivet-dev/Hackathon-2.git
cd Hackathon-2
```

If already cloned, open a terminal in the folder containing `index.html` and `scripts/`.

## 2. Set up the database

In your Supabase project's SQL Editor:

1. Run `supabase/inspect.sql` first. If the application tables already exist, inspect them before applying the initial migration; do not delete existing data.
2. For a fresh project, run `supabase/migrations/202610240001_initial_schema.sql` once.
3. Run `supabase/migrations/202610240002_inventory_operations.sql` once. This adds atomic inventory functions.
4. Run `supabase/verify.sql` to inspect table grants and policies.

The schema contains `profiles`, `fridges`, `food_items`, `scans`, `scan_items` and `food_events`. This version uses owner-only access; shared household membership is not implemented yet. See [database setup and tests](supabase/README.md).

Enable email/password authentication. Add your local app URL to Auth redirect URLs. For the default port, use:

```text
http://127.0.0.1:8080/index.local.html
```

If you use port 8081, add that exact URL too. Keep email confirmation enabled and use an address you can access when creating an account. Configure production email delivery and deployed URLs before releasing to other users.

## 3. Configure `.env`

Copy `.env.example` to `.env` if it does not exist. Set:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

The existing names `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are also supported; this does not mean the app uses Next.js. Conflicting aliases are rejected. Process environment variables take precedence over `.env`, then the legacy `supabase.config.local.json` fallback.

Only these two public values enter the generated browser page. Never put a database password, secret/service-role key or AI API key in browser configuration. `.env` is ignored by Git. Empty configuration shows a setup message; real sign-in needs a configured project.

## 4. Start with one command

macOS / Linux:

```sh
python3 scripts/start.py
```

Windows:

```powershell
py -3 scripts/start.py
```

The script downloads/caches pinned browser libraries in `vendor/`, generates `index.local.html`, starts a local server and opens the app. The default URL is [http://127.0.0.1:8080/](http://127.0.0.1:8080/). The startup server maps `/` to the configured React page.

Useful alternatives:

```sh
python3 scripts/start.py --port 8081
python3 scripts/start.py --no-browser
python3 scripts/setup.py
python3 scripts/setup.py --refresh
```

Keep the terminal open; **Ctrl+C** stops the server. Restart after HTML or `.env` changes. Changes to JS/CSS can be viewed with a page refresh.

Use this startup server instead of a plain `python -m http.server`: it blocks dotfiles, local configuration and directory listings. A plain static server does not apply these protections.

## 5. Try it

1. Create an account, confirm your email, then sign in.
2. Name and create your fridge.
3. Add a food item. Refresh and verify it is still there.
4. Select **Try example scan**, review the detections and save. The ice cream tub example asks you to confirm what is inside.
5. Try **My fridge** filters, edit a date, or mark food as eaten/discarded.
6. Open **History**, **Recipes** or **Food & you**.
7. Sign in with the same account in another browser to load the saved fridge. Another account must not see it.

The account form is real authentication, not the old demo pairing form. Do not use the old demo device code as a password. Data reloads on sign-in, fridge selection and writes; live cross-tab subscriptions are not implemented yet.

## Optional shareable build

After running setup:

```sh
node build.js
```

This writes `dist/chillcheck.html`, including React, CSS, app code and food images. It is an unconfigured preview with sign-in disabled.

To export your local public Supabase configuration as well:

```sh
node build.js --configured
```

This writes the gitignored `dist/chillcheck.local.html`. It contains the project URL and publishable key, never server secrets. The configured bundle loads the pinned Supabase SDK from its CDN because that library requires a script URL; the normal local app uses the downloaded SDK. Add the exact hosted bundle URL to Auth redirects before using signup there. Internet is still needed for Supabase; a single HTML file is not an offline database.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | React entry-point template. |
| `index.local.html` | Generated, ignored entry point with public Supabase configuration. |
| `src/app.js` | React screens and interaction state. |
| `src/api.js` | Supabase queries, field mappings and RPC calls. |
| `src/data.js`, `src/nutrition-data.js` | Product-photo mapping, example recipes and food information. |
| `js/food.js`, `js/dates.js` | Shared food/expiry rules, scan examples and date helpers. |
| `css/styles.css`, `css/react.css` | Shared design system and React layouts. |
| `assets/products/` | Product/recipe photos and generation prompts. |
| `supabase/migrations/` | Versioned database schema and functions. |
| `supabase/tests/` | Database access/transaction tests. |
| `scripts/` | npm-free setup/server and configuration tests. |
| `tests/` | Browser workflow test and isolated backend double. |
| `legacy.html`, other `js/` files | Original prototype, retained for reference. |

## Checks

Configuration/server checks require only Python:

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Database tests run against a disposable PostgreSQL/Supabase environment; see `supabase/README.md`. Browser checks use Playwright if available in your development environment; it is not an app runtime dependency. Set `PLAYWRIGHT_MODULE` to its module path and optionally `CHROME_PATH` and `APP_URL`, then run `node tests/browser.cjs` with a supported Node version. These checks use a local backend test double and do not create real users or modify hosted data.

## Troubleshooting

- **Port busy:** use `--port 8081` and register its Auth redirect URL.
- **DNS/download failure:** allow HTTPS access to `cdn.jsdelivr.net` and `cdnjs.cloudflare.com`, then rerun setup. Downloads are cached once successful.
- **Sign-in disabled:** verify `.env`, rerun setup and open the startup server's configured page.
- **Email confirmation:** open the confirmation email before signing in. Check Supabase's email delivery configuration if no email arrives.
- **Missing function error when saving a scan or finishing food:** apply migration `202610240002_inventory_operations.sql`.
- **Permission errors:** verify the signed-in account and table policies; do not disable Row Level Security to work around them.
- **Expected automatic camera recognition:** not implemented in the React version yet. The next phase adds private uploads and a server-side AI function.


### Database-backed mock items and photos

1. After migrations 001 and 002, run `supabase/migrations/202610240003_mock_catalog.sql` in Supabase SQL Editor. It seeds two example scans (including soup and rice-stuffed peppers in an ice cream tub), three recipes, and 15 photo records. It also adds photo references to inventory and history and backfills matching existing items.
2. From the repository folder run `python3 scripts/upload_mock_photos.py`. At its hidden prompt enter the project's secret/service-role key. The script uses it only in memory to upload the checked-in images; never put this admin key in frontend code or a `NEXT_PUBLIC_` setting. Rerunning uploads replaces the same demo files safely. Alternatively create a public `mock-photos` bucket in Supabase Storage and upload all 15 JPGs from `assets/products/` at the bucket root.
3. Restart `python3 scripts/start.py --port 8081`, sign in and select a fridge. Click **Try example scan**, review the dates and contents, then **Confirm and save**. This writes actual `food_items` rows with `photo_key` references for that fridge. Repeating a scan matches existing items instead of intentionally seeding duplicates. No demo inventory is silently added to other accounts.
4. Refresh and check that your items and photo references remain. Recipes and example scan templates now load from database tables; image bytes are served from Supabase Storage. The local pictures remain available for the signed-out welcome screen.

Catalog tables are read-only for signed-in users; only an administrator can seed/change them. The public bucket contains shared illustrations only, never private fridge photos. Inventory retains the existing owner-only policies. Migration 003 must be applied before using this version of the app. The Python uploader requires no npm or pip dependencies.
