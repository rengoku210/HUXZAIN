-- HX-002 / Module A: seed the notification event matrix.
--
-- Source of truth: scratch/audit/docx/"huxzain - notificaation and emails part 2.txt"
-- (Parts 2-7: Account/Security, Listing, Order, Finance, Subscription, Platform,
-- Internal staff). The doc numbers Order+Subscription+Platform+Internal 1-47;
-- on top of that it defines 15 Account/Security and 20 Listing events, and many
-- events specify DIFFERENT copy for buyer vs seller vs staff. We model one row
-- per recipient-specific notification so the engine can stay fully data-driven.
--
-- channels: in_app / email exactly as the doc marks ✅/❌ per recipient.
-- priority: critical = security + final money movement; high = important/action
--           required; normal = routine (Notification Bell is enough).
-- retention_days: routine = 30; important = 180; security/financial/decisions
--           = 365. NOTE: the doc states the exact retention period is
--           "Super-Admin configurable" and does not give numbers — these are
--           sensible defaults, flagged as adjustable, NOT invented business rules.
-- link_pattern: {placeholders} (orderId, listingId, disputeId, plan, date,
--           color, duration, name) are filled by notify() from context — never
--           hardcoded here.
--
-- Idempotent: ON CONFLICT (event_key) DO NOTHING — safe to re-run, no duplicates.

insert into public.notification_events
  (event_key, title, description, category, priority, channels, template_title, template_body, link_pattern, retention_days)
values
-- ===== ACCOUNT & SECURITY (doc Part 2) =====
('account.registration','Account registered','Welcome on successful signup','platform','normal',ARRAY['in_app','email'],'Welcome to HUXZAIN','Hi {name}, your account is ready. Start exploring the marketplace.','/dashboard',30),
('security.email_verification','Email verification link','Verification link/code on signup','security','high',ARRAY['email'],'Verify your email address','Please confirm your email to secure your account.','/verify-email',180),
('security.email_verified','Email verified','Confirmation after successful verification','security','normal',ARRAY['in_app'],'Email verified','Your email address has been verified successfully.','/account',180),
('security.login_new_device','New device sign-in','Login from unrecognised device','security','critical',ARRAY['in_app','email'],'New device signed in','A new device signed into your account. If this was not you, secure your account now.','/account',365),
('security.failed_logins','Failed login attempts','Multiple failed logins detected','security','critical',ARRAY['in_app','email'],'Unusual sign-in attempts','We detected multiple failed sign-in attempts. If this was not you, change your password.','/account',365),
('security.password_changed','Password changed','Password successfully changed','security','critical',ARRAY['in_app','email'],'Your password was changed','Your password was updated. If you did not do this, contact support immediately.','/account',365),
('security.password_reset_request','Password reset requested','Forgot-password email','security','high',ARRAY['email'],'Reset your password','Use the secure link to reset your password. It expires soon.','/reset-password',180),
('security.email_changed','Email changed','Account email changed (notify old + new)','security','critical',ARRAY['in_app','email'],'Your email was changed','Your account email was updated. If this was not you, contact support immediately.','/account',365),
('security.phone_changed','Phone changed','Account phone changed','security','critical',ARRAY['in_app','email'],'Your phone number was changed','Your account phone number was updated. If this was not you, contact support.','/account',365),

-- ===== SELLER VERIFICATION (doc Part 2 events 11-15) =====
('membership.verification_submitted','Verification submitted','Seller submitted verification','membership','normal',ARRAY['in_app','email'],'Verification received','Your verification request is now under manual review.','/seller/verification',180),
('staff.verification_request','Verification queue updated','Internal: new verification to review','membership','normal',ARRAY['in_app'],'New seller verification waiting','A new seller verification request is awaiting review.','/admin/verifications',90),
('membership.verification_approved','Verification approved','Seller verification approved','membership','high',ARRAY['in_app','email'],'Verification approved','Your seller verification is approved. Your Verified badge is now active.','/seller/verification',365),
('membership.verification_rejected','Verification rejected','Seller verification rejected','membership','high',ARRAY['in_app','email'],'Verification not approved','Your verification could not be approved. Review the feedback and resubmit.','/seller/verification',365),
('membership.verification_expiring','Verification expiring','Reminders 7/3/1 days before','membership','high',ARRAY['in_app','email'],'Verification expiring soon','Your Verified badge will expire on {date}. Renew to keep it active.','/seller/verification',180),
('membership.verification_expired','Verification expired','Verification expired, badge removed','membership','high',ARRAY['in_app','email'],'Verification expired','Your Verified badge has been removed. Renew to restore it.','/seller/verification',365),

