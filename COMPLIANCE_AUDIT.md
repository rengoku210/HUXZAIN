# HUXZAIN MARKETPLACE — DOCUMENTATION ↔ CODEBASE COMPLIANCE AUDIT

**Date:** 2026-06-17
**Source of truth:** `txt/HuxZain developement document (2)/(3).txt`, `Superadmin details`, `Delivery part`, `Notifications and emails`, `Huxzain missing features part 1` (extracted into `scratch/devdoc-requirements.md`, ~700 requirements, IDs AUTH-* … GOV-*).
**Codebase:** TanStack Start (React 19) + Supabase. 91 route files, 65 components, 36 migrations + out-of-migration SQL/cjs.
**Method:** Requirement inventory cross-referenced against routes, lib/server functions, and SQL migrations. Read-only. No code modified.

> **Reconciliation note:** Several sub-findings from parallel reviewers were directly re-verified against source (coupons, dispute freeze, escrow auto-release, admin route guarding, RLS). Where a reviewer was wrong, this report uses the verified result. RLS **does** exist in migrations (contradicting one reviewer's "no RLS" claim, which only inspected app code). Disputes tables/admin flows **do** exist (contradicting one reviewer's "no disputes table" aside).

---

## SECTION 1 — COMPLETE REQUIREMENT INVENTORY

The authoritative inventory is `scratch/devdoc-requirements.md` (kept verbatim-faithful, not summarized). It contains 30 domains:

A. Authentication & Accounts (AUTH-01..22)
B. User Roles & Permissions incl. Owner/Staff (ROLE-01..19, OWNER-01..15)
C. Seller System — Plans/Tiers/Onboarding/Dashboard (SEL, PLAN-01..17, SDASH-01..17)
D. Listing System (LIST-01..33)
E. Category Architecture & Dynamic Fields (CAT-01..44)
F. Marketplace/Search/Ranking/Homepage (HOME-01..17, SRCH-01..18)
G. Order Flow & Order Room (ORD-01..12)
H. Chat System & Anti-Fraud (CHAT-01..09, FRAUD-01..16)
I. Escrow/Earnings/Cooldown/Withdrawal/Settlement (ESC-01..29)
J. Delivery System (DEL-01..10)
K. Inspection Period / Risk Levels (INSP-01..06)
L. Dispute System (DISP-01..25)
M. Verification/KYC/Badges (KYC-01..25, BADGE-01..03)
N. Reviews & Reputation/Trust (REV-01..16, TRUST-01..06)
O. Payments (manual verification) & Platform Credits (PAY-01..13, CRED-01..06)
P. Invoices & Billing (INV-01..11)
Q. Notifications & Emails (NOTIF-01..18, EMAIL-01..09)
R. Admin / Super Admin Panel (ADM-01..30)
S. Moderation (MOD-01..08)
T. Subscriptions/Coupons/Pricing/Fees/Boosts (FEE, BOOST, SUB, COUP, REFER, PROMO)
U. Advertisement System (AD-01..14)
V. Analytics (ANL-01..24)
W. Security (SEC-01..26)
X. Settings/Maintenance/System Config (SET-01..07)
Y. Support/Help Center/Tickets (SUP-01..19)
Z. Legal/Policies/Compliance/Consent (LEG-01..17)
AA. Database/Backend Architecture (DB-01..22)
BB. Storage/Media/Credential Infrastructure (STOR-01..11)
CC. Infrastructure/Deployment/SEO/Performance/Testing (INF, SEO, MOB, TEST)
DD. Cross-cutting / Governance (GOV-01..10)

**Documented conflicts preserved (must be resolved by product, not silently):**
- Wallet vs per-order settlement: Part 35 overrides earlier wallet model → per-order only (ESC-10/11/12).
- Commission %: Part 27 ranges vs Part 54 examples (Gaming 8% / Software 5%) — both "admin-configurable."
- Cooldown tiers: New/Verified/Trusted (14/7/3d) vs New/Verified/Elite/Enterprise (14/7/3/24-48h).

