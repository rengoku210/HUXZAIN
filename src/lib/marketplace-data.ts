import {
  Search,
  Gamepad2,
  Coins,
  Gem,
  Gift,
  Laptop,
  Rocket,
  GraduationCap,
  Crown,
  Users2,
  Briefcase,
  Store,
  Palette,
  Megaphone,
  Sparkles,
  Headphones,
  ShieldCheck,
  BadgeCheck,
  Scale,
  Lock,
  Shield,
  Zap,
  Truck,
  HelpCircle,
  Users,
} from "lucide-react";

export const primaryCategories = [
  {
    slug: "gaming-accounts",
    title: "Gaming Marketplace",
    desc: "Accounts & Profiles - Valorant, BGMI, CS2, Fortnite etc.",
    icon: Gamepad2,
    // kept for existing pages that show a secondary line
    count: "Accounts & Profiles",
  },
  {
    slug: "in-game-currency",
    title: "In-Game Currency",
    desc: "Top-up & Currency - V-Bucks, UC, CP, Robux etc.",
    icon: Gem,
    count: "Top-up & Currency",
  },
  {
    slug: "gift-cards",
    title: "Gift Cards",
    desc: "Redeem & Save - Steam, PlayStation, Xbox, Google Play",
    icon: Gift,
    count: "Redeem & Save",
  },
  {
    slug: "software-tools",
    title: "Software & Tools",
    desc: "Tools & Applications - Antivirus, Productivity, Design",
    icon: Laptop,
    count: "Tools & Apps",
  },
  {
    slug: "subscriptions",
    title: "Subscriptions",
    desc: "Premium Access - Netflix, Spotify, ChatGPT, Adobe",
    icon: Crown,
    count: "Premium Access",
  },
  {
    slug: "coaching-services",
    title: "Coaching Services",
    desc: "Learn & Improve - Rank coaching, gameplay review",
    icon: GraduationCap,
    count: "Learn & Improve",
  },
  {
    slug: "boosting-services",
    title: "Boosting Services",
    desc: "Rank Up Fast - Rank boost, placement matches",
    icon: Rocket,
    count: "Rank Up Fast",
  },
  {
    slug: "game-buddies",
    title: "Game Buddies",
    desc: "Play Together - Find gaming partners",
    icon: Users2,
    count: "Play Together",
  },
  {
    slug: "freelance-services",
    title: "Freelance Services",
    desc: "Hire Experts - Design, Dev, Marketing",
    icon: Briefcase,
    count: "Hire Experts",
  },
  {
    slug: "editing-design",
    title: "Editing & Design",
    desc: "Creative Services - Thumbnails, logos, banners",
    icon: Palette,
    count: "Creative Services",
  },
  {
    slug: "advertising-services",
    title: "Advertising Services",
    desc: "Promote & Grow - Channel promos, social media",
    icon: Megaphone,
    count: "Promote & Grow",
  },
  {
    slug: "digital-marketplace",
    title: "Digital Marketplace",
    desc: "All Digital Listings - Misc digital products",
    icon: Store,
    count: "All Digital Listings",
  },
];

export const gamingCategories = [
  { slug: "accounts", title: "Gaming Marketplace", icon: Gamepad2 },
  { slug: "currency", title: "In-Game Currency", icon: Coins },
  { slug: "gift-cards", title: "Gift Cards", icon: Gift },
  { slug: "boosting", title: "Boosting", icon: Rocket },
  { slug: "coaching", title: "Coaching", icon: GraduationCap },
  { slug: "subscriptions", title: "Subscriptions", icon: Crown },
];

export const trustFeatures = [
  {
    icon: Lock,
    title: "Secure Escrow",
    desc: "Your payment is held safely until delivery is confirmed",
  },
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    desc: "All sellers go through strict verification before listing",
  },
  {
    icon: Scale,
    title: "Dispute Resolution",
    desc: "Fair and transparent dispute handling with dedicated team",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "Your data is encrypted and never shared with third parties",
  },
  { icon: Zap, title: "Fast Delivery", desc: "Orders delivered on time with seller accountability" },
  {
    icon: ShieldCheck,
    title: "Buyer Protection",
    desc: "Full refund guarantee if order not delivered as described",
  },
  { icon: Users, title: "Trusted Community", desc: "Join thousands of verified buyers and sellers" },
  { icon: Headphones, title: "24/7 Support", desc: "Our team is always here to resolve your issues" },
];

