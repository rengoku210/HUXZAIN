# HUXZAIN — Final Production Audit (Pass 1: Seller Plans, Listing Expiry, Promotions, Escrow)

**Date:** 2026-07-02
**Auditor scope honesty:** This is **Pass 1**. It is grounded strictly in (a) the official spec doc `docxx/lisitngs expiry details- Huxzain.docx` (a 5-part mega-doc: seller plans, universal listing expiry, verification-badge expiry, the full promotion system, escrow, withdrawals, dormant earnings, subscription-expiry behaviour), (b) the existing repo `REQUIREMENT_TRACEABILITY_MATRIX.md` (300+ reqs, 2026-06-17), and (c) direct reads of the live code/migrations. The remaining **9 docxx docs** (per-category delivery flows ×5, notifications/emails part 2, categories ×2, seller subscription plans full detail) are **NOT yet line-by-line audited** — flagged at the bottom.
**Conflict rule:** Documentation wins.

## Legend
✅ FULLY · 🟨 PARTIAL · 🟥 NOT-IMPLEMENTED · ⚠ IMPLEMENTED-DIFFERENTLY · ❌ BROKEN

---

## RTM delta — grounded in `lisitngs expiry details- Huxzain.docx`

| ID | Requirement (spec source) | Status | Current implementation (file/table) | Gap | Recommended fix |
|----|---------------------------|--------|-------------------------------------|-----|-----------------|
| EXP-01 | Every listing has **exactly 30-day** validity, all categories, all plans (Part 1 §Universal Listing Expiry) | 🟨→✅ *(fixed this pass)* | `listings.expiry_date` added `20260702150000`; now `DEFAULT now()+30d` + backfill | Was: column existed but null/undefaulted | **DONE**: default + backfill migration |
| EXP-02 | Seller dashboard shows countdown "Expires in 27 Days / Tomorrow / Expired" (Part 1 §Listing Expiry Process) | 🟨→✅ *(fixed this pass)* | `seller.listings.tsx` `expiryLabel()` + row render | Was: not displayed | **DONE**: countdown column added |
| EXP-03 | Renew restarts a **fresh 30-day** cycle (Part 4 §Listing Renewal) | ✅ | `seller.listings.tsx` `executeRenew()` = +30d, status active | none | — |
| EXP-04 | Expired listing → status **"Expired"**, hidden from buyers, still visible in seller dashboard (Part 1 §When a Listing Expires) | ⚠ | Code uses `status='archived'` + `expiry_date<now`; enum lacks `expired` | Uses `archived`, not a distinct `Expired`; buyer-side hide relies on category query filters (needs verify) | Add `expired` to `listing_status` enum OR standardise on `expiry_date`; verify category/search queries exclude expired |
| EXP-05 | Expiry reminder notifications 7/3/1/expiry-day via bell (Part 1) | 🟥 | none | No scheduled job emitting listing-expiry notifications | Add cron (pg_cron / edge) → Notification Engine events |
| PLAN-EXP-01 | On subscription expiry, auto-downgrade to Standard; **never delete** profile/ratings/orders/history (Part 1, Part 5) | 🟨 | `20260604113000` downgrade fn exists (per RTM PLAN-10) | Auto-downgrade fn present; "paused excess listings" NOT built | Wire scheduled downgrade + paused-listing logic |
| PLAN-EXP-02 | Excess active listings on downgrade → **"Paused — Plan Limit Exceeded"**, hidden from buyers, restorable (Part 1, Part 5) | 🟥 | none; enum has no `paused_limit` state | Entire subsystem missing | New status + downgrade hook + seller "choose which stay active" UI |
| PLAN-EXP-03 | Unused Featured/Homepage credits **expire** at cycle end, never carry over; renewal = fresh allocation (Part 5 §Renewal) | 🟥 | Featured-credit ledger not found | No per-cycle credit reset logic | Build credit ledger tied to billing cycle |
| PROMO-IND-01 | Each promotion (Featured / Homepage / Boost / Glow / Urgent) has **independent** timer; multiple can co-exist on one listing (Part 4) | 🟨 | `listings.is_featured/is_homepage_featured/is_urgent/has_glow/boost_score` booleans; `glow_expires_at` added this pass | Booleans have no per-feature expiry (except glow); no independent timers | Model each promotion with its own `*_expires_at` or a `promotions` rows table |
| PROMO-ACT-01 | Activated promo **survives** subscription expiry until its own timer; unused benefits die with subscription (Part 3/4/5, "General Rule") | 🟥 | none | No distinction unused-vs-activated | Enforce in downgrade job |
| VBADGE-01 | Verification Badge is a **separate paid product** (Monthly 30d / 6-Month / Yearly), auto-disappears on expiry from profile/listings/search/cards; reminders 15/7/3/0 (Part 1 §Seller Verification Badge) | 🟨 | `seller.verification.tsx` badge card exists; RTM BADGE-03 "no expiry logic" | Expiry auto-removal + reminders missing | Build badge expiry job + reminder events; ref screenshot pricing ₹499/2399/3999 (see §2 build) |
| VBADGE-02 | Badge **included** while Pro/Elite/Enterprise active; disappears on downgrade if not separately purchased (Part 1) | 🟥 | none | Inclusion/inheritance logic missing | Derive badge from active plan OR standalone purchase |
| KYC-DOC-01 | Verification requires **2 different** govt IDs; same type must be **disabled** in 2nd selector; + selfie-with-ID + address proof; staff-only visibility (Part 3 §Verification Documents) | 🟨 | `seller.verification.tsx` collects govt/selfie/address; single govt upload | Only one govt ID; no "two different types w/ dedupe" enforcement | Add 2nd govt-ID selector with type-exclusion |
| URGENT-01 | Urgent Sale ₹149, lasts until listing expires, does **not** carry to renewed listing (Part 3) | 🟨 | `listings.is_urgent`; boosts page has urgent at ₹79 (RTM BOOST-01 mismatch) | Pricing ₹79≠₹149; no "clears on renew" | Set ₹149 via config; clear `is_urgent` on renew |
| ESC-CAT-01 | **Per-category** escrow hold durations, admin-configurable, from commission table (Part 3 §Category-wise Escrow) | 🟨 | `plan_category_rules` (Platform Settings §4) has escrow_hold_days per category/plan; `escrow.ts` hardcoded per RTM ESC-03 | Config table exists but escrow logic reads hardcoded values | Point escrow calc at `plan_category_rules` |
| WD-FREQ-01 | Withdrawal frequency gated per plan (Standard 1/10d, Pro 2/10d…); block early with "next request in N days" (Part 3 §Withdrawal Requests) | 🟨 | `seller.withdrawals.tsx` submits; plan gating not enforced | No per-plan frequency check | Enforce using `seller_plans.withdrawal_requests`/period |
| WD-STAT-01 | Withdrawal statuses: Submitted/Under Review/Approved/Processing/Completed/Rejected (+reason) (Part 3) | 🟨 | RTM ESC-20: only 3 of 9 | Missing intermediate statuses + reason display | Extend status enum + UI |
| DORM-01 | Dormant earnings: reminders at 30d; dormant on 61st day; reactivation fees 2/5/8/10/20% by age (Part 3 §Dormant) | 🟥 | none | Entire dormant subsystem missing | New: balance-age monitor job + reactivation-fee calculator + UI |
| TERM-01 | Use "Escrow Hold / Settlement" terminology, avoid "cooldown"/"wallet" (Part 3) | ⚠ | `seller.wallet.tsx` uses "Wallet" (RTM ESC-10 VIOLATED) | Terminology drift | Rename per spec |