---

## SECTION 2 — REQUIREMENT-TO-CODE TRACEABILITY MATRIX (domain roll-up)

Status legend: ✅ Fully · 🟡 Partial · ❌ Missing · ⚠️ Contradiction/Disconnected · 🔓 Insecure

| Domain | Status | Primary evidence | Headline gap |
|---|---|---|---|
| A. Auth | 🟡 | `signup.tsx`, `login.tsx`, `lib/auth.functions.ts`, OTP email flow | No CAPTCHA, no brute-force lockout, no age checkbox, no reserved-username block, password = length-only |
| B. Roles/Owner | 🟡 | `lib/roles.ts`, `lib/admin/role.functions.ts`, `admin.staff.tsx`, `admin.tsx` guard | No distinct Owner panel; no 2FA; category/game-scoped staff missing; permission checkboxes not enforced server-side per action |
| C. Seller plans/dash | ✅/🟡 | `lib/seller/tier-context.tsx`, `seller.*` routes, `subscription.functions.ts` | Plan pricing partly hardcoded in component; admin pricing UI missing |
| D. Listings | 🟡 | `seller.listings.tsx` (category-aware ListingModal), `listing-attributes.ts` | listing_status enum thin (5 vs 9); no preview; no fee preview; no expiry; no per-listing analytics |
| E. Categories | 🟡 | `categoryService.ts`, `categories.tsx`, `category.$slug.tsx` | No per-category field-definition table; per-category commission not in DB; "Other/Not Listed" missing; taxonomy diverges from doc |
| F. Home/Search | 🟡/❌ | `index.tsx` hero search, `services.ts` ilike | No global search results page/route; live suggestions, trending, search analytics missing |
| G. Orders/Order Room | 🟡 | `orders.tsx`, `seller.orders.tsx`, `admin.orders.tsx` | No buyer-facing "order room" (timeline + chat + dispute + countdown) |
| H. Chat/Fraud | 🟡 | `ChatWindow.tsx`, `messagingService.ts`, `chat/fraud-detection.ts`, `payments/fraudScoringService.ts` | Credential masking/"Reveal" secure flow missing; off-platform auto-actions weak |
| I. Escrow/Withdrawal | ⚠️ | `lib/escrow.ts`, `wallet.functions.ts`, `seller.withdrawals.tsx`, `escrow_holds` table | **Wallet model contradicts per-order-only spec; dispute does NOT freeze payout; auto-release ignores disputes** |
| J. Delivery | 🟡/❌ | `seller.delivery.tsx` | Single "delivered" step; no 3-phase account delivery; no buyer verify/ownership transfer; no buyer safety instructions |
| K. Inspection/Risk | ✅ | `escrow.ts` calculateInspectionHours/CoolingDays | Risk tiers exist; tie to dispute eligibility window incomplete |
| L. Disputes | 🟡 | `disputeService.ts`, `admin.disputes.tsx`, `disputes`/`dispute_messages` tables | **No auto-freeze on open (DISP-07); evidence stored in PUBLIC bucket; no SLA timers/escalation/priority** |
| M. KYC/Badges | 🟡 | `seller.verification.tsx`, `admin.verifications.tsx`, `verification_history` | Docs not encrypted; KYC access not logged; appeal flow thin; badge display not propagated to cards/search |
| N. Reviews/Trust | 🟡 | `reviewService.ts`, `ReviewModal.tsx`, `trustService.ts`, `recalculate_seller_reputation_score()` | "Verified purchase"/completed-order gating + fake-review moderation incomplete |
| O. Payments/Credits | 🟡 | `checkout.payment.tsx`, `admin.payments.tsx`, OCR + `payment-scoring.ts` | Gateway (Razorpay/Cashfree) referenced but not integrated; duplicate-UTR not DB-enforced; platform credits not a real non-withdrawable account |
| P. Invoices | ✅ | `invoice/invoice-pdf.ts`, `admin.invoices.tsx`, `verify.$invoiceNumber.tsx`, `invoices`/`invoice_counters` | Email-on-generate; auto-trigger on settlement not fully wired |
| Q. Notifications/Email | 🟡 | `notifications.functions.ts`, `email-templates.ts`, `supabase/functions/sendVerificationEmail.ts` | In-app OK; email via Resend (no retry/queue); no SMS/push; no email preferences; newsletter send is a **dead button** |
| R. Admin panel | ✅/🟡 | 28 `admin.*` routes wired to Supabase | No bulk actions; some confirmations missing; newsletter mock |
| S. Moderation | 🟡 | `admin.moderation.functions.ts`, `admin.listings.tsx`, keyword scan in `seller.listings.tsx` | Manual review exists; banned-keyword admin engine + auto-suspension partial |
| T. Subs/Boosts/Coupons | 🟡 | `seller.boosts.tsx`, `seller.coupons.tsx`, `apply_coupon_server` RPC, `coupons` table | Boost/coupon pricing hardcoded; coupon redemption hardwired to "Pro plan"; no boost-expiry cron |
| U. Ads | 🟡/❌ | `seller.ads.tsx` | No independent ad system; aliases boosts; analytics faked |
| V. Analytics | 🟡 | `admin.analytics.tsx`, `seller.analytics.tsx`, `seller_analytics_events` | Owner metrics real; boost analytics faked; no charts/date-range/export |
| W. Security | 🟡/🔓 | RLS in migrations, storage RLS | Public buckets for dispute-evidence/chat/report-screenshots; credentials likely plaintext; no rate limiting/CAPTCHA |
| X. Settings/Maint | 🟡 | `admin.settings.tsx`, `platform_settings`, `maintenance_mode` table | Global emergency controls / maintenance toggle UI incomplete |
| Y. Support/KB | 🟡 | `admin.tickets.tsx`, `seller.support.tsx`, `support_tickets`, `kb_articles` | Auto-reply, routing, public KB UI thin |
| Z. Legal/Consent | 🟡 | `terms.tsx`, `privacy.tsx`, `refund-policy.tsx`, `terms_acceptance_logs` | Policy CMS + version logging + per-step consent capture incomplete |
| AA. DB/Backend | 🟡 | 36 migrations | Fragmented schema (tables in root sql + scratch cjs); no unified audit_logs; no cron |
| BB. Storage/Creds | 🟡/🔓 | storage buckets, `listing_credentials` (scratch cjs) | Credentials not encrypted; no reveal log; some sensitive buckets public |
| CC. Infra/SEO/Mobile | 🟡 | `useSeo.ts`, `seo.functions.ts`, `sitemap[.]xml.ts`, Capacitor/android | SEO + sitemap present; perf/test coverage partial |
| DD. Governance | 🟡 | components reused, role discipline | Hardcoded business values remain (commission, boost/coupon prices) |

