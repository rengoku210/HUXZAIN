-- HX-006.5 / Module A: extend the notification_events matrix with the MODERATION
-- events emitted by src/lib/admin/moderation.functions.ts.
--
-- HX-006 surfaced that the moderation/enforcement system inserted notifications
-- directly (kind = strike.*/user.*), referencing event_keys that did NOT exist in
-- the HX-002 seed. notify() silently skips unknown events, so routing moderation
-- through the engine required these rows to exist first.
--
-- The client-requested set (strike.warning, strike.final_warning, user.suspended,
-- user.unbanned, user.muted, user.unmuted) is included here. Three additional
-- events (strike.removed, user.warning, user.banned) are added alongside them so
-- that EVERY moderation notification the code can emit maps to a real event —
-- otherwise ban / warning / strike-removal would remain orphaned direct inserts
-- and the "100% consistency, no exceptions" goal could not be met.
--
-- channels/priority follow the HX-002 conventions:
--   critical = suspension / ban / final warning (account-restricting, financial-
--              grade severity); high = strikes / warnings / mute / unban; normal =
--              reversals that simply restore access (strike removed / unmute).
-- link_pattern is static (/account) — moderation state lives on the account page;
--   {placeholders} (reason, strikeNumber, strikeCount, expiresAt) are filled by
--   notify() from context, never hardcoded here.
--
-- Idempotent: ON CONFLICT (event_key) DO NOTHING — safe to re-run, no duplicates.

insert into public.notification_events
  (event_key, title, description, category, priority, channels, template_title, template_body, link_pattern, retention_days)
values
-- ===== STRIKE LADDER =====
('strike.warning','Strike issued','Moderation strike (warning tier)','security','high',ARRAY['in_app','email'],'Strike issued on your account','Strike {strikeNumber} has been issued on your account. Reason: {reason}. Please review our community guidelines to avoid further action.','/account',365),
('strike.final_warning','Final warning','Moderation strike (final warning before suspension)','security','critical',ARRAY['in_app','email'],'Final warning','Strike {strikeNumber}: {reason}. This is your final warning — your next violation will automatically suspend your account.','/account',365),
('strike.removed','Strike removed','A strike was removed from the account','security','normal',ARRAY['in_app'],'Strike removed','One strike has been removed from your account. Your current strike count is {strikeCount}.','/account',365),

-- ===== WARNINGS =====
('user.warning','Moderation warning','Manual moderation warning (no strike)','security','high',ARRAY['in_app','email'],'Moderation warning','You have received a warning from moderation. Reason: {reason}.','/account',365),

-- ===== MUTE / UNMUTE =====
('user.muted','Account muted','User muted from messaging','security','high',ARRAY['in_app'],'Account muted','You have been muted from sending messages until {expiresAt}. Reason: {reason}.','/account',180),
('user.unmuted','Mute lifted','User mute lifted / expired','security','normal',ARRAY['in_app'],'Messaging restriction lifted','Your messaging restriction has been lifted. You can send messages again.','/account',180),

-- ===== SUSPENSION / BAN / REINSTATEMENT =====
('user.suspended','Account suspended','User account suspended for a period','security','critical',ARRAY['in_app','email'],'Account suspended','Your account has been suspended until {expiresAt}. Reason: {reason}.','/account',365),
('user.banned','Account permanently restricted','User account permanently banned','security','critical',ARRAY['in_app','email'],'Account permanently restricted','Your account has been permanently restricted. Reason: {reason}. Contact support if you believe this is a mistake.','/account',365),
('user.unbanned','Restrictions lifted','User account restrictions lifted','security','high',ARRAY['in_app','email'],'Account restrictions lifted','Your account restrictions have been lifted. You can now access all platform features again.','/account',365)

on conflict (event_key) do nothing;
