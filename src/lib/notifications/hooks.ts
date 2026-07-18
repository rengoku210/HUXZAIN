/**
 * HX-006 — Integration hooks (safe to call from CLIENT or SERVER).
 *
 * Each hook maps a domain moment to the right HX-002 event_key(s) and fires them
 * through the dispatchEvent server-fn boundary, so the server-only engine runs
 * server-side even when the calling flow is a client component. Hooks contain NO
 * business logic — they only choose event_keys + assemble context.
 *
 * Every event_key below matches a row seeded in HX-002 / HX-003 exactly.
 * All hooks are non-throwing: the engine returns a result object rather than
 * throwing, so a notification failure never breaks the business transaction.
 */

import { dispatchEvent } from "./dispatch.functions";
import type { NotifyContext } from "./notify";

/** Fire one event through the server boundary. */
function fire(eventKey: string, ctx: NotifyContext = {}) {
  return dispatchEvent({ data: { eventKey, ctx } });
}

// ---- Orders ----

/** Buyer placed an order (payment not yet verified). */
export function onOrderCreated(orderId: string, buyerId: string) {
  return fire("order.placed", { userIds: [buyerId], entity: { type: "order", id: orderId } });
}

/** Buyer submitted payment proof: buyer ack + payment team queue. */
export function onPaymentSubmitted(orderId: string, buyerId: string) {
  return Promise.all([
    fire("order.payment_submitted", { userIds: [buyerId], entity: { type: "order", id: orderId } }),
    fire("staff.payment_verification", { roles: ["owner", "payment", "admin", "super_admin"] }),
  ]);
}

/** Payment verified by staff: buyer + seller both notified, distinct copy. */
export function onPaymentSuccess(orderId: string, buyerId: string, sellerId: string) {
  return Promise.all([
    fire("order.payment_approved_buyer", { userIds: [buyerId], entity: { type: "order", id: orderId } }),
    fire("order.payment_approved_seller", { userIds: [sellerId], entity: { type: "order", id: orderId } }),
  ]);
}

/** Payment could not be verified. */
export function onPaymentRejected(orderId: string, buyerId: string) {
  return fire("order.payment_rejected", { userIds: [buyerId], entity: { type: "order", id: orderId } });
}

/** Seller marked the order delivered: buyer prompted to inspect, seller ack. */
export function onOrderDelivered(orderId: string, buyerId: string, sellerId: string) {
  return Promise.all([
    fire("order.delivered", { userIds: [buyerId], entity: { type: "order", id: orderId } }),
    fire("order.delivery_submitted_seller", { userIds: [sellerId], entity: { type: "order", id: orderId } }),
  ]);
}

/** Order completed (buyer accepted / auto-complete): buyer + seller. */
export function onOrderCompleted(orderId: string, buyerId: string, sellerId: string) {
  return Promise.all([
    fire("order.buyer_accepted_buyer", { userIds: [buyerId], entity: { type: "order", id: orderId } }),
    fire("order.buyer_accepted_seller", { userIds: [sellerId], entity: { type: "order", id: orderId } }),
  ]);
}

// ---- Disputes ----

/** Dispute opened: buyer + seller + dispute team. */
export function onDisputeCreated(orderId: string, disputeId: string, buyerId: string, sellerId: string) {
  return Promise.all([
    fire("dispute.created_buyer", { userIds: [buyerId], entity: { type: "order", id: orderId }, data: { disputeId } }),
    fire("dispute.created_seller", { userIds: [sellerId], entity: { type: "dispute", id: disputeId } }),
    fire("staff.dispute_review", { roles: ["owner", "moderator", "admin", "super_admin"], entity: { type: "dispute", id: disputeId } }),
  ]);
}

/** Dispute resolved: buyer + seller informed of the outcome. */
export function onDisputeResolved(orderId: string, disputeId: string, buyerId: string, sellerId: string) {
  return Promise.all([
    fire("dispute.resolved_buyer", { userIds: [buyerId], entity: { type: "order", id: orderId }, data: { disputeId } }),
    fire("dispute.resolved_seller", { userIds: [sellerId], entity: { type: "dispute", id: disputeId } }),
  ]);
}

// ---- Finance / withdrawals ----

/** Seller requested a withdrawal: seller ack + finance team queue. */
export function onWithdrawRequested(withdrawalId: string, sellerId: string) {
  return Promise.all([
    fire("finance.withdrawal_submitted", { userIds: [sellerId], data: { withdrawalId } }),
    fire("staff.withdrawal_request", { roles: ["owner", "finance", "admin", "super_admin"] }),
  ]);
}