---

## SECTION 3 — MISSING FEATURES (not implemented)

1. **Global search results page** (SRCH-01..18) — hero `index.tsx` search input does not navigate to any results route; backend `ilike` exists but is not wired. Live suggestions, trending searches, search analytics absent.
2. **Buyer Order Room** (ORD-07/08) — no internal order page with status timeline, embedded chat, dispute button, protection countdown.
3. **3-phase gaming-account delivery** (LIST-10, DEL-05) — no Phase1 access / Phase2 ownership-transfer / Phase3 protection workflow; `seller.delivery.tsx` is a single "delivered" mark.
4. **Buyer post-purchase safety instructions** (DEL-09).
5. **Secure "Reveal Credentials" masked flow with logging** (CHAT-03/04/05, STOR-03) — credentials stored but no masked view, no reveal audit log.
6. **Platform Credits as non-withdrawable account** (CRED-01..06) — only a generic wallet; credits not modeled to offset platform-fee portion only.
7. **Coupon admin/owner creation panel + restrictions engine** (COUP-02..08) — redemption RPC exists but no create/limit/restriction UI; redemption hardcoded to "Pro plan."
8. **Independent advertisement system** (AD-01..14) — `seller.ads.tsx` aliases boosts; no ad inventory/types/rotation/approval.
9. **2FA / MFA for admin/owner** (OWNER-15, ADM-02, SEC-03).
10. **CAPTCHA / anti-bot** (AUTH-16, SEC-12) and **brute-force lockout / rate limiting** (AUTH-10, SEC-11).
11. **Age confirmation checkbox** (AUTH-17) and **reserved-username block** (AUTH-05).
12. **Distinct Owner dashboard** (OWNER-03/04) and **global emergency controls** (OWNER-11: freeze marketplace, disable withdrawals/purchases, maintenance toggle).
13. **Manual balance adjustment panel** (OWNER-10).
14. **Category/game-scoped staff roles** (ROLE-12/13).
15. **Per-category dynamic field-definition table** (CAT-07/08) and **per-category commission/cooldown in DB** (CAT-11/12).
16. **"Other / Not Listed" category suggestion** (CAT-23..25).
17. **Soft-delete (`deleted_at`) on disputes/orders/listings/fraud/moderation** (SEC-26, DB-16).
18. **Unified `audit_logs` table** (DB-11, ADM-22) — only fragmented per-domain logs.
19. **Cron/scheduled jobs** (DB-20) — subscription expiry, escrow release, listing/boost expiry are manual RPCs; no pg_cron.
20. **Email preferences, retry/queue, SMS/push channels** (EMAIL-09, NOTIF-01/17).
21. **Analytics charts, date filtering, CSV/Excel/PDF export** (ANL-20/21/22).
22. **Bulk admin actions** (ADM-24).
23. **Policy CMS + version logging + per-step consent capture** (LEG-03/04/05/08).

