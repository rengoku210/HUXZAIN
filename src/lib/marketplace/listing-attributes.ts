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
  | "generic";

export interface GameAccountAttributes {
  type: "game-accounts";
  game: string;
  region: string;
  rank?: string;
  level?: number;
  skinsCount?: number;
  rareSkins?: string;
  emailChangeAvailable?: boolean;
  platform?: string; // e.g. PC, PSN, Xbox
  warrantyPeriod?: string;
  linkedAccounts?: string;
  originalOwner?: boolean;
  recoveryInfo?: string;
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
  if (s === "gaming-accounts" || s.includes("account")) return "game-accounts";
  if (s === "in-game-currency" || s.includes("currency") || s.includes("credit")) return "currency";
  if (s === "boosting-services" || s.includes("boost")) return "boosting";
  if (s === "gift-cards") return "gift-cards";
  if (s === "software-tools") return "software-tools";
  if (s === "subscriptions") return "subscriptions";
  if (s === "coaching-services") return "coaching";
  if (s === "game-buddies") return "game-buddies";
  if (s === "freelance-services") return "freelance";
  if (s === "editing-design") return "design";
  if (s === "advertising-services") return "advertising";
  if (s === "digital-marketplace") return "digital-marketplace";
  return "generic";
}
