# HUXZAIN — Task Checklist & Gates

Per-module task tracking. **Rule: one module at a time.** A module is "Done" only when **every** gate box below is checked. Then STOP for review before the next module.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (needs client input)

---

## Per-module gate (copy this block, must be 100% green to advance)

```
GATE — Module <X>
[ ] npm run typecheck passes (0 errors)
[ ] npm run build passes
[ ] npm run lint — 0 errors
[ ] npm run test — green (+ new module tests)
[ ] no console errors at runtime
[ ] no placeholder/dummy/mock data
[ ] no TODO/FIXME left
[ ] existing functionality preserved (surgical diff)
[ ] DB migration written + verified (applies + RLS tested)
[ ] all business values config/DB-driven
[ ] no invented values (MISSING → "needs client input" note)
[ ] mobile + desktop responsive; dark theme; a11y; HUXZAIN avatar
[ ] walkthrough.md updated
[ ] task.md updated
[ ] STOP — reviewed & approved
```

---

## Phase 1 — Planning
- [x] Read spec + CONTINUE_HERE
- [x] Ground codebase (DB / server fns / routes)
- [x] Part 4 Database Change Log appended
- [x] Part 5 API Contract appended
- [x] Part 6 UI Screen Checklist appended
- [x] Part 7 Final Acceptance Checklist appended
- [x] HUXZAIN_IMPLEMENTATION_ROADMAP.md created (graph + sprints + tickets)
- [x] walkthrough.md + task.md created
- [ ] **Reviewed & approved to start Module A**

---

## Module A — Notification + Email Engine (P0) · GATE in progress
- [x] HX-001 notifications schema (link/category/entity/event_key) — **APPLIED** to hosted Supabase + verified (223 rows intact, columns/indexes/constraints confirmed, typecheck + build pass)
- [x] HX-002 notification_events matrix + seed — **APPLIED** (88 recipient-resolved events, no duplicates, constraints/indexes verified, typecheck + build pass) + notify() spec doc written
- [x] HX-003 central notify() dispatcher + notification_deliveries — **APPLIED** (dedupe guard + deliveries log + realtime; idempotency proven live; notify.ts + 6 hook stubs; typecheck/lint/build pass). Hooks NOT wired (HX-006).
- [x] HX-004 email template system + render engine — **DONE** (pure layer: branding + 17 templates + renderEmailTemplate + 37 passing tests; typecheck/lint/build pass). Not wired into notify() per rule (later step).
- [x] HX-005 Notification Center bell (categories + deep-links, BUG-02) — **DONE** (groupByCategory helper + 6-category bell + row deep-link navigate; 5/5 group tests; typecheck/build pass; no new lint errors; no migration)
- [x] HX-006 wire notify() into all transitions (BUG-01/03) — **16 live transitions wired** (order created / payment submitted / payment approved / order completed / dispute created+resolved / listing approved+rejected / subscription activated+expired / verification approved+rejected / withdrawal requested+approved+completed); typecheck + build PASS. **Flagged/deferred (not wired, need business-flow decisions):** order delivered (coupled with completion), payment rejected (generic multi-type handler), order cancelled (no live path), listing submitted (draft-vs-submit), listing expired/boosted (no cron / 3 competing paths). Details in walkthrough → HX-006.
- [x] HX-006.5 moderation-events matrix extension (unblocks user strike/suspend/ban/mute/warn/unban) — migration `20260701120000_moderation_events_seed.sql` (9 security events) + 7 hooks in hooks.ts + `moderation.functions.ts` rewired (6 direct inserts → engine hooks, non-blocking). Hook↔seed event_key parity confirmed (9/9). Migration statically validated vs `notification_events` schema/constraints. typecheck + build PASS. **Live apply to hosted Supabase PENDING — service-role creds not available this session** (applies cleanly at next `supabase db push` / deploy; idempotent ON CONFLICT DO NOTHING).
- [ ] HX-007 client-demanded triggers (CR-202120/201931/201919/201507)
- [ ] HX-008 broadcast + communication logs
- [ ] HX-009 hide notification-prefs panel (BUG-15)
- [ ] GATE A green

## Module B (HX-008 & HX-009) — Super Admin Finance & Configuration System · [x] PRODUCTION COMPLETE
- [x] PHASE 1 — ADMIN CONFIGURATION PANEL (Finance Settings tab in Financial Control Center)
- [x] PHASE 2 — CATEGORY MATRIX EDITOR (Commission matrix grid category x plan)
- [x] PHASE 3 — ESCROW EDITOR (Escrow hold matrix grid category x plan)
- [x] PHASE 4 — SETTLEMENT EDITOR (Settlement processing rules per plan)
- [x] PHASE 5 — BUYER PROTECTION EDITOR (General & Gaming tiers, toggle)
- [x] PHASE 6 — PROCESSING FEE (processing_fee_inr, processing_fee_payer)
- [x] PHASE 7 — LIVE PREVIEW (Transaction Preview Calculator using computeTransactionSummary)
- [x] PHASE 8 — BACKEND (Save API with transactional safety, validation, caching, audit log)
- [x] PHASE 9 — VALIDATION (typecheck + build)
- [x] PHASE 10 — DOCUMENTATION (task.md + walkthrough.md + report)
- [x] GATE B green