---

## SECTION 4 — PARTIALLY IMPLEMENTED FEATURES

1. **Auth** — email OTP signup ✅, but phone verification is post-signup only and not enforced for withdrawals (AUTH-08); password rules length-only (AUTH-06).
2. **Account statuses** — Active/Suspended/Banned/Frozen exist; missing Unverified/Restricted/Under-Investigation and granular partial restrictions (AUTH-18/19).
3. **Listing forms** — category-aware but inside one monolithic `ListingModal`; `listing_status` enum has 5 of 9 documented states (LIST-24).
4. **Categories** — parent_id hierarchy + risk-based cooldown ✅; per-category commission/filters/field-defs missing (CAT-10/11).
5. **Disputes** — case file, messages, admin resolution with split % ✅; missing auto-freeze, SLA timers, priority, escalation, category routing (DISP-07/08/10/15/17).
6. **KYC** — upload + admin approve/reject + history ✅; encryption, access logging, appeal, badge propagation missing (KYC-07/22/24, KYC-11).
7. **Reviews** — submit + display + reputation recompute ✅; completed-order/verified-purchase gating and fake-review moderation incomplete (REV-01/05/08).
8. **Payments** — manual UPI + QR + UTR + screenshot + OCR + fraud score + admin verify ✅; gateway not integrated; duplicate-UTR detection manual only (PAY-07/PAY-06).
9. **Subscriptions** — tiers, listing-limit trigger, boost tokens, expiry-downgrade RPC ✅; pricing partly hardcoded; admin pricing UI + downgrade button missing (PLAN-15).
10. **Boosts** — token/wallet/manual purchase + flags + boost score ✅; pricing hardcoded, no boost-purchase/expiry table, no auto-expiry, faked analytics (BOOST-01/11).
11. **Notifications** — centralized `triggerNotification` + in-app center ✅; email best-effort, no retry/queue/preferences (NOTIF-17).
12. **Admin panel** — ~28 routes wired ✅; bulk actions + some confirmations + newsletter backend missing.
13. **Analytics** — owner/seller real counts ✅; charts/export/date-range + boost/dispute/search analytics missing.
14. **Support** — tickets + KB tables + admin editor ✅; routing, auto-reply, public KB thin.
15. **Security** — RLS broadly present ✅; but public sensitive buckets, plaintext credentials, no rate-limit/CAPTCHA.

