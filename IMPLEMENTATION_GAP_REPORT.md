# HUXZAIN — Implementation Gap Report

**Generated:** 2026-06-17
**Companion to:** `REQUIREMENT_TRACEABILITY_MATRIX.md`
**Purpose:** Risk-ranked list of every gap, to drive the fix phase. Ordered by blast radius: financial integrity → data exposure → core-purchase blockers → governance → missing systems → polish.

---

## Already fixed (prior + this session, on branch `wip/p0-finishing-prior-session`)
- **P0.1 dispute payout-freeze** (ESC-09, DISP-03/07) — verified present in `disputeService.ts` + `wallet.functions.ts`.
- **P0.2 private buckets + signed URLs** (SEC-24/25, DISP-05, STOR) — migrations + `signedUrls.ts` + `SignedImage.tsx`; extended to payment-proofs, chat-attachments (incl. `ChatWindow.tsx` fix this session).
- **P0.3 credential encryption + reveal logging** (STOR-01..04) — migrations written, 4 consumer sites rewired to RPCs.
- **Bucket RLS tightening** (owner/staff-scoped) — migration `20260617140000`.

> ⚠️ **3 migrations are written but NOT applied** (`20260617120000`, `...130000`, `...140000`). Everything above is "verify-after-apply." Applying `private_sensitive_buckets` will 403 any existing `getPublicUrl` links until consumers (now signed-URL aware) are deployed together.

---

## TIER 1 — Financial integrity (fix first)

### G1. Subscription pricing mismatch: DB ≠ frontend ≠ spec  `[PLAN-02/05/06/07, GOV-01]`
- **Frontend** (`tier-context.tsx:51/68/86/105`): ₹499 / ₹2999 / ₹4999 / ₹10000 (matches spec).
- **DB seed** (`20260604113000:23-26`): ₹149 / ₹299 / ₹599 / ₹999 (≈90% under spec).
- **Risk:** Whichever value the *charge/record* path reads determines real revenue. A seller billed against the DB row pays 1/10th. This is a live financial defect.
- **Fix:** Make spec values authoritative, source pricing from `subscription_plans_config` (single source), remove the frontend hardcode, write a migration correcting the seeded prices. Verify the purchase→record path reads the corrected value.

### G2. Wallet vs per-order settlement conflict  `[ESC-10 VIOLATED]`
- `seller.wallet.tsx` presents a generic pooled "Available/Pending balance" wallet — directly contradicts Part 35 (per-order settlement only), which the doc's governance note confirms is authoritative.
- `seller.withdrawals.tsx` + `payout-calculator.ts` already implement the *correct* per-order model.
- **Fix (decided last session — per-order wins):** Deprecate the wallet UI. Either remove `seller.wallet.tsx`/route or convert to read-only "Earnings Summary" (no withdrawable balance, no "Withdraw" button), linking to per-order withdrawals. Keep `wallet.functions.ts` aggregation only for internal/admin analytics. Remove the seller-facing wallet nav entry.

### G3. Hardcoded business logic  `[GOV-01]`
- Pricing, cooldown durations (`escrow.ts:24-77`), listing limits, boost tokens, boost prices (`seller.boosts.tsx:18-61`) all hardcoded; spec requires admin-configurable.
- Boost prices also wrong vs spec (Urgent ₹79≠₹99, Glow ₹119≠₹149).
- **Fix:** Move to `platform_settings` / config tables; read at runtime. Correct the wrong boost values. (Large; can be staged — pricing first, cooldowns next.)

### G4. No protection-fee / commission logic  `[FEE-01..05, ORD-03]`
- Commission rates and optional protection fee are documented but absent from checkout. No fee breakdown at checkout (LIST-27, ORD-03).
- **Fix:** Implement config-driven commission + optional protection fee; surface the breakdown at checkout.

---

## TIER 2 — Data exposure & security (after T1, partly done)

### G5. CAPTCHA / bot protection absent  `[AUTH-16, SEC-12]`
- No anti-bot on signup/login. High-risk marketplace.
- **Fix:** Integrate a CAPTCHA (hCaptcha/Turnstile) on signup + login.

### G6. No confirmation safeguards on destructive admin ops  `[SET-07]`
- Delete listing, suspend seller, refund, freeze — no confirm dialogs.
- **Fix:** Add confirmation modals to destructive admin actions.

### G7. KYC access not logged  `[KYC-22, OWNER-08]`
- Viewing KYC docs / credential reveals partially logged (creds now logged via P0.3) but KYC document views are not.
- **Fix:** Add access-log inserts on KYC document view (mirror the P0.3 credential_access_log pattern).

### G8. Fraud detection logs but does not enforce  `[FRAUD-05/06/07, MOD-02/03]`
- External-contact detection warns + logs to `fraud_events`, but no visibility reduction / payout delay / suspension is triggered.
- **Fix:** Wire detection → strike system → enforcement.

---

