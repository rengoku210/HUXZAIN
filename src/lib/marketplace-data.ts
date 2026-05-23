import {
  Monitor, Cog, Server, Search, Palette, Code2, Megaphone, Building2,
  Gamepad2, Coins, Gift, Rocket, GraduationCap, Crown, Sparkles, Headphones,
  ShieldCheck, Truck, HelpCircle, Users,
} from "lucide-react";

export const primaryCategories = [
  { slug: "digital-products", title: "Digital Products", icon: Monitor, count: "12,000+ Listings" },
  { slug: "services", title: "Services", icon: Cog, count: "18,000+ Listings" },
  { slug: "hosting", title: "Hosting", icon: Server, count: "2,500+ Listings" },
  { slug: "seo", title: "SEO", icon: Search, count: "8,000+ Listings" },
  { slug: "design", title: "Design", icon: Palette, count: "7,000+ Listings" },
  { slug: "programming", title: "Programming", icon: Code2, count: "15,000+ Listings" },
  { slug: "marketing", title: "Marketing", icon: Megaphone, count: "5,000+ Listings" },
  { slug: "business", title: "Business", icon: Building2, count: "3,500+ Listings" },
];

export const gamingCategories = [
  { slug: "accounts", title: "Gaming Accounts", icon: Gamepad2 },
  { slug: "currency", title: "In-Game Currency", icon: Coins },
  { slug: "gift-cards", title: "Gift Cards", icon: Gift },
  { slug: "boosting", title: "Boosting", icon: Rocket },
  { slug: "coaching", title: "Coaching", icon: GraduationCap },
  { slug: "subscriptions", title: "Subscriptions", icon: Crown },
];

export const trustFeatures = [
  { icon: ShieldCheck, title: "Secure Payments", desc: "Your money is safe with our escrow system" },
  { icon: Truck, title: "Fast Delivery", desc: "Get your orders delivered on time" },
  { icon: HelpCircle, title: "24/7 Support", desc: "We're always here to help you" },
  { icon: Users, title: "Trusted Community", desc: "Join thousands of satisfied users" },
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
  { id: "wp-theme", title: "Premium WordPress Theme", seller: "ThemeWorld", level: "Level 2 Seller", rating: 4.9, reviews: 320, price: 49, category: "Digital Products", badge: "Bestseller", cover: "wordpress", delivery: "Instant" },
  { id: "shopify", title: "Complete Shopify Store Setup", seller: "DevExperts", level: "Level 2 Seller", rating: 5.0, reviews: 210, price: 199, category: "Services", badge: "Trending", cover: "shopify", delivery: "3 days" },
  { id: "seo-opt", title: "SEO Optimization Service", seller: "SEOPro", level: "Top Rated Seller", rating: 4.9, reviews: 540, price: 120, category: "SEO", cover: "seo", delivery: "5 days" },
  { id: "logo", title: "Minimalist Logo Design", seller: "DesignStudio", level: "Level 2 Seller", rating: 4.8, reviews: 180, price: 75, category: "Design", cover: "logo", delivery: "2 days" },
  { id: "app-dev", title: "Mobile App Development", seller: "CodeWorks", level: "Top Rated Seller", rating: 5.0, reviews: 95, price: 499, category: "Programming", cover: "app", delivery: "14 days" },
  { id: "icons", title: "5000+ Premium Icons Pack", seller: "IconStock", level: "Level 1 Seller", rating: 4.9, reviews: 200, price: 12, category: "Design", cover: "icons", delivery: "Instant" },
  { id: "ig", title: "Instagram Templates Bundle", seller: "PixelDesigns", level: "Level 2 Seller", rating: 4.8, reviews: 160, price: 18, category: "Design", badge: "Trending", cover: "instagram", delivery: "Instant" },
  { id: "gpt", title: "AI ChatGPT Prompts Mega Pack", seller: "PromptGenius", level: "Top Rated Seller", rating: 5.0, reviews: 310, price: 9, category: "Digital Products", badge: "Hot", cover: "ai", delivery: "Instant" },
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