/** Withdrawal approved by finance. */
export function onWithdrawalApproved(withdrawalId: string, sellerId: string) {
  return fire("finance.withdrawal_approved", { userIds: [sellerId], data: { withdrawalId } });
}

/** Withdrawal completed (funds sent). */
export function onWithdrawalCompleted(withdrawalId: string, sellerId: string) {
  return fire("finance.withdrawal_completed", { userIds: [sellerId], data: { withdrawalId } });
}

// ---- Listings ----

/** Listing submitted for review: seller ack + moderation queue. */
export function onListingSubmitted(listingId: string, sellerId: string) {
  return Promise.all([
    fire("listing.submitted", { userIds: [sellerId], entity: { type: "listing", id: listingId } }),
    fire("staff.listing_review", { roles: ["owner", "moderator", "admin", "super_admin"] }),
  ]);
}

// ---- Support Tickets ----

/** Support ticket opened: user + operations team + owner. */
export function onTicketCreated(ticketId: string, userEmail: string, title: string) {
  return fire("staff.support_ticket", {
    roles: ["owner", "super_admin", "admin", "manager", "moderator", "staff"],
    data: { ticketId, userEmail, title }
  });
}

/** Listing approved by a moderator. */
export function onListingApproved(listingId: string, sellerId: string, listingTitle: string) {
  return fire("listing.approved", { userIds: [sellerId], entity: { type: "listing", id: listingId }, data: { listingTitle } });
}

/** Listing rejected by a moderator. */
export function onListingRejected(listingId: string, sellerId: string, listingTitle: string, reason: string) {
  return fire("listing.rejected", { userIds: [sellerId], entity: { type: "listing", id: listingId }, data: { listingTitle, reason } });
}

// ---- Membership ----

/** Seller membership purchased / activated. */
export function onSubscriptionActivated(sellerId: string, plan: string) {
  return fire("membership.subscription_purchased", { userIds: [sellerId], data: { plan } });
}

/** Seller membership expired (reverted to Standard). */
export function onSubscriptionExpired(sellerId: string, plan = "premium") {
  return fire("membership.subscription_expired", { userIds: [sellerId], data: { plan } });
}

// ---- Seller verification ----

/** Seller KYC / verification approved. */
export function onVerificationApproved(sellerId: string) {
  return fire("membership.verification_approved", { userIds: [sellerId], entity: { type: "user", id: sellerId } });
}

/** Seller KYC / verification rejected. */
export function onVerificationRejected(sellerId: string) {
  return fire("membership.verification_rejected", { userIds: [sellerId], entity: { type: "user", id: sellerId } });
}

// ---- Moderation / enforcement ----
//
// Moderation actions are deliberate, repeatable admin decisions (a user can be
// struck, muted or suspended more than once), so these hooks intentionally omit
// `entity` — that disables the engine's entity-scoped auto-dedupe and lets every
// distinct action notify. Recipients come from `userIds`; templates read `data`.

/**
 * Moderation strike issued. Maps the strike number to the matching event so the
 * strike ladder (warning → final warning → suspension → ban) stays data-driven.
 */
export function onUserStrike(userId: string, strikeNumber: number, reason: string) {
  const eventKey =
    strikeNumber >= 5
      ? "user.banned"
      : strikeNumber === 3
        ? "user.suspended"
        : strikeNumber === 2
          ? "strike.final_warning"
          : "strike.warning";
  return fire(eventKey, { userIds: [userId], data: { strikeNumber, reason } });
}

/** A strike was removed from the user's account. */
export function onStrikeRemoved(userId: string, strikeCount: number) {
  return fire("strike.removed", { userIds: [userId], data: { strikeCount } });
}

/** Manual moderation warning (no strike). */
export function onUserWarning(userId: string, reason: string) {
  return fire("user.warning", { userIds: [userId], data: { reason } });
}

/** User muted from messaging. */
export function onUserMuted(userId: string, reason: string, expiresAt: string) {
  return fire("user.muted", { userIds: [userId], data: { reason, expiresAt } });
}

/** User mute lifted (reserved — mute currently auto-expires). */
export function onUserUnmuted(userId: string) {
  return fire("user.unmuted", { userIds: [userId] });
}

/** User account suspended for a period. */
export function onUserSuspended(userId: string, reason: string, expiresAt: string) {
  return fire("user.suspended", { userIds: [userId], data: { reason, expiresAt } });
}

/** User account permanently banned. */
export function onUserBanned(userId: string, reason: string) {
  return fire("user.banned", { userIds: [userId], data: { reason } });
}

/** User account restrictions lifted. */
export function onUserUnbanned(userId: string) {
  return fire("user.unbanned", { userIds: [userId] });
}
