# HUXZAIN — Production Readiness Audit, Bug Report & Master Build Spec

**Generated:** 2026-06-29
**Inputs analysed (all read, none summarised blindly):**
- **Specification (product blueprint):** 10 `.docx` in `Downloads/docxx` — Category & features, Seller subscription plans, Listing expiry, Notifications & emails (part 2), Universal delivery workflow, Gaming account delivery, In‑game credits delivery, Freelance/business/advertising delivery, Coaching & game buddy, Categories list.
- **Client review (high‑priority feedback):** 35 annotated screenshots in `Pictures/Screenshots/repllllllay.zip` + 3 "new adds" mockups in `Downloads/new adds or edits.zip`. Every annotation, highlight and forwarded note was OCR‑read and is treated as authoritative client feedback.
- **Implementation:** current working tree at `D:/huxzain-trusted-exchange-flow-main` (TanStack Start + React 19 + Supabase), re‑verified against the existing in‑repo audits (`REQUIREMENT_TRACEABILITY_MATRIX.md`, `IMPLEMENTATION_GAP_REPORT.md`, `COMPLIANCE_AUDIT.md`, dated 2026‑06‑17).

**Method:** Spec (what it must do) ↔ Screenshots (what the client saw and rejected) ↔ Code (what actually exists today). Every finding is tagged with its grounding: `[CR-n]` = client screenshot, `[SPEC]` = docx requirement, `[CODE]` = verified in source. Nothing is invented; missing source data is flagged explicitly as **MISSING**, not filled in.

---

## 0. Critical context — what changed since the 2026‑06‑17 audit (read first)

The earlier in‑repo audit flagged 5 financial/security **P0** defects. **All 5 are now fixed in the current tree** — do **not** re‑report them as open:

| Prior P0 | Current status | Evidence |
|---|---|---|
| Dispute does not freeze payout | **FIXED** | `disputeService.ts:51-57` sets `orders.payout_status='disputed'`; `wallet.functions.ts:209-219` excludes disputed orders from auto‑release; `completeOrderAndCreditSeller` guards at `:81-97` |
| Sensitive buckets public | **FIXED** | `20260617120000` + `20260617140000` make `dispute-evidence`/`chat-attachments`/`report-screenshots` private + owner/staff RLS; `storage/signedUrls.ts` mints signed URLs |
| Credentials plaintext | **FIXED** | `20260617130000` encrypts `listing_credentials` (`pgp_sym_encrypt`), adds `credential_access_log`, reveal via `reveal_listing_credentials()` RPC with logging |
| Subscription pricing DB≠FE≠spec | **FIXED** | `20260617150000` corrects DB to 499/2999/4999/10000; matches `tier-context.tsx` |
| Pooled wallet contradicts per‑order | **FIXED** | `seller.wallet.tsx` now redirects to `/seller/earnings`; per‑order settlement only |

A **new moderation/enforcement system** also landed (`20260622150000_moderation_tables.sql` + `admin/moderation.functions.ts`): strike ladder (3→30‑day suspend, 5→permanent ban), DB write‑blocker triggers on listings/orders/messages/withdrawals/reviews/disputes, and Supabase‑Auth ban sync. Treat anti‑abuse items below as building **on top of** this, not from scratch.

**Net effect:** the remaining gap is no longer security/financial integrity — it is **(a) the entire communication layer, (b) category‑specific listing/delivery engines, (c) the fee/settlement transparency UI, and (d) ~20 concrete client‑review fixes.** That is what this document covers.

---
---

# PART 1 — COMPLETE BUG REPORT

Each bug: **Repro → Expected → Current → Root cause → Fix**, with grounding. Severity: **S1** launch‑blocker, **S2** major, **S3** minor/polish.

---

### BUG‑01 — Platform notifications do not fire to any role (only OTP email works) · **S1** · `[CR: 201541, 201731, 201840, 201219]` `[SPEC: notifications doc]`
- **Repro:** As a buyer, place an order on a listing and submit payment. As the seller, watch the bell/dashboard. As an admin/superadmin, watch the dashboard.
- **Expected (SPEC):** Per the notifications doc, a defined event fires at every step: *Buyer Places Order → buyer IA; Buyer Submits Payment → buyer IA+email, Payment‑team & Super‑Admin dashboard; Payment Approved → buyer IA+email AND seller IA "You have received a new order…" + seller email + Super‑Admin dashboard; Seller Has Not Responded (~3–4h) → seller IA+1 email*, etc. (47+ mapped events).
- **Current:** Client confirms across 4 separate screenshots: *"placed order, paid as well — no notifications came to seller… no notification to buyer that payment has been confirmed"*; *"no notifications coming to superadmin or admin or buyer or seller"*; *"notifications are not working properly except OTP."*
- **Root cause:** `src/lib/notifications.functions.ts` is ad‑hoc and only wired into a fraction of events (prior audit: ~40–60% of events missing; no centralized event bus; email is best‑effort with no per‑event triggers). OTP works because it is a separate Supabase/Resend path.
- **Fix:** Build the centralized notification+email engine in Part 2 → *Module A*. Every state transition in order/payment/listing/dispute/withdrawal/subscription/verification flows must call one `notify(event, recipients, payload)` dispatcher that writes the in‑app row, sends the templated email when the matrix says email=✅, and pushes the staff/super‑admin dashboard entry. This is the single highest‑priority item — the client states *"without notifications this platform won't work."*

### BUG‑02 — Notification dropdown items are not clickable (no deep‑link) · **S1** · `[CR: 201219/201221]`
- **Repro:** Open the bell dropdown → click any item (e.g. "Payment Received — Earnings", "New order received").
- **Expected:** *"make it open the page the notification is for, like payment received takes to orders page (seller side)."* Each notification carries a target route.
- **Current:** *"nothing happens when clicked to the notifications."*
- **Root cause:** Notification rows render without an `href`/`link` field; the schema/payload has no `target_url` / `entity_type+entity_id`.
- **Fix:** Add `link`/`target_url` (or `entity_type`+`entity_id`) to the notification model; make each row a navigable element; map each event type → route (order→`/seller/orders/:id` or `/orders/:id`, payment→orders, dispute→`/seller/disputes/:id`, withdrawal→`/seller/withdrawals`, listing→`/seller/listings/:id`, etc.). Mark‑as‑read on click.

### BUG‑03 — Seller not notified / new order not surfaced on placement · **S1** · `[CR: 201303, 201541]`
- **Repro:** Buyer places an order; seller checks dashboard immediately.
- **Expected:** Seller is notified ("New order received") and the order is visible. *"here it should show 1 or according to orders. just placed order and nothing appeared in dashboard, seller will not get notified about anything."*
- **Current:** Order queue *does* populate on the dedicated Orders page (`201330`, `202236` show counts), but the client reports the **dashboard overview** did not reflect it and **no seller notification** fired.
- **Root cause:** Two parts — (a) the notification miss (BUG‑01), and (b) the seller **Dashboard overview** cards may read a different/cached source than the Orders queue. **Needs runtime verification** of which dashboard card the client photographed; the notification half is confirmed broken.
- **Fix:** (a) covered by BUG‑01. (b) Verify `seller.index.tsx` order counters query the same `orders` source as `seller.orders.tsx`; ensure real‑time refresh (or invalidate on order insert).

### BUG‑04 — Gaming Account "Security Score" is shown on the public buyer product page · **S1 (conversion‑killer)** · `[CR: 201158, 201237, 202104, 202120]`
- **Repro:** Open any gaming‑account product page as a buyer.
- **Expected:** Client is explicit (4 screenshots): the score block *"should not be added here, it is for admins/superadmin only… people will run away like this."* and *"It will be shown to seller themself so they properly add details to score higher. So remove it from frontend and add it while listing at the bottom before they click add listing / submit."* and *"health score will be at bottom when a seller is listing… no need to show on frontend."*
- **Current:** Buyer product page renders "Gaming Account Security Score — 15 / High Risk" with the full pts breakdown (`seller.listings.tsx:757-804` collects it; product page displays it). The spec's "non‑blocking score" rule applies, but the client overrides *placement*: seller‑side + admin only.
- **Root cause:** Score component placed on the public `product.$id.tsx` view.
- **Fix:** Remove the Security/Quality score from the public product page. Render it (a) at the **bottom of the seller's Create/Edit Listing form** as a live improvement aid before submit, and (b) on the **admin/moderator** listing‑review page. Score must never block publishing `[SPEC]`.

### BUG‑05 — Payment‑proof form forces UTR + GSTIN; client wants screenshot‑only + instruction · **S2** · `[CR: 201251, 201303, 201856, 201906]`
- **Repro:** Buy → Upload Payment Proof. The "UTR / Transaction Reference" field is required ("Please fill out this field"); a "GSTIN (Optional — for B2B invoice)" field is shown.
- **Expected:** *"Remove both, UTR and GST."* / *"not required, only screenshot and instruction."* / *"here write instructions that 'Payment screenshot should contain full details of UTR id, sender name details etc' — AI it to write professionally."*
- **Current:** UTR is mandatory, GSTIN is present (`checkout.payment.tsx`).
- **Root cause:** Form retains UTR/GSTIN fields and validation.
- **Fix:** Hide/remove the UTR and GSTIN fields for now. Require only the screenshot upload. Add a professionally‑worded instruction line telling the buyer the screenshot must clearly show the full UTR/transaction ID, sender name and payment details. (Keep the OCR fraud‑scoring pipeline reading the screenshot; just drop the manual fields.)

### BUG‑06 — Admin "Trust, Safety & Chat V2 Console" chat rows are not openable · **S2** · `[CR: 201747]`
- **Repro:** Superadmin → Chat Monitoring → click a chat row (e.g. `HX‑CHAT‑000090`).
- **Expected:** *"super admin is not able to check the chats. when clicked it should open the chat."*
- **Current:** Rows render but clicking does not open the conversation (`admin.chats.tsx`).
- **Root cause:** Row has no click handler / no detail view wired to `getLiveConversation`.
- **Fix:** Make each monitoring row open the full conversation (read‑only) via `admin/moderation.functions.ts:getLiveConversation`; reuse the chat thread component in a modal/detail pane.

