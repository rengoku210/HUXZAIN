# HUXZAIN — Requirement Traceability Matrix

**Generated:** 2026-06-17
**Source of truth:** `scratch/devdoc-requirements.md` (sections A–DD) + `update_modal.txt` (client feedback)
**Method:** 9 parallel read-only audits, one per section-cluster. Status reflects END-TO-END verifiability (a feature is *not* complete merely because a table/route/component exists), not just code presence.

> **Scope honesty:** This matrix was produced by static + structural audit. Items marked FULLY were verified by file evidence and wiring, but live runtime verification (clicking through flows against the DB) has NOT been performed for most rows yet — that happens per-slice during the fix phase. Rows depending on the 3 unapplied P0 migrations are marked accordingly.

## Status legend
- **FULLY** — complete and wired end-to-end
- **PARTIAL** — exists but incomplete or broken somewhere in the chain
- **UI-ONLY** — frontend present, no working backend
- **BACKEND-ONLY** — backend/DB present, not reachable/usable by a user
- **DB-ONLY** — table/column exists, no logic or UI
- **NOT-IMPLEMENTED** — absent

---

## A. Authentication & Accounts

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| AUTH-01 | Central auth, 5 account types | PARTIAL | src/lib/roles.ts | 14 roles defined; core 5-type separation unclear |
| AUTH-02 | Signup email + phone | PARTIAL | signup.tsx (email); sms/phone-verification.functions.ts | Phone backend ready, NOT wired into signup |
| AUTH-03 | OAuth (Google/Discord/Steam/Apple) | NOT-IMPLEMENTED | — | None |
| AUTH-04 | Reg flow: signup→role→details→OTP→onboarding | PARTIAL | signup.tsx, verify-email.tsx | OTP ✓; no role-select step, no onboarding |
| AUTH-05 | Unique usernames, reserved keywords | NOT-IMPLEMENTED | auth.functions.ts | admin/support/official not blocked |
| AUTH-06 | Passwords hashed, strong rules | FULLY | Supabase auth; signup.tsx:39 | bcrypt via Supabase; min length client-side |
| AUTH-07 | Email verification flow | FULLY | verify-email.tsx | 6-digit OTP, 10-min expiry |
| AUTH-08 | Phone OTP verification | BACKEND-ONLY | sms/phone-verification.functions.ts | Not integrated into required flows |
| AUTH-09 | Login email/username + password | PARTIAL | login.tsx, team-login.tsx | Email only; username login missing |
| AUTH-10 | Brute-force protection | PARTIAL | sms/audit-logs.ts | Logging only; no per-user lockout |
| AUTH-11 | Session security/remember device | PARTIAL | Supabase JWT | Expiry ✓; remember-device & suspicious-login missing |
| AUTH-12 | Forgot password flow | FULLY | forgot-password.tsx, reset-password.tsx | Complete |
| AUTH-13 | Account recovery email+phone | PARTIAL | — | Email ✓; phone not integrated |
| AUTH-14 | Login history | UI-ONLY | account.index.tsx | No login-history table |
| AUTH-15 | Multi-device session control | NOT-IMPLEMENTED | — | None |
| AUTH-16 | CAPTCHA/anti-bot signup+login | NOT-IMPLEMENTED | — | **CRITICAL: no bot protection** |
| AUTH-17 | Age confirmation checkbox | NOT-IMPLEMENTED | signup.tsx | Missing |
| AUTH-18 | 7 account statuses | DB-ONLY | core_marketplace_schema.sql | Only suspended_at; 1 of 7 |
| AUTH-19 | Granular ban/restriction | NOT-IMPLEMENTED | — | All-or-nothing freeze only |
| AUTH-20 | Referral-ready structure | NOT-IMPLEMENTED | — | None |
| AUTH-21 | Token auth for mobile | PARTIAL | JWT | No dedicated mobile API |
| AUTH-22 | Buyer onboarding | UI-ONLY | — | No onboarding modal/interests |

