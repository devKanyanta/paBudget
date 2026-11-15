# paBudget-backend

Node.js + TypeScript + Express + Prisma + PostgreSQL API for paBudget.

## Run
```bash
cp .env.example .env        # set DATABASE_URL (Postgres 14+ with pg_trgm)
npm install
npx prisma migrate deploy
npm run seed                # areas, categories, tags, badges, first admin
npm run dev                 # http://localhost:4000
npm test                    # needs a pabudget_test database (TEST_DATABASE_URL)
```

## Notes
- Prices are integer ngwee. Public data only shows `LIVE` places; all user content goes through `/submissions/*` (screened, then queued, or auto-published for trusted contributors).
- Storage: Cloudflare R2 when `R2_*` is set, else local disk (`./uploads`) with the same presign flow.
- AI: Gemini is called server-side only; with no key, screening skips photo checks and menu extraction returns 503.
- Distance queries use lat/lng + haversine (no PostGIS requirement).
- Image processing runs inline after `POST /uploads/:id/complete` (no Redis needed at this scale).

## AI planner (`/planner`, `/plans`)
`POST /planner/chat {message, filters?}` runs: parse (Gemini JSON, regex fallback) → SQL candidates (widen area → relax tags → closest over budget) → bundles built in code from real menu items (reviews from the last 90 days de-prioritise places whose real bills exceed the budget) → Gemini ranks → every id and total is re-validated against the database. If Gemini is down or returns garbage, the top 3 matches are returned with template reasons. Limit: `PLANNER_PER_DAY` (default 10) per user. `test/planner.test.ts` is the Gate 2 harness: 100 prompts against a deliberately hallucinating fake Gemini.
Saved plans: `POST /plans` (totals recomputed server-side), `GET /plans`, `DELETE /plans/:id`, public `GET /plans/shared/:token`.

## Owners (`/owner/*`)
A user becomes an owner when an admin approves their `claim` submission. Owners edit details/hours/tags, replace the menu, manage and reorder photos, reply to reviews, post deals and read stats (`/owner/places/:id/{menu,photos,reviews,deals,stats}`). Owner edits apply immediately (text is still screened).

## Community and privacy
`GET /leaderboard?area=&period=`, `GET /me/badges`, `GET /me/export` (all personal data as JSON), `DELETE /me` (anonymises the account, deletes plans/favourites, detaches planner prompts), `POST /takedowns` (public, 72 h deadline) with `GET /admin/takedowns` and `POST /admin/takedowns/:id/resolve`.

## Operations
- `GET /health` checks the database (use it for uptime monitors; returns 503 when down).
- `SENTRY_DSN` enables error reporting; nothing is sent when unset.
- `scripts/backup.sh` writes a gzipped `pg_dump` and prunes backups older than 14 days (cron example inside).
