# Budget Place Finder — URD & Development Plan

Nov 12, 2026 · @Mapalo

## 1. Overview

A Flutter mobile app and a React web app that help young people in Zambia find restaurants, cafes and outings within a set budget. The places, photos, menus and reviews come from the community: anyone with an account can add a place, upload photos and menus, and share what they paid. Nothing goes public until it passes AI screening and admin approval. An AI planner turns a request like "date for 2, K400, Saturday evening" into costed suggestions. The MVP launches in one Lusaka area with 15–20 seed places and is built in about 15 weeks.

**Problem.** Most Zambian eateries do not publish menus or prices online. People find out what an outing costs only when the bill arrives, which makes planning dates and hangouts on a tight budget stressful.

**Goals**

- Let a user see what a place really costs before going, with photos and a current priced menu.
- Let anyone contribute places, photos, menus and reviews, so the catalogue grows without one person collecting it all.
- Keep full admin control over what goes public, with AI screening and trust levels to keep moderation fast.
- Let a user ask an AI planner for places that fit a budget, area, group size and vibe, with an estimated bill.
- Give restaurants a simple way to claim their listing and keep menus up to date.
- Build a revenue base from featured listings and deals within 6 months of launch.

**In scope (v1).** Place browsing and search, menus with prices, photo galleries, filters, community contributions (add place, add menu, upload photos, review with amount paid, suggest an edit), AI screening of submissions, moderation queue, contributor trust levels and points, AI budget planner, favourites, restaurant claim and dashboard. Featured listings, deals and contributor rewards follow in months 4–6.

**Out of scope (v1).** Table bookings with deposits, in-app payments, delivery, user-to-user chat, cities beyond Lusaka. These are candidates for v2.

**Target users.** Youths aged 18–35 in Lusaka planning dates, friends' hangouts, birthdays and family outings, mostly on low-to-mid-range Android phones with limited data.

**Working name.** Budget Place Finder (placeholder until branding is chosen). Currency is Zambian kwacha (K / ZMW) throughout.

## 2. User roles

The system has five roles. Guests can browse; signing in unlocks contributing, the AI planner and favourites. Contributors earn trust as their submissions are approved.

| Role | Who | Main tasks | Platform |
| --- | --- | --- | --- |
| Guest | Anyone who opens the app or site | Browse places, view menus, photos and reviews, filter by budget | Flutter app, React web |
| Contributor | Any signed-in user with a verified phone number | Everything a guest can do, plus add places, upload photos and menus, write reviews with amount paid, suggest edits, flag content, use the AI planner, save favourites. All submissions go to the moderation queue | Flutter app, React web |
| Trusted contributor | A contributor with about 10 approved submissions and no recent rejections | Same as contributor, but reviews, photos and edits to existing places go live at once and are spot-checked; new places still need approval | Flutter app, React web |
| Place owner | Restaurant, cafe or venue manager | Claim a listing, edit menu and prices, upload photos, reply to reviews, post deals, see view stats, buy featured slots | React web dashboard |
| Admin | You and any staff | Approve or reject submissions, review AI screening flags, manage trust levels, approve owner claims, merge duplicates, manage areas and categories, view analytics | React web admin panel, mobile-friendly |

**Personas**

- **Chanda, 23, university student.** K300 to spend on a date, wants somewhere nice but not embarrassing on price. Uses the Android app on prepaid data, and adds the menu of a new cafe she found to earn points.
- **Mwila, 28, young professional.** Organising a birthday dinner for 8 friends. Needs a place with a group-friendly menu and a total cost estimate.
- **Mr Banda, cafe owner in Woodlands.** Wants more weekend customers and can update a menu from a laptop or phone browser.

## 3. Functional requirements

Priority: **M** = must have for MVP, **S** = should have soon after launch, **C** = could have later. "Both" means the Flutter app and the React web app.

### 3.1 Accounts and profile