---

## Fixes applied in this pass (verified `bun run typecheck` = 0 errors)
1. **Universal 30-day expiry** — `supabase/migrations/20260702150000_listing_expiry_and_glow.sql`: `expiry_date` now `DEFAULT now()+30 days` + backfill of existing rows (`created_at + 30d`). *(Migration must be applied to the DB.)*
2. **Expiry countdown UI** — `src/routes/_authenticated/seller.listings.tsx`: `expiryLabel()` renders "Expires in N Days / Expires Tomorrow / Expired" per row.
3. *(from §5, prior)* Listing states overhaul (removed "Hidden", Promoted/Expired tabs, promo icons from real flags, Expire/Renew, Promote→Promotion Center), sidebar consolidation, Promotion Center rebrand.

## Highest-priority remaining gaps from THIS doc (not yet built)
- 🟥 **Paused — Plan Limit Exceeded** subsystem (downgrade must pause, not delete, excess listings).
- 🟥 **Subscription credit lifecycle** (Featured/Homepage credits: per-cycle allocation, no carry-over, activated-survives-expiry).
- 🟥 **Dormant earnings** engine (monitor + reactivation fees).
- 🟥 **Badge/verification expiry** automation + reminder notifications.
- 🟨 **Per-category escrow** wired to `plan_category_rules` instead of hardcoded `escrow.ts`.
- 🟨 **Withdrawal frequency gating** + full status set.