## TIER 3 — Core purchase-flow blockers (a real user can't finish documented flows)

### G9. Gaming-account 3-phase / hybrid delivery missing  `[LIST-10, DEL-04/05/06]`  ← client pain point
- Only instant/manual toggle. No Phase 1/2/3 orchestration, no in-chat ownership-transfer flow, no OTP assist.
- **Fix:** Implement 3-phase delivery state machine for account categories, in-platform.

### G10. Non-gaming listing forms missing  `[LIST-11..16]`
- Types defined but NO create-listing UI for ingame-currency, giftcard, software, coaching, game-buddy, freelance. Sellers can't list in 8+ categories.
- **Fix:** Render category-specific dynamic forms for each type.

### G11. Listing moderation queue missing  `[LIST-25, MOD-01]`
- Auto-flag keywords exist; no admin approve/reject/request-edit workflow. Listings can go live unreviewed.
- **Fix:** Build moderation queue + enforce pending-review status.

### G12. Reviews not shown publicly + no completion gate  `[REV-01/02/06]`
- `submitReview()` doesn't validate order completion / verified buyer; reviews never render on public listing/profile.
- **Fix:** Add completion+buyer validation; render reviews on listing + seller profile.

### G13. Notifications: critical events silent  `[NOTIF-07/08/10/11, EMAIL-03/04, NOTIF-03]`
- No withdrawal/dispute/listing/KYC notifications; no notification-center UI; no seller/admin alert emails.
- **Fix:** Centralize event triggers; build notification center; add the missing email templates + triggers.

### G14. Platform Credits entirely missing  `[CRED-01..06]`
- No table, UI, or logic. Blocks compensation/partial-refund/promo flows.
- **Fix:** Schema + ledger + admin grant UI + buyer Credits section.

### G15. Buyer payment history missing  `[PAY-13]`
- Buyers can't see proof status / admin feedback.
- **Fix:** Buyer-facing payment/proof status page.

---

## TIER 4 — Governance / automation

### G16. No cron/scheduled tasks  `[DB-20]`
- Subscription expiry, escrow auto-release, listing/boost expiry, badge expiry (BADGE-03) rely on read-time hacks or nothing.
- **Fix:** pg_cron (or scheduled edge functions) for expiries + auto-release.

### G17. Auto invoice generation not wired  `[INV-01/06/09]`
- Invoices manual only; counter table dead; no email send.
- **Fix:** Trigger invoice on payment/settlement/boost approval; wire auto-numbering + email.

### G18. Trust score incomplete + duplicated  `[TRUST-01/02/03, KYC-21]`
- Formula missing ~6 factors incl. verification level; two implementations (JS vs SQL); effects mostly unwired.
- **Fix:** Reconcile to one authoritative calc; add missing factors; wire effects.

---

## TIER 5 — Missing systems (large, lower launch-risk)

| Gap | Reqs | Note |
|-----|------|------|
| G19. Advertisement system | AD-01..14 | ~entirely absent; boosts ≠ ads |
| G20. Coupon engine (admin + checkout) | COUP-01..10 | partial; no admin creation/checkout |
| G21. Custom staff role builder | ROLE-09/11/14 | hardcoded roles; no permission UI |
| G22. Category CRUD admin panel | CAT-02/03 | categories via SQL only |
| G23. Homepage CMS + announcement bar | HOME-13/14/15, ADM-21 | hardcoded content |
| G24. Owner separate dashboard | OWNER-03 | shared /admin |
| G25. Search: FTS, suggestions, analytics | SRCH-02/03/13/18 | basic only |
| G26. Policy CMS + 12 missing policy pages + consent logging | LEG-02/03/04/05/07 | legal exposure |
| G27. Analytics: category/search/fraud/export | ANL-04/09/12/22 | dashboards absent |
| G28. Referral + promo systems | REFER, PROMO | future-ready |

---

## TIER 6 — Polish / UX
- Username login (AUTH-09), reserved-keyword block (AUTH-05), age checkbox (AUTH-17), onboarding (AUTH-04/22)
- Listing preview (LIST-23), DnD image reorder + compression (LIST-17), listing analytics (LIST-29)
- Dispute reason enum (DISP-04), dispute priority/assignment (DISP-17/18), internal notes (DISP-11)
- 11 ticket categories (SUP-04), public Help Center (SUP-14), branded 404 (HOME-16)
- Seller responses to reviews (REV-12), verified-purchase indicator (REV-05)

---

## Open audit caveats (be honest)
1. **No screenshots/PDF/DOCX in session** — client visual feedback (Step 7) couldn't be verified against images; only `update_modal.txt` text + matched requirement IDs.
2. **Static audit** — FULLY rows verified by file evidence/wiring, not live runtime click-through. Runtime verification happens per-slice in the fix phase.
3. **3 P0 migrations unapplied** — all STOR/encryption/private-bucket items are verify-after-apply.
4. **Two trust-score implementations** — authoritative one undetermined.
