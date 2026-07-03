/**
 * HX-004 — Email template registry (PURE, STATIC).
 *
 * Each template is static data: a {{variable}} subject + html body + text body.
 * No logic, no DB. The render engine (../render.ts) interpolates these against
 * notify() context and wraps them in the branding shell.
 *
 * Templates are keyed by the REAL HX-002 event_key so renderEmailTemplate works
 * directly with whatever the HX-003 dispatcher passes. The HX-004 brief used
 * friendlier names; the mapping to the seeded keys is:
 *
 *   order.created        -> order.placed
 *   order.completed      -> order.buyer_accepted_buyer (+ order.auto_completed_buyer)
 *   order.dispute_opened -> dispute.created_buyer / dispute.created_seller
 *   payment.success      -> order.payment_approved_buyer / order.payment_approved_seller
 *   withdrawal.requested -> finance.withdrawal_submitted
 *   withdrawal.approved  -> finance.withdrawal_approved
 *   listing.approved     -> listing.approved
 *   listing.rejected     -> listing.rejected
 *   strike.warning       -> security.account_strike
 *   account.suspended    -> security.account_suspended
 *   account.banned       -> security.account_banned
 *   subscription.active  -> membership.subscription_purchased
 *   subscription.expired -> membership.subscription_expired
 *
 * Variables available from notify() context: userName, orderId, listingId,
 * listingTitle, disputeId, withdrawalId, plan, amount, reason, date, link.
 * Missing variables degrade safely to "" (greeting names default to "there").
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  /** Label for the action button (link comes from context.link). */
  actionLabel?: string;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  // ---- Orders ----
  "order.placed": {
    subject: "Your HUXZAIN order has been created",
    html: "<p>Hi {{userName}},</p><p>Your order <strong>{{orderId}}</strong> has been created successfully. Please complete the payment instructions to continue.</p>",
    text: "Hi {{userName}},\n\nYour order {{orderId}} has been created successfully. Please complete the payment instructions to continue.",
    actionLabel: "Continue Payment",
  },
  "order.buyer_accepted_buyer": {
    subject: "Your order {{orderId}} is complete",
    html: "<p>Hi {{userName}},</p><p>Thank you for confirming your order for <strong>{{listingTitle}}</strong>. Your purchase is now complete, and you can leave a review whenever you are ready.</p>",
    text: "Hi {{userName}},\n\nThank you for confirming your order for {{listingTitle}}. Your purchase is now complete and you can leave a review.",
    actionLabel: "View Order",
  },
  "order.auto_completed_buyer": {
    subject: "Your order {{orderId}} was completed automatically",
    html: "<p>Hi {{userName}},</p><p>Your inspection period for order <strong>{{orderId}}</strong> ended without any reported issues, so the order has been completed automatically.</p>",
    text: "Hi {{userName}},\n\nYour inspection period for order {{orderId}} ended without reported issues, so the order was completed automatically.",
    actionLabel: "View Order",
  },

  // ---- Payments ----
  "order.payment_approved_buyer": {
    subject: "Payment verified — your order has started",
    html: "<p>Hi {{userName}},</p><p>Great news! Your payment for order <strong>{{orderId}}</strong> has been verified and the seller has been asked to begin processing your order.</p>",
    text: "Hi {{userName}},\n\nYour payment for order {{orderId}} has been verified and the seller has been asked to begin processing your order.",
    actionLabel: "View Order",
  },
  "order.payment_approved_seller": {
    subject: "You received a new order",
    html: "<p>Hi {{userName}},</p><p>Congratulations! You have received a new order <strong>{{orderId}}</strong>. A buyer is now waiting for you to begin processing. Please return to HUXZAIN to start.</p>",
    text: "Hi {{userName}},\n\nYou have received a new order {{orderId}}. A buyer is waiting for you to begin processing. Please return to HUXZAIN to start.",
    actionLabel: "View Order",
  },

  // ---- Disputes ----
  "dispute.created_buyer": {
    subject: "Your dispute for order {{orderId}} has been created",
    html: "<p>Hi {{userName}},</p><p>Your dispute for order <strong>{{orderId}}</strong> has been created and our team will begin reviewing your case. We will keep you updated.</p>",
    text: "Hi {{userName}},\n\nYour dispute for order {{orderId}} has been created. Our team will begin reviewing your case.",
    actionLabel: "View Dispute",
  },
  "dispute.created_seller": {
    subject: "A dispute was opened on your order {{orderId}}",
    html: "<p>Hi {{userName}},</p><p>A dispute has been opened on one of your orders (<strong>{{orderId}}</strong>). Please review the case and submit any required evidence promptly.</p>",
    text: "Hi {{userName}},\n\nA dispute has been opened on your order {{orderId}}. Please review the case and submit any required evidence promptly.",
    actionLabel: "Respond To Dispute",
  },

  // ---- Listings ----
  "listing.approved": {
    subject: "Your listing is now live on HUXZAIN",
    html: "<p>Hi {{userName}},</p><p>Congratulations! Your listing <strong>{{listingTitle}}</strong> has been approved and is now live on HUXZAIN for buyers to discover.</p>",
    text: "Hi {{userName}},\n\nYour listing {{listingTitle}} has been approved and is now live on HUXZAIN.",
    actionLabel: "View Listing",
  },
  "listing.rejected": {
    subject: "Your listing could not be approved",
    html: "<p>Hi {{userName}},</p><p>Your listing <strong>{{listingTitle}}</strong> could not be approved. Reason: {{reason}}. Please review the feedback, make the necessary changes, and resubmit.</p>",
    text: "Hi {{userName}},\n\nYour listing {{listingTitle}} could not be approved. Reason: {{reason}}. Please review the feedback and resubmit.",
    actionLabel: "Edit Listing",
  },

  // ---- Withdrawals ----
  "finance.withdrawal_submitted": {
    subject: "Your withdrawal request was received",
    html: "<p>Hi {{userName}},</p><p>Your withdrawal request has been received successfully and is now waiting for processing. We will notify you once it has been approved.</p>",
    text: "Hi {{userName}},\n\nYour withdrawal request has been received and is now waiting for processing. We will notify you once it is approved.",
    actionLabel: "View Withdrawals",
  },
  "finance.withdrawal_approved": {
    subject: "Your withdrawal has been approved",
    html: "<p>Hi {{userName}},</p><p>Your withdrawal has been approved and the funds will be transferred to your registered bank account shortly.</p>",
    text: "Hi {{userName}},\n\nYour withdrawal has been approved and funds will be transferred to your registered bank account shortly.",
    actionLabel: "View Withdrawals",
  },

  // ---- Security / Account restrictions ----
  "security.account_strike": {
    subject: "A strike was added to your account",
    html: "<p>Hi {{userName}},</p><p>Your account has received a strike for a policy violation. Reason: {{reason}}. Repeated violations may lead to temporary or permanent restrictions on your account.</p>",
    text: "Hi {{userName}},\n\nYour account has received a strike for a policy violation. Reason: {{reason}}. Repeated violations may restrict your account.",
    actionLabel: "View Account",
  },
  "security.account_suspended": {
    subject: "Your account has been suspended",
    html: "<p>Hi {{userName}},</p><p>Your account has been temporarily suspended. If you believe this is a mistake, please contact our support team and we will review your case.</p>",
    text: "Hi {{userName}},\n\nYour account has been temporarily suspended. If you believe this is a mistake, please contact our support team.",
    actionLabel: "Contact Support",
  },
  "security.account_banned": {
    subject: "Your account has been banned",
    html: "<p>Hi {{userName}},</p><p>Your account has been banned for repeated or serious policy violations. If you would like to appeal this decision, please contact our support team.</p>",
    text: "Hi {{userName}},\n\nYour account has been banned for repeated or serious policy violations. To appeal, please contact our support team.",
    actionLabel: "Contact Support",
  },

  // ---- Subscriptions ----
  "membership.subscription_purchased": {
    subject: "Welcome to the {{plan}} plan",
    html: "<p>Hi {{userName}},</p><p>Welcome to the <strong>{{plan}}</strong> seller plan! Your membership is now active and your new benefits are ready to use.</p>",
    text: "Hi {{userName}},\n\nWelcome to the {{plan}} seller plan! Your membership is now active and your new benefits are ready to use.",
    actionLabel: "View Subscription",
  },
  "membership.subscription_expired": {
    subject: "Your {{plan}} membership has expired",
    html: "<p>Hi {{userName}},</p><p>Your <strong>{{plan}}</strong> membership has ended and your account has returned to the Standard Seller plan. Your account is still safe — you can renew at any time to restore your premium benefits.</p>",
    text: "Hi {{userName}},\n\nYour {{plan}} membership has ended and your account returned to the Standard Seller plan. You can renew at any time to restore your benefits.",
    actionLabel: "Renew Subscription",
  },
};

/**
 * Fallback used for any email-channel event_key without a dedicated template.
 * The dispatcher can pass {{title}}/{{body}} (e.g. the event's in-app copy) so
 * every email still renders meaningful, branded content.
 */
export const GENERIC_TEMPLATE: EmailTemplate = {
  subject: "{{title}}",
  html: "<p>Hi {{userName}},</p><p>{{body}}</p>",
  text: "Hi {{userName}},\n\n{{body}}",
  actionLabel: "View Details",
};
