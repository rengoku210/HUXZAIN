/**
 * Gaming Account Security Score — INTERNAL moderation/admin tool.
 *
 * This value must NEVER be shown to buyers or the public. It is computed from
 * the ownership/security attributes the seller supplies at listing creation and
 * is used ONLY inside the admin listing-review flow to help moderators approve
 * or reject gaming-account listings.
 *
 * Extracted from the (now removed) buyer product-page block so the calculation
 * lives in exactly one place and is rendered only in admin surfaces.
 */

export type SecurityFactor = {
  name: string;
  desc: string;
  status: boolean;
  points: number;
};

export type SecurityScoreResult = {
  score: number;
  label: string;
  /** tailwind classes for the score chip */
  colorClass: string;
  factors: SecurityFactor[];
};

/** True if the listing belongs to the gaming-accounts family. */
export function isGamingAccountListing(attrs: any, categorySlug?: string): boolean {
  const slug = categorySlug || "";
  return attrs?.type === "game-accounts" || slug === "gaming-accounts" || slug.includes("account");
}

export function computeGamingSecurityScore(attrs: any): SecurityScoreResult {
  let score = 0;
  const factors: SecurityFactor[] = [];

  const hasOrigEmail = attrs?.originalEmailIncluded === true || attrs?.originalEmailIncluded === "true";
  if (hasOrigEmail) {
    score += 25;
    factors.push({ name: "Original Email Included", desc: "Includes access to the initial registration email account.", status: true, points: 25 });
  } else {
    factors.push({ name: "Original Email Included", desc: "Original registration email is not provided with purchase.", status: false, points: 25 });
  }

  const isFirstOwner = attrs?.firstOwnerStatus === true || attrs?.firstOwnerStatus === "true" || attrs?.originalOwner === true || attrs?.originalOwner === "true";
  if (isFirstOwner) {
    score += 20;
    factors.push({ name: "First Owner Verified", desc: "Seller is the original creator of the gaming account.", status: true, points: 20 });
  } else {
    factors.push({ name: "First Owner Verified", desc: "Account was resold or traded previously by other owners.", status: false, points: 20 });
  }

  const hasRecovery = !!(attrs?.recoveryHistory || attrs?.recoveryInfo);
  if (hasRecovery) {
    score += 15;
    factors.push({ name: "Recovery History Provided", desc: "Detailed recovery details & security answers are supplied.", status: true, points: 15 });
  } else {
    factors.push({ name: "Recovery History Provided", desc: "No recovery details or history supplied by the seller.", status: false, points: 15 });
  }

  const hasWarranty = !!(attrs?.warrantyInformation || attrs?.warrantyPeriod) && !String(attrs?.warrantyInformation || attrs?.warrantyPeriod).toLowerCase().includes("none");
  if (hasWarranty) {
    score += 15;
    factors.push({ name: "Warranty Period Active", desc: `Account is covered by a seller warranty: ${attrs?.warrantyInformation || attrs?.warrantyPeriod}.`, status: true, points: 15 });
  } else {
    factors.push({ name: "Warranty Period Active", desc: "No refund or replacement warranty is offered for this account.", status: false, points: 15 });
  }

  const hasReceipts = attrs?.purchaseReceiptsAvailable === true || attrs?.purchaseReceiptsAvailable === "true";
  if (hasReceipts) {
    score += 15;
    factors.push({ name: "Purchase Receipts Available", desc: "First purchase receipt/invoices are provided to buyer.", status: true, points: 15 });
  } else {
    factors.push({ name: "Purchase Receipts Available", desc: "No transaction receipts or purchase history proofs available.", status: false, points: 15 });
  }

  const hasLinked = !!attrs?.linkedAccounts && !String(attrs?.linkedAccounts).toLowerCase().includes("none");
  if (hasLinked) {
    score += 10;
    factors.push({ name: "Linked Connections Checked", desc: `Linked social/console accounts detailed: ${attrs?.linkedAccounts}.`, status: true, points: 10 });
  } else {
    factors.push({ name: "Linked Connections Checked", desc: "No linked third-party consoles or platforms specified.", status: false, points: 10 });
  }

  let colorClass = "text-red-500 border-red-500/20 bg-red-500/5";
  let label = "High Risk";
  if (score >= 80) {
    colorClass = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    label = "Excellent Security";
  } else if (score >= 50) {
    colorClass = "text-gold border-gold/20 bg-gold/5";
    label = "Moderate Security";
  }

  return { score, label, colorClass, factors };
}