## B. User Roles & Permissions (Owner/Staff)

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| ROLE-01 | Permission-based roles | FULLY | roles.ts | Comprehensive permission model |
| ROLE-02 | Role hierarchy Owner→…→Support | FULLY | roles.ts:85-86, admin/role.functions.ts | Hierarchy enforced |
| ROLE-03 | Super Admin controls | PARTIAL | admin.tsx | Sidebar covers areas; each unverified |
| ROLE-04 | Moderation staff (not financial) | PARTIAL | roles.ts | Role defined; financial gating unverified |
| ROLE-05 | Financial admin | PARTIAL | roles.ts | Permissions defined |
| ROLE-06 | Support staff (not KYC/financial) | PARTIAL | roles.ts, admin.tickets.tsx | Restrictions unverified |
| ROLE-07 | Verification staff | PARTIAL | roles.ts, admin.verifications.tsx | 4 functions partial |
| ROLE-08 | Fraud/Risk staff role | DB-ONLY | — | **Missing dedicated role** |
| ROLE-09 | Custom staff role builder | NOT-IMPLEMENTED | staff.functions.ts | **CRITICAL: no custom-role UI** |
| ROLE-10 | Custom staff creation flow | PARTIAL | staff.functions.ts | No manual permission assignment |
| ROLE-11 | Permission builder (checkbox) | NOT-IMPLEMENTED | roles.ts | **CRITICAL: hardcoded per role** |
| ROLE-12 | Game-specific moderators | NOT-IMPLEMENTED | — | None |
| ROLE-13 | Category-based staff access | NOT-IMPLEMENTED | — | None |
| ROLE-14 | Staff dashboard by permissions | NOT-IMPLEMENTED | admin.tsx | **All staff see identical UI** |
| ROLE-15 | Staff task queue | PARTIAL | admin.tasks.tsx | Auto-populate unclear |
| ROLE-16 | Staff action logging | FULLY | sms/audit-logs.ts, admin.audit-logs.tsx | Comprehensive |
| ROLE-17 | Staff performance tracking | UI-ONLY | — | Future-ready only |
| ROLE-18 | Backend-enforced staff restrictions | PARTIAL | auth/roleGuard.ts | Checks exist; full route audit needed |
| ROLE-19 | Super Admin override | PARTIAL | staff.functions.ts | Disable ✓; revoke-specific missing |
| OWNER-01..15 | Owner architecture/dashboard | PARTIAL/NOT-IMPL | admin.* | **OWNER-03 no separate owner panel; OWNER-08 credential reveal log, OWNER-13 global search missing** |

## C. Seller System (Plans/Tiers/Onboarding/Dashboard)

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| SEL-01..09 | Onboarding flow | PARTIAL/NOT-IMPL | become-coach.tsx, seller-panel.tsx | Verbatim notice (SEL-03), warnings (SEL-04), tutorial (SEL-08), activity status (SEL-09) missing |
| PLAN-02 | Verified Badge ₹499/mo | **PRICING-MISMATCH** | DB:20260604113000:23 (₹149); tier-context.tsx:51 (₹499) | **DB ≠ frontend ≠ spec** |
| PLAN-05 | Pro ₹2999/mo | **PRICING-MISMATCH** | DB:24 (₹299); tier-context.tsx:68 (₹2999) | **DB 90% under spec** |
| PLAN-06 | Elite ₹4999/mo | **PRICING-MISMATCH** | DB:25 (₹599); tier-context.tsx:86 (₹4999) | **DB 88% under spec** |
| PLAN-07 | Enterprise ₹10000/mo | **PRICING-MISMATCH** | DB:26 (₹999); tier-context.tsx:105 (₹10000) | **DB 90% under spec** |
| PLAN-08 | Boost tokens reusable | FULLY | subscription.functions.ts:205-273 | Token deduction works |
| PLAN-10 | Downgrade on expiry | FULLY | DB:20260604113000:240-263 | Function exists |
| PLAN-11..12 | Sub statuses/storage | FULLY | DB:42, subscription.functions.ts | 5 statuses, fields mapped |
| PLAN-13 | Purchase flow | UI-ONLY | seller.subscription.payment.tsx | Manual; no auto-activation |
| PLAN-15 | Pricing admin-configurable | FULLY (table) / VIOLATED (code) | subscription_plans_config; tier-context.tsx hardcoded | Table exists but frontend hardcodes |
| PLAN-16 | Storage limits per plan | UI-ONLY | — | Not enforced at upload |
| PLAN-17 | Support priority per plan | NOT-IMPLEMENTED | — | None |
| SDASH-01..17 | Seller dashboard | PARTIAL | seller.tsx, seller.index.tsx | Ownership-transfer checklist (11), bulk listing (12), review-delete guard (13), perf-score usage (17) missing |