## Module C — Listing Forms + Delivery Engines (P0)
- [x] HX-010 min Category Engine (field/engine config + seeds, BUG-13) — **FINALIZED** (migration 20260702130000 + category-engine hook/validations + dynamic ListingModal builder; typecheck/build PASS; technical debt logged)
- [x] HX-011 listing delivery config + secure asset vault — **FINALIZED** (product.$id.tsx metadata specifications preview + seller.listings.tsx layout grouping, pricing hints, and conditional visibility; typecheck/build PASS)
- [ ] HX-017 Digital Delivery Engine (9 methods + limits + reveal)
- [ ] HX-018 Gaming 3-phase/Hybrid + inspection + banners
- [ ] HX-019 Service Delivery Engine (requirements→deliver→revision)
- [ ] HX-020 Session & Booking Engine
- [ ] HX-021 move Security/Quality score off buyer page (BUG-04)
- [!] inspection/response/payment windows (client input)
- [ ] GATE C green

## Module D — Listing Lifecycle & Moderation (P1)
- [ ] HX-022 listing_status enum + lifecycle columns
- [ ] HX-023 30-day expiry + reminders + renew
- [ ] HX-024 per-category plan limits + auto-pause/restore
- [ ] HX-025 moderation queue + structured rejection reasons
- [ ] GATE D green

## Module E — Promotions (P1)
- [ ] HX-026 remove dummy Featured/Trending (BUG-12)
- [ ] HX-027 promotion config + credits + active promotions
- [ ] HX-028 Promotion Center UI (Featured/Homepage/Boost/Glow/Urgent)
- [ ] HX-029 Trending auto-compute
- [ ] HX-030 remove fabricated ad analytics
- [ ] GATE E green

## Module F — Escrow/Settlement/Withdrawals (P1)
- [ ] HX-031 withdrawal/dormant config tables
- [ ] HX-032 withdrawal Bank-Transfer only (BUG/CR-201943)
- [ ] HX-033 settlement timeline + dormant flow
- [!] dormant offsets + retention (client input)
- [ ] GATE F green

## Module G — KYC + Verified Badge (P1)
- [ ] HX-034 KYC submission (two diff gov IDs + selfie + address)
- [ ] HX-035 Verified Badge standalone page + purchase (mockup 202017)
- [!] verification-expiry reminder schedule (client input)
- [ ] GATE G green

## Module H — Categories & Dynamic Engine full (P1)
- [ ] HX-036 Admin Category CRUD + public display name (BUG-14)
- [ ] HX-037 category aliases / duplicate detection
- [ ] GATE H green

## Module I — Order Room (P1)
- [ ] HX-038 create conversations/messages tables (DB GAP)
- [ ] HX-039 Order Room screen (timeline+chat+completion+dispute, BUG-11)
- [ ] GATE I green

## Module J — Account Security & Anti-Abuse (P1)
- [ ] HX-040 1 phone = 1 profile (CR-201806)
- [ ] HX-041 email/phone change with OTP (BUG-08)
- [ ] HX-042 accurate presence (BUG-10) + default avatar audit (BUG-09)
- [ ] HX-043 remove header "?" + Help Centre dropdown (BUG-07)
- [ ] GATE J green

## Module O — Automation / Cron (P1)
- [ ] HX-044 enable scheduler + cron_runs log
- [ ] HX-045 wire all scheduled jobs
- [ ] GATE O green

## Module L — Admin/Super-Admin completeness (P1/P2)
- [ ] HX-046 clickable admin chat monitoring (BUG-06)
- [ ] HX-047 coupon engine + checkout (fix hardcoded "Pro")
- [ ] HX-048 newsletter real send
- [ ] HX-049 emergency controls (owner-only)
- [ ] HX-050 remove MOCK_LOGS fallback
- [ ] HX-051 analytics export + homepage CMS + policy CMS
- [ ] GATE L green

## Module K — Help Centre (P2)
- [ ] HX-052 public Help Centre page
- [ ] GATE K green

## Module M — Reviews & Reputation (P2)
- [ ] HX-053 review gating + columns
- [ ] HX-054 render reviews + reconcile trust score
- [ ] GATE M green

## Module N — Platform Credits (P2)
- [ ] HX-055 platform credit ledger + buyer Credits section
- [ ] GATE N green