## NOT yet audited (remaining docxx docs — require their own passes)
- `universal delivery workflow - huxzain.docx` (13k words)
- `gaming account delivery flow.docx` (12k) · `ingame credits etc delivery flow.docx` (8k) · `freelance service flow etc delivery.docx` (9k) · `coaching and game buddy services.docx` (7k)
- `huxzain - notificaation and emails part 2.docx` (13k)
- `Category and huxzain features.docx` (10k) · `huxzain categories.docx` · `Seller subscription plans full detail.docx` (8.5k)

**Production readiness (this area): NOT READY.** The universal-expiry surface is now spec-aligned, but the subscription-lifecycle, paused-listing, credit, dormant, and badge-expiry subsystems this doc mandates are unbuilt.

---

# PASS 2 — `Seller subscription plans full detail.docx` (8,508 words, read in full)

**Headline:** the centralized **Finance Engine (HX-007, `20260701130000_finance_engine_config.sql`) is EXACTLY spec-compliant** — a strong result.

| ID | Requirement (spec) | Status | Evidence | Gap / Action |
|----|--------------------|--------|----------|--------------|
| FIN-COMM-01 | Commission matrix per category×plan (Gaming 18/16/14/12 … Advertising 10/9/8/7) | ✅ | `commission_config` seed L31-41 | **Exact match** — no change |
| FIN-ESC-01 | Escrow hold per category×plan (Gaming 14/10/7/5 … Instant=0) | ✅ | `escrow_config` seed L57-67 | **Exact match** — no change |
| FIN-SET-01 | Settlement processing + withdrawal freq (Std 7d/1×10d, Pro 4d/2×10d, Elite 3d/1×5d, Ent 2d/1×2d) | ✅ | `settlement_config` seed L83-87 | **Exact match** — no change |
| PLAN-PRICE-01 | Monthly pricing Pro ₹2,999 / Elite ₹4,999 / Enterprise ₹9,999; Verified ₹499 | ⚠→✅ *(fixed)* | `subscription_plans_config` had ₹299/599/999/149; `tier-context.tsx` Enterprise ₹10,000 | **FIXED**: migration `20260702160000` + tier-context 10000→9999 |
| PLAN-LIMIT-01 | Listing limit/category: Std 1 / Pro 5 / Elite 10 / Enterprise 30 | ⚠→🟨 *(data fixed)* | seed had 1/6/11/99999 | **FIXED (data)** via migration; **enforcement at listing-create still 🟥** |
| GOV-01 | No hardcoded business logic — pricing/features must come from config | ⚠ | `tier-context.tsx` still hardcodes prices/features | Values now match spec, but should read `subscription_plans_config` at runtime (refactor pending) |
| CREDIT-ALLOC-01 | Featured Listing Credits: Pro 5×10d / Elite 10×20d / Enterprise 30×30d | 🟥 | no config table/columns found | Build credit-allocation config + ledger |
| CREDIT-ALLOC-02 | Homepage Featured Credits: Pro 1 / Elite 2 / Enterprise 5 (24h each) | 🟥 | none | Same subsystem |
| SUPPORT-PRI-01 | Support queue priority Enterprise→Elite→Pro→Standard; plan tag on tickets | 🟥 | not verified in tickets UI | Add plan-tag + priority sort |
| DASH-TIER-01 | Tiered dashboards (Std basic / Pro graphs / Elite advanced / Enterprise reports) + Business Health Score | 🟨 | partial analytics exist | Score + tiered gating unbuilt |
| PAUSE-01 | (reconfirmed from Pass 1) excess listings → "Paused – Subscription Limit Exceeded" on downgrade | 🟥 | none | Backbone subsystem |

