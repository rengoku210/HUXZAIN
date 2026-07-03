# HUXZAIN — Continuation Prompt (paste this into a new Claude Code session)

> Copy everything inside the code block below into a fresh session to resume this work.

```
You are resuming a HUXZAIN marketplace upgrade (TanStack Start + React 19 + Supabase,
repo: D:/huxzain-trusted-exchange-flow-main). A full audit was already completed in a prior
session. Read these BEFORE doing anything else, in order:

1. HUXZAIN_PRODUCTION_AUDIT_AND_BUILD_SPEC.md  (the master spec: Part 1 Bug Report,
   Part 2 Missing Features by module A–O, Part 3 Master AI Builder Prompt + data tables)
2. CONTINUE_HERE.md  (this file — status + rules + next steps)
3. The extracted source material is in scratch/audit/ (docx text + the 38 annotated
   client screenshots) if you need to re-verify a requirement. NEVER invent values.

=== WHAT IS ALREADY TRUE (do NOT redo) ===
- 5 prior P0s are FIXED in code: dispute payout-freeze, private sensitive buckets + signed
  URLs, credential encryption + reveal logging, subscription pricing (499/2999/4999/10000),
  pooled-wallet removed (per-order settlement only).
- A moderation/enforcement strike system exists (migration 20260622150000_moderation_tables.sql
  + src/lib/admin/moderation.functions.ts): strike ladder (3=30d suspend, 5=ban), DB write-
  blocker triggers, Supabase-Auth ban sync. Build anti-abuse ON TOP of this.
- A partial notification engine exists:
    * Table public.notifications: id, user_id, kind, title, body, read_at, created_at
      (NO link/target_url column, NO category column — this is why notifications aren't
      clickable, BUG-02).
    * src/lib/notifications.functions.ts: triggerNotification (user) + triggerRoleNotification
      (roles), service-role client + Resend email.
    * src/lib/email-templates.ts: 13 templates (welcome, orderConfirmation, paymentConfirmation,
      deliveryCompleted, reviewRequest, supportReply, disputeUpdate, payoutProcessed,
      withdrawalApproved, passwordReset, sellerVerification, invoiceGenerated). Missing ~34
      from the spec's 47-event matrix.
    * Bell UI is inline in src/components/site/Header.tsx (also a duplicate hook
      src/hooks/useNotifications.ts). Clicking a row only marks-read (Header.tsx ~line 718),
      no navigation. Code groups Orders/Payments/Support/Messages; spec wants
      Orders/Listings/Finance/Seller Membership/Security/Platform.
- Build scripts: npm run typecheck (tsc --noEmit), npm run build (vite build),
  npm run lint (eslint .), npm run test (vitest run).

=== WHAT WAS REQUESTED NEXT (not yet done) ===
A. Append 4 sections to HUXZAIN_PRODUCTION_AUDIT_AND_BUILD_SPEC.md:
   1) Database Change Log (per feature: Tables / New Columns / Migrations / RLS Impact)
   2) API Contract (per feature: server-fn name + logical endpoint, Input, Output, Validation,
      Error Codes, Permissions — remember this app uses createServerFn RPC, not REST)
   3) UI Screen Checklist (Buyer/Seller/Admin/SuperAdmin/Public screens, each with sub-items)
   4) Final Acceptance Checklist (build/typecheck/lint pass; no placeholder data; no TODO;
      no console errors; mobile+desktop responsive; dark theme; a11y; security; prod-ready)
B. Create HUXZAIN_IMPLEMENTATION_ROADMAP.md: dependency graph, sprint plan, and 50–100
   granular tickets (Objective / Files to modify / DB changes / Components / Acceptance / Tests).
C. Create walkthrough.md (running implementation log) and task.md (per-module checklist + gates).

=== DEPENDENCY ORDER (build foundations first) ===
Notification Engine -> (unblocks) Orders, Payments, Disputes, Withdrawals, Subscriptions.
Category Engine -> Dynamic Listing Forms -> Delivery Engines -> Search/Homepage.
Commission/Escrow config tables -> Transaction Summary panel + Checkout fees + Settlement timeline.
So the P0 build order is: A) Notification+Email Engine, B) Transaction Summary + commission/
escrow config, C) Category-specific listing forms + 4 delivery engines. Then P1 modules D–O.

=== EXECUTION RULES (strict — the client insisted) ===
- Read the whole spec and build a dependency graph FIRST. Do not modify code during planning.
- Implement ONLY ONE module at a time. Do not start the next module until ALL of these pass:
    [ ] npm run typecheck passes
    [ ] npm run build passes
    [ ] no ESLint errors, no console errors
    [ ] no placeholder/dummy data, no TODO comments
    [ ] existing functionality preserved (don't touch unrelated code)
    [ ] DB migration written AND verified
    [ ] walkthrough.md updated, task.md updated
  Then STOP and wait for review before the next module.
- Make all business values config/DB-driven (commission, escrow, limits, prices, promo prices).
- Scores never block publishing. Approvals (listing/payment/dispute/KYC) stay human-gated.

=== KNOWN MISSING DATA (ask, do not invent) ===
- 6-month & 12-month subscription prices (Pro/Elite/Enterprise).
- Enterprise monthly price conflict: ₹9,999 (subscription doc) vs ₹10,000 (features doc + code).
- Exact inspection-period, seller-response window, payment window, notification retention.
- Verification-expiry reminder schedule (docs give 3 conflicting versions).

=== START NOW WITH ===
Phase 1: produce the dependency graph + sprint roadmap + ticket list (items A, B, C above),
writing them to the files named. Do NOT write feature code yet. When the planning docs are
done, stop and confirm before implementing Module A (Notification Engine).
```

---

## Current status snapshot (for your reference, not part of the paste)

**Delivered last session:**
- `HUXZAIN_PRODUCTION_AUDIT_AND_BUILD_SPEC.md` — full 3-part audit (16 bugs, 15 feature modules A–O, master prompt, authoritative data tables, grounding index).
- All 10 specs + 38 client screenshots analyzed; extracted copies in `scratch/audit/`.
- Codebase re-verified (5 P0s fixed, moderation system present, notification engine grounded).

**Pending (the new 4 sections + roadmap + governance + Module A build):** not started — captured in the prompt above so a new session resumes cleanly.