## D. Listing System

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| LIST-01 | Creation flow + moderation | PARTIAL | seller.listings.tsx:51-500 | No admin moderation queue |
| LIST-02 | Category dynamic forms | FULLY | seller.listings.tsx:643-850 | game-accounts form works |
| LIST-05 | Gaming account fields | FULLY | seller.listings.tsx:650-805 | All 13 fields present |
| LIST-06 | Account Security Score | UI-ONLY | seller.listings.tsx:757-804 | Fields collected, no calc |
| LIST-08/20 | Delivery types incl Hybrid | PARTIAL | seller.listings.tsx:582-590 | instant/manual only; no Hybrid |
| LIST-10 | 3-phase account delivery | NOT-IMPLEMENTED | — | **Not implemented** |
| LIST-11..16 | Non-gaming category forms | PARTIAL/NOT-IMPL | listing-attributes.ts | **Types defined, NO UI form for ingame/giftcard/software/coaching/buddy/freelance** |
| LIST-17 | Multi-image, compress, reorder | PARTIAL | seller.listings.tsx:507-541 | Reorder buttons; no DnD/compress |
| LIST-24 | 9 listing statuses | BACKEND-ONLY | types.ts:9-15 | Only 5 of 9 |
| LIST-25 | Moderation review flow | NOT-IMPLEMENTED | admin.listings.tsx | No review workflow |
| LIST-29 | Listing analytics | NOT-IMPLEMENTED | — | None |
| LIST-30 | Listing expiry/renewal | NOT-IMPLEMENTED | — | No expiry_at |
| LIST-32 | Tag system | FULLY | seller.listings.tsx:622-641 | Works |

## E. Category Architecture & Dynamic Fields

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| CAT-01/04 | Hierarchy parent-child | FULLY | sync_categories.sql, categories.tsx | Works |
| CAT-02/03 | Owner category CRUD | DB-ONLY | admin.categories.tsx | **No admin CRUD UI; categories via SQL only** |
| CAT-05 | Category statuses | DB-ONLY | — | No status column |
| CAT-07/08/09 | Dynamic field engine | PARTIAL | listing-attributes.ts | Hardcoded in TS, not admin-config |
| CAT-11..15 | Per-category commission/cooldown/delivery/moderation | DB-ONLY/NOT-IMPL | — | None configurable |
| CAT-23..25 | Manual category suggestion + review queue | NOT-IMPLEMENTED | — | None |
| CAT-28/29/30 | Platform/region/delivery filters | PARTIAL/NOT-IMPL | seller.listings.tsx | Free-text, no enum/filters |
| CAT-31..37 | Core categories exist | FULLY | categories migration | Present |
| CAT-38/41/43 | Gaming Services / Redeemable Codes / Collectibles | NOT-IMPLEMENTED | — | Missing categories |

## F. Marketplace / Search / Ranking / Homepage

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| HOME-01..09 | Homepage sections | FULLY/PARTIAL | index.tsx | Most present |
| HOME-10 | Live activity (never fake) | NOT-IMPLEMENTED | — | None |
| HOME-13/14/15 | Announcement bar + Homepage CMS | NOT-IMPLEMENTED | marketplace-data.ts | Hardcoded content |
| HOME-16 | Branded 404 | NOT-IMPLEMENTED | — | Generic |
| SRCH-02/03 | Full-text + partial match | NOT-IMPLEMENTED | — | No FTS index |
| SRCH-09 | Sorting options | PARTIAL | category.$slug.tsx:120 | Only newest + boost |
| SRCH-10 | Featured priority + organic | FULLY | category.$slug.tsx:139-154 | Works |
| SRCH-11 | Organic ranking factors | PARTIAL | category.$slug.tsx | Only boost_score + recency |
| SRCH-13/18 | Search analytics + admin control | NOT-IMPLEMENTED | — | None |