**Conflict logged:** Platform Settings screenshot mockups show Enterprise ₹8,999 / Gaming-Enterprise 8%; the official doc says **₹9,999 / 12%**. Per "documentation wins", the doc values are authoritative and are what the config now holds.

**Fixes applied Pass 2 (typecheck 0 · build ✓ 10.27s):**
- `supabase/migrations/20260702160000_reconcile_plan_pricing_to_spec.sql` — plan prices + listing limits → spec.
- `src/lib/seller/tier-context.tsx` — Enterprise ₹10,000 → ₹9,999.

---

# PASS 3 — `universal delivery workflow - huxzain.docx` = **Document 1: Universal Marketplace Engine** (13,033 words, 11 parts, read in full)

**Reuse-first verdict:** Document 1 describes the ENTIRE marketplace engine (create-listing → moderation → payment verification → order room → inspection → escrow → dispute → settlement → universal automations). Per the mature-repo rules, **nothing was rebuilt** — these systems already exist (`admin.listings`, `moderation_tables`, `checkout`/`admin.payments`, `messages.tsx` order room, `escrow.ts`/`wallet.functions`, `disputeService`, Notification Engine `notifications/hooks.ts`, Finance Engine). Only a spec conflict was patched.

| ID | Requirement (Doc 1) | Status | Evidence / existing system | Gap / Action |
|----|--------------------|--------|----------------------------|--------------|
| ENG-EXPIRY-01 | Listing expiry window = **30 days from APPROVAL**, not creation (Part 4 "Initial Listing Status") | ⚠→✅ *(fixed)* | `admin.listings.updateStatus` now stamps `expiry_date` on activation; migration no longer defaults at insert; drafts keep NULL | **FIXED** — conflict with Pass-1 default resolved |
| ENG-STATUS-01 | Full status set incl. **Changes Requested** + **Paused (Sub-Limit Exceeded)** (Part 4/8; Doc 2 filter list) | 🟨 | §5 UI has Draft/Pending/Active/Promoted/Expired/Sold | "Changes Requested" + "Paused" states not yet modelled — tied to moderation "Request Changes" + downgrade subsystem |
| ENG-MOD-01 | Manual moderation queue, approve/reject/**request-changes**, structured reject reasons, moderator notes, history | 🟨 | `admin.listings` approve/reject + `onListingApproved/Rejected` + `moderation_tables` | Approve/Reject ✅; **Request Changes** middle-state + structured reason enum pending |
| ENG-PAY-01 | Manual payment verification; seller notified **only after** approval; auto order-room + welcome msg | ✅ (reuse) | `checkout.*`, `admin.payments`, `messages.tsx` welcome, `hooks.onPaymentApproved` | Matches spec (payment-first design already noted in walkthrough) |
| ENG-INSPECT-01 | Buyer inspection page + mutual completion + auto-complete on timer expiry | 🟨 | order room + wallet auto-release timer | Category-specific inspection checklists + explicit mutual-completion UI pending |
| ENG-ESC-01 | Escrow hold → Settlement Available → withdrawal; separate balances (Escrow/Available/Dormant) | 🟨 | `escrow.ts`, `wallet.functions`, `finance_engine_config` | Escrow+settlement ✅; **Dormant** bucket still 🟥 (Pass 1) |
| ENG-AUTO-01 | Background automations: auto-expire listings, auto-release escrow, auto-complete orders, auto-pause on downgrade | 🟥 | no `pg_cron`/scheduler found (RTM DB-20) | Scheduled-job layer is the key missing automation backbone |
| ENG-SCORE-01 | Listing Quality Score + Security Score at create (never block publish) | 🟨 | Security Score computed on product page (admin-only, Pass 1 §1); Quality Score not found | Add Quality Score calc + seller-guidance UI |

**Fixes applied Pass 3 (definitive `tsc` = 0 · build ✓ 10.68s):**
- `src/routes/_authenticated/admin.listings.tsx` — set `expiry_date` = now()+30d on approval (spec: 30 days from approval).
- `supabase/migrations/20260702150000_...` — removed insert-default; backfill only `status='active'` rows.
- `src/routes/_authenticated/seller.listings.tsx` — added real DB columns (`expiry_date`, `is_featured`, `is_homepage_featured`, `is_urgent`, `has_glow`, `glow_color`) to the `Listing` type. **This also fixed 5 latent type errors** in the Pass-1 promo-icon code that the `bun` typecheck wrapper had masked (incremental cache); the definitive `npx tsc` caught them. *Verification note: all future passes verified with `npx tsc -p tsconfig.json --noEmit`, not the bun wrapper.*

---

# PASS 4 — `Category and huxzain features.docx` (9,644 words, read in full)

**Reuse-first verdict:** overlaps Docs 2–3 (seller plans, promotions) + adds the **category taxonomy** (12 categories → sub-categories → listings) and a **promotion pricing table**. No engine rebuilt.

| ID | Requirement (Doc) | Status | Evidence / system | Gap / Action |
|----|-------------------|--------|-------------------|--------------|
| PROT-FEE-01 | Buyer Protection: general 5% / ₹499 / ₹799 / ₹999 tiers; Gaming 5% flat; min order ₹1,000 | ✅ | `buyer_protection_config` seed (`20260701130000`) L107-115 | **Exact match** — verified, no change |
| PROMO-URGENT-01 | Urgent Sale = **₹149 flat**, active **until listing expires**, not restored on renew | ⚠→✅ *(fixed)* | `seller.boosts.tsx` charged ₹79 / 3 days | **FIXED**: price ₹149; duration now derived from listing `expiry_date` (fallback 30d); display "until listing expires" |
| PROMO-PRICE-02 | Boost/Glow duration-tiered pricing (24h ₹49 / 1wk ₹199 / until-expiry ₹349) | 🟨 | boosts page uses flat per-type price (push ₹49, glow ₹119) | Duration-tiered model = larger Promotion-Center reconciliation (matches the screenshot flows) — documented, not hacked |
| CAT-TAX-01 | 12 main categories → sub-categories (game titles etc.) → listings; admin-configurable, nothing hardcoded | 🟨 | `category_engine_config` + `category_field_config` (`20260702130000`) drive dynamic forms/delivery; `categories` table hierarchy (RTM CAT-01/04) | Field/delivery engine ✅; full sub-category browse taxonomy + admin CRUD (RTM CAT-02/03) pending |
| CREDIT-ALLOC-03 | Featured (Pro 5×10d/Elite 10×20d/Ent 30×30d) + Homepage (1/2/5 ×24h) credits, stacking, no carry-over | 🟥 | none | Confirms Pass-2 CREDIT-ALLOC gap — credit ledger subsystem unbuilt |

**Fixes applied Pass 4 (`tsc` 0 · build ✓):**
- `src/routes/_authenticated/seller.boosts.tsx` — Urgent Sale ₹79→₹149; duration wired to listing `expiry_date`; listings fetch now selects `expiry_date`; option-card duration label corrected.

**Regression audit (promotions-pricing subsystem):**
- ✅ No stale ₹79 / 3-day logic remains anywhere (repo-wide grep clean).
- ✅ Charged amount derives from single source `selectedOption.price` → propagates identically to QR, confirm dialog, pay button, `purchaseBoost` charge, and admin boost record (`amount_inr`) and downstream invoice.
- ✅ Buyer-facing urgent badge uses `is_urgent` flag (no price) — unaffected. `admin.payments` `urgent_delivery_fee` is a distinct concept — correctly untouched.
- ✅ Cross-module consistency verified: seller purchase ↔ wallet ↔ admin ↔ invoice all agree on ₹149.

---

# PASS 5 — `huxzain categories.docx` (recap, 0.3k) + `gaming account delivery flow.docx` = **Document 2: Gaming Accounts** (11,972 words, read in full)

**Reuse-first verdict:** a category layer over the universal engine. Credential vault verified as spec-compliant; no rebuild.

| ID | Requirement (Doc 2) | Status | Evidence / system | Gap / Action |
|----|--------------------|--------|-------------------|--------------|
| GAME-CRED-01 | Credentials encrypted, never public/indexed/in-email/in-API, delivered in Order Room post-payment, every view logged | ✅ | `20260617130000_encrypt_listing_credentials.sql`, `credential_access_log`, private buckets (RTM STOR-01..04) | **Verified compliant** — no change |
| GAME-SEC-SCORE-01 | Security Score is a **public buyer-facing** trust signal (Part 6/7) | ⚠ **CONFLICT** | Code gates it admin-only (Pass-1 §1) per your **session-1 instruction** to remove it from buyers | **Doc vs your explicit prior instruction.** NOT silently reversed — flagged for your decision |
| GAME-QUAL-SCORE-01 | Listing **Quality Score** (buyer-facing, seller guidance, never blocks publish) | 🟥 | not found | Not implemented — distinct from Security Score |
| GAME-FIELDS-01 | Per-game dynamic field configs (Valorant blueprint + 15 games), admin-configurable | 🟨 | `category_field_config` drives category-level fields | Per-game (sub-category-level) field configs not built |
| GAME-OTHER-01 | "Other Game" smart category creation + fuzzy dedup (CS2 = Counter-Strike 2) | 🟥 | none | Not implemented |
| GAME-INSPECT-01 | Gaming delivery checklist / "Secure Your Account" panel + game-specific inspection items | 🟥 | universal inspection only | Category-specific inspection UI pending |

**Phase A status:** 6 of 10 docs audited (this + prior). **Remaining 4:** ingame-credits, freelance, coaching/game-buddy delivery flows + notifications-&-emails pt2. These are category-delivery layers that map to the existing `universal_delivery_engines` (`Instant/Credentials/Manual/Session/Booking/Hybrid/OTP/File/Appointment/Admin`) — audit is verification-weighted, not new builds.

---

# PHASE C (begun) — Production Security Hardening

**SEC-DISPOSABLE-01 — Disposable/temporary email detection** ✅ IMPLEMENTED (defence in depth)
- New shared util `src/lib/security/disposable-email.ts` — ~110 curated disposable domains + exact/subdomain match; extensible `Set` for future admin-managed list.
- **Backend gate** (real enforcement): `auth.functions.ts requestOtp` rejects before any OTP is generated/sent → **covers ALL callers** (signup, login, verify-email resend, account email-change) — verified by grep.
- **Frontend gate** (UX): `signup.tsx` rejects before submit.
- Blocks: fake-account creation, spam-listing/spam vectors, OTP-abuse via throwaway mailboxes.
- Verified: `npx tsc` = 0 · `npx vite build` = ✓.
- Regression: single server-side choke point means no OTP path is left unprotected; existing valid-email flows unaffected (real domains pass).