| ID | Requirement | Priority | Platform |
| --- | --- | --- | --- |
| FR-01 | Sign up and log in with phone number + OTP (SMS) or email + password | M | Both |
| FR-02 | Sign in with Google | S | Both |
| FR-03 | Guest browsing without an account | M | Both |
| FR-04 | Profile: name, home area, default budget, preferred vibes | S | Both |
| FR-05 | Delete account and personal data on request | M | Both |

### 3.2 Places and menus

| ID | Requirement | Priority | Platform |
| --- | --- | --- | --- |
| FR-10 | List places by area with cover photo, name, category, price level (K, KK, KKK) and average spend per person | M | Both |
| FR-11 | Place detail page: photo gallery, description, opening hours, address, map pin, phone and WhatsApp buttons | M | Both |
| FR-12 | Priced menu grouped by section (starters, mains, drinks, desserts), each item with name, price in K and optional photo | M | Both |
| FR-13 | Show "menu last updated" date on every place | M | Both |
| FR-14 | Vibe and feature tags: quiet, outdoor, live music, family-friendly, parking, Wi-Fi, backup power | M | Both |
| FR-15 | Open in Google Maps for directions | M | Both |
| FR-16 | Free date ideas section: parks, picnic spots, events with no or low cost | S | Both |

### 3.3 Search and filters

| ID | Requirement | Priority | Platform |
| --- | --- | --- | --- |
| FR-20 | Search by place name, dish or area | M | Both |
| FR-21 | Filter by budget per person or total budget for a group size | M | Both |
| FR-22 | Filter by area, category, vibe tags and "open now" | M | Both |
| FR-23 | Sort by cheapest, nearest, rating, newest | M | Both |
| FR-24 | "Near me" using device location, with permission | S | Both |

### 3.4 AI budget planner

| ID | Requirement | Priority | Platform |
| --- | --- | --- | --- |
| FR-30 | Chat box where the user describes budget, group size, area, time and vibe in plain English (Bemba and Nyanja later) | M | Both |
| FR-31 | Return 2–3 suggested places drawn only from the database, each with a reason and an estimated bill built from real menu items | M | Both |
| FR-32 | Show the estimate as a line list (e.g. 2 mains + 2 drinks = K340) with a tap-through to the place | M | Both |
| FR-33 | Follow-up refinement in the same chat ("cheaper", "somewhere outdoor") | M | Both |
| FR-34 | Multi-stop plan: dinner then dessert or an activity, with a combined total | S | Both |
| FR-35 | Save a plan and share it as a link or WhatsApp message | S | Both |
| FR-36 | Daily AI request limit per user on the free tier (e.g. 10 per day) | M | Both |

### 3.5 Community and engagement

| ID | Requirement | Priority | Platform |
| --- | --- | --- | --- |
| FR-40 | Save places to favourites | M | Both |
| FR-41 | Show approved community reviews on each place, newest first, with rating, amount paid and photos | M | Both |
| FR-42 | Show "menu added by" and "photo by" credits with the contributor's display name | M | Both |
| FR-43 | Push notifications for deals at favourite places and for approved or rejected submissions | S | Flutter |

