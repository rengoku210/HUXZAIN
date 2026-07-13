export type ListingCategoryType = 
  | "game-accounts" 
  | "currency" 
  | "boosting" 
  | "gift-cards" 
  | "software-tools" 
  | "subscriptions" 
  | "coaching" 
  | "game-buddies" 
  | "freelance" 
  | "design" 
  | "advertising" 
  | "digital-marketplace" 
  | "hosting"
  | "ai-tools"
  | "generic";

export interface GameAccountAttributes {
  type: "game-accounts";
  game: string;
  region: string;
  rank?: string;
  level?: number;
  skinsCount?: number;
  rareSkins?: string; // Backward compat
  rareItems?: string; // New field
  emailChangeAvailable?: boolean; // Backward compat
  emailChangeable?: boolean; // New field
  platform?: string; // e.g. PC, PSN, Xbox
  warrantyPeriod?: string; // Backward compat
  warrantyInformation?: string; // New field
  linkedAccounts?: string;
  originalOwner?: boolean; // Backward compat
  firstOwnerStatus?: boolean; // New field
  originalEmailIncluded?: boolean; // New field
  accountCreationDate?: string; // New field
  recoveryInfo?: string; // Backward compat
  recoveryHistory?: string; // New field
  purchaseReceiptsAvailable?: boolean; // New field
  proofScreenshotsUrl?: string;
  proofInventoryUrl?: string;
  proofRankUrl?: string;
  proofPurchaseUrl?: string;
}

export interface InGameCurrencyAttributes {
  type: "currency";
  game: string;
  currencyType: string;
  amount: number;
  deliveryMethod?: string;
}

export interface BoostingAttributes {
  type: "boosting";
  game: string;
  currentRank: string;
  desiredRank: string;
  region: string;
  platform?: string;
}

export interface GiftCardAttributes {
  type: "gift-cards";
  brand: string;
  value: string;
  region: string;
}

export interface SoftwareAttributes {
  type: "software-tools";
  softwareName: string;
  os: string;
  licenseType: string;
  deviceLimit?: number;
}

export interface SubscriptionAttributes {
  type: "subscriptions";
  subscriptionName: string;
  planType: string;
  duration: string;
  accessModel: string;
}

export interface CoachingAttributes {
  type: "coaching";
  game: string;
  coachRank: string;
  sessionDuration: string;
  voiceChat: boolean;
  language: string;
}

export interface GameBuddyAttributes {
  type: "game-buddies";
  game: string;
  platform: string;
  region: string;
  voiceChat: boolean;
  language: string;
}

export interface FreelanceAttributes {
  type: "freelance";
  serviceType: string;
  deliveryTime: string;
  revisionLimit: number;
  portfolioUrl?: string;
}

export interface DesignAttributes {
  type: "design";
  designType: string; // Logo, Thumbnail, Banner, etc.
  sourceFilesIncluded: boolean;
  commercialUse: boolean;
}

export interface AdvertisingAttributes {
  type: "advertising";
  platformName: string; // YouTube, Twitch, Instagram, Discord
  reachAudience: string;
  durationDays: number;
}

export interface DigitalMarketplaceAttributes {
  type: "digital-marketplace";
  productType: string;
  fileSize?: string;
  format?: string;
}

export type ListingAttributes = 
  | GameAccountAttributes 
  | InGameCurrencyAttributes 
  | BoostingAttributes 
  | GiftCardAttributes
  | SoftwareAttributes
  | SubscriptionAttributes
  | CoachingAttributes
  | GameBuddyAttributes
  | FreelanceAttributes
  | DesignAttributes
  | AdvertisingAttributes
  | DigitalMarketplaceAttributes
  | { type: "generic"; [key: string]: any };

export function getCategoryTypeFromSlug(slug: string): ListingCategoryType {
  const s = slug.toLowerCase();
  // Substring matching so DB slug variants (e.g. "accounts" vs "game-accounts",
  // "coaching" vs "coaching-services", "design" vs "editing-design",
  // "digital-products" vs "digital-marketplace") still resolve to the right
  // category-specific listing form instead of silently falling through to generic.
  if (s.includes("account")) return "game-accounts";
  if (s.includes("currency") || s.includes("credit") || s.includes("vp")) return "currency";
  if (s.includes("boost")) return "boosting";
  if (s.includes("gift")) return "gift-cards";
  if (s.includes("software") || s.includes("tool")) return "software-tools";
  if (s.includes("subscription")) return "subscriptions";
  if (s.includes("coach")) return "coaching";
  if (s.includes("buddy") || s.includes("buddies")) return "game-buddies";
  if (s.includes("freelance")) return "freelance";
  if (s.includes("design") || s.includes("editing") || s.includes("creative")) return "design";
  if (s.includes("advertis") || s.includes("social")) return "advertising";
  if (s.includes("digital")) return "digital-marketplace";
  return "generic";
}
