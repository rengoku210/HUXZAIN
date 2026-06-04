// src/lib/escrow.ts

export type SellerTier = "standard" | "pro" | "elite" | "enterprise";

/**
 * Calculates the inspection period duration in hours based on product risk tier, price, and seller subscription plan.
 * 
 * Requirements:
 * - Low Risk (Gift Cards, Software/License Keys, Redeem Codes, Digital Downloads): 24 Hours
 * - Medium Risk (Shared Subscriptions, Premium Memberships, Digital Assets, Templates, Website/Course Files): 48 Hours
 * - High Risk (Gaming Accounts, Social Media Accounts, Streaming/Business Accounts): 72 Hours
 * - Very High Risk (Gaming accounts with price >= 10,000 INR, monetized social accounts, websites with revenue): 7 Days (168 Hours)
 * - Seller Plan Reductions:
 *   - Standard: 0% reduction
 *   - Pro: 25% reduction
 *   - Elite: 40% reduction
 *   - Enterprise: 50% reduction
 */
export function calculateInspectionHours(
  categorySlug: string,
  priceInr: number,
  sellerTier: SellerTier = "standard"
): number {
  let baseHours = 24; // Default to 24h

  const lowRisk = ["gift-cards", "software-tools", "digital-marketplace", "digital-products"];
  const mediumRisk = [
    "subscriptions", "freelance-services", "editing-design", "advertising-services",
    "coaching-services", "boosting-services", "game-buddies", "coaching",
    "rank-boosting", "in-game-credits", "services", "hosting", "seo",
    "design", "programming", "marketing", "business"
  ];
  const highRisk = ["gaming-accounts", "game-accounts"];

  if (highRisk.includes(categorySlug)) {
    if (priceInr >= 10000) {
      baseHours = 168; // 7 days
    } else {
      baseHours = 72; // 3 days
    }
  } else if (mediumRisk.includes(categorySlug)) {
    baseHours = 48;
  } else if (lowRisk.includes(categorySlug)) {
    baseHours = 24;
  }

  // Apply reductions
  let multiplier = 1.0;
  if (sellerTier === "pro") multiplier = 0.75;
  else if (sellerTier === "elite") multiplier = 0.60;
  else if (sellerTier === "enterprise") multiplier = 0.50;

  return Math.round(baseHours * multiplier);
}

/**
 * Calculates the cooling period duration in days based on seller plan tier.
 * 
 * Requirements:
 * - Standard Seller: 7 Days
 * - Pro Seller: 5 Days
 * - Elite Seller: 3 Days
 * - Enterprise Seller: 1 Day
 */
export function calculateCoolingDays(sellerTier: SellerTier = "standard"): number {
  switch (sellerTier) {
    case "pro":
      return 5;
    case "elite":
      return 3;
    case "enterprise":
      return 1;
    case "standard":
    default:
      return 7;
  }
}