-- ===== LISTINGS (doc Part 3) =====
('listing.submitted','Listing submitted','Seller submitted listing for review','listings','normal',ARRAY['in_app'],'Listing submitted','Your listing is submitted and waiting for approval.','/seller/listings/{listingId}',30),
('staff.listing_review','Listing queue updated','Internal: new listing to moderate','listings','normal',ARRAY['in_app'],'Listing approval queue updated','A new listing is awaiting moderation.','/admin/listings',90),
('listing.approved','Listing approved','Listing approved and live','listings','high',ARRAY['in_app','email'],'Listing approved','Your listing {listingTitle} is now live on HUXZAIN.','/seller/listings/{listingId}',180),
('listing.rejected','Listing rejected','Listing rejected with reason','listings','high',ARRAY['in_app','email'],'Listing not approved','Your listing could not be approved. Review the feedback and resubmit.','/seller/listings/{listingId}',180),
('listing.requires_reapproval','Listing under review','Edit requires re-approval','listings','normal',ARRAY['in_app'],'Listing waiting for review','Your updated listing is under review before going live again.','/seller/listings/{listingId}',30),
('listing.expired','Listing expired','30-day validity ended','listings','normal',ARRAY['in_app'],'Listing expired','Your listing has expired. Renew it to make it visible again.','/seller/listings/{listingId}',30),
('listing.expiring_soon','Listing expiring','Reminders 7/3/1 days before','listings','normal',ARRAY['in_app'],'Listing expiring soon','Your listing expires on {date}. Renew to keep it visible.','/seller/listings/{listingId}',30),
('listing.renewed','Listing renewed','Fresh 30-day cycle','listings','normal',ARRAY['in_app'],'Listing renewed','Your listing is renewed for a fresh 30-day cycle.','/seller/listings/{listingId}',30),
('listing.paused_subscription','Listings paused','Paused due to plan downgrade','listings','high',ARRAY['in_app','email'],'Some listings were paused','Your plan no longer supports this many active listings. Renew or reduce to restore them.','/seller/subscription',180),
('listing.paused_restored','Listings restored','Paused listings restored on upgrade','listings','normal',ARRAY['in_app'],'Listings restored','Your eligible listings are active again.','/seller/listings',30),
('listing.sold_out','Listing unavailable','Sold or marked unavailable','listings','normal',ARRAY['in_app'],'Listing no longer available','Your listing has been marked as sold or unavailable.','/seller/listings/{listingId}',30),
('promo.featured_activated','Featured activated','Featured credit applied','listings','normal',ARRAY['in_app'],'Listing featured','Your listing is now featured for {duration} days.','/seller/listings/{listingId}',30),
('promo.featured_expiring','Featured expiring','24h before featured ends','listings','normal',ARRAY['in_app'],'Featured promotion expiring','Your Featured promotion ends soon. Renew for continued visibility.','/seller/listings/{listingId}',30),
('promo.featured_expired','Featured expired','Featured promotion ended','listings','normal',ARRAY['in_app'],'Featured promotion ended','Your Featured promotion has ended.','/seller/listings/{listingId}',30),
('promo.homepage_activated','Homepage featured','Homepage slot active 24h','listings','normal',ARRAY['in_app'],'Now on the homepage','Your listing is featured on the HUXZAIN homepage for 24 hours.','/seller/listings/{listingId}',30),
('promo.homepage_slot_unavailable','Homepage slots full','Credit not consumed','listings','normal',ARRAY['in_app'],'Homepage slots occupied','All homepage slots are full. Your credit was not used. Try again later.','/seller/promotions',30),
('promo.homepage_ended','Homepage ended','Homepage promotion completed','listings','normal',ARRAY['in_app'],'Homepage promotion ended','Your homepage promotion completed and your listing returned to its normal position.','/seller/listings/{listingId}',30),
('promo.glow_activated','Glow activated','Glow highlight applied','listings','normal',ARRAY['in_app'],'Glow highlight active','Glow highlight ({color}) is active on your listing until {date}.','/seller/listings/{listingId}',30),
('promo.glow_expiring','Glow expiring','24h before glow ends','listings','normal',ARRAY['in_app'],'Glow highlight expiring','Your Glow highlight ends soon.','/seller/listings/{listingId}',30),
('promo.glow_expired','Glow expired','Glow highlight ended','listings','normal',ARRAY['in_app'],'Glow highlight ended','Your Glow highlight has ended. Activate again to stand out.','/seller/listings/{listingId}',30),