export type Listing = {
  id: string;
  title: string;
  seller: string;
  level: "Top Rated Seller" | "Level 2 Seller" | "Level 1 Seller" | "New Seller";
  rating: number;
  reviews: number;
  price: number;
  category: string;
  badge?: "Bestseller" | "Trending" | "Hot" | "New";
  cover: string;
  delivery: string;
};

export const featuredListings: Listing[] = [
  {
    id: "wp-theme",
    title: "Premium WordPress Theme",
    seller: "ThemeWorld",
    level: "Level 2 Seller",
    rating: 4.9,
    reviews: 320,
    price: 49,
    category: "Digital Products",
    badge: "Bestseller",
    cover: "wordpress",
    delivery: "Instant",
  },
  {
    id: "shopify",
    title: "Complete Shopify Store Setup",
    seller: "DevExperts",
    level: "Level 2 Seller",
    rating: 5.0,
    reviews: 210,
    price: 199,
    category: "Services",
    badge: "Trending",
    cover: "shopify",
    delivery: "3 days",
  },
  {
    id: "seo-opt",
    title: "SEO Optimization Service",
    seller: "SEOPro",
    level: "Top Rated Seller",
    rating: 4.9,
    reviews: 540,
    price: 120,
    category: "SEO",
    cover: "seo",
    delivery: "5 days",
  },
  {
    id: "logo",
    title: "Minimalist Logo Design",
    seller: "DesignStudio",
    level: "Level 2 Seller",
    rating: 4.8,
    reviews: 180,
    price: 75,
    category: "Design",
    cover: "logo",
    delivery: "2 days",
  },
  {
    id: "app-dev",
    title: "Mobile App Development",
    seller: "CodeWorks",
    level: "Top Rated Seller",
    rating: 5.0,
    reviews: 95,
    price: 499,
    category: "Programming",
    cover: "app",
    delivery: "14 days",
  },
  {
    id: "icons",
    title: "5000+ Premium Icons Pack",
    seller: "IconStock",
    level: "Level 1 Seller",
    rating: 4.9,
    reviews: 200,
    price: 12,
    category: "Design",
    cover: "icons",
    delivery: "Instant",
  },
  {
    id: "ig",
    title: "Instagram Templates Bundle",
    seller: "PixelDesigns",
    level: "Level 2 Seller",
    rating: 4.8,
    reviews: 160,
    price: 18,
    category: "Design",
    badge: "Trending",
    cover: "instagram",
    delivery: "Instant",
  },
  {
    id: "gpt",
    title: "AI ChatGPT Prompts Mega Pack",
    seller: "PromptGenius",
    level: "Top Rated Seller",
    rating: 5.0,
    reviews: 310,
    price: 9,
    category: "Digital Products",
    badge: "Hot",
    cover: "ai",
    delivery: "Instant",
  },
];

export const heroStats = [
  { v: "50,000+", l: "Active Users" },
  { v: "10,000+", l: "Verified Sellers" },
  { v: "100,000+", l: "Orders Completed" },
  { v: "99.8%", l: "Positive Feedback" },
];

export const bigStats = [
  { v: "150K+", l: "Products & Services" },
  { v: "25K+", l: "Active Sellers" },
  { v: "120K+", l: "Happy Customers" },
  { v: "99.8%", l: "Positive Reviews" },
];

export const howSteps = [
  { n: 1, title: "Find", desc: "Explore digital products or services you need", icon: Search },
  { n: 2, title: "Order", desc: "Place your order and make secure payment", icon: Sparkles },
  { n: 3, title: "Receive", desc: "Seller delivers and you review the work", icon: Headphones },
  { n: 4, title: "Complete", desc: "Approve the order and release payment", icon: ShieldCheck },
];

export const protectionPillars = [
  { title: "Buyer Protection", desc: "Get full protection on every order" },
  { title: "Money Back Guarantee", desc: "Easy refunds when eligible" },
  { title: "Quality Services", desc: "Only the best sellers" },
  { title: "Dispute Resolution", desc: "Fair and transparent process" },
];