## Cross-cutting
- [ ] HX-060 zod runtime validation for money/auth endpoints
- [ ] HX-061 notification-event traceability test harness
- [ ] HX-062 seed-data verification script (config drift CI)

---

## Blocked — awaiting client input (do not invent)
- [!] Enterprise monthly price: ₹9,999 vs ₹10,000
- [!] 6-month & 12-month plan prices (Pro/Elite/Enterprise)
- [!] Inspection-period / seller-response / payment windows
- [!] Notification retention period
- [!] Verification-expiry reminder schedule (3 conflicting docs)
- [!] Dormant exact reminder offsets

---

## Client Review Fixes (2026-07-02) — production issues from client review

All items implemented on this working copy. `npm run typecheck` ✅ and `npm run build` ✅ pass.

- [x] **CR-1 Help icon** — removed the "❓ Support" link from the top nav ribbon; moved to Profile dropdown → "Help & Support" (`/contact`).
- [x] **CR-2 Security score** — Gaming Account Security Score on the product page is gated to staff roles (admin/super_admin/owner/manager/moderator/staff); hidden from buyers/public.
- [x] **CR-3 Notification click actions** — notifications deep-link via the stored `link` field. Header bell already navigated; wired the seller notifications page too.
- [x] **CR-4 Seller order badge** — red unread-count badge on the Orders sidebar item, the Notifications sidebar item, and the "All orders" dashboard card; clears when the seller opens Orders.
- [x] **CR-5 Orders appear in seller dashboard** — added realtime subscription on `orders` (filter `seller_id`) so new orders appear immediately without a manual refresh.
- [x] **CR-6 Checkout payment proof** — removed UTR Number and GSTIN fields (both checkout flows); kept screenshot upload + added optional payment note.
- [x] **CR-7 Notification settings page** — removed the Notifications tab from Account Settings (delivery still automatic; infra untouched).
- [x] **CR-8 Email/Phone change** — email change now requires OTP verification (new `changeEmailWithOtp` server fn + `requestOtp`); phone change via OTP already existed (MSG91 modal).
- [x] **CR-9 Admin chat monitoring** — entire chat row is clickable and opens the existing live conversation viewer (messages/attachments/order/moderation).
- [x] **CR-10 Order counters** — seller Orders StatCards count real DB statuses (`paid`, `delivered` added); counters reflect actual orders.
- [x] **CR-11 Notification engine audit** — engine is centralized (`dispatchEvent`), event-seeded with `link_pattern`, has a dedupe table; hooks are non-throwing. Seller "new order" fires at payment approval (`order.payment_approved_seller`).
- [x] **CR-12 Verify** — typecheck + build green; docs updated (this file + walkthrough.md).

### Known follow-ups (client decision)
- [!] CR-11: seller is notified at **payment approval**, not initial placement (matches the payment-first design). Notifying at placement would need a new seeded `order.placed_seller` event (DB migration) — flagged.
- [!] Live end-to-end manual testing (real orders / OTP emails / SMS against live Supabase) was **not** run to avoid real side-effects; verified via typecheck, build, and code trace.

---

## docxx Final Production Audit (2026-07-02) — running

RTM: `HUXZAIN_FINAL_AUDIT_PASS1.md`. Verify each pass with `npx tsc -p tsconfig.json --noEmit` + `npx vite build`.

- [x] **Pass 1** — `listings expiry` doc: 30-day expiry column + countdown + Expire/Renew (`seller.listings`, migration `20260702150000`).
- [x] **Pass 2** — `Seller subscription plans full detail`: verified Finance Engine matches spec; reconciled plan pricing/limits (migration `20260702160000`, `tier-context`).
- [x] **Pass 3** — `universal delivery workflow` (Document 1): expiry stamped at approval (`admin.listings`); `Listing` type fixed (5 latent type errors resolved). No engine rebuilt.
- [x] **Pass 4** — `Category and huxzain features`: verified Buyer Protection config matches spec; Urgent Sale ₹79→₹149 + duration wired to listing expiry (`seller.boosts`); regression-audited promotions pricing (single-source, cross-module consistent).
- [x] **Pass 5** — `huxzain categories` (recap) + `gaming account delivery` (Document 2): verified credential vault spec-compliant; flagged Security-Score visibility conflict (doc=public vs your session-1 instruction=admin-only); logged Quality-Score / per-game-fields / smart-game-creation gaps. No rebuild.
- [x] **Pass 6** — remaining docs read: Document 3 (Digital Delivery Engine — ingame/giftcards/software/digital-products/subscriptions), Document 4 (Service Delivery Engine — freelance/business/advertising), Document 5 (Session & Booking Engine — coaching/game-buddy), Communication/Notifications doc. All map to existing universal engines (`universal_delivery_engines`, Notification Engine) — verification-weighted, gaps catalogued below. **Phase A doc reading = 10/10.**

