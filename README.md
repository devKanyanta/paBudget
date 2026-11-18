# paBudget

A community-built guide to eating and going out in Lusaka, Zambia, on a budget.

Most Zambian eateries don't publish menus or prices online, so people only find out what an outing costs when the bill arrives. paBudget lets anyone see what a place really costs before they go. It shows photos, a current priced menu and what other people actually paid. An AI planner turns a request like *"date for 2, K400, Saturday evening"* into costed suggestions.

All prices are in Zambian kwacha (K / ZMW). The target users are 18–35-year-olds in Lusaka, mostly on low-to-mid-range Android phones with limited data.

---

## Contents

- [Features](#features)
- [Repository layout](#repository-layout)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API overview](#api-overview)
- [Data model](#data-model)
- [How the key systems work](#how-the-key-systems-work)
- [Testing](#testing)
- [CI/CD and deployment](#cicd-and-deployment)
- [Operations](#operations)
- [Project docs](#project-docs)

---

## Features

**For everyone**
- Browse and search places with filters for budget (per person or group total), area, category, tags and open-now. Sort and near-me search are included.
- Priced menus, photo galleries, opening hours and reviews that include the amount paid.
- Favourites, and a leaderboard with badges for top contributors.
- **AI budget planner**: describe the outing, get up to three costed bundles built from real menu items. Plans can be saved and shared by link.

**For contributors** (any signed-in account)
- Add a place, upload photos, add or replace a menu, write a review, or suggest an edit or flag.
- Photograph a menu and let AI extract the items and prices, then confirm before submitting.
- Every submission is AI-screened and queued for admin approval. Trusted contributors can be auto-published.
- Offline drafts on mobile.

**For owners**
- Claim a listing (approved by an admin), then edit details, hours and tags, replace the menu, manage photos, reply to reviews, post deals and view stats.

**For admins**
- Moderation queue sorted by AI score with batch actions, an edit-then-approve flow, a place editor, duplicate merge, user and trust management, takedown handling and an audit log.

**Privacy**
- Personal data export (`GET /me/export`), account deletion that anonymises the account, and a public takedown flow with a 72-hour deadline.

---

## Repository layout

A single repo with three independent projects:

| Folder | Stack | Purpose |
| --- | --- | --- |
| [`paBudget-backend/`](paBudget-backend) | Node.js, TypeScript, Express 5, Prisma 6, PostgreSQL, Zod, Gemini, S3/R2 | REST API for everything |
| [`paBudget-web/`](paBudget-web) | Next.js 16 (App Router), React 19, TanStack Query, Tailwind 4 | Public site, `/owner` dashboard, `/admin` panel |
| [`paBudget-mobile/`](paBudget-mobile) | Flutter, Riverpod, Dio, go_router | Android app (iOS later) |
| [`deploy/`](deploy) | bash, nginx, PM2 | VPS bootstrap and deploy scripts |
| [`.github/workflows/`](.github/workflows) | GitHub Actions | CI for each project plus deploy |

```
paBudget/
├── paBudget-backend/
│   ├── prisma/          schema, migrations, seed + demo data
│   ├── src/
│   │   ├── routes/      auth, places, submissions, uploads, planner, owner, admin, community
│   │   ├── services/    ai, screening, submissions, planner, images, storage, badges, avgspend
│   │   └── middleware/  auth, rate limits, errors
│   ├── test/            vitest + supertest against a real Postgres
│   └── scripts/backup.sh
├── paBudget-web/src/
│   ├── app/             routes: places, planner, contribute, me, owner, admin, legal pages
│   └── components/
├── paBudget-mobile/lib/
│   ├── core/            api client, cache, offline drafts, formatting
│   ├── screens/         explore, place_detail, planner, contribute, me, auth
│   └── widgets/
├── deploy/              setup-server.sh, deploy.sh, nginx configs
└── ecosystem.config.cjs PM2 process definitions
```

---

## Architecture

```
 Flutter app ─┐                          ┌─ PostgreSQL (pg_trgm)
              ├──► Express API (:4000) ──┼─ Gemini (server-side only)
 Next.js web ─┘      JWT auth, Zod       └─ Cloudflare R2 or local disk
   (:3000/4001)
```

Design decisions that shape the code:

- **Money is integer ngwee** (K1 = 100 ngwee) everywhere. Values are formatted as `K` only in the UI.
- **AI never does arithmetic or invents places.** The database picks candidates, code builds the totals, and every id and total in AI output is re-validated against the database.
- **Moderation is data-driven.** There is one `submissions` table and one apply-on-approve handler per type. Adding a submission type means adding a schema and a handler.
- **Public data only shows `LIVE` places.** All user content goes through `/submissions/*`.
- **Secrets stay on the server.** The Gemini and R2 keys are never sent to clients.
- **No Redis or PostGIS needed at this scale.** Image processing runs inline after upload, and distance queries use lat/lng with haversine.

---

## Getting started

### Prerequisites

- Node.js 22+
- PostgreSQL 14+ with the `pg_trgm` extension
- Flutter (SDK `^3.13`) for the mobile app
- Optional: a Gemini API key and a Cloudflare R2 bucket. Without them the app still runs, with reduced AI features and images stored on local disk.

### 1. Backend

```bash
cd paBudget-backend
cp .env.example .env          # set DATABASE_URL and JWT_SECRET at minimum
npm install
npx prisma migrate deploy
npm run seed                  # areas, categories, tags, badges, first admin
npm run seed:demo             # optional: demo places and menus
npm run dev                   # http://localhost:4000
```

The seed creates the first admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Change both before deploying.

### 2. Web

```bash
cd paBudget-web
npm install
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev    # http://localhost:3000
```

> The web app uses a recent Next.js with breaking changes. See [`paBudget-web/AGENTS.md`](paBudget-web/AGENTS.md) and read the bundled docs in `node_modules/next/dist/docs/` before changing framework-level code.

### 3. Mobile

```bash
cd paBudget-mobile
flutter pub get
flutter run --dart-define=API_URL=http://<your-LAN-ip>:4000
```

Use your machine's LAN address rather than `localhost`, because the device or emulator can't reach your host's loopback. The default is set in `lib/core/api.dart`.

---

## Configuration

### Backend (`paBudget-backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | none | PostgreSQL connection string |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | `dev-secret` | **Change in production.** Signs access tokens |
| `PUBLIC_URL` | `http://localhost:4000` | Public base URL, used to build file URLs |
| `GEMINI_API_KEY` | empty | Enables AI screening, menu extraction and the planner |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE` | empty | Cloudflare R2 storage. If unset, images go to `./uploads` on local disk using the same presign flow |
| `UPLOAD_DIR` | `uploads` | Local storage directory |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | see `.env.example` | First admin created by `npm run seed` |
| `PLANNER_PER_DAY` | `10` | Planner requests per user per day |
| `SENTRY_DSN` | empty | Enables error reporting |
| `TEST_DATABASE_URL` | none | Database used by the test suite |

### Web

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL. Baked in at build time |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for metadata, sitemap and robots |

### Mobile

| Define | Description |
| --- | --- |
| `API_URL` | API base URL, passed with `--dart-define` |

---

## API overview

Base URL is `http://localhost:4000` in development. Authentication uses a 15-minute JWT access token with a rotating refresh token (30 days).

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` (checks the DB, returns 503 if down) |
| Auth | `/auth/*` (register, login, refresh, logout) |
| Catalogue | `/places` (search, filters, sorting, near-me), `/meta` (areas, categories, tags) |
| Account | `/me`, `/me/favourites`, `/me/badges`, `/me/export`, `DELETE /me` |
| Contributing | `/uploads` (presign, complete), `/submissions/*` |
| Planner | `POST /planner/chat`, `/plans` (save, list, delete), `GET /plans/shared/:token` |
| Owners | `/owner/places/:id/{menu,photos,reviews,deals,stats}` |
| Community | `GET /leaderboard?area=&period=` |
| Privacy | `POST /takedowns` (public) |
| Admin | `/admin/*` (queue, places, users, takedowns, moderation log) |

Errors are returned as `{ "error": "<code>", "message": "..." }`. Requests are validated with Zod and rate-limited, and users get at most 20 submissions and 5 new places per day.

---

## Data model

Defined in [`paBudget-backend/prisma/schema.prisma`](paBudget-backend/prisma/schema.prisma). The main entities are:

- **Catalogue:** `Place`, `PlaceHour`, `PlaceTag`, `Area`, `Category`, `Tag`, `MenuSection`, `MenuItem`, `Image`, `Review`, `Deal`, `FeaturedSlot`
- **Users:** `User`, `RefreshToken`, `Favourite`, `PlaceOwner`, `ContributorStats`, `Badge`, `UserBadge`
- **Planner:** `Plan`, `PlanStop`, `AiRequest`
- **Moderation:** `Submission`, `ModerationLog`, `Takedown`
- **Analytics:** `PlaceEvent`

Migrations live in `prisma/migrations/`, including trigram indexes for fuzzy and dish search.

---

## How the key systems work

### Submissions and moderation

Every contribution (new place, menu, photos, review, edit, flag, claim) becomes a row in `submissions`. The flow is:

1. **Screen:** AI checks photo labels, text safety and price plausibility, and looks for duplicates by trigram name match and distance. This produces an `ai_score` and reasons. Unsafe content is auto-rejected.
2. **Route:** trusted contributors with a score above the threshold (70) are auto-published, and about 10% of those are spot-checked. Everything else goes to the admin queue.
3. **Apply:** approving runs the type's handler, which writes the real tables in a transaction.
4. **Trust:** a contributor is promoted after 10 approvals with a rejection rate of 10% or less. They are demoted after 3 rejections in 30 days.

### AI planner

`POST /planner/chat` runs this pipeline:

1. **Parse** the request with Gemini JSON mode, falling back to a regex parser.
2. **Candidates** come from SQL: widen the area, then relax tags, then fall back to the closest places over budget.
3. **Bundles** are built in code from real menu items. Reviews from the last 90 days de-prioritise places whose real bills exceed the budget.
4. **Rank** with Gemini.
5. **Validate** every place id and total against the database.

If Gemini is down or returns garbage, the top 3 matches are returned with template reasons.

### Images and storage

Uploads use a presigned PUT flow (JPEG/PNG/WebP, 8 MB max). After `POST /uploads/:id/complete`, `sharp` strips EXIF data and produces 400 px and 800 px WebP variants. Storage is Cloudflare R2 when configured and local disk otherwise.

---

## Testing

```bash
# Backend (needs a pabudget_test database and TEST_DATABASE_URL)
cd paBudget-backend && npm test
npm run typecheck

# Web
cd paBudget-web && npm test && npm run lint && npm run typecheck

# Mobile
cd paBudget-mobile && flutter analyze && flutter test
```

`paBudget-backend/test/planner.test.ts` is the AI safety harness. It runs 100 prompts against a deliberately hallucinating fake Gemini and asserts that every returned total matches the database and that no unknown place id appears.

---

## CI/CD and deployment

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Runs |
| --- | --- |
| `backend.yml` | install, typecheck and tests for the API |
| `web.yml` | lint, typecheck, tests and build for the web app |
| `mobile.yml` | `flutter analyze` and `flutter test` |
| `deploy.yml` | on push to `main`, builds backend and web, rsyncs the release to the VPS, runs migrations and restarts PM2 |

**Production layout:** a single VPS runs nginx (TLS via certbot), with PM2 managing `pabudget-api` (port 4000) and `pabudget-web` (Next.js standalone on 4001). Builds happen in CI, so the server needs no git, installs or builds.

**First-time server setup:**

```bash
DOMAIN=pabudget.example.com API_DOMAIN=api.pabudget.example.com \
EMAIL=you@example.com bash deploy/setup-server.sh
# then create ~/pabudget/backend/.env on the server and push to main
```

**Repository secrets and variables for deploy:** secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, and variables `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`.

---

## Operations

- **Uptime:** point a monitor at `GET /health`.
- **Errors:** set `SENTRY_DSN` to enable reporting. Nothing is sent when it's unset.
- **Backups:** `paBudget-backend/scripts/backup.sh` writes a gzipped `pg_dump` and prunes backups older than 14 days. A cron example is inside the script.

---

## Project docs

- [`Budget Place Finder — URD & Development Plan.md`](<Budget Place Finder — URD & Development Plan.md>): requirements, roles, user stories
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md): phased build plan and key technical decisions
- [`development-plan.md`](development-plan.md): original development plan
- [`paBudget-backend/README.md`](paBudget-backend/README.md): backend-specific notes

> The implementation plan was written before some decisions changed. For example, the backend is Express rather than NestJS, there's no Redis or PostGIS, and SMS/OTP verification was removed. The code and this README are the source of truth.
