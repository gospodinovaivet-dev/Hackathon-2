# Database migration — step 1 of the React/Supabase rewrite

Status: schema and transaction tests pass in isolated PostgreSQL 14. The user applied the initial migration; read-only hosted API checks now expose all six tables and both inventory functions while denying anonymous access. The React frontend is implemented. Full hosted signed-in persistence still needs a user-account smoke test. No changes have been committed for these migration steps.

## Tables

| Table | Purpose |
| --- | --- |
| `profiles` | User-facing name, linked to `auth.users`; passwords remain in Supabase Auth. |
| `fridges` | Fridge name, owner and last scan timestamp. |
| `food_items` | Confirmed inventory, dates and sources, shelf, category, confidence, container and notes. |
| `scans` | Scan source, processing status and optional private image path. |
| `scan_items` | Proposed detections awaiting review, separate from confirmed inventory. |
| `food_events` | Eaten/discarded history with a name snapshot, retained when an individual item is deleted. |

This first migration implements owner-only access. Shared household membership and retailer roles require a later migration. The demo device code is not an authentication credential. Physical device pairing is not part of this schema.

Expiry status is computed from `expires_on`, not stored as a stale safe/soon flag. Unknown dates are nullable. `cooked_on` records a confirmed cooking date when known, separately from `first_seen_on`. Reused ice cream tubs are recorded in `container_description`; the app must not use their printed dates for cooked contents.

`scan_items.proposed_data` stores draft scan fields only. Review and validation are required before creating confirmed food records. The composite foreign key ensures a scan item belongs to the same fridge as its parent scan.

## Apply to the hosted project (no npm required)

1. Open the intended Supabase project in the dashboard and select **SQL Editor**.
2. Run `inspect.sql`. If any of the six application tables already exist, stop and compare their columns/policies. Do not delete them or use a reset. Prepare an incremental migration based on that actual schema instead.
3. On a fresh project, run the complete contents of `migrations/202610240001_initial_schema.sql` once. It is transactional: a conflict with an existing table rolls back the entire migration. The file is also compatible with the Supabase CLI migration layout if the team adopts the CLI later.
4. Run `migrations/202610240002_inventory_operations.sql` once to add atomic scan saving and eaten/discarded actions.
5. Run `verify.sql`: expect six rows, `rls_enabled = true`, `policy_count = 4`, `anonymous_can_select = false`, and `authenticated_has_select_grant = true`.
6. Configure email authentication and the local app's redirect URL. Account creation/login is implemented in React. A publishable key alone cannot create SQL tables or sign in a user.

Do not paste database passwords into frontend configuration or chat. The public URL and publishable key can go into the ignored root `.env`. Administrative SQL runs through the dashboard or a trusted database connection, never through the browser SDK's publishable key.

## Verification

`tests/access.sql` uses temporary fixtures within a transaction and rolls them back. It verifies owner CRUD, cross-account read/write denial, forged-owner rejection, anonymous denial, category constraints, scan/fridge foreign keys and retained history. Run it in a disposable test project, not production. `tests/local_auth_stub.sql` is only for plain local PostgreSQL: it emulates Supabase's auth role and `auth.uid()` contract. Never run that stub on hosted Supabase.

Example for an empty disposable PostgreSQL database:

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/local_auth_stub.sql \
  -f supabase/migrations/202610240001_initial_schema.sql \
  -f supabase/migrations/202610240002_inventory_operations.sql \
  -f supabase/tests/access.sql \
  -f supabase/tests/inventory.sql
```

Use your normal local PostgreSQL connection configuration for this command. The tests do not verify hosted Auth email delivery, API schema exposure, storage buckets or frontend persistence. Those checks follow after applying the migration to the actual development project.

## Contract for the React phase

- Sign in with Supabase Auth, then create/load the user's `profiles` row.
- Select an owned fridge; use its UUID on every inventory query.
- Map existing `qty` → `quantity`, `expires` → `expires_on`, `dateSource` → `date_source`, `firstSeen` → `first_seen_on`, and `container` → `container_description`.
- Use database-generated UUIDs rather than the prototype's short random IDs.
- Use `null` for an unknown shelf/date instead of an empty date string.
- Await writes and show errors; do not report success after a failed database operation.
- Save approved scan results using the `save_food_review` RPC; do not silently overwrite manually confirmed dates.
- Use `finish_food_item` to record eaten/discarded history and remove inventory atomically.
- Import local demo data only through an explicit user action after login; never silently upload browser storage.
- Preserve Strawberry Matcha styling, product photos, recipe photos, shelf filters and Balkan leftovers examples during the React migration.

Private photo buckets and server-side AI functions are subsequent work. Creating these tables does not enable photo recognition or remove the existing Claude calls.


### Database-backed mock items and photos

1. After migrations 001 and 002, run `supabase/migrations/202610240003_mock_catalog.sql` in Supabase SQL Editor. It seeds two example scans (including soup and rice-stuffed peppers in an ice cream tub), three recipes, and 15 photo records. It also adds photo references to inventory and history and backfills matching existing items.
2. From the repository folder run `python3 scripts/upload_mock_photos.py`. At its hidden prompt enter the project's secret/service-role key. The script uses it only in memory to upload the checked-in images; never put this admin key in frontend code or a `NEXT_PUBLIC_` setting. Rerunning uploads replaces the same demo files safely. Alternatively create a public `mock-photos` bucket in Supabase Storage and upload all 15 JPGs from `assets/products/` at the bucket root.
3. Restart `python3 scripts/start.py --port 8081`, sign in and select a fridge. Click **Try example scan**, review the dates and contents, then **Confirm and save**. This writes actual `food_items` rows with `photo_key` references for that fridge. Repeating a scan matches existing items instead of intentionally seeding duplicates. No demo inventory is silently added to other accounts.
4. Refresh and check that your items and photo references remain. Recipes and example scan templates now load from database tables; image bytes are served from Supabase Storage. The local pictures remain available for the signed-out welcome screen.

Catalog tables are read-only for signed-in users; only an administrator can seed/change them. The public bucket contains shared illustrations only, never private fridge photos. Inventory retains the existing owner-only policies. Migration 003 must be applied before using this version of the app. The Python uploader requires no npm or pip dependencies.