## G. Order Flow & Order Room

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| ORD-01 | Core fund-hold→deliver→verify→cooldown | PARTIAL | orders.tsx, wallet.functions.ts | States exist; automation partial |
| ORD-02/03/04 | Checkout + protection fee | UI-ONLY/PARTIAL | checkout.payment.tsx | **No protection-fee UI, no listing summary sidebar** |
| ORD-05/06 | Order statuses (full set) | PARTIAL | orders.tsx:39-80 | Subset of documented states |
| ORD-07 | Central order page | PARTIAL | messages.tsx:1166-1604 | Split across /orders + order room |
| ORD-10 | Order automation | NOT-IMPLEMENTED | — | **Manual steps only** |
| ORD-11 | Account delivery panel | PARTIAL | messages.tsx:1750-1850 | Works; masking unclear |
| ORD-12 | Report listing + safety instructions | UI-ONLY | messages.tsx:1231 | No report-listing, no post-purchase safety |

## H. Chat System & Anti-Fraud

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| CHAT-01 | Mandatory in-platform chat | PARTIAL | messages.tsx, chat/fraud-detection.ts | Built; no external-contact block |
| CHAT-02 | Text/images/order-linked | PARTIAL | messages.tsx | Text only, no images |
| CHAT-03/04/05 | Credential masking + secure reveal + log | NOT-IMPL/PARTIAL | messages.tsx:105-140 | No warning popup, no message-level masking |
| CHAT-06 | Dispute chat isolation | NOT-IMPLEMENTED | — | Single thread |
| CHAT-07 | Auto-detect external contact | PARTIAL | chat/fraud-detection.ts:31-108 | Detect+warn ✓; no block |
| CHAT-08 | Admin-managed banned keywords | NOT-IMPLEMENTED | — | Hardcoded rules |
| FRAUD-01..16 | Fraud monitoring/enforcement | PARTIAL/NOT-IMPL | chat/fraud-detection.ts, fraud_events | **Logged but no enforcement (visibility/payout/suspension)** |

## I. Escrow / Earnings / Settlement

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| ESC-01 | Safe terminology | PARTIAL | seller.wallet.tsx:63 | "Wallet" used (violates) |
| ESC-03/04 | Category cooldowns admin-configurable | PARTIAL/NOT-IMPL | escrow.ts:65-77 | **Hardcoded, not per-category, not admin-config** |
| ESC-05/06 | Trust-tier hold reduction | NOT-IMPL/PARTIAL | escrow.ts | Uses subscription tier, not trust tier |
| ESC-08 | Auto-release | PARTIAL | wallet.functions.ts:208-249 | Timer-based; no buyer-confirm flow |
| ESC-09 | Dispute auto-freeze | FULLY ✓ | disputeService.ts:51-57; wallet.functions.ts:69 | **P0.1 — verified present** |
| ESC-10 | NO traditional wallet | **VIOLATED** | seller.wallet.tsx:11-188 | **Generic wallet page exists — contradicts Part 35** |
| ESC-11 | Per-order settlement | FULLY | seller.withdrawals.tsx:114-130, payout-calculator.ts | Works correctly |
| ESC-16/19 | Withdrawal verification (PAN/govID/legal name) | PARTIAL | seller.withdrawals.tsx:196-223 | Missing PAN, govID, legal name |
| ESC-20 | 9 withdrawal statuses | PARTIAL | wallet.functions.ts:416-430 | Only 3 of 9 |
| ESC-22 | Withdrawal auto-block | FULLY | wallet.functions.ts:384-395 | Freeze/dispute checks (no KYC check) |
| ESC-27 | Transaction logging | FULLY | wallet.functions.ts (multiple) | Complete |

