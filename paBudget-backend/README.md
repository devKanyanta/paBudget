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