---

## SECTION 5 — BROKEN FEATURES (implemented but incorrect/non-functional)

1. **Dispute does not protect funds** — `disputeService.createDispute()` (`src/lib/marketplace/disputeService.ts:42-51`) inserts a dispute with `status:"open"` but never updates order/payout status. `checkAndReleaseEscrows()` (`src/lib/wallet.functions.ts`) auto-completes `buyer_reviewing` orders and releases cooling holds **without excluding disputed orders**. Net effect: a buyer can open a dispute and the seller can still be auto-paid. Violates **ESC-09, DISP-07, ESC-24**. **CRITICAL.**
2. **Coupon redemption is hardwired** — `applyCoupon()` (`src/lib/wallet.functions.ts:574`) calls `apply_coupon_server` then sends a notification hardcoded to "Pro Plan Unlocked." No coupon type/value/restriction is reflected to the user; behavior assumes all coupons = Pro trial (COUP-04/05/08).
3. **Newsletter broadcast is a dead action** — `admin.newsletter.tsx` `handleSend()` uses a `setTimeout` + success toast with **no backend call** (EMAIL-08, ADM-21).
4. **Boost/Ads analytics are fabricated** — `seller.ads.tsx` computes impressions/clicks/sales as `activeBoostsCount * 120/15/2`. Presenting fake metrics violates ANL-08 and the doc's "NEVER fake activity" (HOME-10).
5. **Dispute evidence uploaded to a PUBLIC bucket with `getPublicUrl`** — `disputeService.ts:30-38` uploads to `dispute-evidence` and stores public URLs; bucket is `public=true`. Violates DISP-05, SEC-24, SEC-25. **CRITICAL (data exposure).**

---

## SECTION 6 — DISCONNECTED / CONTRADICTORY FEATURES

1. **Wallet vs per-order settlement (ESC-10/11/12).** Spec (Part 35) mandates NO wallet, per-order "Withdraw Settlement" only. Code ships BOTH: `wallets` table + `seller.wallet.tsx` balance view + `wallet.functions.ts` (available/pending balances), alongside per-order eligibility in `seller.withdrawals.tsx`. Hybrid model contradicts the authoritative spec — product must pick one.
2. **Schema fragmentation.** Some tables live outside `supabase/migrations/`: `coupons`, `apply_coupon_server`, boost tables in root `migration.sql`/`supabase_add_boost_tables.sql`; `listing_credentials` and `badge_subscriptions` created only by `scratch/*.cjs`. Deployed DB state is therefore non-deterministic and not reproducible from migrations (DB-01, GOV-04).
3. **`listing_credentials` / `badge_subscriptions` RLS** uses the `employees` table directly instead of the standard `is_staff()` helper used elsewhere — inconsistent access model.
4. **Backend search exists but is unreachable from UI** — `services.ts` partial-match query has no consuming results page (SRCH-01).
5. **KYC approval auto-sets plan to "Verified"** (`admin.verifications.tsx`) — couples identity verification to subscription tier with no manual override.

---

## SECTION 7 — DEAD BUTTONS / DEAD ROUTES / DEAD ACTIONS

| Location | Element | Problem |
|---|---|---|
| `admin.newsletter.tsx` (`handleSend`) | "Send Newsletter Broadcast" | No backend; setTimeout+toast only |
| `seller.coupons.tsx` (`applyCoupon` path) | "Redeem Coupon" | Backend ignores coupon type; always "Pro plan" message |
| `seller.ads.tsx` | Ad metrics + "Campaign" CTA | Metrics fabricated; CTA just routes to boosts (no ad system) |
| `seller.subscription.index.tsx` | Downgrade control | No manual downgrade option (only auto-on-expiry) |
| `index.tsx` hero search | Search submit | Updates state, never navigates to results |
| `admin.staff.tsx` (credential display) | Generated staff credentials | Shown without reveal-audit log (OWNER-08) |
| `admin.audit-logs.tsx` | Log viewer | Falls back to `MOCK_LOGS` array that can shadow real data |