### BUG‑07 — Top‑nav "?" / contact icon should be removed; Help Centre belongs in profile menu · **S3** · `[CR: 201816, 201828]`
- **Expected:** *"remove the contact option, remove the question mark from here and add it in the profile option."* + *"HERE — 'Help Centre'"* (arrow at the profile dropdown).
- **Current:** A "?" help/contact icon sits in the top navigation; profile dropdown (Buyer Dashboard / Seller Dashboard / My Orders / Messages / My Account / Settings / Sign Out) has no Help Centre item.
- **Fix:** Remove the "?" icon from the header. Add a **"Help Centre"** entry to the profile dropdown linking to the (to‑be‑built) public Help Centre.

### BUG‑08 — Profile Settings has no email change; email/phone change lacks OTP · **S2** · `[CR: 201531]`
- **Repro:** My Account → Profile Settings.
- **Expected:** *"no email option. give option to change email or number with OTP authentication."*
- **Current:** Profile shows Display Name, Username, Country, Email Visibility, Phone (verified), Bio — but **no editable email field**, and no OTP‑guarded change flow for email/phone (`account.index.tsx`).
- **Fix:** Add an email field with a "Change email" flow guarded by OTP (email verification code) and a "Change phone" flow guarded by SMS OTP (`sms/phone-verification.functions.ts` backend already exists — wire it). Confirm to both old+new email per spec notification #8.

### BUG‑09 — Default avatar shows "huxin"; must be HUXZAIN default for all users · **S3** · `[CR: 201806]`
- **Expected:** *"in DP its coming 'huxin'… make it huxzain default picture for all users."*
- **Current:** A default‑avatar fallback was added in commit `ed37ebf` ("HUXZAIN Default Profile Picture"), but the client still observes the wrong/old default in places.
- **Root cause:** Inconsistent fallback source (some components still point at the old asset / a "huxin" placeholder).
- **Fix:** Audit every avatar render (navbar, profile, listing card, order room, chat, admin tables) to use the single HUXZAIN default asset. Verify the recent fallback util is the only path.

### BUG‑10 — Seller shown "online" when not · **S2** · `[CR: 201806]`
- **Expected:** *"seller showing online even though they are not."* Presence must reflect real activity.
- **Current:** Online/presence indicator is static or not driven by real session/heartbeat.
- **Root cause:** No last‑seen/heartbeat source; status likely hardcoded or derived from existence rather than activity.
- **Fix:** Drive presence from a real signal (Supabase Realtime presence or a `last_active_at` heartbeat with a freshness window, e.g. online if active < 2–5 min). Show "last seen" otherwise.

### BUG‑11 — "Invoice" action visible before order is completed · **S3** · `[CR: 202236]`
- **Repro:** Seller → Orders → a PENDING order shows an "Invoice" button.
- **Expected:** *"invoice option not visible until completed."*
- **Current:** Invoice action renders for PENDING/PROCESSING orders too (`seller.orders.tsx`).
- **Fix:** Gate the Invoice action to `status === completed` (and per spec, invoices auto‑generate on completion/settlement).

### BUG‑12 — Dummy/placeholder Featured & Trending listings are hardcoded · **S2** · `[CR: 201145]` `[SPEC: features doc]`
- **Expected:** *"remove all featured listings / trending listings dummies… featured listing is a paid option, only those who pay get featured… trending listing — the system should automatically place listings with highest clicks and sales… remove it as we'll test real‑life function."*
- **Current:** Homepage/category render hardcoded/dummy featured & trending content (`marketplace-data.ts`, `index.tsx`).
- **Root cause:** Static placeholder data; no paid‑featured source, no trending computation.
- **Fix:** Remove all dummy featured/trending data. **Featured** = driven only by paid Featured/Homepage credits (Part 2 → *Module E*). **Trending** = computed from real engagement (clicks + sales) — see Part 2. Until those exist, render empty/none rather than fakes (client accepts empty for testing).

### BUG‑13 — Listing‑attributes block leaks placeholder prompt text · **S3** · `[CR: 202215]`
- **Expected:** Clean dynamic attributes section.
- **Current:** The Create‑Listing "Listing Attributes" header literally reads *"(Auto‑updates based on Category)"* — internal prompt/scaffold text leaked into the UI. Client: *"refine all this, prompt ka words aa gya he."*
- **Fix:** Remove the leaked descriptor; render the dynamic per‑category attribute fields cleanly (tie to the dynamic category‑field engine, Part 2 → *Module D*).

### BUG‑14 — Public label "Gaming Accounts" should display as "Games"/"Gaming Marketplace" · **S3** · `[CR: 202326]`
- **Expected:** *"the category for gaming accounts will be named as Games or gaming marketplace not gaming accounts publicly. only when listing, the category will pop up as gaming accounts."*
- **Current:** "Gaming Accounts" used as the public nav/category label everywhere.
- **Fix:** Add a separate **public display name** vs **listing/internal name** for categories. Public surfaces (nav, category page, breadcrumbs) show "Games"/"Gaming Marketplace"; the seller's listing category selector shows "Gaming Accounts". (Best handled by the category CRUD/display‑name field in Part 2 → *Module H*.)

### BUG‑15 — Notification‑preference toggle page should be hidden for now · **S3** · `[CR: 201507]`
- **Expected:** *"notifications option remove or hide it for now, will check if we need later — but we want the seller to get notified when he gets orders and messages from buyer."*
- **Current:** Account → Notifications shows a full preference panel (Email Alerts, Order Updates, Dispute Alerts, Payout Alerts, Marketing, Push, In‑App) that isn't backed by a working engine.
- **Fix:** Hide the preferences panel for now. Ensure seller order + buyer‑message notifications fire unconditionally (BUG‑01). When the engine is complete, re‑introduce preferences honoring the spec rule that essential notifications (security, payment, withdrawal, dispute, order completion) cannot be disabled.

### BUG‑16 — Enterprise plan price conflict: ₹9,999 vs ₹10,000 · **S3 (data integrity)** · `[SPEC conflict]` `[CODE]`
- **Detail:** The *Seller subscription plans* doc states Enterprise **₹9,999/mo**; the *Category & features* doc and current code (`tier-context.tsx:106`, migration `20260617150000`) use **₹10,000**. One source is wrong.
- **Fix:** Product decision required — confirm the canonical Enterprise monthly price, then make it the single source. **Also MISSING from all docs:** the 6‑month and 12‑month prices for Pro/Elite/Enterprise (docs literally say *"use our finalized pricing"*). These must be supplied before billing for those durations can be built.

> **Carried‑forward items to re‑verify (flagged honestly — these were in the 2026‑06‑17 audit and were NOT re‑confirmed against current code in this pass):**
> - **Coupon redemption hardcoded to "Pro Plan"** (`wallet.functions.ts applyCoupon`) — verify before relying on coupons.
> - **Newsletter "Send" is a dead button** (`admin.newsletter.tsx` setTimeout+toast, no backend).
> - **Ads/boost analytics fabricated** (`seller.ads.tsx` computes impressions = boosts×120). Per spec "NEVER fake activity," remove or back with real events.
> - **`admin.audit-logs.tsx` can fall back to `MOCK_LOGS`.**
> Re‑check each in the current tree; if still present, treat as S2 bugs.

---
---

# PART 2 — COMPLETE MISSING‑FEATURES REPORT (by module & priority)

Priority key: **P0** launch‑blocker · **P1** core marketplace · **P2** completeness/governance. Every row is grounded; **MISSING** marks data the source documents do not provide.

## Module A — Notifications & Email Engine · **P0** · `[SPEC: notifications doc]` `[CR: 201507, 201541, 201731, 201840, 201919, 201931, 202120, 202215]`
The spec provides a complete, verbatim 47‑event matrix (recipient × in‑app × email × staff‑dashboard × super‑admin × exact copy). None of it is meaningfully wired today.
1. **Central dispatcher** `notify(event, payload)` → writes in‑app row, sends templated email where matrix=✅, writes staff/super‑admin dashboard entry. Idempotent, with delivery logging.
2. **Notification Center (bell):** categories **Orders / Listings / Finance / Seller Membership / Security / Platform**; read‑unread; "Mark All As Read"; **deep‑links per event** (BUG‑02); retention (routine archived sooner, security/financial kept longer — exact period is **Super‑Admin configurable; concrete value MISSING in docs**).
3. **Branded email templates** (logo/header/title/greeting/body/action‑button/support/footer) for all money/order/security/subscription/dispute/verification/maintenance events. Standard action buttons: View Order, Renew Listing, Renew Subscription, Complete Verification, Respond To Dispute, Request Withdrawal, View Support Ticket, Continue Payment, Download Invoice, Reset Password.
4. **Staff‑dashboard notifications** (department‑scoped: Payment/Verification/Dispute/Finance/Moderation/Support/Risk teams) + **Super‑Admin dashboard** feed.
5. **Specific client‑demanded triggers:** new listing submitted → email superadmin/admin/assigned moderator `[CR:202120]`; payment approved by superadmin → buyer "purchase successful + invoice" email `[CR:201931]`; seller‑ready‑to‑deliver → buyer in‑app+email `[CR:201919]`; new order/new buyer message → seller `[CR:201507]`.
6. **Broadcast messaging** (super‑admin: target groups, in‑app/email/both, schedule/draft) · **Communication logs** (recipient, type, channel, status, read, bounce) · **Communication preferences** (build later; hidden now per BUG‑15; essential notifications non‑disableable).
7. **Reminder schedules** (exact, from spec): listing expiry 7/3/1d + day‑of; subscription expiry 7/3d/24h; verification expiry — **doc conflict 15/7/3 vs 7/3/1 — confirm**; dormant 14/7d/24h; coaching session 24h/1h/10min(+at‑time).

## Module B — Fee Transparency: "Transaction Summary" + Commission Engine · **P0** · `[CR new‑adds: 201600, 201700]` `[SPEC: subscription doc]`
Client supplied pixel mockups and is explicit this is wanted *"in every category, right below pricing."*
1. **Universal Transaction Summary panel** in Create/Edit Listing, below pricing: **Estimated Seller Payout** vs **Order Total**, auto‑deducting platform commission by **category × seller‑plan** (mockup example: Gaming Accounts, Standard = 18% → ₹5,999 − fee = ₹4,919). "What You Get With Every Order" trust badges (Secure Escrow, Fraud Protection, Human Dispute Resolution, Seller Growth & Visibility, Verified Marketplace, Platform Security) + "No Hidden Charges".
2. **Dynamic Settlement Timeline** in the same panel: Escrow Hold Period (varies by category×plan) → Settlement Eligibility → Settlement Processing (varies by plan) → Payout Sent. Must read live from config.
3. **Commission config table (category × plan)** — authoritative from spec, must be a DB/config table, not hardcoded:

| Category | Standard | Pro | Elite | Enterprise |
|---|---|---|---|---|
| Gaming Accounts | 18% | 16% | 14% | 12% |
| In‑Game Credits | 9% | 8% | 7% | 6% |
| Gift Cards | 5% | 4.5% | 4% | 3% |
| Software & Digital Tools | 12% | 11% | 10% | 8% |
| Coaching | 20% | 18% | 16% | 14% |
| Game Buddy | 25% | 22% | 20% | 18% |
| Freelance | 20% | 18% | 16% | 14% |
| Digital Products | 10% | 9% | 8% | 7% |
| Subscriptions | 5% | 4% | 3.5% | 3% |
| Advertising & Promotion | 10% | 9% | 8% | 7% |

4. **Buyer Protection / Protection Fee at checkout** (optional, buyer‑selected; **not** for orders < ₹1,000): general tiers ₹1,000–7,000→5%, ₹7,001–20,000→₹499, ₹20,001–50,000→₹799, ₹50,001–1,00,000→₹999; **Gaming Accounts = 5% flat** regardless of value. Surface protection benefits list. Settlement display order: Sale Amount → Commission → Protection Fee → Net Settlement.

## Module C — Category‑specific Listing Forms & Delivery Engines · **P0** · `[SPEC: 4 delivery docs]` `[CR: 202245, 202250, 202253, 202257]`
Today only the **gaming‑account** form exists. Client: *"every category is different delivered… different listing form required for different categories."* Build three shared engines + dynamic forms:
1. **Digital Delivery Engine** (In‑Game Credits, Gift Cards, Software & Digital Tools, Digital Products, Subscriptions): 9 delivery methods (Instant Code, Manual Code, License Key, Digital File Upload, Secure Download Link, Account Invitation, Email Delivery, External Activation Link, Manual Delivery); secure asset vault (no raw URLs, payment‑gated); download‑limit options (Unlimited / Limited e.g. **5 downloads** / **30‑Day Access**); reveal‑code / reveal‑key buttons; per‑category buyer verification checklists; download & delivery history logs.
2. **Gaming Account delivery (3‑phase / Hybrid)**: `Payment Verified → Credentials Released → Transfer Instructions → Buyer Logs In → Confirms Game/Email Access → Changes Passwords → Updates Recovery → Inspection Checklist → Confirms Ownership Transfer`. Hybrid delivery type ("Initial access + Manual ownership") seen in mockup `[CR:201600]`. Per‑game dynamic fields + inspection checklist; safety banners on listing/order‑room/credential screens; conditional logic (no linked email → explain transfer; recovered account → explanation box). Credentials encrypted (already built) + reveal‑audit (already built).
3. **Service Delivery Engine** (Freelance, Business, Advertising): Order → **Complete Project Requirements** form → seller Accept/Request‑More‑Info → requirements **locked** → work → **formal delivery** (summary + files + external links + notes, versioned) → buyer Accept / **Request Revision** → revision loop bounded by package limits (Basic 1 / Standard 3 / Premium unlimited) → Accept → Completed. Packages (Basic/Standard/Premium), Custom Quote, Extras.
4. **Session & Booking Engine** (Coaching, Game Buddy): seller availability (days/hours/buffer/timezone/max‑per‑day), slot generation, booking (duration→date→slot→confirm→pay), buyer requirements, reminders (24h/1h/10min), join‑info revealed only after confirmation, **In Progress** auto at start time, attendance confirm ("I Have Joined"), Mark Session Completed → buyer confirm, reschedule (request→accept/suggest, cancels old reminders), cancel/no‑show records (no auto‑fault). Booking limits: **Min Notice 12h, Max Advance 30d** (examples in doc).
5. **Dynamic per‑category fields** with the leaked‑prompt fix (BUG‑13). One service / one game / one product per listing.

## Module D — Listing Lifecycle, Expiry & Moderation · **P1** · `[SPEC: listing expiry + universal docs]` `[CR: 202120, 202326]`
1. **30‑day universal expiry** (all categories/plans): countdown ("Expires in 27 Days"/"Expires Tomorrow"/"Expired"), reminders 7/3/1d+day‑of, on expiry → **Expired** section (hidden publicly, never deleted), Renew = fresh 30‑day cycle (worked example in doc), Edit‑before‑renew re‑enters moderation.
2. **Per‑category active‑listing limits per plan** (Standard 1 / Pro 5 / Elite 10 / Enterprise 30) + auto‑pause excess to **"Paused — Subscription Limit Exceeded"** on downgrade (never deleted; auto‑restore on re‑subscribe). *(Canonicalize the 3 label variants in docs.)*
3. **Listing Moderation Queue**: statuses `Draft → Pending Approval → Active / Changes Requested / Rejected`; moderator review page (seller info, scores, listing); structured rejection reasons (Incorrect Category, Missing Info, Poor Quality, Misleading, Duplicate, Prohibited, Copyright, Policy Violation, Suspicious, Other); auto policy pre‑checks (warnings only, never auto‑reject); **email moderators/superadmin on submit** `[CR:202120]`; internal moderator notes + moderation history.
4. **Full `listing_status` enum** (Draft/Pending Approval/Active/Changes Requested/Rejected/Expired/Paused/Sold) — current enum is thin.
5. **Score placement** (BUG‑04): Quality/Security score on seller form bottom + admin review; never blocks publish.
6. **Public vs internal category display name** (BUG‑14).

## Module E — Promotions: Featured / Homepage / Trending / Boost / Glow / Urgent · **P1** · `[SPEC: features+expiry docs]` `[CR: 201145]`
1. **Featured Listing** = paid credits only (Pro 5×10d / Elite 10×20d / Enterprise 30×30d), category Featured section, gold badge/border/glow, credits **stack** (extend, not reset), unused expire with cycle.
2. **Homepage Featured** = credits (Pro 1 / Elite 2 / Enterprise 5), finite **slot system**, 24h duration, slot‑unavailable message (credit not consumed).
3. **Trending = auto‑computed** from real clicks + sales (no dummies, BUG‑12). Define the ranking formula + a job to refresh.
4. **Boost To Top** ₹49 / ₹199 / ₹349 (24h / 1week / until‑expiry) — refresh to top of normal results, no ranking change.
5. **Glow Highlight** ₹49 / ₹199 / ₹349, colors Gold/Blue/Purple/Green/Red (admin‑extendable), visual only.
6. **Urgent Sale** ₹149, badge until listing expiry, visual only.
7. **Promotion Center**: statuses (Available/Active/Expires‑in/Expired/Waiting‑for‑Slot), history, per‑promo expiry notifications; promotions run to own expiry independent of subscription; never auto‑restore on listing renewal.

## Module F — Escrow, Settlement & Withdrawals · **P1** · `[SPEC: subscription doc]` `[CR: 201943, 202000]`
1. **Escrow Hold Period table (category × plan)** — config‑driven; feeds the Transaction Summary timeline:

| Category | Std | Pro | Elite | Ent |
|---|---|---|---|---|
| Gaming Accounts | 14d | 10d | 7d | 5d |
| In‑Game Credits / Gift Cards / Coaching / Game Buddy / Subscriptions / Advertising | 3d | 2d | 1d | Instant |
| Software / Freelance / Digital Products | 7d | 5d | 3d | 2d |

2. **Settlement processing by plan**: Std 7d / Pro 4d / Elite 3d / Ent 2d; **withdrawal frequency**: Std 1/10d, Pro 2/10d, Elite 1/5d, Ent 1/2d; timer starts at withdrawal request, never at completion; terminology "Escrow Hold / Settlement Eligibility / Settlement Review" (never "cooldown").
3. **Withdrawal payout: Bank Transfer only for now — remove UPI option** `[CR:201943]`. Fields: legal account‑holder name, account number, IFSC. Withdrawal statuses (Submitted/Under Review/Approved/Processing/Completed/Rejected).
4. **Dormant earnings**: first reminder 30d after funds available, dormant on day 61, withdrawals disabled until reactivation; fees 2%/5%/8%/10%/20% (60/90/120/180d/1yr); display Available/Dormant/Reactivation Fee/Withdrawable‑After.

## Module G — Verification / KYC / Verified Badge · **P1** · `[CR new‑add: 202017]` `[CR: 201943, 202000]` `[SPEC]`
1. **Standalone HUXZAIN Verified Badge page** exactly like mockup `202017`: plans **Monthly ₹499 / 6 Months ₹2,399 / Yearly ₹3,999**; 4 steps (Upload ID Proofs → Selfie Verification → Address Proof → Review & Verify); submit **two DIFFERENT government IDs** (Aadhaar/PAN/Passport/DL/Voter — system disables picking the same type twice) + **selfie holding an uploaded ID** + **address proof**. Badge independent of subscription (Standard can buy; paid plans include it while active).
2. **Rename "Verification" → "KYC Verification"** and **split the badge purchase into its own separate option** (not nested in the KYC page) `[CR:202000]`.
3. **Badge propagation** to seller profile / public card / listing cards / search results; **expiry reminders** (confirm schedule conflict) → on expiry only the badge disappears, all data kept.
4. Manual review only (no auto‑approve); docs visible to authorized staff only.

## Module H — Categories & Dynamic Category Engine · **P1** · `[SPEC: features doc]` `[CR: 201721, 202326]`
1. **Admin Category CRUD** (no‑code add/remove/rename/reorder main + sub‑categories) — currently SQL‑only. Include **public display name** field (BUG‑14).
2. **Dynamic Category Engine** (config, not code): per‑category required/optional fields, accepted file types, max images, help/placeholder text, validation, dropdown values, quality/security score rules, required disclaimers, **inspection period**, **escrow hold**, delivery workflow, order‑room welcome message, category‑specific notifications, buyer/seller guidance. Goal: *new category = config only.*
3. **Full 12‑category taxonomy** with sub‑categories from the features doc (Games/Gaming Accounts, In‑Game Credits, Gift Cards, Software & Digital Tools, Coaching, Game Buddy, Freelance, Digital Products, Subscriptions, Hosting & Web, Business, Advertising & Promotion) + each category's "Other / Not Listed" with smart duplicate detection (CS2 ≡ Counter‑Strike 2, GTA V ≡ GTA 5).