-- ===== ORDERS (doc Parts 4-5) =====
('order.placed','Order created','Buyer placed order','orders','normal',ARRAY['in_app'],'Order created','Your order is created. Complete the payment instructions to continue.','/orders/{orderId}',90),
('order.payment_submitted','Payment proof received','Buyer submitted payment','orders','high',ARRAY['in_app','email'],'Payment proof received','We have received your payment proof. It is now awaiting verification.','/orders/{orderId}',365),
('staff.payment_verification','Payment verification queue','Internal: payment to verify','orders','normal',ARRAY['in_app'],'New payment awaiting verification','A payment proof is waiting in the verification queue.','/admin/payments',90),
('order.payment_approved_buyer','Payment verified (buyer)','Payment approved, order started','orders','high',ARRAY['in_app','email'],'Payment verified','Your payment is verified and your order has started.','/orders/{orderId}',365),
('order.payment_approved_seller','New order received (seller)','Seller receives new order','orders','high',ARRAY['in_app','email'],'You received a new order','A buyer is waiting. Begin processing order {orderId}.','/seller/orders/{orderId}',365),
('order.payment_rejected','Payment rejected','Payment could not be verified','orders','high',ARRAY['in_app','email'],'Payment not verified','Your payment could not be verified. Review the reason and submit again.','/orders/{orderId}',365),
('order.seller_no_response','Buyer waiting reminder','One reminder after ~3-4h','orders','high',ARRAY['in_app','email'],'Your buyer is waiting','Please begin processing your order. A buyer is waiting for you.','/seller/orders/{orderId}',90),
('order.auto_cancelled_buyer','Order auto-cancelled (buyer)','Seller failed to respond','orders','high',ARRAY['in_app','email'],'Order cancelled and refund started','The seller did not respond in time. Your order was cancelled and your refund has begun.','/orders/{orderId}',365),
('order.auto_cancelled_seller','Order auto-cancelled (seller)','Order cancelled, listing inactive','orders','high',ARRAY['in_app','email'],'Order cancelled','Your order was cancelled because you did not respond in time.','/seller/orders/{orderId}',90),
('order.chat_created','Order chat ready','Order chat room created','orders','normal',ARRAY['in_app'],'Order chat available','Your order chat is now available.','/orders/{orderId}',30),
('order.new_message','New order message','In-app only, never per-message email','orders','normal',ARRAY['in_app'],'New message','You have a new message in your order chat.','/orders/{orderId}',30),
('order.delivery_started','Delivery started','Seller began fulfilling','orders','normal',ARRAY['in_app'],'Seller started your order','Your seller has started working on your order.','/orders/{orderId}',90),
('order.delivered','Order delivered (buyer)','Seller marked delivered','orders','high',ARRAY['in_app','email'],'Order delivered','Your order is delivered. Please review and complete the inspection.','/orders/{orderId}',365),
('order.delivery_submitted_seller','Delivery submitted (seller)','Waiting for buyer review','orders','normal',ARRAY['in_app'],'Delivery submitted','Delivery submitted. Waiting for buyer review.','/seller/orders/{orderId}',90),
('order.inspection_started','Inspection started','Buyer inspection period begins','orders','normal',ARRAY['in_app'],'Inspection period started','Please review your order before the inspection period ends.','/orders/{orderId}',90),
('order.inspection_expiring','Inspection ending','Reminder before auto-complete','orders','high',ARRAY['in_app','email'],'Inspection period ending soon','Review your order before it auto-completes.','/orders/{orderId}',90),
('order.buyer_accepted_buyer','Order completed (buyer)','Buyer accepted delivery','orders','high',ARRAY['in_app','email'],'Purchase complete','Thanks for confirming. You can now leave a review.','/orders/{orderId}',365),
('order.buyer_accepted_seller','Order completed (seller)','Earnings enter escrow','orders','normal',ARRAY['in_app'],'Order completed','Your order is complete. Earnings have entered Escrow Hold.','/seller/orders/{orderId}',90),
('order.auto_completed_buyer','Order auto-completed (buyer)','Inspection lapsed','orders','high',ARRAY['in_app','email'],'Order auto-completed','Your inspection period ended and the order completed automatically.','/orders/{orderId}',365),
('order.auto_completed_seller','Order auto-completed (seller)','Earnings enter escrow','orders','normal',ARRAY['in_app'],'Order auto-completed','Your order completed automatically. Earnings entered Escrow Hold.','/seller/orders/{orderId}',90),
('review.received','Review received','Buyer left a review','orders','normal',ARRAY['in_app'],'You received a review','A buyer left a new review on your order.','/seller/reviews',90),
('review.reply','Review reply','Seller replied to review','orders','normal',ARRAY['in_app'],'Seller replied to your review','The seller responded to your review.','/orders/{orderId}',30),

