# HUXZAIN — Implementation Roadmap

**Generated:** 2026-06-30 · **Companion to:** `HUXZAIN_PRODUCTION_AUDIT_AND_BUILD_SPEC.md` (Parts 1–7)
**Stack:** TanStack Start + React 19 + Supabase · **Repo:** `D:/huxzain-trusted-exchange-flow-main`

This roadmap turns the audit/spec into an ordered, dependency-aware build. It contains:
1. Dependency graph (what unblocks what)
2. Sprint plan (module sequencing + gates)
3. Granular ticket backlog (HX-### tickets, each with Objective / Files / DB / Components / Acceptance / Tests)

> **Governance reminder (from CONTINUE_HERE):** build ONE module at a time. Do not start the next module until the per-module Acceptance gate (Part 7) is fully green and `walkthrough.md` + `task.md` are updated. Then STOP for review.

---

## 1. Dependency Graph

```
                         ┌─────────────────────────────┐
                         │  Module A: Notification +    │  ← FOUNDATION (P0, first)
                         │  Email Engine                │
                         └───────────────┬─────────────┘
            unblocks (every state change calls notify())
   ┌──────────────┬──────────────┬───────────────┬───────────────┐
   ▼              ▼              ▼               ▼               ▼
 Orders        Payments       Disputes      Withdrawals     Subscriptions
 (I)           (B/F)          (existing)    (F)             (existing)

                         ┌─────────────────────────────┐
                         │  Module B: Commission/Escrow │  ← CONFIG FOUNDATION (P0)
                         │  config tables               │
                         └───────────────┬─────────────┘
              feeds                       │
   ┌─────────────────────┬───────────────┴───────────────┐
   ▼                     ▼                                ▼
 Transaction Summary   Checkout fees / Buyer        Settlement timeline
 panel (B)             Protection (B)               (F)

                         ┌─────────────────────────────┐
                         │  Module H: Category Engine   │  ← CONFIG FOUNDATION (P1, but
                         │  (categories + field config) │     partially needed by C)
                         └───────────────┬─────────────┘
              drives                      │
   ┌─────────────────────┬───────────────┴───────────────┐
   ▼                     ▼                                ▼
 Dynamic Listing       Delivery Engines (C)          Search / Homepage (E)
 Forms (C)             digital/gaming/service/session

 Module O (Cron) ── enables ──▶ D (expiry), E (promo expiry/trending),
                                 F (escrow release/dormant), G (badge expiry), I (auto-cancel/complete)

 Module I (Order Room) ── requires ──▶ NEW conversations/messages tables (DB gap)
 Module J (Anti-abuse) ── builds on ──▶ existing moderation/strike system
 Modules K/L/M/N ── independent polish, scheduled after P0/P1 core
```

**Critical-path reading:**
- **A and B are the two true foundations.** A unblocks all transactional comms; B unblocks all fee/settlement display. Build A first, then B.
- **C depends partially on H** — to build dynamic per-category forms cleanly (and fix BUG-13's leaked prompt text), the category field-config engine should exist. Pragmatic compromise: build the **minimum** of H (field_config + engine_config tables + Gaming/Digital/Service/Session category rows) inside/just-before C, defer full Category CRUD UI to the P1 H ticket.
- **O (cron) is a P1 enabler** but several P1 modules (D expiry, F dormant/escrow, E trending) are not *fully* demonstrable without it. Build the job functions during their modules; wire the scheduler in O.
- **I (Order Room) has a hard DB blocker:** `conversations`/`messages` tables are referenced by `get_or_create_order_conversation()` (migration `20260618120000`) but never created. This must be authored before the order-room chat works.

---

## 2. Sprint Plan

Each "sprint" = one module = one review gate. Sizing is relative (S/M/L/XL), not calendar-bound.

| # | Sprint / Module | Priority | Size | Depends on | Gate |
|---|---|---|---|---|---|
| S1 | **A — Notification + Email Engine** | P0 | XL | — | Part 7 gate + E2E order-notify test |
| S2 | **B — Commission/Escrow config + Transaction Summary + Buyer Protection** | P0 | L | A (for fee-change notifications optional) | Gaming Std ₹5,999→₹4,919 check |
| S3 | **C — Category-specific Listing Forms + 4 Delivery Engines** | P0 | XL | B, min-H | Each engine E2E; BUG-04/13 fixed |
| S4 | **D — Listing Lifecycle, Expiry & Moderation** | P1 | L | A, C, O(partial) | expiry/renew/moderation E2E |
| S5 | **E — Promotions (Featured/Homepage/Boost/Glow/Urgent) + Trending** | P1 | L | B, O(partial) | BUG-12 removed; paid-only featured |
| S6 | **F — Escrow/Settlement/Withdrawals (Bank-only) + Dormant** | P1 | L | B, A | withdrawal bank-only; dormant@61d |
| S7 | **G — KYC + Verified Badge (standalone)** | P1 | M | A | 2-diff-IDs rule; badge page (202017) |
| S8 | **H — Category CRUD + Dynamic Category Engine (full)** | P1 | M | C(min-H done) | no-code add category |
| S9 | **I — Order Room + conversations/messages tables** | P1 | L | A, C | mutual completion; chat; invoice gating |
| S10 | **J — Account Security & Anti-Abuse** | P1 | M | A | 1-phone-1-profile; OTP change; presence |
| S11 | **O — Automation / Cron** | P1 | M | D,E,F,G,I | all scheduled jobs run + logged |
| S12 | **L — Admin/Super-Admin completeness** | P1/P2 | L | A | chat-open; coupon; newsletter; emergency |
| S13 | **K — Help Centre** | P2 | S | — | public KB + dropdown entry; "?" removed |
| S14 | **M — Reviews & Reputation** | P2 | M | I | gated reviews; one trust score |
| S15 | **N — Platform Credits** | P2 | S | F | non-withdrawable ledger |

**Client-blocking inputs needed before certain sprints close:**
- S2/S6: confirm Enterprise monthly price (₹9,999 vs ₹10,000); inspection/response/payment windows.
- S6: notification retention period; dormant exact offsets.
- S7: 6/12-month plan + badge prices already given (₹2,399/₹3,999); but plan-duration prices MISSING.
- S1: verification-expiry reminder schedule (3 conflicting docs).

---

## 3. Ticket Backlog

Format per ticket — **Objective · Files · DB · Components · Acceptance · Tests**. Tickets are grouped by module/sprint. ~70 tickets.

---

### Module A — Notification + Email Engine (S1)

**HX-001 · Extend notifications schema for deep-links + categories**
- Objective: Fix BUG-02/BUG-15 root cause — add `link`, `category`, `entity_type`, `entity_id`, `event_key`, `priority`, `channels` to `notifications`.
- Files: new migration `…_notifications_engine.sql`.
- DB: ALTER `public.notifications`; add indexes `idx_notifications_user_unread`, `idx_notifications_category`; backfill existing rows `category='platform'`.
- Components: none (schema only).
- Acceptance: migration applies; existing rows valid; RLS unchanged.
- Tests: migration smoke test; insert with link reads back.

**HX-002 · Create `notification_events` matrix config + seed**
- Objective: Encode the 47-event matrix as data (recipient/in-app/email/staff/super-admin/template/link-pattern/retention).
- Files: `…_notification_events_seed.sql`; `src/lib/notifications/events.ts` (typed keys).
- DB: NEW `notification_events`; seed from notifications doc (`scratch/audit/docx`).
- Acceptance: all 47 rows present; every `event_key` has a template or in-app-only flag.
- Tests: count = 47; no orphan template keys.

**HX-003 · Central `notify()` dispatcher**
- Objective: One idempotent server fn writes in-app row(s), sends templated email where matrix=✅, writes staff/super-admin entries, logs deliveries.
- Files: `src/lib/notifications/notify.ts` (or extend `notifications.functions.ts`); `src/server/supabase-admin.ts` (reuse).
- DB: NEW `notification_deliveries`.
- Components: none.
- Acceptance: calling `notify('payment_approved', …)` creates buyer IA+email + seller IA+email + super-admin entry; re-call is idempotent.
- Tests: unit test recipient resolution from matrix; delivery-log written; idempotency key.

**HX-004 · Build remaining email templates (matrix coverage)**
- Objective: Extend `email-templates.ts` from 13 → all matrix templates (money/order/security/subscription/dispute/verification/maintenance) with standard action buttons.
- Files: `src/lib/email-templates.ts`.
- Acceptance: every `email=true` event has a template; all use `getEmailWrapper` + correct action button.
- Tests: snapshot each template renders subject+html; no undefined interpolation.

**HX-005 · Notification Center (bell) rebuild — categories + deep-links**
- Objective: Fix BUG-02. Group into Orders/Listings/Finance/Membership/Security/Platform; rows navigable; mark-as-read on click; "Mark all read".
- Files: `src/components/site/Header.tsx` (bell ~643-746), `src/hooks/useNotifications.ts` (dedupe — pick one source).
- Components: notification dropdown; category tabs/filter.
- Acceptance: clicking a row navigates to `link` and marks read; categories correct; unread badge accurate.
- Tests: component test click→navigate+read; category grouping.

**HX-006 · Wire `notify()` into all state transitions**
- Objective: Fix BUG-01/03. Call `notify()` from every order/payment/listing/dispute/withdrawal/subscription/verification transition.
- Files: order/payment/listing/dispute/withdrawal/subscription server fns.
- Acceptance: place→pay→approve→deliver→complete each fires the matrix events to correct recipients (E2E).
- Tests: integration test full order lifecycle asserts notification rows.

**HX-007 · Specific client-demanded triggers**
- Objective: new listing submitted→email moderators/superadmin (CR-202120); payment approved→buyer purchase-successful+invoice (CR-201931); seller-ready→buyer IA+email (CR-201919); new order/message→seller (CR-201507).
- Files: listing submit fn, payment approve fn, delivery fn, message fn.
- Acceptance: each demanded trigger verified manually + test.
- Tests: assert each event fires with correct template.

**HX-008 · Super-admin broadcast + communication logs**
- Objective: broadcast (segments/channels/schedule) + logs view.
- Files: `src/lib/admin/communication.functions.ts` (EXT), `admin.communication.tsx`.
- DB: NEW `broadcasts`; reuse `notification_deliveries` for logs.
- Acceptance: super-admin sends broadcast; logs show status; non-super-admin forbidden.
- Tests: permission test; delivery rows created.

**HX-009 · Hide notification-preferences panel (BUG-15)**
- Objective: Hide prefs UI; keep order+message notifications unconditional.
- Files: `account.index.tsx` notifications panel; `seller.notifications.tsx`.
- Acceptance: prefs hidden; essential notifications still fire.
- Tests: panel not rendered; order notify still works.

---

### Module B — Commission/Escrow Config + Transaction Summary (S2)

**HX-010 · Commission/Escrow/Protection config tables + seeds**
- Objective: Move all fee/escrow/protection values to config (no hardcoding).
- Files: `…_commission_escrow_config.sql`.
- DB: NEW `commission_config`, `escrow_config`, `buyer_protection_config`; seed from Part-2 tables. RLS read=auth, write=admin.
- Acceptance: all 10 categories × 4 plans present; Gaming Std=18%.
- Tests: seed counts; lookup returns expected percent.

**HX-011 · Order fee-breakdown columns**
- Objective: Itemized breakdown on orders.
- Files: `…_orders_fee_breakdown.sql`.
- DB: ALTER `orders` add `commission_percent/amount`, `protection_fee`, `net_settlement`, `protection_selected`.
- Acceptance: columns added; existing orders unaffected.
- Tests: migration smoke.

**HX-012 · `getTransactionSummary` server fn**
- Objective: Compute payout vs total by category×plan; settlement timeline from config.
- Files: `src/lib/marketplace/transaction-summary.functions.ts` (NEW).
- Acceptance: Gaming Standard ₹5,999 → commission ₹1,080 (18%) → payout ₹4,919; changes with plan/category.
- Tests: table-driven test across categories/plans; CONFIG_MISSING path.

**HX-013 · Transaction Summary panel in Create/Edit Listing**
- Objective: Render panel below pricing (mockups 201600/201700) with trust badges + "No Hidden Charges" + settlement timeline.
- Files: `src/routes/_authenticated/seller.listings.tsx`; new component `TransactionSummary.tsx`.
- Acceptance: live updates as price/plan/category change; matches mockup.
- Tests: component renders payout; updates on input.

**HX-014 · Buyer Protection at checkout**
- Objective: Optional buyer-selected protection (≥₹1,000; Gaming 5% flat); settlement order Sale→Commission→Protection→Net.
- Files: `checkout.payment.tsx`; `getBuyerProtectionQuote` fn.
- Acceptance: <₹1,000 → no protection option; Gaming → 5% flat; tiers correct.
- Tests: boundary tests at 1,000 / 7,000 / 20,001 / 50,001.

---

### Module C — Listing Forms + Delivery Engines (S3)

**HX-015 · Minimum Category Engine for C (field_config + engine_config + seed Gaming/Digital/Service/Session)**
- Objective: Enough of Module H to drive dynamic forms + fix BUG-13.
- Files: `…_category_engine.sql` (partial); `src/lib/marketplace/category-engine.ts`.
- DB: NEW `category_field_config`, `category_engine_config`; seed core categories.
- Acceptance: dynamic fields render per category; no leaked "(Auto-updates based on Category)" text.
- Tests: field config drives form; BUG-13 string absent.

**HX-016 · Listing delivery config + secure asset vault**
- Objective: Per-listing delivery engine + encrypted asset vault (reuse credential pattern).
- Files: `…_delivery_engines.sql`; `src/lib/delivery/digital.functions.ts`.
- DB: NEW `listing_delivery`, `digital_assets`, `asset_access_log`; pgcrypto.
- Acceptance: assets encrypted; no raw URLs; access logged.
- Tests: encrypt/decrypt roundtrip; log written on reveal.

**HX-017 · Digital Delivery Engine (9 methods + download limits + reveal)**
- Objective: Instant/Manual code, license key, file, secure link, invitation, email, external activation, manual; limits Unlimited/5/30-day; reveal buttons; verification checklists.
- Files: `src/lib/delivery/digital.functions.ts`; `seller.listings.tsx` form section; order-room reveal UI.
- Acceptance: reveal respects download limit; expired link blocked; redeemed code blocked.
- Tests: limit enforcement; edge cases (expired/redeemed).

**HX-018 · Gaming 3-phase / Hybrid delivery + inspection checklist + safety banners**
- Objective: Payment Verified→Credentials Released→Transfer→Login→Access→Passwords→Recovery→Inspection→Ownership Transfer; hybrid type; per-game fields; banners.
- Files: `src/lib/delivery/gaming.functions.ts`; `…_delivery_engines.sql` (gaming_inspection); order-room.
- DB: NEW `gaming_inspection`.
- Acceptance: order completes only after ownership-transfer checklist; banners shown on credential screens.
- Tests: phase transition legality; cannot complete early.

**HX-019 · Service Delivery Engine (requirements→lock→deliver→revision→accept)**
- Objective: Packages (Basic 1/Standard 3/Premium ∞) + custom quote + extras; versioned delivery; bounded revisions.
- Files: `src/lib/delivery/service.functions.ts`; `…_service_engine.sql`; order-room.
- DB: NEW `service_packages`, `service_requirements`, `service_deliveries`.
- Acceptance: revisions capped by package; revision vs new-scope handled; locked requirements immutable.
- Tests: revision limit; lock prevents edit.

**HX-020 · Session & Booking Engine (availability→slots→book→reminders→complete)**
- Objective: Availability, slot generation, booking flow, reminders 24h/1h/10min, join-info gated, in-progress auto, attendance confirm, complete, reschedule/cancel/no-show; min-notice 12h/max-advance 30d.
- Files: `src/lib/delivery/session.functions.ts`; `…_booking_engine.sql`; coaching/game-buddy routes.
- DB: NEW `seller_availability`, `booking_slots`, `bookings`.
- Acceptance: no double-book; reminders scheduled; join-info only after confirmation; reschedule cancels old reminders.
- Tests: slot double-book conflict; no-show record; reschedule.

**HX-021 · Move Security/Quality score off buyer page (BUG-04)**
- Objective: Remove score from `product.$id.tsx`; render at seller form bottom + admin review; never blocks publish.
- Files: `product.$id.tsx` (remove), `seller.listings.tsx` (add bottom), `admin.listings.tsx` (review).
- Acceptance: buyer page has no score; seller sees live improvement aid; publish not blocked.
- Tests: product page snapshot lacks score; publish works at any score.

---

### Module D — Listing Lifecycle & Moderation (S4)

**HX-022 · Extend `listing_status` enum + lifecycle columns**
- Objective: add `changes_requested/expired/paused/sold`; `expires_at/published_at/pause_reason`.
- Files: `…_listing_lifecycle.sql` (enum add in own migration).
- Acceptance: enum extended; public reads exclude non-active.
- Tests: enum values; public RLS excludes expired/paused.

**HX-023 · 30-day expiry + reminders + renew**
- Objective: countdown UI; reminders 7/3/1d+day-of (via notify); renew = fresh 30-day; edit-before-renew re-enters moderation.
- Files: lifecycle fns; `seller.listings.tsx`; Module O job stub.
- Acceptance: expiry flips to Expired (hidden, not deleted); renew restores 30d.
- Tests: expiry job; renew cycle.

**HX-024 · Per-category plan limits + auto-pause/restore**
- Objective: Standard 1/Pro 5/Elite 10/Enterprise 30 per category; downgrade pauses excess ("Paused — Subscription Limit Exceeded"); re-subscribe restores.
- Files: subscription fns; lifecycle fns.
- Acceptance: exceeding limit blocked; downgrade pauses newest excess; renew restores.
- Tests: limit enforcement; pause/restore.

**HX-025 · Listing moderation queue + structured rejection reasons**
- Objective: Draft→Pending→Active/Changes/Rejected; review page (seller info+score+listing); structured reasons; moderator notes/history; email on submit.
- Files: `…_listing_moderation.sql`; `admin.listings.tsx`; `moderateListing`/`submitListingForReview` fns.
- DB: NEW `listing_moderation`.
- Acceptance: human-gated approve/reject/request-changes; moderators emailed on submit (CR-202120).
- Tests: transition legality; email fired.

---

### Module E — Promotions (S5)

**HX-026 · Remove dummy Featured/Trending (BUG-12)**
- Objective: delete hardcoded featured/trending; empty-state until real sources exist.
- Files: `src/lib/marketplace-data.ts`, `index.tsx`, category pages.
- Acceptance: no dummy data; empty render acceptable.
- Tests: no static featured array referenced.

**HX-027 · Promotion config + credits + active promotions**
- Objective: promo catalog (Boost/Glow/Urgent prices), Featured/Homepage credit ledger (stack/extend), active-promo table.
- Files: `…_promotions.sql`; `src/lib/promotions/*.functions.ts`.
- DB: NEW `promotion_config`, `promotion_credits`, `listing_promotions`, `homepage_slots`.
- Acceptance: credits stack; homepage slot-full returns credit; promos run to own expiry.
- Tests: slot contention; credit stacking.

**HX-028 · Promotion Center UI + paid Featured/Homepage/Boost/Glow/Urgent**
- Objective: surface statuses/history; purchase flows.
- Files: `seller.boosts.tsx`/`seller.ads.tsx` (EXT) or new `seller.promotions.tsx`.
- Acceptance: Featured = paid only; visuals (gold/glow/urgent) applied.
- Tests: purchase→active; expiry notification.

**HX-029 · Trending auto-compute**
- Objective: ranking formula from real clicks+sales; refresh job (Module O).
- Files: `src/lib/promotions/trending.functions.ts`; `recomputeTrending`.
- Acceptance: trending reflects real engagement; no dummies.
- Tests: formula deterministic on fixture data.

**HX-030 · Remove fabricated ad analytics (carry-forward)**
- Objective: drop `seller.ads.tsx` impressions=boosts×120; back with real events or remove.
- Files: `seller.ads.tsx`.
- Acceptance: no fabricated metrics.
- Tests: no synthetic multiplier present.

---

### Module F — Escrow/Settlement/Withdrawals (S6)

**HX-031 · Withdrawal/dormant config tables**
- Objective: per-plan withdrawal freq + settlement days; dormant fee schedule.
- Files: `…_withdrawal_dormant_config.sql`.
- DB: NEW `withdrawal_config`, `dormant_config`.
- Acceptance: config drives behavior; no hardcoded days/fees.
- Tests: seed values.

**HX-032 · Withdrawal Bank-Transfer only (BUG/CR-201943)**
- Objective: remove UPI option; require legal name/account/IFSC; status labels.
- Files: `requestWithdrawal` (ALTER), `seller.withdrawals.tsx`.
- Acceptance: only Bank Transfer selectable; UPI removed.
- Tests: UPI input rejected; bank fields required.

**HX-033 · Settlement timeline from config + dormant flow**
- Objective: timeline stages from escrow/settlement config; dormant reminder@30d, dormant@61d, withdrawals disabled until reactivation; fees 2/5/8/10/20%.
- Files: `getSettlementTimeline`; wallet/dormant fns; Module O job.
- Acceptance: dormant triggers at day 61; reactivation fee applied.
- Tests: dormant transition; fee tiers.

---

### Module G — KYC + Verified Badge (S7)

**HX-034 · KYC submission (two different gov IDs + selfie + address)**
- Objective: 4-step KYC; CHECK doc1.type≠doc2.type; private doc bucket.
- Files: `…_kyc_badge.sql`; `submitKYC`/`reviewKYC`; `seller.verification.tsx` (rename to KYC).
- DB: NEW `kyc_submissions`; private bucket + signed URLs.
- Acceptance: same-type doc twice blocked; manual review only.
- Tests: doc-type constraint; staff-only doc access.

**HX-035 · Verified Badge standalone page + purchase (mockup 202017)**
- Objective: standalone badge landing; plans Monthly ₹499/6mo ₹2,399/Yearly ₹3,999; split from KYC (CR-202000); propagation to cards/search; expiry → badge only disappears.
- Files: new route `verified-badge.tsx`; `purchaseVerifiedBadge`; `…_kyc_badge.sql` (verified_badges, badge_pricing_config).
- DB: NEW `verified_badges`, `badge_pricing_config`.
- Acceptance: badge independent of subscription; propagates; expiry keeps data.
- Tests: purchase→active; expiry flips badge only.

---

### Module H — Category CRUD + Dynamic Engine full (S8)

**HX-036 · Admin Category CRUD (no-code) + public display name (BUG-14)**
- Objective: add/remove/rename/reorder main+sub categories; `public_display_name`.
- Files: `admin.categories.tsx`; category CRUD fns; `…_category_taxonomy_seed.sql`.
- DB: ALTER `categories`; seed 12-category taxonomy + aliases.
- Acceptance: "Games" public vs "Gaming Accounts" in listing selector; no-code add works.
- Tests: CRUD; display-name split; no-delete-with-listings.

**HX-037 · Category aliases / duplicate detection**
- Objective: CS2≡Counter-Strike 2, GTA V≡GTA 5; "Other/Not Listed" per category.
- Files: `category-engine.ts`; `…` (category_aliases).
- DB: NEW `category_aliases`.
- Acceptance: duplicate suggestions surface.
- Tests: alias match.

---

### Module I — Order Room (S9)

**HX-038 · Create conversations/messages tables (DB GAP)**
- Objective: author the tables `get_or_create_order_conversation()` already references.
- Files: `…_conversations_messages.sql`.
- DB: NEW `conversations`, `messages`; RLS = participants+staff.
- Acceptance: RPC works; messages persist.
- Tests: RPC creates/returns conversation; RLS isolation.

**HX-039 · Order Room screen (timeline + chat + completion + dispute)**
- Objective: status timeline, embedded chat, inspection countdown, mutual completion + auto-complete on lapse, dispute button, read-only after completion, auto-welcome, auto-cancel if seller unresponsive; invoice gated to completed (BUG-11).
- Files: new `order.$id.tsx` (or extend orders routes); `confirmOrderCompletion`, `sendOrderMessage`.
- Acceptance: mutual completion settles+invoices; invoice hidden until completed.
- Tests: completion flow; invoice gating; read-only after complete.

---

### Module J — Account Security & Anti-Abuse (S10)

**HX-040 · 1 phone = 1 profile enforcement (CR-201806)**
- Objective: unique partial index on verified phone; block at signup/verify.
- Files: `…_account_security.sql`; phone-verification fns.
- DB: ALTER `profiles` unique index `phone WHERE phone_verified`.
- Acceptance: second profile with same verified phone blocked.
- Tests: duplicate phone rejected.

**HX-041 · Email/phone change with OTP (BUG-08)**
- Objective: editable email field; email change via OTP; phone change via SMS OTP (wire existing).
- Files: `account.index.tsx`; `requestEmailChange`/`confirmEmailChange`/`requestPhoneChange`/`confirmPhoneChange`; `…_account_security.sql`.
- DB: NEW `email_change_requests`, `phone_change_requests`.
- Acceptance: change requires OTP; old+new email notified.
- Tests: OTP match; expiry; uniqueness.

**HX-042 · Accurate presence (BUG-10) + HUXZAIN default avatar audit (BUG-09)**
- Objective: `last_active_at` heartbeat; online if <2-5min; audit all avatar renders to single HUXZAIN default.
- Files: `…_account_security.sql` (last_active_at); `heartbeat` fn; avatar util; Header/cards/admin tables.
- Acceptance: presence reflects activity; no "huxin" anywhere.
- Tests: presence freshness; avatar fallback path single.

**HX-043 · Header "?" removal + Help Centre dropdown entry (BUG-07)**
- Objective: remove "?" contact icon; add Help Centre to profile dropdown.
- Files: `Header.tsx`.
- Acceptance: "?" gone; Help Centre links to public page.
- Tests: header snapshot.

---

### Module O — Automation / Cron (S11)

**HX-044 · Enable scheduler (pg_cron or Edge Functions) + cron_runs log**
- Objective: scheduling mechanism + audit table.
- Files: `…_cron.sql`; scheduler config.
- DB: NEW `cron_runs`; enable pg_cron OR Supabase scheduled functions.
- Acceptance: a test job runs + logs.
- Tests: job logs row.

**HX-045 · Wire all scheduled jobs**
- Objective: listing expiry+reminders, promotion expiry, subscription downgrade→pause/restore, escrow release, dormant transition, badge expiry, trending recompute, auto-cancel unresponsive, auto-complete on lapse, auto-invoice+email.
- Files: respective module job fns; scheduler entries.
- Acceptance: each job runs idempotently + fires notifications.
- Tests: each job on fixture data.

---

### Module L — Admin/Super-Admin completeness (S12)

**HX-046 · Clickable admin chat monitoring (BUG-06)**
- Objective: rows open read-only conversation via `getLiveConversation`.
- Files: `admin.chats.tsx`.
- Acceptance: clicking row opens full thread.
- Tests: row click → detail.

**HX-047 · Coupon engine + checkout integration (fix hardcoded "Pro")**
- Objective: real coupon validation (scope/percent-flat/expiry/usage); fix `applyCoupon`.
- Files: `wallet.functions.ts` applyCoupon; coupon admin; checkout.
- Acceptance: coupons apply by rule; no hardcoded plan.
- Tests: scope/expiry/usage paths.

**HX-048 · Newsletter real send (fix dead button)**
- Objective: wire `admin.newsletter.tsx` send to real campaign dispatch.
- Files: `admin.newsletter.tsx`; communication fns.
- Acceptance: send dispatches + logs; no setTimeout fake.
- Tests: send creates delivery rows.

**HX-049 · Emergency controls (owner-only)**
- Objective: freeze marketplace / disable withdrawals / disable purchases.
- Files: `…` (platform_settings keys / emergency_controls); owner dashboard.
- Acceptance: toggles enforce platform-wide; owner-only.
- Tests: permission; enforcement.

**HX-050 · Remove MOCK_LOGS fallback (audit-logs)**
- Objective: drop mock fallback in `admin.audit-logs.tsx`.
- Files: `admin.audit-logs.tsx`.
- Acceptance: real logs only.
- Tests: no mock import.

**HX-051 · Analytics charts + date-range + CSV/PDF export; homepage CMS + announcement bar; policy CMS + consent logging**
- Objective: admin completeness polish.
- Files: `admin.analytics.tsx`, homepage CMS, policy pages.
- Acceptance: export works; CMS edits reflect; consent logged.
- Tests: export format; CMS render.

---

### Module K — Help Centre (S13)

**HX-052 · Public Help Centre page (surface kb_articles)**
- Objective: public KB + search + ticket entry; linked from profile dropdown (HX-043).
- Files: new `help.tsx`; reuse `kb_articles`.
- Acceptance: public KB renders; search works.
- Tests: KB list; search filter.

---

### Module M — Reviews & Reputation (S14)

**HX-053 · Review gating + columns**
- Objective: reviews only for completed order + verified buyer; add `seller_response`, `reported`, `verified_purchase`.
- Files: `…_reviews.sql`; `submitReview`/`respondToReview`.
- Acceptance: review blocked unless completed+verified; verified-purchase indicator.
- Tests: gating; response.

**HX-054 · Render reviews + reconcile trust score**
- Objective: show on listing + seller profile; pick `recalculate_seller_reputation_score` as authoritative; remove JS `trustService` duplicate.
- Files: `product.$id.tsx`, seller profile; remove JS dup.
- Acceptance: one trust score source; reviews displayed with responses.
- Tests: single score path; render.

---

### Module N — Platform Credits (S15)

**HX-055 · Platform credit ledger + buyer Credits section**
- Objective: non-withdrawable credits (admin grant; offset platform-fee portion).
- Files: `…_platform_credits.sql`; `grantPlatformCredit`; buyer credits UI.
- DB: NEW `platform_credits`.
- Acceptance: credits non-withdrawable; offset fee only.
- Tests: grant; consume on order fee.

---

## 4. Cross-cutting tickets

**HX-060 · Introduce runtime validation (zod) for money/auth endpoints**
- Applies to: all NEW money/auth server fns. Replace identity validators with zod schemas.

**HX-061 · Notification-event traceability test harness**
- Objective: an integration test that drives a full order lifecycle and asserts every matrix event fired to correct recipients/channels. Reused as the S1 release gate.

**HX-062 · Seed-data verification script**
- Objective: assert config tables (commission/escrow/withdrawal/dormant/promotion/badge) match the authoritative spec tables; fail CI on drift.

---

## 5. Open client inputs (block specific tickets)

| Input | Blocks |
|---|---|
| Enterprise monthly price (₹9,999 vs ₹10,000) | HX-010, HX-012 (Enterprise rows) |
| 6/12-month plan prices | subscription duration billing |
| Inspection/response/payment windows | HX-018, HX-039, HX-023 |
| Notification retention period | HX-002 (retention_days) |
| Verification-expiry reminder schedule | HX-035 expiry reminders |
| Dormant exact offsets | HX-031/033 |

> **Do not invent these.** Where blocked, ship the surrounding feature reading from config and leave the value as a clearly-flagged "needs client input" config row.

---

## 6. Execution protocol (every sprint)

1. Re-read the module's spec sections (Parts 2/4/5/6) + relevant screenshots in `scratch/audit/`.
2. Write migration(s) → verify apply + RLS.
3. Implement server fn(s) + UI.
4. Run Part 7 per-module gate (typecheck/build/lint/test/no-mock/no-TODO/responsive/dark/a11y/security).
5. Update `walkthrough.md` (what was done + decisions) and `task.md` (check the boxes).
6. **STOP — wait for review** before the next module.