## Module I — Order Room (buyer + seller) · **P1** · `[SPEC: universal doc]`
Internal order page: status timeline, embedded order‑linked chat, inspection countdown, **mutual completion** (both confirm) + auto‑complete on inspection lapse, dispute button, read‑only after completion (reopens during protection window if disputed), auto‑welcome message on creation, auto‑cancel + refund if seller fails to respond in window (with notifications). Invoice gated to completed (BUG‑11).

## Module J — Account Security & Anti‑Abuse · **P1** · `[CR: 201806, 201531]`
1. **1 phone number = 1 profile** enforcement to stop multi‑account farming of the free Standard listing `[CR:201806]` (unique verified‑phone constraint + block on signup/verify).
2. **Accurate presence** (BUG‑10) · **email/phone change with OTP** (BUG‑08) · **HUXZAIN default avatar everywhere** (BUG‑09).
3. **Superadmin absolute access vs admin restricted** `[CR:201806]` — verify role matrix grants superadmin full access; admin scoped.
4. Carry‑over hardening from prior audit (verify still open): CAPTCHA/anti‑bot on signup+login, age‑confirmation checkbox, reserved‑username block, brute‑force lockout.

## Module K — Help Centre · **P2** · `[CR: 201816, 201828]`
Public Help Centre page + entry in profile dropdown; remove top‑nav "?" (BUG‑07). (Ticket/KB backend already exists — surface it publicly.)

## Module L — Admin / Super‑Admin completeness · **P1/P2**
Clickable chat monitoring (BUG‑06); coupon admin engine + checkout integration (+ fix hardcoded "Pro"); newsletter real send; remove fabricated ad analytics; homepage CMS + announcement bar; analytics charts/date‑range/CSV‑PDF export; owner separate dashboard + emergency controls (freeze marketplace, disable withdrawals/purchases); per‑category commission/escrow config UIs; policy CMS + consent logging.

## Module M — Reviews & Reputation · **P2** · `[SPEC]`
Gate reviews to **completed order + verified buyer**; render on public listing + seller profile; verified‑purchase indicator; seller responses; review moderation/report; reconcile the **two trust‑score implementations** (JS `trustService` vs SQL `recalculate_seller_reputation_score`) to one authoritative calc.

## Module N — Platform Credits · **P2** · `[SPEC]`
Non‑withdrawable credit ledger (admin grant, compensation/partial‑refund/promo offset of platform‑fee portion) + buyer Credits section.

## Module O — Automation / Cron · **P1 (enables D/E/F)** · `[SPEC]`
Scheduled jobs (pg_cron or edge functions): listing expiry + reminders, promotion expiry, subscription expiry→downgrade + paused‑listing restore, escrow auto‑release, dormant transition, badge expiry, trending recompute, auto‑cancel unresponsive orders, auto‑complete on inspection lapse, auto invoice generation + email.

> **Source data explicitly MISSING (must be supplied — do not invent):**
> 1. 6‑month & 12‑month subscription prices for Pro/Elite/Enterprise (docs say "use finalized pricing").
> 2. Canonical Enterprise monthly price (₹9,999 vs ₹10,000 conflict).
> 3. Exact inspection‑period durations, seller‑response window, payment window, notification retention period, dormant reminder exact offsets — docs defer these to "configurable"/absent documents.
> 4. Verification‑expiry reminder schedule (3 different schedules across docs).
> 5. Boost/Glow standalone pricing appears in features doc but not the expiry doc — reconcile.

---
---

# PART 3 — MASTER AI BUILDER PROMPT

> Paste the block below into your AI coding agent. It is self‑contained: context → authoritative data → ordered build plan → client fixes → QA → anti‑hallucination rules.

```
ROLE
You are a senior full‑stack engineer upgrading HUXZAIN — a digital‑goods/gaming marketplace
(TanStack Start + React 19 + Supabase) — from its current state to production‑ready.
Buyers and sellers trade Gaming Accounts, In‑Game Credits, Gift Cards, Software & Digital Tools,
Coaching, Game Buddy, Freelance, Business, Advertising, Digital Products, Subscriptions, Hosting.

GROUND TRUTH & RULES
- The .docx specs are the product blueprint. The annotated screenshots are binding client review
  and OVERRIDE the implementation wherever they conflict.
- NEVER invent values. If a number/rule is not in the spec, output "MISSING — needs client input"
  and stop guessing. The known MISSING items are: 6/12‑month plan prices; canonical Enterprise
  monthly price (9,999 vs 10,000); exact inspection/response/payment‑window/retention durations;
  verification‑expiry reminder schedule (docs conflict). Do not fabricate these.
- ALREADY DONE — do not redo: dispute payout‑freeze, private sensitive buckets + signed URLs,
  credential encryption + reveal logging, subscription price reconciliation (499/2999/4999/10000),
  removal of pooled wallet (per‑order settlement only), moderation/enforcement strike system.
- Make all business values config/DB‑driven (commission, escrow, limits, prices, promo prices),
  never hardcoded. Scores never block publishing. All approvals (listing/payment/dispute/KYC) stay
  human‑gated; automation only handles repetitive/scheduled tasks.

AUTHORITATIVE DATA TABLES (use verbatim)
- Plans (monthly): Standard ₹0 / Pro ₹2,999 / Elite ₹4,999 / Enterprise ₹10,000 (confirm 9,999 vs 10,000).
  Durations Monthly/6mo/12mo (6/12 prices MISSING). Active listings PER CATEGORY: 1 / 5 / 10 / 30.
  Universal listing validity = 30 days, all plans. On sub expiry → auto‑downgrade to Standard,
  excess listings → "Paused — Subscription Limit Exceeded" (never deleted, auto‑restore on renew).
- Commission (category×plan): Gaming 18/16/14/12; In‑Game Credits 9/8/7/6; Gift Cards 5/4.5/4/3;
  Software 12/11/10/8; Coaching 20/18/16/14; Game Buddy 25/22/20/18; Freelance 20/18/16/14;
  Digital Products 10/9/8/7; Subscriptions 5/4/3.5/3; Advertising 10/9/8/7.
- Escrow hold (category×plan): Gaming 14/10/7/5d; (In‑Game/GiftCard/Coaching/GameBuddy/Subs/Ads)
  3/2/1d/Instant; (Software/Freelance/DigitalProducts) 7/5/3/2d.
- Settlement processing: Std 7d/Pro 4d/Elite 3d/Ent 2d. Withdrawal freq: 1/10d, 2/10d, 1/5d, 1/2d.
- Dormant: reminder at 30d, dormant at day 61; fees 2/5/8/10/20% (60/90/120/180d/1yr).
- Promotions: Featured credits 5×10d / 10×20d / 30×30d (stack/extend); Homepage 1/2/5 ×24h (finite slots);
  Boost‑To‑Top ₹49/₹199/₹349; Glow ₹49/₹199/₹349 (Gold/Blue/Purple/Green/Red); Urgent Sale ₹149.
  Featured = PAID ONLY. Trending = AUTO from real clicks+sales (no dummies).
- Buyer Protection (buyer‑selected at checkout, min order ₹1,000): 1k–7k=5%, 7,001–20k=₹499,
  20,001–50k=₹799, 50,001–1L=₹999; Gaming Accounts = 5% flat.
- Verified Badge (standalone): Monthly ₹499 / 6mo ₹2,399 / Yearly ₹3,999; 2 different gov IDs + selfie + address proof.
- Notifications: implement the full 47‑event matrix from "notifications & emails" doc (recipient ×
  in‑app × email × staff‑dashboard × super‑admin × exact copy). Channels per matrix; never email per chat msg.

BUILD ORDER (ship in slices, each independently verifiable)
P0:
  1. Notification+Email engine (central dispatcher, Notification Center with categories + deep‑links,
     branded templates, staff/super‑admin feeds, the client‑demanded triggers). Wire EVERY order/
     payment/listing/dispute/withdrawal/subscription/verification transition to notify().
  2. "Transaction Summary" panel below pricing in Create/Edit Listing for EVERY category (mockups
     201600/201700): Estimated Seller Payout vs Order Total via commission table; dynamic Settlement
     Timeline from escrow+settlement tables; trust badges; "No Hidden Charges". + Buyer Protection at checkout.
  3. Category‑specific listing forms + 4 delivery engines: Digital Delivery (9 methods, secure vault,
     download limits 5/30‑day, reveal code/key, verification checklists); Gaming 3‑phase/Hybrid ownership
     transfer + inspection checklist + safety banners; Service engine (requirements→lock→deliver→revision
     by package 1/3/∞→accept); Session & Booking engine (slots, reminders 24h/1h/10min, reschedule/cancel/no‑show).
P1:
  4. Listing lifecycle: 30‑day expiry + reminders + renew; per‑category plan limits + Paused status;
     moderation queue (approve/reject/request‑changes, structured reasons, moderator email on submit);
     full status enum; move Quality/Security score to seller form bottom + admin (remove from buyer page).
  5. Promotions: Featured(paid)/Homepage(slots)/Boost/Glow/Urgent + Promotion Center; Trending auto‑compute.
  6. Escrow/settlement/withdrawal tables; withdrawal Bank‑Transfer‑only (remove UPI); dormant flow.
  7. Verified Badge standalone page (mockup 202017); rename Verification→KYC Verification, split badge purchase.
  8. Category CRUD + Dynamic Category Engine (config‑driven fields/validation/score/escrow/delivery/welcome).
  9. Order Room (timeline, chat, inspection countdown, mutual completion, dispute, read‑only‑after‑complete,
     auto‑cancel/auto‑complete). Invoice gated to completed.
 10. Anti‑abuse: 1 phone = 1 profile; accurate presence; email/phone change w/ OTP; HUXZAIN default avatar;
     superadmin absolute vs admin restricted. (Builds on existing strike/enforcement system.)
 11. Cron jobs for every expiry/release/downgrade/restore/trending/auto‑cancel/invoice.
P2:
 12. Help Centre (public + in profile dropdown; remove top‑nav "?"); clickable admin chat monitoring;
     coupon admin engine; real newsletter send; remove fabricated ad analytics; analytics charts/export;
     reviews gating + display + responses; reconcile trust score; platform credits; homepage CMS; policy CMS.

CLIENT‑REVIEW FIXES (binding — from screenshots)
- Remove dummy Featured/Trending; Featured=paid, Trending=auto.    - Hide Security Score on buyer page; show on seller form bottom + admin.
- Make notification items clickable (deep‑link).                    - Notifications must fire to buyer/seller/admin/superadmin.
- Payment proof: remove UTR + GSTIN, screenshot + AI‑written instruction only.
- Profile: add email field + email/phone change via OTP.           - Notification‑prefs page: hide for now (still notify orders+messages).
- Remove top‑nav "?"; add "Help Centre" to profile dropdown.        - Admin chat rows must open the conversation.
- Superadmin absolute access; 1 phone = 1 profile; real presence; HUXZAIN default avatar.
- Buyer notified+emailed when seller ready & when superadmin approves (purchase‑successful + invoice).
- Withdrawal: Bank Transfer only.   - Rename Verification→KYC Verification; separate badge purchase.
- Email superadmin/admin/moderator when a listing is submitted.     - Refine dynamic listing‑attributes (remove leaked "(Auto‑updates based on Category)").
- Invoice hidden until completed.   - Public label "Games/Gaming Marketplace"; "Gaming Accounts" only in the listing selector.

QA / ACCEPTANCE (per slice)
- Place order end‑to‑end: buyer IA+email on submit; seller IA+email on approval; super‑admin dashboard entry;
  click each notification → lands on correct page.
- Listing form Transaction Summary: Gaming Standard ₹5,999 → payout ₹4,919 (18%); changes with plan/category.
- 3‑phase gaming delivery completes only after ownership‑transfer checklist; digital reveal respects download limit.
- 30‑day expiry job flips a listing to Expired + reminder fired; downgrade pauses excess + renew restores.
- Withdrawal shows only Bank Transfer; dormant triggers at day 61.
- Verified Badge: cannot upload the same gov‑ID type twice; selfie+address required.
- Edge cases: invalid/redeemed code, cancelled/no‑show session, revision vs new‑scope, slot double‑book,
  expired download link, sub‑expiry mid‑promotion (promo runs to its own end), order < ₹1,000 (no protection fee).
- For anything MISSING above, surface a clear "needs client input" note instead of inventing.
```