### 3.6 Place owner dashboard (React web)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-50 | Claim an existing listing, verified by admin (phone call or document) | M |
| FR-51 | Edit place details, hours, tags | M |
| FR-52 | Add, edit and remove menu sections and items with prices | M |
| FR-53 | Upload a photo of a printed menu; AI extracts items and prices into a draft the owner reviews and confirms | M |
| FR-54 | Upload and reorder gallery photos | M |
| FR-55 | Post deals with start and end dates (e.g. couple's dinner K299) | S |
| FR-56 | View stats: profile views, menu views, AI planner appearances, direction and call taps | S |
| FR-57 | Buy a featured slot and pay by MTN MoMo or Airtel Money | S |
| FR-58 | Reply publicly to reviews on their place | S |

### 3.7 Admin panel (React web)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-60 | Create and edit places directly, used for the 15–20 seed places before launch | M |
| FR-61 | Approve owner claims | M |
| FR-62 | Moderation queue for all submissions (places, menus, photos, reviews, edits, flags), sorted by AI score, with approve, reject with reason, and edit-then-approve | M |
| FR-63 | Manage areas, categories and vibe tags | M |
| FR-64 | Merge duplicate places and move their photos, menus and reviews to one listing | M |
| FR-65 | Usage dashboard: active users, submissions per day, approval rate, AI requests and cost, top places and contributors | S |
| FR-66 | Manage featured listings and their schedules | S |
| FR-67 | Set or remove a user's trust level; suspend or ban accounts | M |

### 3.8 Community contributions

Any signed-in contributor can submit content. Every submission is saved with status `pending` and is not public until approved (or auto-published for trusted contributors where allowed).

| ID | Requirement | Priority | Platform |
| --- | --- | --- | --- |
| FR-70 | Add a place: name, area, map pin (from GPS or dropped by hand), category, price level, at least 1 photo, optional hours and phone | M | Both |
| FR-71 | Duplicate check before saving: show nearby places with similar names and ask "Is it one of these?" | M | Both |
| FR-72 | Add or update a menu by photo; AI extracts sections, items and prices into an editable draft the contributor confirms | M | Both |
| FR-73 | Add or edit menu items by hand | M | Both |
| FR-74 | Upload photos to a place (food, interior, outside), up to 10 per submission | M | Both |
| FR-75 | Write a review: 1–5 stars, what they ordered, total amount paid and group size, vibe tags, text, optional photos; one review per user per place | M | Both |
| FR-76 | Suggest an edit to an existing place: hours, phone, location, "permanently closed", price change | M | Both |
| FR-77 | Flag a place, photo or review as wrong, fake or inappropriate | M | Both |
| FR-78 | "My contributions" screen showing each submission's status and any rejection reason | M | Both |
| FR-79 | Save a submission as a draft offline and send it when back on data | S | Flutter |
| FR-80 | Points for approved contributions, badges (e.g. Menu Hunter, Area Explorer), and a leaderboard per area | S | Both |
| FR-81 | Contributor rewards (airtime or partner deals) for top contributors | C | Both |

### 3.9 Moderation and trust

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-90 | AI screening of every submission before it reaches the queue: photo relevance (food or venue), unsafe or offensive content, spam, menu plausibility, duplicate likelihood; produces a score and reasons | M |
| FR-91 | Auto-reject submissions the AI marks as clearly unsafe, with the reason sent to the contributor | M |
| FR-92 | Trust levels: New (all content reviewed), Trusted (reviews, photos and edits to existing places auto-publish, 1 in 10 spot-checked), Banned | M |
| FR-93 | Automatic promotion to Trusted after 10 approved submissions with fewer than 10% rejected; automatic demotion after 3 rejections in 30 days | S |
| FR-94 | Mobile-friendly queue with swipe or one-tap approve and reject, and batch approve | M |
| FR-95 | Fake-review signals: reviews from new accounts on the same place in a short time, owner accounts reviewing their own place or rivals, repeated text | S |
| FR-96 | Blur faces in uploaded photos, or reject photos where people are the main subject | S |
| FR-97 | Audit log of who approved, rejected or edited what, and when | M |

## 4. Non-functional requirements

The hardest limits come from the users' phones and data plans, so data use and app size are treated as requirements, not nice-to-haves.

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Data use | Place list screen loads under 150 KB on first view; thumbnails served as WebP at 400 px wide, full images only on tap |
| NFR-02 | App size | Android APK under 25 MB; support Android 8.0 and above, 2 GB RAM devices |
| NFR-03 | Offline | Cache viewed places, menus and favourites so they open without data |
| NFR-04 | Speed | API responses under 500 ms at the 95th percentile for list and detail calls; AI planner reply under 8 seconds |
| NFR-05 | Web | React site is mobile-first, scores 85+ on Lighthouse performance on a mid-range phone, place pages are server-rendered or pre-rendered for Google search |
| NFR-06 | Security | HTTPS everywhere; passwords hashed with bcrypt or argon2; JWT access tokens (15 min) + refresh tokens; role-based access for user, owner, admin |
| NFR-07 | Privacy | Follow Zambia's Data Protection Act No. 3 of 2021: consent for location, clear privacy policy, data deletion on request |
| NFR-08 | Uploads | Images only (JPEG, PNG, WebP), max 8 MB, uploaded straight to R2 with presigned URLs, scanned for type and stripped of location metadata |
| NFR-09 | AI cost control | Per-user daily limits, response caching for repeated queries, AI usage logged per request with token counts |
| NFR-10 | Availability | 99.5% uptime target; daily PostgreSQL backups kept 14 days |
| NFR-11 | Accuracy | Every price shows its last-updated date; the AI never names a place or price not in the database |
| NFR-12 | Scalability | Stateless API behind a load balancer so it can scale to more cities without a rewrite |
| NFR-13 | Monitoring | Error tracking (Sentry) on app, web and API; uptime alerts |
| NFR-14 | Moderation | Nothing user-submitted is public before approval, except auto-published content from trusted contributors; target review time under 24 hours for pending submissions |
| NFR-15 | Abuse prevention | Contributing requires a verified phone number; rate limits per account (e.g. 20 submissions and 5 new places per day); device and IP throttling for sign-ups |
| NFR-16 | Content rights | Contributors agree in the terms that they took the photos and grant the app a licence to display them; takedown requests handled within 72 hours |

## 5. System architecture

One backend API serves the Flutter app, the React web app and the React dashboards, so business rules and the AI logic live in one place. PostgreSQL holds all records, Cloudflare R2 holds all images, and Gemini is called only from the server so the API key never reaches a phone.

&#91;embedded content: system architecture · 3 clients, 1 API, 3 services\]

Apps upload photos straight to R2 using short-lived presigned URLs from the API, then read them back through Cloudflare's CDN, so image traffic never passes through the backend.

| Layer | Choice | Why |
| --- | --- | --- |
| Mobile | Flutter 3 (Dart), Riverpod for state, Dio for HTTP, Hive or Isar for offline cache, cached\_network\_image | One codebase for Android and iOS; you already know it |
| Web | React + TypeScript with Next.js (or Vite + React Router), TanStack Query, Tailwind CSS | Next.js gives server-rendered place pages that Google can index |
| Dashboards | Same React codebase under `/owner` and `/admin` routes, role-guarded | One deploy, shared components |
| API | Node.js + TypeScript (NestJS or Express), Prisma ORM, Zod validation | Same language as the web app; Flask works too if you prefer Python |
| Database | PostgreSQL 16 with PostGIS and pg\_trgm | Location queries and fuzzy search without extra services |
| Storage | Cloudflare R2 (S3-compatible) + custom domain on Cloudflare CDN | No egress fees for image-heavy browsing |
| Image processing | Background job (BullMQ + Redis, or a Cloudflare Worker) that makes 400 px and 800 px WebP versions | Keeps data use low (NFR-01) |
| AI | Google Gemini API (a Flash model for parsing and ranking; a vision-capable model for menu photos) | Fast, low cost, you know the API |
| Auth & SMS | JWT + refresh tokens; SMS OTP via a Zambian-capable SMS gateway (e.g. Africa's Talking) | Phone-first sign-up suits the audience |
| Payments (phase 2) | MTN MoMo and Airtel Money via an aggregator such as Flutterwave or a local provider | For featured listings and deals |
| Hosting | API + Postgres on a VPS or managed host (Railway, Render, DigitalOcean); web on Vercel or Cloudflare Pages | Low monthly cost at MVP scale |
| DevOps | GitHub Actions CI, Docker, Sentry, uptime monitoring | Repeatable deploys and error alerts |

## 6. Data model (PostgreSQL)

Twenty-four core tables cover the MVP, including the community submission and moderation tables. Prices are stored as integers in ngwee (K1 = 100 ngwee) so budget sums never hit rounding errors. Enable the PostGIS extension for "near me" queries and `pg_trgm` for fuzzy name search.

| Table | Key columns | Notes |
| --- | --- | --- |
| users | id (uuid), name, phone, email, password\_hash, role (user / owner / admin), home\_area\_id, default\_budget\_ngwee, created\_at | One table for all roles |
| areas | id, name, city, slug, centre (geography point) | Woodlands, Kabulonga, East Park, etc. |
| categories | id, name, slug | Restaurant, cafe, lounge, fast food, activity |
| places | id, name, slug, category\_id, area\_id, description, address, location (geography point), phone, whatsapp, price\_level (1–3), avg\_spend\_pp\_ngwee, status (draft / pending / live / hidden), is\_featured, menu\_updated\_at, created\_at | avg\_spend\_pp is recalculated when the menu changes |
| place\_hours | place\_id, weekday (0–6), opens\_at, closes\_at | Several rows per day allowed |
| tags / place\_tags | tag: id, name, type (vibe / feature); join table place\_id + tag\_id | Quiet, outdoor, live music, backup power |
| place\_owners | place\_id, user\_id, verified\_at, verified\_by | Links owners to places after claim approval |
| menu\_sections | id, place\_id, name, sort\_order | Starters, mains, drinks |
| menu\_items | id, section\_id, place\_id, name, description, price\_ngwee, is\_available, image\_id, updated\_at | place\_id kept for fast budget queries |
| images | id, owner\_type (place / menu\_item / review), owner\_id, r2\_key, width, height, variant\_keys (jsonb), status (pending / approved / rejected), uploaded\_by | Files live in R2; only keys stored here |
| price\_reports | id, menu\_item\_id, user\_id, reported\_price\_ngwee, note, status, created\_at | Admin approves to update the item |
| reviews | id, place\_id, user\_id, rating (1–5), body, status, created\_at |  |
| favourites | user\_id, place\_id, created\_at | Composite primary key |
| plans / plan\_stops | plan: id, user\_id, title, budget\_ngwee, group\_size, share\_token; stop: plan\_id, place\_id, sort\_order, estimated\_total\_ngwee, items (jsonb) | Saved AI plans |
| ai\_requests | id, user\_id, prompt, parsed\_filters (jsonb), candidate\_place\_ids, response (jsonb), tokens\_in, tokens\_out, latency\_ms, created\_at | Cost tracking and quality review |
| deals / featured\_slots | deal: id, place\_id, title, price\_ngwee, starts\_at, ends\_at; slot: id, place\_id, area\_id, starts\_at, ends\_at, amount\_paid\_ngwee, payment\_ref | Revenue features |
| place\_events | id, place\_id, user\_id (nullable), type (view / menu\_view / call / directions / ai\_shown), created\_at | Owner stats; partition by month as it grows |

**Community and moderation tables (new)**

| Table | Key columns | Notes |
| --- | --- | --- |
| submissions | id, user\_id, type (new\_place / menu / photos / review / edit / flag), target\_place\_id (nullable), payload (jsonb), status (pending / approved / rejected / auto\_published), ai\_score (0–100), ai\_reasons (jsonb), reviewed\_by, reviewed\_at, reject\_reason, created\_at | One queue for every kind of contribution; on approval the payload is written into the real tables |
| contributor\_stats | user\_id, trust\_level (new / trusted / banned), points, approved\_count, rejected\_count, last\_promoted\_at | Drives auto-publish and leaderboards |
| badges / user\_badges | badge: id, name, rule; join table user\_id + badge\_id + earned\_at | Menu Hunter, Area Explorer |
| moderation\_log | id, admin\_id, submission\_id, action, note, created\_at | Audit trail (FR-97) |

**Changes to existing tables:** `places` gains `created_by` (user) and `source` (seed / community / owner); `reviews` gains `amount_paid_ngwee`, `group_size` and `items_ordered`, and these real bills feed the AI planner's cost estimates; `images` gains `submission_id`; `menu_items` gains `last_confirmed_at` and `confirm_count` for price freshness. The separate `price_reports` table is replaced by `edit` submissions.

**Key indexes:** places(area\_id, status), places(location) GiST, places(name) GIN trigram, menu\_items(place\_id, price\_ngwee), place\_events(place\_id, created\_at).

**Storage layout in Cloudflare R2** (S3-compatible, so the AWS S3 SDK works with R2's endpoint):

- `places/{place_id}/gallery/{image_id}/{original|800|400}.webp`
- `places/{place_id}/menu/{item_id}/{image_id}/400.webp`
- `menu-scans/{place_id}/{upload_id}.jpg` (private, for AI extraction)
- Public images served through a custom domain (e.g. `img.yourdomain.com`) with Cloudflare caching; R2 has no egress fees, which keeps image-heavy browsing cheap.

## 7. AI budget planner flow

The database picks the candidates and Gemini only ranks and explains them, so the AI can never invent a place or a price. Each request makes two small Gemini calls and one SQL query.

1. **User message.** "Date for 2 in Woodlands, K400 max, outdoor, Saturday evening."
2. **Parse (Gemini call 1, JSON mode).** Extract structured filters: `{budget_ngwee: 40000, group_size: 2, area: "Woodlands", tags: ["outdoor"], day: "saturday", time: "evening", occasion: "date"}`. Missing fields fall back to the user's profile defaults.
3. **Query PostgreSQL.** Find live places in or near the area that are open at that time, match the tags, and where `avg_spend_pp × group_size ≤ budget`. Take the top 10 by fit and rating.
4. **Build menu bundles in code.** For each candidate, compute a realistic order within budget (e.g. one main + one drink per person, plus dessert if it fits) from real `menu_items`. Where approved reviews report what people actually paid in the last 90 days, the estimate is adjusted towards those real bills. This arithmetic is done in the backend, not by the AI.
5. **Rank and explain (Gemini call 2).** Send only the 10 candidates with their bundles and tags. Ask for the best 2–3 as JSON: place\_id, a one-line reason, and which bundle to show.
6. **Validate.** Reject any place\_id not in the candidate list and recheck every total against the database before replying.
7. **Reply.** Show cards with photo, reason, line-item estimate and total, plus "Save plan" and "Share on WhatsApp" buttons.
8. **Refine.** Follow-ups ("cheaper", "somewhere with live music") update the stored filters and rerun from step 3.
9. **Log.** Store the prompt, filters, candidates, response, token counts and latency in `ai_requests`.

**Fallbacks:** no matches → widen the area, then relax tags, then suggest the closest option over budget with the gap shown ("K40 over"). Gemini unavailable → return the top 3 from step 3 with a template reason.

**Rank prompt outline (call 2)**

```
You are a local outing planner in Lusaka, Zambia.
Pick the best 2-3 places for this request using ONLY the candidates below.
Never invent places, dishes or prices. Prices are in Zambian kwacha.
Request: {parsed_filters}
Candidates: {json list of place_id, name, tags, rating, bundles with totals}
Return JSON: [{"place_id": "...", "bundle_id": "...", "reason": "max 20 words"}]
```

**Menu extraction (contributor, owner and admin uploads):** a menu photo goes to Gemini with a JSON schema of sections → items → name, price. The contributor corrects the draft, then it enters the moderation queue like any other submission.

**Submission screening (runs on every contribution before the queue):**

1. **Photo check.** Gemini (vision) labels each photo: food, menu, interior, exterior, people as main subject, unsafe, unrelated. Unsafe photos are auto-rejected; people-focused photos are flagged.
2. **Text check.** Reviews and descriptions are checked for offensive language, spam, phone numbers or links, and copied text.
3. **Menu plausibility.** Prices are compared with similar places in the area; outliers (e.g. a K5 steak) are flagged.
4. **Duplicate check.** New places are compared by name similarity (pg\_trgm) and distance (PostGIS, within 150 m) with existing places.
5. **Score.** The backend combines these into an `ai_score` (0–100) with reasons. The queue shows the lowest-risk items first so they can be batch-approved; trusted contributors' eligible content is auto-published when the score passes a set threshold.

## 8. Development plan

The MVP takes about 15 weeks for one full-time developer. Instead of collecting every place by hand, you seed 15–20 places yourself and the community adds the rest through moderated submissions. Two gates must pass before moving on: the seed places and the full submit-screen-approve flow working before building the apps, and AI totals that always match the database before the beta.

&#91;embedded content: development roadmap · 5 phases, 2 gates, 14 weeks\]

Weeks assume one developer working full time; a second developer on Flutter could cut weeks 7–10 roughly in half.

### Phase 1: Setup and design (weeks 1–2)

- [ ] Monorepo or three repos: `api`, `web`, `mobile`; GitHub Actions for lint, test, build
- [ ] PostgreSQL schema and Prisma migrations for section 6 tables, including `submissions`, `contributor_stats` and `moderation_log`; seed areas, categories, tags
- [ ] Create R2 bucket, API token, CORS rules and the image custom domain
- [ ] Wireframes in Figma: home, list, place detail, menu, AI chat, add place, add menu, review, my contributions, moderation queue, owner dashboard
- [ ] Draft terms of use and content guidelines (photo licence, what gets rejected)
- [ ] Pick launch area (e.g. Woodlands or Kabulonga) and start visiting the 15–20 seed places: photos, menus, hours

### Phase 2: Core backend, submissions and moderation (weeks 3–6)

- [ ] Auth: phone OTP (required to contribute), email + password, JWT + refresh, roles and trust levels
- [ ] REST endpoints: places, menus, search, filters, favourites, reviews
- [ ] Presigned upload flow to R2 + resize job producing 400 px and 800 px WebP; strip location metadata
- [ ] Submissions API: create, list my submissions, approve, reject with reason, edit-then-approve; on approval write into the real tables
- [ ] AI screening pipeline: photo check, text check, menu plausibility, duplicate check, `ai_score`
- [ ] Gemini menu extraction from photos into an editable draft
- [ ] Trust rules: auto-publish for trusted contributors, promotion and demotion, rate limits
- [ ] React admin panel: mobile-friendly moderation queue, batch approve, merge duplicates, place editor, audit log
- [ ] Enter the 15–20 seed places and run 20 test submissions end to end (**gate 1**)

### Phase 3: Mobile and web apps (weeks 7–10)

- [ ] Flutter: home by area, place list, filters and sort, place detail, gallery, menu, reviews, favourites
- [ ] Flutter: contribute flows (add place with duplicate check, menu by photo, upload photos, review with amount paid, suggest edit, flag), my contributions screen
- [ ] Flutter: offline cache and offline submission drafts, low-data image loading, call / WhatsApp / directions buttons
- [ ] React web: public home, search results, server-rendered place pages with SEO tags, same contribute flows
- [ ] Shared API client and design tokens so both look the same
- [ ] Analytics events (view, menu view, call, directions) into `place_events`

### Phase 4: AI budget planner (weeks 11–12)

- [ ] Parse step with Gemini JSON output and profile fallbacks
- [ ] Candidate SQL query and bundle builder in code, adjusted by real amounts paid from reviews
- [ ] Rank step, validation, fallbacks, daily limits, caching, `ai_requests` logging
- [ ] Chat UI in Flutter and React; save and share plan
- [ ] Test on 100 realistic prompts; every total must match the database (**gate 2**)

### Phase 5: Owner dashboard, beta and launch (weeks 13–15)

- [ ] Owner claim flow, menu and photo editing, reply to reviews, basic stats
- [ ] Points, badges and area leaderboards
- [ ] Closed beta with 50 students and young professionals who both use and contribute; target 100+ approved community places by the end of beta
- [ ] Privacy policy, terms, data deletion flow, takedown process
- [ ] Publish Android app on Google Play; launch web on custom domain
- [ ] Launch push: contributor challenge with campus ambassadors (e.g. add 5 places, win airtime), TikTok and Instagram date-idea videos, partner restaurants sharing their listing

### After launch (months 4–6)

- [ ] Mobile money payments for featured listings and deals
- [ ] Contributor rewards (airtime, partner deals) funded from featured listings
- [ ] Deals and multi-stop plans
- [ ] iOS release
- [ ] Second and third Lusaka areas, then Kitwe or Ndola, opened by local contributors
- [ ] Bemba and Nyanja support in the AI planner

**Monthly running cost to budget for at MVP:** hosting for API and database, R2 storage (free tier covers the first 10 GB), Gemini usage, SMS for OTP, Google Play one-time fee, domain. Check current prices for each before launch.

## 9. Monetisation, risks and success metrics

Community content builds the audience, and revenue starts once there are users to show restaurants: free listings at launch, paid features from about month 2 after launch. Prices below are starting points to test, not researched figures.

**Revenue streams**

| Stream | How it works | Starting price to test |
| --- | --- | --- |
| Featured listing | Top of an area's list and a "Featured" badge in AI results (always labelled) | K300–K600 per month |
| Owner Pro plan | Full stats, deals, unlimited menu scans | K150–K250 per month |
| Deals commission | Fee per redeemed app-only deal | K5–K10 per redemption |
| User Plus (later) | More AI plans per day, saved multi-stop plans | K20–K30 per month |

**Risks**

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Too few people contribute | Catalogue stays thin | Seed 15–20 places first, points and badges, campus contributor challenge, credits on place pages, airtime rewards later |
| Fake or paid reviews (owners praising themselves or attacking rivals) | Users lose trust | Verified phone required, one review per user per place, fake-review signals (FR-95), owner accounts blocked from reviewing |
| Inappropriate or stolen photos | Legal and reputation harm | AI photo screening, nothing public before approval for new contributors, face blurring, takedown within 72 hours |
| Moderation backlog | Contributors wait days and give up | AI score sorting, batch approve, trusted auto-publish, mobile-friendly queue; add a part-time moderator as volume grows |
| Duplicate places | Confusing listings | Duplicate check at submission, AI duplicate flag, admin merge tool |
| Menus and prices go stale | Users lose trust in estimates | Last-updated dates, price confirmations from reviews, edit suggestions, owner dashboard |
| Restaurants upset by community listings | Complaints | Let them claim the listing, update the menu and reply to reviews |
| AI costs grow with users and submissions | Margins shrink | Daily limits, caching, small Gemini model for screening and parsing, cost logged per request |
| AI suggests wrong totals | Embarrassing bills | Totals computed in code from the database, validated before reply |
| Low data and old phones | Slow, heavy app | NFR-01 to NFR-03 enforced; offline drafts for submissions |

**Success metrics (first 3 months after launch)**

- 1,000 registered users and 300 weekly active users
- 150+ live places, at least 80% added by the community
- 100 active contributors, each with at least 1 approved submission
- Median time from submission to decision under 24 hours; approval rate above 70%
- 40% of AI planner sessions end with a tap on a place (call, directions or save)
- 10 places claimed by owners; 3 paying for a featured slot
- Average AI cost per plan and per screened submission tracked and kept under a set ceiling