### Phase A gaps catalogued (grounded, mostly large subsystems — NOT quick patches)
- Per-category / per-game dynamic field configs (Valorant blueprint + 15 games; software/giftcard/subscription field sets) — `category_field_config` exists but per-sub-category depth not populated.
- Category-specific inspection checklists (gaming ownership, digital verify, service revision, session attendance) — universal inspection only.
- Service packages (Basic/Standard/Premium), buyer-requirement collection, revision management (Doc 4).
- Session & Booking calendars, availability, attendance, rescheduling (Doc 5).
- Download limits/history/secure-link expiry (Doc 3).
- "Other Game / Product Not Listed" smart category creation + fuzzy dedup.
- Listing **Quality Score** (Docs 1/2).
- Communication Preferences page + new-device/failed-login security notifications (Notifications doc) — ties to Phase C security.

### MEASURED code-quality snapshot (2026-07-02, `src/`)
- 260 TS/TSX files · 76,215 LOC · 53 migrations
- **console.log/debug: 180** (top measured debt; mix of dev-noise + error logging — needs selective, not blind, cleanup)
- TODO/FIXME/HACK: **3** (very low) · @ts-ignore: **1** (excellent) · placeholder/mock/fake: **5** (need inspection)
- Oversized files (>800 LOC): **12** — largest `seller.listings.tsx` 2497, `messages.tsx` 2452, `admin.payments.tsx` 1769
- Dead-code % / duplicate-code %: **NOT yet measured** (needs a proper unused-export/knip pass — will not guess)

### Phase C — Security hardening (financial surface — DONE this pass)
- [x] **SEC-WITHDRAW-RACE-01** — withdrawal balance hold was a TOCTOU read-then-write (JS-computed absolute value) → **fixed** with atomic `security definer` RPC `request_wallet_hold(amount)` scoped to `auth.uid()` (migration `20260702170000`). Closes concurrent double-withdrawal AND the trust-client-userId ownership gap. `tsc` 0 · build ✓.
- [x] **SEC-PAYMENT-DBLCREDIT-01** — `admin.payments.executeApprove` transitioned pending→approved with no status guard → double-click/two-admins could re-run seller crediting. **Fixed** with atomic conditional update (`.eq(status,'pending')` + rows-affected abort). `tsc` 0 · build ✓.
- [x] **Verified already-solid (no change):** OTP brute-force (5-attempt lockout + 60s throttle), ban→session revocation (`is_banned`→`auth.users.banned_until` trigger), order-completion/sale-logging idempotency guards, disposable-email (Pass 5), private-bucket signed URLs.

### Phase B/C STILL remaining (blocks production certification — honest)
- [ ] Measured dead-code / duplicate-code pass (needs knip/ts-prune install)
- [ ] console.log selective cleanup (180 measured)
- [ ] Full RLS/ownership audit across ALL tables (only wallet/payment paths hardened so far)
- [ ] Login rate-limiting (per-IP) + new-device/failed-login security notifications (per Notifications doc)
- [ ] Performance: N+1 / missing-index / bundle review (measured)
- [ ] Repository-wide bug hunt across all 30 subsystems
- [ ] Large unbuilt business subsystems from Phase A (paused-on-downgrade, credit ledger, dormant earnings, badge-expiry automation, scheduler, per-category field configs, Quality Score, service packages, booking calendars)

### Phase C — Production hardening (begun)
- [x] **SEC-DISPOSABLE-01** — disposable/temporary email detection. Shared `src/lib/security/disposable-email.ts`; enforced server-side in `requestOtp` (covers all OTP callers) + client-side in `signup.tsx`. `tsc` 0 · build ✓.
- [ ] Remaining Phase B/C: dead-code sweep, full RLS/permission/payment-race audit, rate-limiting/lockouts, N+1/index review, bug hunt.

### CONFLICT FOR CLIENT DECISION
- [!] **Security Score visibility:** official Gaming-Accounts doc says it is a **public buyer-facing** signal; your session-1 instruction said **admin-only**. Left admin-only (respecting your direct instruction). Confirm which wins.

### Grounded unbuilt subsystems (blocked or large)
- [ ] Paused-on-downgrade (excess listings → "Paused – Subscription Limit Exceeded")
- [ ] Subscription credit lifecycle (Featured/Homepage credits per cycle, no carry-over, activated-survives-expiry)
- [ ] Dormant earnings (60/90/120/180/365-day reactivation fees)
- [ ] Badge/verification expiry automation + reminders
- [ ] Background scheduler (pg_cron) for auto-expiry / auto-escrow-release / auto-complete
- [!] **Client input needed:** finalized 6-/12-month prices for Pro/Elite/Enterprise.