---

## Appendix — Source‑grounding index
- **Client screenshots (CR):** featured/trending dummies `201145`; security‑score placement `201158/201237/202104/202120`; notification deep‑link `201219/201221`; payment proof UTR/GST `201251/201303/201856/201906`; orders/dash + notify miss `201303/201330/201541/201840`; notif‑prefs hide `201507`; email/phone OTP `201531`; admin chat open `201747`; superadmin/1‑phone/presence/avatar `201806`; remove "?"/Help Centre `201816/201828`; seller‑ready + approve emails `201919/201931`; withdrawal bank‑only `201943/202000`; rename KYC + split badge `202000`; moderator email on submit + attribute leak `202120/202215`; invoice gating `202236`; public category name `202326`; **new‑adds** Transaction Summary `201600/201700`, Verified Badge page `202017`.
- **Specs (SPEC):** category & features; seller subscription plans (commission/escrow/withdrawal/dormant tables); listing expiry; notifications & emails (47‑event matrix); universal/gaming/digital/service/session delivery flows.
- **Code (CODE):** verified current tree incl. the 5 fixed P0s and the moderation system (`20260622150000`, `admin/moderation.functions.ts`).
- **Extracted working copies:** `scratch/audit/docx/*.txt` (spec text), `scratch/audit/images/` + `scratch/audit/newadds/` (screenshots).

---
---

# PART 4 — DATABASE CHANGE LOG (per module)

**Grounding:** all existing tables/columns/enums below were re‑verified in `supabase/migrations/` on 2026‑06‑30. New objects are proposals for the build; nothing here is created yet. Migration filenames follow the repo convention `YYYYMMDDHHMMSS_description.sql` (current latest = `20260622150000_moderation_tables.sql`). **Rule:** every business value (commission, escrow, limits, prices) lands in a config table, never a column default or code constant.

**Existing baseline (do NOT recreate):** `profiles`, `user_roles`, `listings`, `orders`, `transactions`, `wallets`, `withdrawals`, `disputes`, `dispute_messages`, `reviews`, `categories`, `notifications`, `seller_subscriptions`, `subscription_plans_config`, `payment_verifications`/`payment_proofs`, `invoices`, `platform_settings`, `email_templates`, `campaigns`, `announcements`, `support_tickets`, `kb_articles`, `moderation_actions`/`user_moderation_status`/`user_strikes`, `game_buddies`, `coaches`, `escrow_holds`, `boost`/`seller_analytics_events`. Enums: `app_role` (buyer/seller/moderator/staff/admin/super_admin/owner), `listing_status` (draft/active/hidden/flagged/archived/pending/rejected), `order_status` (pending_payment/pending/paid/delivering/delivered/completed/disputed/refunded/cancelled/payment_under_review/payment_approved/order_active/seller_delivering/buyer_reviewing).

---

## Module A — Notifications & Email Engine

| Object | Change | Detail |
|---|---|---|
| `notifications` (existing) | **ALTER — add columns** | `link text` (deep‑link target, fixes BUG‑02), `category text` (enum‑checked: `orders`/`listings`/`finance`/`membership`/`security`/`platform`), `entity_type text` + `entity_id uuid` (typed deep‑link source), `event_key text` (the 47‑matrix event id), `priority text default 'normal'`, `channels text[] default '{in_app}'`, `read_at` already present. Backfill `category='platform'`, `link=null` for existing rows. |
| `notification_events` | **NEW config table** | The 47‑event matrix as data: `event_key text pk`, `description text`, `recipient_roles text[]`, `in_app bool`, `email bool`, `staff_dashboard bool`, `super_admin bool`, `email_template_key text`, `default_link_pattern text`, `category text`, `retention_days int`. Seeded from the notifications doc. |
| `notification_deliveries` | **NEW** | Per‑send delivery log: `id`, `notification_id`, `channel text` (in_app/email/staff), `status text` (queued/sent/failed/bounced), `provider_msg_id text`, `error text`, `created_at`. Powers Communication Logs (Module L) + idempotency. |
| `broadcasts` | **NEW** | Super‑admin broadcast: `id`, `title`, `body`, `target_segment jsonb`, `channels text[]`, `schedule_at timestamptz`, `status text` (draft/scheduled/sent), `created_by`, `created_at`. |
| Migrations | `…_notifications_engine.sql` | adds columns + indexes (`idx_notifications_user_unread`, `idx_notifications_category`); `…_notification_events_seed.sql` seeds matrix. |
| RLS impact | notifications: keep `notifications_read` (own or staff). `notification_events` read = authenticated, write = super_admin. `notification_deliveries` read = staff only. `broadcasts` read/write = super_admin. |

## Module B — Fee Transparency / Commission Engine

| Object | Change | Detail |
|---|---|---|
| `commission_config` | **NEW config table** | `id`, `category_id uuid fk categories`, `plan text` (standard/pro/elite/enterprise), `commission_percent numeric(5,2)`, unique(category_id, plan). Seeded from the Part‑2 commission table. |
| `escrow_config` | **NEW config table** | `category_id`, `plan`, `escrow_hold_days int` (nullable = Instant), `settlement_processing_days int`, unique(category_id, plan). Seeded from Module F tables. |
| `buyer_protection_config` | **NEW config table** | `id`, `min_amount int`, `max_amount int`, `fee_type text` (percent/flat), `fee_value numeric`, `category_override_id uuid null` (for Gaming‑5%‑flat). |
| `orders` (existing) | **ALTER — add columns** | `commission_percent numeric(5,2)`, `commission_amount numeric(12,2)`, `protection_fee numeric(12,2) default 0`, `net_settlement numeric(12,2)`, `protection_selected bool default false`. (Existing `fee_cents` retained; new columns are the itemized breakdown.) |
| Migrations | `…_commission_escrow_config.sql`, `…_orders_fee_breakdown.sql` | tables + seeds + order columns. |
| RLS impact | config tables: read = authenticated (needed by Transaction Summary on listing form), write = admin/super_admin. Orders columns inherit existing orders RLS. |

## Module C — Category‑specific Listing Forms & Delivery Engines

| Object | Change | Detail |
|---|---|---|
| `listing_delivery` | **NEW** | Per‑listing delivery config: `listing_id`, `engine text` (digital/gaming/service/session), `delivery_method text` (the 9 digital methods or hybrid), `download_limit_type text` (unlimited/limited/timed), `download_limit_value int`, `config jsonb` (engine‑specific). |
| `digital_assets` | **NEW** | Secure vault: `id`, `listing_id`, `asset_type text` (code/key/file/link), `encrypted_value text` (pgp_sym_encrypt, reuse credential pattern from `20260617130000`), `consumed_by_order uuid null`, `created_at`. No raw URLs ever exposed. |
| `asset_access_log` | **NEW** | Mirrors existing `credential_access_log`: who revealed/downloaded which asset, when, order_id. |
| `service_packages` | **NEW** | Freelance/business/advertising: `listing_id`, `tier text` (basic/standard/premium/custom), `price`, `delivery_days`, `revisions int` (null=unlimited), `extras jsonb`. |
| `service_requirements` | **NEW** | Per‑order: `order_id`, `payload jsonb`, `locked bool default false`, `accepted_at`. |
| `service_deliveries` | **NEW** | Versioned formal delivery: `order_id`, `version int`, `summary`, `files jsonb`, `links jsonb`, `notes`, `created_at`, `status text` (delivered/revision_requested/accepted). |
| `seller_availability` | **NEW** | Coaching/Game Buddy: `seller_id`, `listing_id`, `days jsonb`, `hours jsonb`, `buffer_min int`, `timezone text`, `max_per_day int`, `min_notice_hours int default 12`, `max_advance_days int default 30`. |
| `booking_slots` | **NEW** | Generated slots: `id`, `listing_id`, `start_at`, `end_at`, `status text` (open/held/booked), `order_id null`. |
| `bookings` | **NEW** | `id`, `order_id`, `slot_id`, `status text` (confirmed/in_progress/completed/rescheduled/cancelled/no_show), `join_info_encrypted text`, `buyer_joined_at`, `seller_completed_at`. |
| `gaming_inspection` | **NEW** | 3‑phase checklist state per gaming order: `order_id`, `phase text`, `checklist jsonb`, `ownership_confirmed_at`. (Credentials encryption + reveal already exist — reuse.) |
| Migrations | `…_delivery_engines.sql` (+ pgcrypto reuse), `…_service_engine.sql`, `…_booking_engine.sql` | one migration per engine to keep them reviewable. |
| RLS impact | `digital_assets`/`asset_access_log`: owner‑seller + buyer‑of‑paid‑order + staff only (mirror credential RLS, payment‑gated). `service_*`/`bookings`: order participants + staff. `seller_availability`/`booking_slots`: public read (open slots), seller write. |