No widespread orphan routes were found — most 91 route files render and most admin routes query Supabase. The issues are **missing backend wiring / fabricated data**, not unrouted pages.

---

## SECTION 8 — SECURITY CONCERNS

**Critical**
1. **Funds not frozen on dispute** (ESC-09/24) — see Section 5.1. Financial-integrity defect.
2. **Sensitive storage buckets are public** (SEC-24/25): `dispute-evidence`, `chat-attachments`, `report-screenshots` are `public=true`; dispute evidence stored via `getPublicUrl`. KYC-like `payment-proofs`, `invoices`, `buddy-proofs`, `coach-proofs` are correctly private.
3. **Credentials likely plaintext** — `listing_credentials.password` stored as TEXT (created in `scratch/create_listing_credentials.cjs`); no encryption, no reveal/access log (STOR-01/02/03, SEC-02).

**High**
4. **No 2FA** for admin/owner (OWNER-15, SEC-03).
5. **No CAPTCHA / no brute-force lockout / no rate limiting** on auth, OTP, uploads, disputes, messages (AUTH-10/16, SEC-11/12).
6. **Server-side per-action permission enforcement is partial** — route-level guard exists in `admin.tsx` (role + path checks) and RLS exists, but the staff permission checkboxes (`role_permissions`) are not consistently enforced before each privileged write (ROLE-18, SEC-04).
7. **KYC access not logged** (KYC-22) and **credential reveals not logged** (OWNER-08).

**Medium**
8. No unified audit log (DB-11) — forensic reconstruction is hard.
9. Duplicate-UTR / fake payment-proof not DB-enforced (unique constraint absent) (FRAUD-08).
10. No soft-delete on disputes/fraud/moderation — hard-delete cascades destroy evidence (SEC-26).

**Positive:** Passwords via Supabase Auth (bcrypt) ✅ (SEC-01); broad RLS on profiles/listings/orders/transactions/disputes/withdrawals/payment_proofs ✅; private buckets for payment proofs/invoices/KYC-like docs ✅.

---

## SECTION 9 — DATABASE INCONSISTENCIES

1. **`listing_status` enum thin** — `('draft','active','hidden','flagged','archived')` vs doc's Draft/Pending Review/Active/Rejected/Suspended/Expired/Sold Out/Under Investigation/Paused (LIST-24).
2. **`order_status`** — extended (`payment_under_review`, `payment_approved`, `order_active`, `seller_delivering`, `buyer_reviewing`) but names diverge from doc; cooling/withdraw states live in columns (`payout_status`, `withdrawal_eligible_at`) not the enum.
3. **`disputes.status`** — free TEXT, no CHECK/enum; doc requires Open/Under Review/Waiting Buyer/Waiting Seller/Escalated/Resolved/Closed (DISP-06).
4. **No `deleted_at`** anywhere (SEC-26, DB-16).
5. **No unified `audit_logs`** — only `staff_action_logs`, `order_status_history`, `verification_history`, `withdrawal_logs`, `team_login_history`.
6. **Out-of-migration tables**: `coupons`, boost tables (root `*.sql`); `listing_credentials`, `badge_subscriptions` (scratch `*.cjs`) → not reproducible from `supabase/migrations/`.
7. **Missing indexes** — `disputes(order_id,status,created_at)`, `orders(status,created_at)`, no full-text index on `listings(title,description)` (DB-15/21).
8. **No per-category commission/cooldown columns** on `categories`; no `category_field_definitions` (CAT-07/11/12).
9. **`wallets` table** exists despite "no wallet" spec (ESC-10).
10. **Weak FKs** — `payment_proofs` references order via TEXT `payment_reference`, not a UUID FK.
11. **Inconsistent RLS helper** — credentials/badge tables check `employees` directly vs `is_staff()`.

