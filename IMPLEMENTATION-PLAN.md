# paBudget — Implementation Plan

Derived from `Budget Place Finder — URD & Development Plan.md` and `development-plan.md`.
Nothing here is committed; this is the working plan for building the MVP (~15 weeks).

## 1. Repository layout

Single git repo (this one), three independent projects:

| Folder | Stack | Serves |
| --- | --- | --- |
| `paBudget-backend/` | Node.js + TypeScript, NestJS, Prisma, PostgreSQL 16 (PostGIS, pg_trgm), BullMQ + Redis, Zod, Gemini, R2 (S3 SDK) | REST API for everything |
| `paBudget-web/` | Next.js + TypeScript, TanStack Query, Tailwind. Routes: public, `/owner`, `/admin` (role-guarded) | Public site, owner dashboard, admin panel |
| `paBudget-mobile/` | Flutter 3, Riverpod, Dio, Isar/Hive, cached_network_image | Android app (iOS later) |

Shared contract: backend publishes an OpenAPI spec (`/openapi.json`); web generates a TS client and mobile generates a Dart client from it. Design tokens live in one JSON file copied into web (Tailwind) and mobile (ThemeData).

## 2. Build order and why

Backend first (everything depends on it), then admin panel (needed to moderate/seed — Gate 1), then public web + mobile in parallel against the stable API, then AI planner, then owner features and launch.

## 3. Phases

### Phase 1 — Setup (weeks 1–2)
- Backend: scaffold NestJS, config module, Prisma schema for all 24 tables (prices in ngwee ints, PostGIS geography columns, trigram indexes via raw SQL migrations), seed areas/categories/tags. Local Postgres (no docker available — use system `psql`/local install; add `docker-compose.yml` for others).
- CI: GitHub Actions per project (lint, test, build).
- R2 bucket, CORS, presign service stub.
- Web/mobile: scaffold, design tokens, API client generation pipeline.
- Non-code (user): Figma wireframes, terms, pick launch area, collect seed places.

### Phase 2 — Backend core, submissions, moderation (weeks 3–6)
1. Auth: email+password (argon2), phone OTP (Africa's Talking adapter + dev console adapter), JWT 15 min + refresh rotation, roles guard, device/IP throttling. FR-01, FR-03, FR-05.
2. Catalogue API: places, hours, tags, menus, search (pg_trgm + dish search), filters (budget/pp, group total, area, category, tags, open-now), sorts, PostGIS near-me, favourites, reviews. FR-10–FR-24, FR-40–42.
3. Uploads: presigned PUT, type/size checks (8 MB, JPEG/PNG/WebP), BullMQ worker with `sharp` → 400/800 WebP, EXIF strip. NFR-01, NFR-08.
4. Submissions engine: single `submissions` table, per-type payload Zod schemas (new_place, menu, photos, review, edit, flag), apply-on-approve handlers writing real tables in a transaction, status machine, rate limits (20/day, 5 places/day). FR-70–78, NFR-15.
5. AI module (Gemini wrapper with JSON schema mode, token logging): menu-photo extraction; screening pipeline (photo labels, text check, price plausibility, duplicate via trgm+150 m) → `ai_score` + reasons; auto-reject unsafe. FR-72, FR-90, FR-91.
6. Trust & moderation: contributor_stats, auto-publish rules + threshold, promotion/demotion, 1-in-10 spot check, moderation_log audit. FR-92, FR-93, FR-97, FR-67.
7. Admin API: queue (sorted by score, batch ops), edit-then-approve, place editor, merge duplicates, areas/categories/tags, claims approval. FR-60–64.
8. Web admin panel (mobile-friendly queue, batch approve, place editor, merge, audit log).
- **Gate 1:** 15–20 seed places entered; 20 end-to-end test submissions pass; integration tests cover each submission type.

### Phase 3 — Mobile and web apps (weeks 7–10)
- Web (Next.js, SSR place pages, SEO/OG, sitemap): home, search, place detail, menu, reviews, favourites, auth, contribute flows, my contributions.
- Mobile: same screens; image compression before upload; Isar cache for viewed places/menus/favourites; offline submission drafts queue (FR-79); call/WhatsApp/Maps intents; APK < 25 MB, minSdk 26.
- Contribute flows share one pattern: draft → AI-extract (menu) → confirm → submit → status in "My contributions".
- Analytics events → `place_events` (batched on mobile).
- Budgets: list payload < 150 KB, Lighthouse 85+.

### Phase 4 — AI planner (weeks 11–12)
- Pipeline per URD §7: parse (Gemini JSON) → SQL candidates → bundle builder in code (reviews-adjusted, 90-day window) → rank (Gemini) → validate ids and recompute totals → reply → refine → log.
- Fallbacks (widen area → relax tags → over-budget nearest; Gemini down → top 3 template). Daily limit 10/user, response cache, `ai_requests` logging. FR-30–33, FR-36, NFR-09/11.
- Chat UI on web + mobile; save/share plan (token link, WhatsApp). 
- **Gate 2:** harness of 100 prompts asserting every returned total == DB recomputation and no unknown place_id.

### Phase 5 — Owner, beta, launch (weeks 13–15)
- Owner claim flow, menu/photo editing, menu-scan, review replies, basic stats (web `/owner`). FR-50–54, 58, 56.
- Points, badges, area leaderboards. FR-80.
- Privacy policy/terms pages, account deletion + data export, takedown flow (72 h). NFR-07, NFR-16.
- Sentry on all three, uptime checks, daily pg backups (14 days). NFR-10, NFR-13.
- Closed beta (50 users), Play Store release, web on custom domain.

### After launch
Mobile-money payments, featured listings, deals, rewards, multi-stop plans, iOS, more cities, Bemba/Nyanja.

## 4. Key technical decisions

- **Money:** integer ngwee everywhere; format to `K` only in UI.
- **AI never does arithmetic or names places:** DB picks candidates, code builds totals, output validated.
- **Moderation is data-driven:** one submissions table; approve handler per type; adding a type = schema + handler.
- **Statelessness:** no in-process session state; Redis for queues/rate limits; so the API scales horizontally.
- **Testing:** Jest + Supertest against a real Postgres for the backend; Vitest/RTL + Playwright smoke for web; Flutter widget + integration tests for critical flows.
- **Secrets:** Gemini and R2 keys only on server, via env.

## 5. Risks to watch during build
- No Docker locally → rely on local Postgres/Redis; confirm PostGIS is installed.
- Gemini cost → log tokens from day one, use Flash model for screening/parsing.
- Offline drafts and image upload resumption on flaky networks → build the upload queue early in mobile.

## 6. Open items needing the user
Launch area, domain/branding, SMS gateway account, Cloudflare R2 + Gemini keys, Figma designs, hosting choice.

## 7. Proposed immediate next steps
1. Scaffold `paBudget-backend` (NestJS + Prisma) and write the full schema + seed.
2. Scaffold `paBudget-web` (Next.js) and `paBudget-mobile` (`flutter create`).
3. Implement auth, then catalogue API.