-- ===== DISPUTES (doc Part 5) =====
('dispute.created_buyer','Dispute created (buyer)','Buyer opened dispute','orders','high',ARRAY['in_app','email'],'Dispute created','Your dispute has been created. Our team will review your case.','/orders/{orderId}',365),
('dispute.created_seller','Dispute opened (seller)','Dispute opened on seller order','orders','high',ARRAY['in_app','email'],'A dispute was opened','A dispute was opened on one of your orders. Submit your evidence.','/seller/disputes/{disputeId}',365),
('staff.dispute_review','Dispute queue updated','Internal: high-priority dispute','orders','high',ARRAY['in_app'],'High-priority dispute waiting','A new dispute is waiting for review.','/admin/disputes',365),
('dispute.evidence_requested','Evidence requested','Staff requests more evidence','orders','high',ARRAY['in_app','email'],'Additional evidence needed','Please provide the requested evidence before the deadline.','/orders/{orderId}',365),
('dispute.resolved_buyer','Dispute resolved (buyer)','Dispute decision reached','orders','high',ARRAY['in_app','email'],'Dispute resolved','A decision has been reached on your dispute. See the outcome.','/orders/{orderId}',365),
('dispute.resolved_seller','Dispute resolved (seller)','Dispute decision reached','orders','high',ARRAY['in_app','email'],'Dispute resolved','A decision has been reached on your dispute. See the outcome.','/seller/disputes/{disputeId}',365),
('refund.approved_buyer','Refund approved (buyer)','Refund approved, processing','finance','high',ARRAY['in_app','email'],'Refund approved','Your refund is approved and processing has begun.','/orders/{orderId}',365),
('refund.approved_seller','Refund approved (seller)','Refund affects seller earnings','finance','high',ARRAY['in_app','email'],'Refund approved','A refund was approved on one of your orders.','/seller/orders/{orderId}',365),

-- ===== FINANCE / ESCROW / WITHDRAWAL / DORMANT (doc Part 5) =====
('finance.escrow_started','Escrow hold started','Earnings entered escrow','finance','normal',ARRAY['in_app'],'Earnings in escrow','Your earnings are in Escrow Hold and will release after the hold period.','/seller/earnings',90),
('finance.escrow_completed','Earnings available','Escrow hold finished','finance','high',ARRAY['in_app','email'],'Earnings available','Your earnings are now available for withdrawal.','/seller/earnings',365),
('finance.withdrawal_submitted','Withdrawal requested','Seller requested withdrawal','finance','high',ARRAY['in_app','email'],'Withdrawal request received','Your withdrawal request was received and is awaiting processing.','/seller/withdrawals',365),
('staff.withdrawal_request','Withdrawal queue updated','Internal: withdrawal to process','finance','normal',ARRAY['in_app'],'Withdrawal awaiting processing','A new withdrawal request is waiting.','/admin/withdrawals',90),
('finance.withdrawal_approved','Withdrawal approved','Withdrawal approved','finance','high',ARRAY['in_app','email'],'Withdrawal approved','Your withdrawal is approved. Funds will transfer shortly.','/seller/withdrawals',365),
('finance.withdrawal_completed','Withdrawal completed','Funds transferred','finance','critical',ARRAY['in_app','email'],'Withdrawal completed','Your withdrawal has been completed successfully.','/seller/withdrawals',365),
('finance.dormant_reminder','Dormancy reminder','Reminders 14/7 days and 24h before','finance','high',ARRAY['in_app','email'],'Withdraw before dormancy','Your available balance will become dormant on {date}. Withdraw now to avoid fees.','/seller/earnings',365),
('finance.dormant_became','Earnings dormant','Earnings became dormant','finance','critical',ARRAY['in_app','email'],'Earnings became dormant','Your earnings are now dormant. Reactivation is required before withdrawal.','/seller/earnings',365),
('finance.dormant_reactivated','Earnings reactivated','Dormant earnings reactivated','finance','high',ARRAY['in_app','email'],'Earnings reactivated','Your dormant earnings are reactivated. You can request a withdrawal.','/seller/earnings',365),