---

## SECTION 10 — WORKFLOW GAPS

**Listing → Moderation → Visibility → Purchase → Payment → Escrow → Delivery → Review → Completion → Payout → Invoice**
- Moderation: keyword auto-flag → `pending` ✅; admin approve/reject ✅. Gap: no "request revision" state, no reject-reason surfaced to seller.
- Visibility: **break** — no search/browse results page; discovery only via category slug / direct product URL.
- Purchase→Payment: manual UPI ✅; gateway missing; **no buyer order-room** after purchase.
- Escrow→Delivery: auto-release ✅ but **ignores disputes** (break); delivery is single-step (no 3-phase / buyer verify / ownership transfer).
- Completion→Payout→Invoice: cooling→eligible→withdraw ✅ (per-order UI) but co-exists with wallet balance (contradiction); invoice auto-gen on order ✅, on settlement not fully wired; no invoice email.

**Verification → Payment → Approval → Badge**
- Submit→approve ✅; **badge not propagated** to listing cards / search / order pages (KYC-11); KYC docs unencrypted/unlogged.

**Subscription → Purchase → Activation → Expiration → Downgrade**
- Purchase→approve→activate ✅; expiry-downgrade RPC ✅ but **manual-invoked (no cron)**; no manual downgrade UI; activation email inconsistent.

**Coupon → Redemption → Restriction → Expiration**
- Redemption RPC ✅ but **restrictions/types/limits not honored**; UI hardwired to "Pro plan."

**Chat → Reporting → Moderation → Fraud → Review Queue**
- Chat + fraud keyword detection ✅; report→admin queue ✅; **off-platform auto-penalties + credential masking missing**; fraud rarely triggers automated action.

**Invoice → Generation → Storage → Download → Verification**
- Generate + PDF + public `verify.$invoiceNumber` ✅; **email-on-generate + settlement-trigger gaps**.

**Dispute → Freeze → Review → Resolution**
- Open + evidence + admin resolution/split ✅; **freeze step entirely missing (break); evidence public; no SLA/escalation/priority**.

---

## SECTION 11 — EXACT FILES REQUIRING MODIFICATION

**Escrow / dispute fund safety (CRITICAL)**
- `src/lib/marketplace/disputeService.ts` — on `createDispute`, set order `payout_status`/status to frozen/under_review.
- `src/lib/wallet.functions.ts` — `checkAndReleaseEscrows()` must exclude orders with open disputes; `completeOrderAndCreditSeller` guard against disputed orders.
- New migration — add `disputes.status` enum/CHECK; add order freeze columns; add `deleted_at` soft-delete columns.

**Storage security (CRITICAL)**
- New migration — set `dispute-evidence`, `chat-attachments`, `report-screenshots` buckets `public=false`; add owner/staff-scoped RLS.
- `src/lib/marketplace/disputeService.ts` — replace `getPublicUrl` with signed-URL access for evidence.
- `scratch/create_listing_credentials.cjs` → fold into a real migration; encrypt credential fields; add `credential_access_log` + reveal logging.

**Coupons / newsletter / ads (broken/dead)**
- `src/lib/wallet.functions.ts` (`applyCoupon`) + `apply_coupon_server` RPC — honor type/value/restrictions/limits; fix hardcoded notification.
- New `src/routes/_authenticated/admin.coupons.tsx` — coupon CRUD + restrictions.
- `src/routes/_authenticated/admin.newsletter.tsx` — wire `handleSend` to real email dispatch.
- `src/routes/_authenticated/seller.ads.tsx` — replace fabricated metrics with real event data or remove claims.