## L. Dispute System

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| DISP-01/03 | Open dispute + auto-freeze | FULLY | seller.disputes.tsx, disputeService.ts:39-45 | Works |
| DISP-04 | Predefined dispute reasons | BACKEND-ONLY | disputeService.ts:11 | Free-text, no enum |
| DISP-05 | Evidence private encrypted | FULLY ✓ | disputeService.ts:29-36 | **P0.2 — private bucket + signed URLs** |
| DISP-06 | Full dispute status set | PARTIAL | disputeService.ts:5 | 5 of documented; no Waiting/Escalated |
| DISP-08 | Response deadlines/timers | NOT-IMPLEMENTED | — | None |
| DISP-10 | Category-specific moderation | NOT-IMPLEMENTED | — | None |
| DISP-11 | Internal staff notes | NOT-IMPLEMENTED | — | None private |
| DISP-13 | Moderator actions (freeze/warn/escalate/suspend) | PARTIAL | admin.disputes.tsx | Only refund split |
| DISP-14/21 | Partial refund / settlement split | FULLY | admin.disputes.tsx | buyer%/seller% works |
| DISP-15/17/18/20 | Escalation/priority/assignment/auto-flag | NOT-IMPLEMENTED | — | None |
| DISP-23/24 | Dispute→trust impact, review-block | NOT-IMPLEMENTED | — | None |

## M. Verification / KYC / Badges

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| KYC-01 | Multi-layer verification | PARTIAL | seller.verification.tsx:37-100 | Only L2 identity |
| KYC-05 | KYC form fields (name/DOB/PAN/address) | PARTIAL | seller.verification.tsx:25-67 | Only payout details |
| KYC-08 | Verification statuses | FULLY | admin.verifications.tsx:53,60 | All present |
| KYC-09 | Review panel | PARTIAL | admin.verifications.tsx:65-180 | No dispute history/payouts/re-upload |
| KYC-11 | Badge on profile/cards/search/order | PARTIAL | ListingCard.tsx:69,78-79 | Cards only; not profile/search/order |
| KYC-13 | Enterprise/business verification | NOT-IMPLEMENTED | — | None |
| KYC-14 | Manual review only | FULLY | admin.verifications.tsx:117-150 | No auto-approve |
| KYC-15/17 | Fraud flagging / payout-name matching | NOT-IMPLEMENTED | — | None |
| KYC-21 | Verification → trust score | PARTIAL | reputation_and_performance_engine.sql | **verification_level NOT in formula** |
| KYC-22 | KYC access logging | NOT-IMPLEMENTED | — | No view audit |
| BADGE-01 | Seller levels (New→Partner) | PARTIAL | ListingCard.tsx:72-80 | Subscription tiers only |
| BADGE-03 | Badge expiry | NOT-IMPLEMENTED | — | **No expiry logic** |

## N. Reviews & Reputation / Trust Score

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| REV-01 | Reviews only after completion by verified buyer | PARTIAL | reviewService.ts:17-36 | **No completion/verified-buyer validation** |
| REV-02/06 | Review on profile/listing | PARTIAL | seller.reviews.tsx | **Not shown on public listing/profile** |
| REV-03 | Star 1-5 | FULLY | reviewService.ts:11 | Works |
| REV-05 | Verified-purchase indicator | NOT-IMPLEMENTED | — | None |
| REV-08/09/10 | Review moderation/report/status | NOT-IMPLEMENTED | — | None |
| REV-12 | Seller response to reviews | NOT-IMPLEMENTED | — | One-way |
| REV-13 | Fake review prevention | NOT-IMPLEMENTED | reviewService.ts | Self-review possible |
| TRUST-01 | Internal trust score | PARTIAL | 20260604141000 | Inconsistent naming (trust/reputation/performance) |
| TRUST-02 | Trust factors (10+) | PARTIAL | reputation_and_performance_engine.sql:69-99 | ~60%; missing age/verification/activity/escrow |
| TRUST-03 | Trust auto-calc + effects | PARTIAL | trg_recalculate_reputation | Calc ✓; most effects not wired |
| TRUST-04 | Buyer reputation | NOT-IMPLEMENTED | — | Seller-only |
| TRUST-05/06 | Trending seller / spotlight | NOT-IMPLEMENTED | — | None |