-- ===== SUBSCRIPTIONS / MEMBERSHIP (doc Part 6) =====
('membership.subscription_purchased','Subscription purchased','Seller bought membership','membership','high',ARRAY['in_app','email'],'Membership activated','Welcome to the {plan} plan. Your membership is active.','/seller/subscription',365),
('membership.subscription_upgraded','Subscription upgraded','Seller upgraded plan','membership','high',ARRAY['in_app','email'],'Membership upgraded','Your membership is upgraded. New benefits are active.','/seller/subscription',365),
('membership.subscription_renewed','Subscription renewed','Seller renewed membership','membership','high',ARRAY['in_app','email'],'Membership renewed','Your membership is renewed. New expiry: {date}.','/seller/subscription',365),
('membership.subscription_expiring','Subscription expiring','Reminders 7/3 days and 24h before','membership','high',ARRAY['in_app','email'],'Membership expiring soon','Your {plan} membership expires on {date}. Renew to keep your benefits.','/seller/subscription',180),
('membership.subscription_expired','Subscription expired','Returned to Standard','membership','high',ARRAY['in_app','email'],'Membership expired','Your {plan} membership ended. Your account returned to Standard.','/seller/subscription',365),
('membership.standalone_verification_purchased','Verification purchased','Standard seller bought verification','membership','high',ARRAY['in_app','email'],'Verification purchased','Your verification subscription is active and review has started.','/seller/verification',365),
('membership.standalone_verification_expiring','Verification sub expiring','Reminders 7/3 days and 24h','membership','high',ARRAY['in_app','email'],'Verification expiring soon','Your verification expires on {date}. Renew to keep your Verified badge.','/seller/verification',180),
('membership.subscription_payment_failed','Subscription payment failed','Renewal payment failed','membership','high',ARRAY['in_app','email'],'Subscription payment failed','We could not process your renewal payment. Please retry to keep your benefits.','/seller/subscription',180),

-- ===== PLATFORM ANNOUNCEMENTS (doc Part 6) =====
('platform.maintenance_scheduled','Scheduled maintenance','Planned maintenance notice','platform','high',ARRAY['in_app','email'],'Scheduled maintenance','Maintenance is planned for {date}. Some services may be briefly unavailable.','/',90),
('platform.maintenance_emergency','Emergency maintenance','Unexpected maintenance','platform','high',ARRAY['in_app','email'],'Emergency maintenance','We are performing urgent maintenance and will restore full service shortly.','/',90),
('platform.new_features','New features','Marketing-respecting feature launch','platform','normal',ARRAY['in_app','email'],'What is new on HUXZAIN','We have launched new features. See what is new.','/',30),
('platform.security_incident','Security incident','Platform-wide security notice','security','critical',ARRAY['in_app','email'],'Important security notice','We are informing you of a security event that may affect accounts. Review the recommended actions.','/account',365),

-- ===== INTERNAL STAFF (doc Part 6) =====
('staff.support_ticket','Support ticket queue','Internal: new support ticket','platform','normal',ARRAY['in_app'],'New support ticket','A new support ticket is waiting.','/admin/tickets',90),
('staff.fraud_flag','Fraud alert','Internal + super-admin email on fraud','security','critical',ARRAY['in_app','email'],'Fraud alert','Suspicious activity was detected and needs review.','/admin/security-logs',365)

on conflict (event_key) do nothing;