## Module D — Listing Lifecycle, Expiry & Moderation

| Object | Change | Detail |
|---|---|---|
| `listing_status` enum (existing) | **ALTER — add values** | add `changes_requested`, `expired`, `paused`, `sold` (current enum has draft/active/hidden/flagged/archived/pending/rejected). Postgres `ALTER TYPE … ADD VALUE`. |
| `listings` (existing) | **ALTER — add columns** | `expires_at timestamptz`, `published_at timestamptz`, `pause_reason text` (e.g. 'subscription_limit'), `public_display_category text` is on category not listing — see Module H. |
| `listing_moderation` | **NEW** | `listing_id`, `status`, `reviewer_id`, `rejection_reason text` (enum‑checked structured reasons), `moderator_notes text`, `history jsonb`, `submitted_at`, `reviewed_at`. |
| `categories` (existing) | **ALTER** | `public_display_name text` (BUG‑14: "Games" public vs "Gaming Accounts" internal), `active_listing_limits jsonb` (per‑plan override). |
| Migrations | `…_listing_lifecycle.sql`, `…_listing_moderation.sql` | enum add must be its own migration (Postgres can't add enum value + use it in same txn). |
| RLS impact | `listing_moderation`: seller read own + staff read/write. Public listing reads must exclude `expired`/`paused`/`draft`/`pending`/`rejected` (update `listings_public_read_active`). |

## Module E — Promotions

| Object | Change | Detail |
|---|---|---|
| `promotion_config` | **NEW config** | promo type catalog with prices (Boost 49/199/349, Glow 49/199/349, Urgent 149) + durations + colors — admin‑editable. |
| `promotion_credits` | **NEW** | Featured/Homepage credit ledger per seller: `seller_id`, `type` (featured/homepage), `total`, `used`, `expires_at`, `granted_by_cycle`. Credits **stack/extend**. |
| `listing_promotions` | **NEW** | Active promos: `listing_id`, `type` (featured/homepage/boost/glow/urgent), `glow_color text`, `starts_at`, `ends_at`, `status text`. Runs to own expiry independent of subscription. |
| `homepage_slots` | **NEW** | Finite slot system: `id`, `slot_index int`, `listing_id null`, `expires_at`. 24h duration; slot‑unavailable returns credit. |
| `listings` (existing) | **already has** `is_featured/is_homepage_featured/is_urgent/has_glow/boost_score/trending_score` | drive these from `listing_promotions`, not manual flags. Trending recomputed by Module O job from real views+sales. |
| RLS impact | config read = authenticated, write = admin. credits/promotions read = owner+staff, write = system (service role) on purchase. |

## Module F — Escrow, Settlement & Withdrawals

| Object | Change | Detail |
|---|---|---|
| `escrow_config` | (created in Module B) | feeds settlement timeline. |
| `withdrawal_config` | **NEW config** | per‑plan `withdrawal_freq_per_period`, `period_days`, `settlement_processing_days`. |
| `dormant_config` | **NEW config** | fee schedule 2/5/8/10/20% at 60/90/120/180/365d; reminder offsets. |
| `withdrawals` (existing) | **ALTER** | remove UPI usage at app layer (BUG/CR‑201943: Bank Transfer only) — keep `method` column but constrain app input to `bank_transfer`; ensure `account_details jsonb` holds {legal_name, account_number, ifsc}. Withdrawal statuses already: pending/approved/processing/completed/rejected/cancelled (map to Submitted/Under Review/Approved/Processing/Completed/Rejected labels). |
| `orders` (existing) | **already has** `payout_status`, `withdrawal_eligible_at`, `withdrawal_expired_at`, `cooling_days`, `inspection_hours`, `protection_until`, `reactivated_at`, `reactivation_fee_inr` | reuse; drive `cooling_days`/eligibility from `escrow_config` not the column default. |
| RLS impact | config tables read = authenticated, write = admin. Withdrawals keep existing owner+staff RLS. |

## Module G — Verification / KYC / Verified Badge

| Object | Change | Detail |
|---|---|---|
| `kyc_submissions` | **NEW** | `id`, `user_id`, `id_doc_1_type`, `id_doc_1_url`, `id_doc_2_type`, `id_doc_2_url` (CHECK doc_1_type <> doc_2_type — two DIFFERENT gov IDs), `selfie_url`, `address_proof_url`, `status text` (pending/approved/rejected), `reviewer_id`, `reviewed_at`, `rejection_reason`. Docs in a **private** bucket (reuse `20260617120000` pattern). |
| `verified_badges` | **NEW** | `user_id`, `plan text` (monthly/6mo/yearly), `price_paid`, `starts_at`, `expires_at`, `status text` (active/expired). Independent of subscription. |
| `badge_pricing_config` | **NEW config** | Monthly ₹499 / 6mo ₹2,399 / Yearly ₹3,999. |
| `profiles` (existing) | **already has** `is_verified` | drive from `verified_badges.active`; on expiry only badge flips, data kept. |
| RLS impact | `kyc_submissions`: owner insert/read own + authorized staff read all; docs bucket = private signed URLs. `verified_badges`: public can read active badge status (for propagation to cards/search); write = system. |

## Module H — Categories & Dynamic Category Engine

| Object | Change | Detail |
|---|---|---|
| `categories` (existing) | **ALTER** | `public_display_name` (BUG‑14), `is_active bool`, `sort` (exists), self‑referential `parent_id` (exists). |
| `category_field_config` | **NEW** | Dynamic per‑category fields: `category_id`, `field_key`, `label`, `field_type`, `required bool`, `options jsonb`, `placeholder`, `help_text`, `validation jsonb`, `sort`. Drives dynamic listing forms (fixes BUG‑13 leaked prompt text). |
| `category_engine_config` | **NEW** | Per‑category operational config: `category_id`, `accepted_file_types`, `max_images`, `inspection_period_hours`, `escrow_link` (→escrow_config), `delivery_workflow text`, `order_room_welcome text`, `score_rules jsonb`, `required_disclaimers jsonb`. Goal: new category = config only. |
| `category_aliases` | **NEW** | Duplicate detection: `category_id`, `canonical_name`, `aliases text[]` (CS2 ≡ Counter‑Strike 2). |
| Migrations | `…_category_engine.sql`, `…_category_taxonomy_seed.sql` | seed full 12‑category taxonomy + sub‑categories. |
| RLS impact | all category tables: public read, admin/super_admin write (enables no‑code Category CRUD). |

## Module I — Order Room

| Object | Change | Detail |
|---|---|---|
| `conversations`, `messages` | **NEW (referenced but missing!)** | `get_or_create_order_conversation()` in `20260618120000` references these tables but **no migration creates them** — they must be authored: `conversations(id, order_id, buyer_id, seller_id, created_at)`, `messages(id, conversation_id, sender_id, body, attachments jsonb, read_at, created_at)`. **Flagged as a real gap.** |
| `orders` (existing) | **already has** `timeline jsonb`, `delivery_payload`, `buyer_requirements_payload`, `completed_at`, `delivered_at`, `protection_until` | reuse for order‑room timeline + mutual completion. Add `buyer_confirmed_at`, `seller_confirmed_at` for mutual completion if not derivable from timeline. |
| RLS impact | conversations/messages: participants + staff (mirror dispute RLS). Order‑room read‑only after completion enforced at app layer. |

## Module J — Account Security & Anti‑Abuse

| Object | Change | Detail |
|---|---|---|
| `profiles` (existing) | **ALTER** | add `last_active_at timestamptz` (presence heartbeat, fixes BUG‑10). `phone` exists; add **unique partial index** on `phone WHERE phone_verified` (1 phone = 1 profile, CR‑201806). |
| `email_change_requests` / `phone_change_requests` | **NEW** | OTP‑guarded change flow (BUG‑08): `user_id`, `new_value`, `otp_hash`, `expires_at`, `verified_at`. (Phone OTP backend exists in `sms/phone-verification.functions.ts`.) |
| RLS impact | change‑request tables: owner only. `last_active_at` updatable by owner. Unique phone index is a hard DB constraint (blocks farming at write time). |

## Module K — Help Centre
No new tables — `support_tickets`/`kb_articles` exist (`20260609000002`). Surface `kb_articles` on a public route. (Header "?" removal + profile‑dropdown entry are UI‑only.)

## Module L — Admin/Super‑Admin completeness

| Object | Change | Detail |
|---|---|---|
| `coupons` | **verify/extend** | fix hardcoded "Pro Plan" in `applyCoupon`; ensure `coupons` table drives redemption (scope, percent/flat, expiry, usage limit). |
| `homepage_cms` / `announcement_bar` | **NEW** | CMS blocks + announcement bar config. `announcements`/`emergency_alerts` exist — reuse where possible. |
| `emergency_controls` | **NEW or platform_settings keys** | freeze marketplace / disable withdrawals / disable purchases flags (owner‑only). `maintenance_mode` exists in `20260609000001` — extend. |
| `audit_logs` | **verify** | remove `MOCK_LOGS` fallback (carried‑forward item). |
| RLS impact | CMS/emergency: super_admin/owner write only. |

## Module M — Reviews & Reputation
`reviews` exists (gated to `order_id` UNIQUE). **ALTER**: add `seller_response text`, `seller_response_at`, `reported bool`, `verified_purchase bool` (derive from completed order). Reconcile the two trust‑score implementations (`trustService` JS vs `recalculate_seller_reputation_score` SQL) → keep the SQL function as authoritative, remove JS duplicate. No new tables.

## Module N — Platform Credits

| Object | Change | Detail |
|---|---|---|
| `platform_credits` | **NEW** | Non‑withdrawable ledger: `id`, `user_id`, `amount`, `reason text` (compensation/partial_refund/promo), `granted_by`, `consumed_by_order null`, `created_at`. Offsets platform‑fee portion only. |
| RLS impact | owner read own + staff; write = admin (grant) / system (consume). |

## Module O — Automation / Cron

| Object | Change | Detail |
|---|---|---|
| **pg_cron** | **NEW (not present today)** | enable extension OR use Supabase scheduled Edge Functions. Existing functions `check_and_downgrade_expired_subscriptions()`, `checkAndReleaseEscrows` need a scheduler. |
| `cron_runs` | **NEW** | job audit: `job_name`, `started_at`, `finished_at`, `status`, `affected_rows`, `error`. |
| Jobs to schedule | — | listing expiry+reminders, promotion expiry, subscription expiry→downgrade→pause/restore, escrow auto‑release, dormant transition, badge expiry, trending recompute, auto‑cancel unresponsive orders, auto‑complete on inspection lapse, auto‑invoice generation+email. |
| RLS impact | `cron_runs` read = staff. Jobs run as service role (bypass RLS). |

> **DB‑level MISSING flags:** `conversations`/`messages` tables are referenced by an existing RPC but never created (Module I). 6/12‑month plan price columns in `subscription_plans_config` exist conceptually but values are MISSING. Enterprise monthly price conflict (9,999 vs 10,000) must be set in `subscription_plans_config` once confirmed.

---
---

# PART 5 — API CONTRACT (server functions)

**Convention (verified):** this app uses TanStack `createServerFn({ method }).inputValidator((d:Type)=>d).handler(async ({data})=>…)`. There is **no Zod** today — validators are identity functions with TS types; handlers return `{ success, error?, data? }`. The admin/service‑role client comes from `src/server/supabase-admin.ts` (`getAdminClient()`). **Planning recommendation:** introduce real runtime validation (zod) for all new money/auth endpoints — flagged per‑contract as `Validation`. "Endpoint" = the logical RPC name (not a REST path).

**Error code convention (proposed, uniform):** `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, `RATE_LIMITED`, `STATE_INVALID` (wrong status for action), `CONFIG_MISSING`, `INTERNAL`. Returned as `{ success:false, error:{ code, message } }`.

---

## Module A — Notifications & Email

| Server fn (endpoint) | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `notify` (NEW central dispatcher) | `{ eventKey, recipients?:{userIds?,roles?}, entity?:{type,id}, link?, data }` | `{success, notificationIds[]}` | eventKey ∈ notification_events; resolve recipients from matrix | CONFIG_MISSING, VALIDATION, INTERNAL | service‑role (called by other server fns) |
| `triggerNotification` (existing) | `{userId,kind,title,body,emailPayload?}` | `{success,error?}` | typed only → add zod | INTERNAL | service‑role |
| `triggerRoleNotification` (existing) | `{roles[],kind,title,body}` | `{success}` | typed | INTERNAL | service‑role |
| `getMyNotifications` (NEW) | `{cursor?,category?,unreadOnly?}` | `{items[],unreadCount,nextCursor}` | — | UNAUTHENTICATED | authenticated (own rows) |
| `markNotificationRead` / `markAllRead` (NEW) | `{id}` / `{}` | `{success}` | own row | UNAUTHENTICATED, FORBIDDEN | owner |
| `sendBroadcast` (NEW) | `{title,body,segment,channels,scheduleAt?}` | `{broadcastId}` | segment shape | FORBIDDEN, VALIDATION | super_admin |
| `getCommunicationLogs` (NEW) | `{filters,cursor}` | `{items[]}` | — | FORBIDDEN | staff |

## Module B — Fee Transparency / Commission

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `getTransactionSummary` (NEW) | `{categoryId, plan, price, protectionSelected?}` | `{orderTotal, commissionPercent, commissionAmount, protectionFee, sellerPayout, settlementTimeline[]}` | price>0; lookup commission_config+escrow_config | CONFIG_MISSING, VALIDATION | authenticated (seller on listing form / buyer on checkout) |
| `getCommissionConfig` / `setCommissionConfig` (NEW) | `{}` / `{categoryId,plan,percent}` | config rows / `{success}` | percent 0–100 | FORBIDDEN | read=auth, write=admin |
| `getBuyerProtectionQuote` (NEW) | `{categoryId, amount}` | `{eligible, feeType, fee}` | amount≥1000 else eligible=false | — | authenticated |

## Module C — Listing Forms & Delivery Engines

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `saveListingDelivery` (NEW) | `{listingId, engine, method, downloadLimit, config}` | `{success}` | engine/method enum; seller owns listing | FORBIDDEN, VALIDATION | seller(owner) |
| `addDigitalAsset` (NEW) | `{listingId, assetType, value}` | `{assetId}` | encrypt value (pgp_sym_encrypt) | FORBIDDEN | seller(owner) |
| `revealDigitalAsset` (NEW) | `{orderId, assetId}` | `{value}` (logged) | order paid+buyer; within download limit | FORBIDDEN, STATE_INVALID, RATE_LIMITED | buyer(of paid order) |
| `advanceGamingPhase` (NEW) | `{orderId, phase, checklist}` | `{order}` | phase transition legal | STATE_INVALID, FORBIDDEN | order participant |
| `submitServiceRequirements` / `lockRequirements` (NEW) | `{orderId, payload}` / `{orderId}` | `{success}` | requirements not yet locked | STATE_INVALID | buyer / seller |
| `deliverService` / `requestRevision` / `acceptDelivery` (NEW) | `{orderId, version, …}` | `{delivery}` | revisions ≤ package limit | STATE_INVALID, CONFLICT | seller / buyer |
| `getAvailability` / `setAvailability` (NEW) | `{listingId}` / `{…}` | slots / `{success}` | min_notice/max_advance | FORBIDDEN | public read / seller write |
| `bookSlot` (NEW) | `{listingId, slotId}` | `{booking}` | slot open; not double‑booked | CONFLICT, STATE_INVALID | buyer |
| `rescheduleBooking` / `cancelBooking` / `markSessionComplete` (NEW) | `{bookingId,…}` | `{booking}` | status transition | STATE_INVALID | participant |

## Module D — Listing Lifecycle & Moderation

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `submitListingForReview` (NEW) | `{listingId}` | `{success}` | seller owns; status draft/changes_requested | STATE_INVALID | seller(owner) → fires `notify` to moderators (CR‑202120) |
| `moderateListing` (NEW) | `{listingId, decision, reason?, notes?}` | `{success}` | decision ∈ approve/reject/request_changes; reason from enum | FORBIDDEN, VALIDATION | moderator/admin (human‑gated) |
| `renewListing` (NEW) | `{listingId}` | `{expiresAt}` | within plan limit | STATE_INVALID, FORBIDDEN | seller(owner) |
| `getModerationQueue` (NEW) | `{filters,cursor}` | `{items[]}` | — | FORBIDDEN | moderator+ |

## Module E — Promotions

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `purchasePromotion` (NEW) | `{listingId, type, tier|color}` | `{promotionId, endsAt}` | price from promotion_config; credits stack | CONFLICT (homepage slot full → credit not consumed), STATE_INVALID | seller(owner) |
| `getPromotionCenter` (NEW) | `{}` | `{credits, active[], history[]}` | — | UNAUTHENTICATED | seller(owner) |
| `recomputeTrending` (NEW, cron) | `{}` | `{updated}` | — | INTERNAL | service‑role |

## Module F — Escrow / Settlement / Withdrawals

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `requestWithdrawal` (existing, ALTER) | `{amount, method:'bank_transfer', accountDetails:{legalName,accountNumber,ifsc}}` | `{withdrawalId}` | **remove UPI**; amount ≤ available; freq within `withdrawal_config` | STATE_INVALID, RATE_LIMITED, VALIDATION | seller(owner) |
| `processWithdrawalStatus` (existing) | `{withdrawalId, status, notes?}` | `{success}` | legal status transition | FORBIDDEN, STATE_INVALID | finance/admin (human‑gated) |
| `checkAndReleaseEscrows` (existing, cron) | `{}` | `{released}` | escrow_config driven | INTERNAL | service‑role |
| `getSettlementTimeline` (NEW) | `{orderId}` | `{stages[]}` | — | FORBIDDEN | order participant |

## Module G — KYC / Verified Badge

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `submitKYC` (NEW; existing `submitKYCVerification` to refactor) | `{idDoc1{type,url}, idDoc2{type,url}, selfieUrl, addressProofUrl}` | `{submissionId}` | doc1.type ≠ doc2.type; all files present | VALIDATION, CONFLICT | authenticated |
| `reviewKYC` (NEW) | `{submissionId, decision, reason?}` | `{success}` | — | FORBIDDEN | verification staff (human‑gated, no auto‑approve) |
| `purchaseVerifiedBadge` (NEW) | `{plan}` | `{badgeId, expiresAt}` | price from badge_pricing_config | VALIDATION, CONFIG_MISSING | authenticated |

## Module H — Categories & Dynamic Engine

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `createCategory`/`updateCategory`/`reorderCategories`/`deleteCategory` (NEW) | `{name, publicDisplayName, parentId?, …}` | `{category}` | slug unique; no delete if listings exist | CONFLICT, FORBIDDEN | admin/super_admin |
| `getCategoryFieldConfig` (NEW) | `{categoryId}` | `{fields[]}` | — | — | public (drives dynamic form) |
| `setCategoryFieldConfig` / `setCategoryEngineConfig` (NEW) | `{categoryId, …}` | `{success}` | — | FORBIDDEN | admin |

## Module I — Order Room

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `getOrCreateOrderConversation` (existing RPC — needs tables!) | `{orderId}` | `{conversationId}` | order exists; participant | NOT_FOUND, FORBIDDEN | participant |
| `sendOrderMessage` (NEW) | `{conversationId, body, attachments?}` | `{message}` | not read‑only (order not completed) | STATE_INVALID, FORBIDDEN | participant |
| `confirmOrderCompletion` (NEW) | `{orderId}` | `{order}` | mutual completion logic | STATE_INVALID | participant → triggers settlement + invoice |
| `openDispute` (existing flow) | `{orderId, reason}` | `{disputeId}` | within protection window | STATE_INVALID | participant |

## Module J — Account Security

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `requestEmailChange`/`confirmEmailChange` (NEW) | `{newEmail}` / `{otp}` | `{success}` | OTP match+unexpired; email unused | VALIDATION, CONFLICT | owner |
| `requestPhoneChange`/`confirmPhoneChange` (NEW; wire existing SMS fns) | `{newPhone}` / `{otp}` | `{success}` | phone unique among verified (1‑phone‑1‑profile) | CONFLICT, VALIDATION | owner |
| `heartbeat` (NEW) | `{}` | `{success}` | updates `last_active_at` | UNAUTHENTICATED | authenticated |

## Module L — Admin/Super‑Admin

| Server fn | Input | Output | Validation | Errors | Permissions |
|---|---|---|---|---|---|
| `getLiveConversation` (existing) | `{conversationId}` | full thread | — | FORBIDDEN | moderator+ (fixes BUG‑06 when wired to UI) |
| `applyCoupon` (existing, FIX) | `{code, context}` | `{discount}` | remove hardcoded "Pro"; validate scope/expiry/usage | VALIDATION, CONFLICT, STATE_INVALID | authenticated |
| `sendNewsletter` (FIX dead button) | `{campaignId}` | `{sent}` | — | FORBIDDEN | admin |
| `setEmergencyControl` (NEW) | `{control, enabled}` | `{success}` | — | FORBIDDEN | owner only |

## Modules M / N / O

| Server fn | Input | Output | Errors | Permissions |
|---|---|---|---|---|
| `submitReview` (NEW) | `{orderId, rating, text}` | `{review}` | STATE_INVALID (order not completed) | buyer(verified purchase) |
| `respondToReview` (NEW) | `{reviewId, response}` | `{success}` | FORBIDDEN | seller(owner) |
| `grantPlatformCredit` (NEW) | `{userId, amount, reason}` | `{success}` | FORBIDDEN | admin |
| Cron entrypoints (Module O) | `{}` each | `{affected}` | INTERNAL | service‑role |

> **API MISSING flags:** `conversations`/`messages` tables must exist before `getOrCreateOrderConversation` is reliable. 6/12‑month badge & plan prices needed before `purchaseVerifiedBadge`/plan‑duration billing. Confirm Enterprise price before commission/settlement display for Enterprise plan.

---
---

# PART 6 — UI SCREEN CHECKLIST

Each screen lists the sub‑items to build/fix. `(NEW)` = create, `(FIX)` = bug from Part 1, `(EXT)` = extend existing. Routes verified in `src/routes/`. All screens: dark theme default, gold accent, mobile + desktop responsive, shadcn/ui primitives, HUXZAIN default avatar (BUG‑09).

## Public
- **Home `index.tsx`** — remove dummy Featured/Trending (BUG‑12, FIX); Featured = paid source; Trending = computed; announcement bar (EXT); empty‑state when no real data.
- **Header `components/site/Header.tsx`** — remove "?" contact icon (BUG‑07, FIX); add **Help Centre** to profile dropdown (NEW); notification bell deep‑links + 6 categories (BUG‑02, EXT); real presence (BUG‑10) on avatars.
- **Category page `category.$slug.tsx`** — public display name "Games" not "Gaming Accounts" (BUG‑14, FIX); category Featured section.
- **Product page `product.$id.tsx`** — **remove Security Score block** (BUG‑04, FIX); verified badge propagation; real presence; reviews (verified‑purchase) display (Module M).
- **Help Centre (NEW route)** — public KB surfaced from `kb_articles`; search; contact/ticket entry.
- **Verified Badge landing (NEW route)** — mockup 202017: plans + 4‑step explainer.

## Buyer
- **Dashboard `dashboard.tsx`** — order list reflects real orders; notifications surfaced.
- **Orders `orders.tsx`** — order‑room link; status timeline.
- **Order Room (NEW)** — timeline, order‑linked chat, inspection countdown, mutual completion, dispute button, read‑only after completion, invoice gated to completed (BUG‑11).
- **Checkout `checkout.payment.tsx`** — **remove UTR + GSTIN** (BUG‑05, FIX); screenshot‑only + AI‑written instruction; Buyer Protection option (≥₹1,000); Transaction Summary breakdown (sale→commission→protection→net).
- **Checkout verify `checkout.verify-payment.tsx`** — confirmation + purchase‑successful/invoice email on approval (CR‑201931).
- **Account `account.index.tsx`** — add **email field + email change via OTP**; **phone change via OTP** (BUG‑08, FIX); HUXZAIN default avatar.
- **Account → Notifications panel** — **hide for now** (BUG‑15, FIX); keep order+message notifications firing.

## Seller
- **Dashboard `seller.index.tsx`** — order counters from same source as Orders queue (BUG‑03); new‑order notification.
- **Listings / Create‑Edit `seller.listings.tsx`** — **category‑specific dynamic forms** (Module C); remove leaked "(Auto‑updates based on Category)" text (BUG‑13, FIX); **Transaction Summary panel below pricing** (Module B); **Security/Quality score at form bottom** (BUG‑04); delivery‑engine config per category; expiry countdown.
- **Orders `seller.orders.tsx`** — Invoice gated to completed (BUG‑11, FIX); order‑room; delivery actions per engine.
- **Earnings `seller.earnings.tsx`** — per‑order settlement (pooled wallet already removed); settlement timeline.
- **Withdrawals `seller.withdrawals.tsx`** — **Bank Transfer only, remove UPI** (BUG/CR‑201943, FIX); legal name/account/IFSC; status labels; dormant display.
- **Subscription `seller.subscription.index.tsx` / `.payment.tsx`** — plan limits per category; durations (6/12mo MISSING‑gated).
- **Verification → rename "KYC Verification"** (`seller.verification.tsx`, FIX); **split badge purchase into its own option** (CR‑202000); 4‑step KYC (two different gov IDs + selfie + address).
- **Promotion Center (NEW or `seller.boosts.tsx`/`seller.ads.tsx` EXT)** — Featured/Homepage/Boost/Glow/Urgent; credits; remove fabricated ad analytics (carry‑forward FIX).
- **Notifications `seller.notifications.tsx`** — deep‑links; categories.

## Admin
- **Listings `admin.listings.tsx`** — moderation queue; review page with score + structured rejection reasons; email moderators on submit.
- **Orders/Payments `admin.orders.tsx`/`admin.payments.tsx`** — approve payment → buyer purchase‑successful+invoice email, seller new‑order email (CR‑201931).
- **Disputes `admin.disputes.tsx`** — human‑gated resolution; payout stays frozen (already fixed).
- **Withdrawals `admin.withdrawals.tsx`** — review/approve flow; risk flags.
- **Categories `admin.categories.tsx`** — **no‑code Category CRUD** (Module H); public display name; field/engine config.
- **Chats `admin.chats.tsx`** — **rows open the conversation** (BUG‑06, FIX) via `getLiveConversation`.
- **Newsletter `admin.newsletter.tsx`** — real send (FIX dead button).
- **Coupons** — coupon engine; fix hardcoded "Pro" (FIX).
- **Audit logs `admin.audit-logs.tsx`** — remove MOCK_LOGS fallback (FIX).
- **Communication `admin.communication.tsx`** — broadcasts, segments, logs.
- **Verifications `admin.verifications.tsx`** — KYC review (human‑gated).

## SuperAdmin / Owner
- **Command center `admin.index.tsx`** — super‑admin dashboard feed (Module A); platform health.
- **Commission/Escrow config UIs (NEW)** — edit `commission_config`/`escrow_config`/`withdrawal_config`/`dormant_config`.
- **Emergency controls (NEW)** — freeze marketplace / disable withdrawals / disable purchases (owner‑only).
- **Homepage CMS + announcement bar (NEW)**; policy CMS + consent logging.
- **Role matrix** — superadmin absolute vs admin restricted (CR‑201806, verify).

---
---

# PART 7 — FINAL ACCEPTANCE CHECKLIST

**Run after every module (gate to next module) and once at release.**

### Build & quality gates (per module — from CONTINUE_HERE rules)
- [ ] `npm run typecheck` passes (tsc --noEmit, 0 errors)
- [ ] `npm run build` passes (vite build)
- [ ] `npm run lint` — 0 ESLint errors
- [ ] `npm run test` — vitest green (new tests for the module added)
- [ ] No `console.*` errors in browser at runtime for touched screens
- [ ] No placeholder/dummy/mock data shipped (no MOCK_LOGS, no fabricated analytics, no hardcoded featured/trending)
- [ ] No `TODO`/`FIXME` left in the module's code
- [ ] Existing functionality preserved — unrelated code untouched (surgical diff)
- [ ] DB migration written, named per convention, and verified (applies cleanly + RLS tested)
- [ ] `walkthrough.md` and `task.md` updated for the module

### Data‑integrity gates
- [ ] All business values come from config/DB tables (commission, escrow, limits, prices, promo prices) — grep for hardcoded numbers
- [ ] No invented values — every MISSING item surfaces a "needs client input" note, not a guess
- [ ] Scores never block publishing; all approvals (listing/payment/dispute/KYC) remain human‑gated

### UX / platform gates
- [ ] Mobile + desktop responsive (test ≤375px and ≥1280px)
- [ ] Dark theme correct (gold accent, no light‑mode leakage)
- [ ] HUXZAIN default avatar everywhere (no "huxin")
- [ ] a11y: keyboard nav, focus states, labels/aria on new interactive elements, contrast
- [ ] Loading/empty/error states present for every new data view

### Security gates
- [ ] RLS verified on every new table (owner/staff/public scoped correctly)
- [ ] Sensitive assets stay in private buckets + signed URLs (no raw URLs)
- [ ] Money/auth endpoints have runtime validation + permission checks
- [ ] Deep‑links can't leak cross‑user data (notification links re‑authorize)

### End‑to‑end acceptance (release)
- [ ] Order E2E: buyer IA+email on submit; seller IA+email on approval; super‑admin dashboard entry; each notification deep‑links correctly
- [ ] Transaction Summary: Gaming Standard ₹5,999 → payout ₹4,919 (18%); changes with plan/category
- [ ] Gaming 3‑phase delivery completes only after ownership‑transfer checklist; digital reveal respects download limit
- [ ] 30‑day expiry job flips listing → Expired + reminder fired; downgrade pauses excess + renew restores
- [ ] Withdrawal shows only Bank Transfer; dormant triggers at day 61
- [ ] Verified Badge: cannot upload same gov‑ID type twice; selfie + address required
- [ ] Edge cases pass: redeemed code, no‑show session, revision vs new scope, slot double‑book, expired download link, sub‑expiry mid‑promotion (promo runs to own end), order < ₹1,000 (no protection fee)