> **Note:** Two trust implementations exist — `trustService.ts:computeTrustScore()` (JS) vs `recalculate_seller_reputation_score()` (SQL). Authoritative one unclear; reconcile before relying on either.

## O. Payments (Manual Verification) & Platform Credits

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| PAY-02/03/04 | Payment portal + submission + admin panel | FULLY | checkout.payment.tsx:440-657, admin.payments.tsx | QR/UTR/screenshot, OCR, approve/reject ✓ |
| PAY-05 | Payment statuses incl Expired | PARTIAL | payment_proofs | No expiry automation |
| PAY-06 | Fake screenshot protection | PARTIAL | checkout.payment.tsx:524-537 | Warning only; no IP/device/dup detection |
| PAY-07/08 | Gateways + category-based methods | NOT-IMPLEMENTED | — | Manual UPI only |
| PAY-10 | Funds held until conditions met | FULLY | checkout.payment.tsx:215-229, admin.payments.tsx:454 | Escrow flow works |
| PAY-13 | Buyer payment history page | NOT-IMPLEMENTED | — | **No buyer visibility into proof status** |
| CRED-01..06 | Platform Credits | NOT-IMPLEMENTED | — | **Entirely missing (no table/UI/logic)** |

## P. Invoices & Billing

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| INV-01 | Auto invoice generation | PARTIAL | admin.invoices.tsx | **Not triggered on payment/settlement/boost** |
| INV-02/08 | PDF generation + branding | FULLY | invoice-pdf.ts, email-templates.ts | jsPDF ready |
| INV-04/05 | Manual invoice creator | FULLY | admin.invoices.tsx:40-65 | Full form |
| INV-06 | Auto invoice numbering | NOT-IMPLEMENTED | invoice_counters (dead code) | Manual entry |
| INV-07 | Auto tax calculation | PARTIAL | admin.invoices.tsx:146-147 | No GST logic |
| INV-09 | Email invoice to customer | PARTIAL | admin.invoices.tsx | **No email trigger** |
| INV-11 | Invoice statuses | PARTIAL | invoices table | No transition UI |

## Q. Notifications & Emails

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| NOTIF-02 | Centralized event engine | PARTIAL | notifications.functions.ts:7-121 | Ad-hoc, ~40% events missing |
| NOTIF-03 | In-platform notification center | PARTIAL | notifications table | **No user-visible UI / unread badge** |
| NOTIF-07 | Withdrawal notifications | NOT-IMPLEMENTED | — | **CRITICAL: seller blind to withdrawal status** |
| NOTIF-08/10/11 | Dispute/listing/KYC notifications | NOT-IMPLEMENTED | — | Users not notified of outcomes |
| EMAIL-01 | Auth emails (OTP/verify/reset) | PARTIAL | email-templates.ts:38-52 | 1 of 4 |
| EMAIL-03/04 | Seller + admin alert emails | NOT-IMPLEMENTED | — | **CRITICAL: operational blindness** |
| EMAIL-05 | Branded templates | FULLY | email-templates.ts:7-35 | Resend + branding ✓ |
| NOTIF-17 | Delivery reliability/retry | PARTIAL | — | Fire-and-forget, no retry |