**Search / order room / delivery (missing)**
- New `src/routes/search.tsx` (+ wire `index.tsx` hero + navbar) using `services.ts`.
- New buyer order-room route/component (timeline + chat + dispute + countdown).
- `src/routes/_authenticated/seller.delivery.tsx` + new buyer verify flow — 3-phase account delivery, ownership transfer, safety instructions.

**Auth / security hardening**
- `src/routes/signup.tsx`, `login.tsx`, `src/lib/auth.functions.ts` — CAPTCHA, age checkbox, reserved-username block, password complexity, OTP rate-limit/lockout.
- Admin/owner — 2FA enrollment; enforce `role_permissions` server-side per privileged write in `src/lib/admin/*.functions.ts`.

**Schema hygiene**
- Consolidate root `*.sql` + `scratch/*.cjs` table creators into `supabase/migrations/`.
- Add unified `audit_logs`; indexes on disputes/orders + listings full-text; per-category commission/cooldown + `category_field_definitions`.
- Resolve wallet-vs-per-order: deprecate `wallets`/`seller.wallet.tsx` or formally adopt hybrid (update spec).

**Schedulers**
- Add pg_cron (or external scheduler) for `check_and_downgrade_expired_subscriptions`, escrow release, listing/boost expiry (DB-20).

---

## SECTION 12 — PRIORITIZED EXECUTION PLAN

**P0 — Financial integrity & data exposure (do first)**
1. Freeze payout on dispute open + exclude disputed orders from auto-release (`disputeService.ts`, `wallet.functions.ts`, migration). *Verify:* open dispute on a `buyer_reviewing` order → run release job → seller NOT credited; payout shows frozen.
2. Make `dispute-evidence`/`chat-attachments`/`report-screenshots` private + signed URLs. *Verify:* anonymous fetch of an evidence URL returns 403.
3. Encrypt `listing_credentials` + add reveal/access logging. *Verify:* raw DB row shows no plaintext; each reveal writes a log row.

**P1 — Decide & fix contradictions / broken actions**
4. Resolve wallet vs per-order settlement (product decision) and align UI + spec.
5. Fix coupon engine (honor type/restrictions/limits; remove hardcoded "Pro"). *Verify:* a fixed-₹ coupon applies correct discount at checkout; limits enforced.
6. Wire newsletter send; remove or back fabricated ads/boost analytics.
7. Consolidate out-of-migration schema into `supabase/migrations/`; add `disputes.status` enum + `deleted_at`.

**P2 — Close core marketplace workflow gaps**
8. Global search results page + suggestions.
9. Buyer order room (timeline, chat, dispute, protection countdown).
10. 3-phase account delivery + buyer verify + ownership transfer + safety instructions.
11. Badge propagation to listing cards/search/order pages.
12. Cron scheduler for subscription/escrow/listing/boost expiry.

**P3 — Security & governance hardening**
13. 2FA for admin/owner; CAPTCHA + rate-limiting + lockout; age checkbox; reserved usernames; password complexity.
14. Server-side enforcement of `role_permissions` per privileged action; unified `audit_logs`; KYC/credential access logging.
15. Distinct Owner panel + global emergency controls + manual balance adjustment.

**P4 — Configurability, analytics, completeness**
16. Move hardcoded commission/boost/coupon/plan pricing into `platform_settings` + admin UIs (GOV-01).
17. Per-category commission/cooldown + dynamic field-definition table + "Other/Not Listed".
18. Analytics charts/date-range/export; email preferences + retry/queue + SMS/push.
19. Independent ad system; policy CMS + version/consent logging; bulk admin actions; missing listing states (preview, fee preview, expiry, analytics).

---

### Confidence & caveats
- Findings are based on static reading of routes, lib/server functions, and SQL. Deployed DB may differ from migrations because several objects are created by ad-hoc scripts (flagged in §6/§9).
- P0 items 1–3 were re-verified against source and are high-confidence. Items relying on truncated reads (some admin route internals) are marked Partial rather than asserted Fully.
- This audit makes no code changes, per instructions.