## R. Admin / Super Admin Panel

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| ADM-01 | Admin sidebar | PARTIAL | admin.index.tsx, 27 routes | Missing Announcements/Homepage-CMS/Reports routes |
| ADM-03/04 | Dashboard cards + activity feed | FULLY | admin.index.tsx:31-517 | 11 cards, live feed |
| ADM-07 | Seller management panel | PARTIAL | — | **No dedicated admin.sellers route** |
| ADM-09 | Seller warning system | NOT-IMPLEMENTED | — | No warning UI/tracking |
| ADM-10 | Listing moderation panel | PARTIAL | admin.listings.tsx | No approve/reject/edit workflow |
| ADM-15 | Support ticket panel | FULLY | admin.tickets.tsx | Full system |
| ADM-17 | Verification center | FULLY | admin.verifications.tsx | Works |
| ADM-21 | Announcement system | NOT-IMPLEMENTED | — | No route |
| ADM-27 | Off-platform detection panel | NOT-IMPLEMENTED | — | None |
| ADM-29/30 | Storage + file moderation | NOT-IMPLEMENTED | — | None |

## S. Moderation

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| MOD-01 | Listings not instantly live | PARTIAL | admin.listings.tsx | No enforced pending-review/auto-flag |
| MOD-02/03 | Off-platform detection + penalties | PARTIAL | admin/moderation.functions.ts | Strike system exists; enforcement link unclear |
| MOD-04 | Marketplace warning announcements | NOT-IMPLEMENTED | — | None |
| MOD-05 | Admin-managed banned keywords | PARTIAL | moderation.functions.ts:6-45 | Detection ✓; no admin keyword mgmt |
| MOD-08 | Auto-suspension logic | PARTIAL | moderation.functions.ts:274-285 | 4-strike; semi-automated |

## T. Subscriptions / Coupons / Pricing / Fees / Boosts

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| FEE-01..05 | Category commission + protection fee | DB-ONLY/NOT-IMPL | — | **No commission logic, no protection fee** |
| BOOST-01..04 | Boost pricing | HARDCODED | seller.boosts.tsx:18-61 | Hardcoded, ≠ spec (Urgent ₹79≠₹99, Glow ₹119≠₹149) |
| BOOST-02/10 | Homepage slot system | NOT-IMPLEMENTED | — | None |
| BOOST-06 | Boost token system | FULLY | subscription.functions.ts:205-273 | Works |
| COUP-01..10 | Coupon engine | PARTIAL/NOT-IMPL | seller.coupons.tsx, wallet.functions.ts | **No admin creation, no checkout integration** |
| REFER-01..03 | Referral system | NOT-IMPLEMENTED | — | Future-ready |
| PROMO-01/02 | Promo campaigns | NOT-IMPLEMENTED | — | None |

## U. Advertisement System

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| AD-01..14 | Entire ad system | NOT-IMPLEMENTED | — | **10/14 not implemented; boosts ≠ ads** |

## V. Analytics

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| ANL-01/03 | Owner + revenue analytics | PARTIAL | admin.analytics.tsx:79-100 | Basic totals; no sub/boost/protection breakdown |
| ANL-02 | Live activity feed | FULLY | admin.index.tsx:145-195 | Works |
| ANL-04 | Category analytics | NOT-IMPLEMENTED | — | None |
| ANL-09/10/12 | Search/behavior/fraud analytics | NOT-IMPLEMENTED | — | None |
| ANL-20 | Charts | PARTIAL | admin.analytics.tsx | Render lib unverified |
| ANL-22 | Export CSV/Excel/PDF | NOT-IMPLEMENTED | — | None |

## W. Security

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| SEC-01 | Passwords hashed | FULLY | Supabase auth | bcrypt |
| SEC-04 | RBAC backend-enforced | FULLY | auth/roleGuard.ts | Server validates |
| SEC-10 | No card storage | FULLY | checkout.payment.tsx | Manual only |
| SEC-12 | Bot protection/CAPTCHA | NOT-IMPLEMENTED | — | **CRITICAL** |
| SEC-16 | Security logging | FULLY | sms/audit-logs.ts | Comprehensive |
| SEC-22 | Automated suspicious-activity response | PARTIAL | — | Manual only |
| SEC-24/25 | Private/public storage separation | FULLY ✓ | storage/signedUrls.ts | **P0.2 verified** |

## X. Settings / Maintenance Mode

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| SET-01 | Maintenance mode | FULLY | admin.settings.tsx:25 | Works |
| SET-02/04 | DB-driven config tables | FULLY | platform_settings, subscription_plans_config | Present (but frontend hardcodes — see GOV-01) |
| SET-03 | Feature flags | PARTIAL | admin.categories.tsx | Categories only |
| SET-07 | Confirmation safeguards on destructive ops | NOT-IMPLEMENTED | — | **CRITICAL: no confirm dialogs on delete/suspend/refund** |

## Y. Support / Help Center / Tickets

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| SUP-01/03 | Ticket infrastructure + creation | FULLY | admin.tickets.tsx, seller.support.tsx | Works |
| SUP-04 | 11 ticket categories | PARTIAL | seller.support.tsx:29 | Only 4 in seller UI |
| SUP-10 | Category-based routing | NOT-VERIFIED | — | Manual assignment only |
| SUP-14 | Help Center / KB | PARTIAL | admin.tickets.tsx:70-77 | KB editable; no public help center page |
| SUP-16 | FAQ management | FULLY | admin.tickets.tsx:70-77 | Works |

## Z. Legal / Policies / Consent

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| LEG-01/17 | Marketplace-intermediary positioning | FULLY | terms.tsx:58-59 | Clear |
| LEG-02 | 15 policy pages | PARTIAL | terms/privacy/refund-policy.tsx | 3 of 15 present |
| LEG-03/04 | Policy CMS + versioning | NOT-IMPLEMENTED | — | Hardcoded JSX |
| LEG-05 | Consent logging | NOT-IMPLEMENTED | — | **No consent table** |
| LEG-07/08 | Seller consent + multi-touchpoint | NOT-IMPLEMENTED | — | None |
| LEG-14 | Prohibited items list | FULLY | terms.tsx:74-81 | Complete |

## AA. Database / Backend Architecture

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| DB-01..11 | Modular schema + core entities | FULLY | docs/SCHEMA.sql, migrations | All tables present |
| DB-12 | Background job/queue | PARTIAL | package.json | No queue library |
| DB-19 | Caching strategy | NOT-IMPLEMENTED | — | None |
| DB-20 | Cron/scheduled tasks | PARTIAL | — | **No pg_cron — expiry/auto-release not automated** |
| DB-21 | Search indexing (FTS) | PARTIAL | — | No FTS |

## BB. Storage / Media / Credential Infrastructure

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| STOR-01..04 | Credential encryption + reveal log | FULLY ✓ | 20260617130000 (P0.3, written, **unapplied**) | **Verify-after-apply** |
| STOR-05 | Cloud object storage | FULLY | Supabase Storage | Works |
| STOR-06/07 | Video handling | PARTIAL/NOT-IMPL | sharp | No video pipeline |
| STOR-09 | File expiry/cleanup | NOT-IMPLEMENTED | — | None |
| STOR-11 | Backup/DR | NOT-IMPLEMENTED | — | None documented |

## CC. Infrastructure / Deployment / SEO / Testing

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| SEO-01/03 | SEO URLs + sitemap | FULLY | sitemap[.]xml.ts | Works |
| SEO-02 | Dynamic meta/OG | PARTIAL | — | OG generation unverified |
| MOB-01..04 | Responsive + mobile-ready | UI-ONLY | Tailwind | Needs runtime QA |
| TEST-01..05 | Test coverage + load testing | PARTIAL | e2e/* | Incomplete; no load tests |

## DD. Cross-cutting / Governance

| ID | Requirement (short) | Status | Evidence | E2E Verdict / Gap |
|----|--------------------|--------|----------|-------------------|
| GOV-01 | No hardcoded business logic | PARTIAL/VIOLATED | tier-context.tsx:29-120, escrow.ts:24-77 | **Pricing, cooldowns, limits, boost tokens hardcoded** |
| GOV-06 | Activity logging, server-side access control | FULLY | credential_access_log, RLS | Works |
| GOV-08/09 | 3-section architecture + full page list | FULLY | routes/* | Present |
| GOV-10 | Buyer dashboard sidebar | UI-ONLY | dashboard.tsx | Credits section missing (CRED-01) |
