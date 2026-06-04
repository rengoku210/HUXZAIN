import { ChevronDown, Filter } from "lucide-react";

interface CategoryFiltersProps {
  categorySlug: string;
}

const filterSchemas: Record<string, string[]> = {
  "generic": ["Category", "Sort By", "Price"],
  "game-buddies": ["Game", "Region", "Rank", "Language", "Price"],
  "coaching-services": ["Game", "Coaching Type", "Rank", "Role", "Price"],
  "boosting-services": ["Game", "Boost Type", "Current Rank", "Desired Rank", "Region", "Price"],
  "gift-cards": ["Brand", "Region", "Amount", "Platform"],
  "gaming-accounts": ["Game", "Rank", "Level", "Region"],
  "in-game-currency": ["Game", "Currency Type", "Delivery Time"],
  "subscriptions": ["Platform", "Duration", "Region"],
  "software-tools": ["Software Type", "Platform", "License Type"],
  "editing-design": ["Service Type", "Delivery Time", "Price"],
  "freelance-services": ["Category", "Experience Level", "Budget"],
  "advertising-services": ["Platform", "Audience Size", "Budget"]
};

const filterOptions: Record<string, Record<string, string[]>> = {
  "gift-cards": {
    "Brand": ["Amazon", "Steam", "PlayStation Network (PSN)", "Xbox Live", "Google Play", "Apple Gift Card", "Riot Games (VP/LoL)", "Netflix Gift Card", "Roblox Gift Card", "Nintendo eShop"],
    "Region": ["Global", "India (INR)", "United States (USD)", "Europe (EUR)", "United Kingdom (GBP)", "Asia-Pacific", "Middle East"],
    "Amount": ["Under ₹500", "₹500 - ₹1,500", "₹1,500 - ₹3,000", "₹3,000 - ₹5,000", "₹5,000+", "$10", "$25", "$50", "$100"],
    "Platform": ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Android", "iOS", "Mobile"]
  },
  "gaming-accounts": {
    "Game": ["Valorant", "BGMI", "CS2", "Fortnite", "Free Fire", "GTA V Online", "League of Legends", "Apex Legends", "Clash of Clans", "Mobile Legends"],
    "Rank": ["Unranked", "Valorant: Radiant", "Valorant: Immortal", "Valorant: Diamond/Ascendant", "BGMI: Conqueror", "BGMI: Ace/Ace Master", "CS2: Global Elite", "CS2: Premiere 20k+", "Fortnite: Unreal", "CoC: Town Hall 16"],
    "Level": ["Level 10+", "Level 30+", "Level 50+", "Level 100+", "Level 200+"],
    "Region": ["India/APAC", "North America (NA)", "Europe (EU)", "LATAM", "Brazil", "Korea/Japan", "Middle East"]
  },
  "in-game-currency": {
    "Game": ["Valorant (VP)", "BGMI (UC)", "Roblox (Robux)", "Fortnite (V-Bucks)", "Free Fire (Diamonds)", "Apex Legends (Coins)", "Genshin Impact (Genesis Crystals)", "League of Legends (RP)"],
    "Currency Type": ["UC (BGMI)", "V-Bucks (Fortnite)", "Diamonds (Free Fire)", "VP (Valorant)", "Robux (Roblox)", "Genesis Crystals", "Gold", "Coins"],
    "Delivery Time": ["Instant", "Under 15 mins", "Under 1 Hour", "Under 24 Hours", "24-48 Hours"]
  },
  "coaching-services": {
    "Game": ["Valorant", "BGMI", "CS2", "League of Legends", "Dota 2", "Apex Legends", "Fortnite"],
    "Coaching Type": ["Aim & Mechanics", "Game Sense & Decision Making", "Live Game Backseating", "VOD Review & Analysis", "Role/Agent Mastery", "Team/IGL Coaching"],
    "Rank": ["Beginner / Low Elo", "Intermediate / Mid Elo", "Advanced / High Elo", "Pro Player / Radiant Coaching"],
    "Role": ["Duelist / Entry Fragger", "Initiator / Support", "Controller / IGL", "Sentinel / Anchor", "Roamer / Jungler"],
    "Price": ["Under ₹500/hr", "₹500 - ₹1,000/hr", "₹1,000 - ₹2,000/hr", "₹2,000+/hr"]
  },
  "boosting-services": {
    "Game": ["Valorant", "BGMI", "CS2", "League of Legends", "Dota 2", "Apex Legends"],
    "Boost Type": ["Rank Boosting", "Placement Matches", "Net Wins", "Duo Queue Carry", "Level Boosting", "Badge / Achievement Unlock"],
    "Current Rank": ["Iron / Bronze", "Silver / Gold", "Platinum / Diamond", "Ascendant / Immortal", "Ace / Ace Master (BGMI)"],
    "Desired Rank": ["Gold / Platinum", "Diamond / Ascendant", "Immortal / Radiant", "Conqueror (BGMI)", "Global Elite (CS2)"],
    "Region": ["India/APAC", "Europe (EU)", "North America (NA)", "Middle East"],
    "Price": ["Under ₹1,000", "₹1,000 - ₹3,000", "₹3,000 - ₹7,000", "₹7,000+"]
  },
  "subscriptions": {
    "Platform": ["Netflix Premium", "Spotify Premium", "ChatGPT Plus / OpenAI", "YouTube Premium", "Discord Nitro", "Xbox Game Pass Ultimate", "PlayStation Plus Extra/Deluxe", "Adobe Creative Cloud", "Midjourney Pro", "Prime Video"],
    "Duration": ["1 Month", "3 Months", "6 Months", "1 Year / Annual", "Lifetime Account"],
    "Region": ["India (INR Only)", "Global / Region Free", "US Region", "EU Region"]
  },
  "software-tools": {
    "Software Type": ["Antivirus & Security", "VPN & Privacy", "OS Activation Keys (Win 11)", "Office Suite Keys", "Video & Audio Editing", "Graphic Design Tools", "Developer Tools", "Data Recovery"],
    "Platform": ["Windows", "macOS", "Linux", "Android", "iOS / iPadOS"],
    "License Type": ["Lifetime Retail Key", "1-Year Subscription", "Monthly Subscription", "Single Device Key", "Multi-Device Key (5 PCs)"]
  },
  "editing-design": {
    "Service Type": ["YouTube Thumbnail Design", "Gaming Logo & Brand", "Stream Overlay & Alerts", "Video Editing (Shorts/YT)", "UI/UX Layout Design", "3D Model / Avatar", "Vector Art / Illustration"],
    "Delivery Time": ["Express (Under 24 Hours)", "2-3 Days", "5-7 Days", "1-2 Weeks"],
    "Price": ["Under ₹500", "₹500 - ₹1,500", "₹1,500 - ₹4,000", "₹4,000+"]
  },
  "freelance-services": {
    "Category": ["Web & App Development", "Discord Server Setup", "Game Server Setup (Minecraft/Rust)", "Graphic Design & Art", "Content Writing & SEO", "Social Media Management", "Database & Scripting"],
    "Experience Level": ["Junior Developer/Designer", "Mid-Level Specialist", "Senior Architect/Creative", "Verified Agency"],
    "Budget": ["Under ₹2,000", "₹2,000 - ₹8,000", "₹8,000 - ₹20,000", "₹20,000+"]
  },
  "advertising-services": {
    "Platform": ["YouTube Sponsor / Shoutout", "Twitch Live Hosting", "Instagram Post / Story", "Discord Server Promotion", "Telegram Channel Broadcast", "Website Ad Banner Placement"],
    "Audience Size": ["Micro (1k - 5k Followers)", "Mid-Tier (5k - 20k Followers)", "Mega (20k - 100k Followers)", "Enterprise (100k+ Followers)"],
    "Budget": ["Under ₹1,000", "₹1,000 - ₹5,000", "₹5,000 - ₹15,000", "₹15,000+"]
  },
  "game-buddies": {
    "Game": ["Valorant", "BGMI", "CS2", "League of Legends", "Dota 2", "Fortnite", "Apex Legends", "Minecraft", "GTA V"],
    "Region": ["India", "APAC / SE Asia", "North America", "Europe", "Middle East"],
    "Rank": ["Any Rank", "Iron - Silver", "Gold - Diamond", "Ascendant - Radiant / Ace - Conqueror"],
    "Language": ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Malayalam", "Kannada"],
    "Price": ["Free / Fun", "Paid Coach/Buddy"]
  }
};

export function CategoryFilters({ categorySlug }: CategoryFiltersProps) {
  // Resolve filter schema based on slug matching to handle subcategory routes
  let resolvedSlug = "generic";
  const slug = categorySlug.toLowerCase();
  
  if (slug.includes("gift-card")) resolvedSlug = "gift-cards";
  else if (slug.includes("account")) resolvedSlug = "gaming-accounts";
  else if (slug.includes("currency") || slug.includes("coin") || slug.includes("top-up") || slug.includes("topup")) resolvedSlug = "in-game-currency";
  else if (slug.includes("coaching")) resolvedSlug = "coaching-services";
  else if (slug.includes("boosting")) resolvedSlug = "boosting-services";
  else if (slug.includes("subscription")) resolvedSlug = "subscriptions";
  else if (slug.includes("software") || slug.includes("tool")) resolvedSlug = "software-tools";
  else if (slug.includes("design") || slug.includes("edit")) resolvedSlug = "editing-design";
  else if (slug.includes("freelance")) resolvedSlug = "freelance-services";
  else if (slug.includes("advertise") || slug.includes("promo")) resolvedSlug = "advertising-services";
  else if (slug.includes("buddy") || slug.includes("buddies")) resolvedSlug = "game-buddies";
  else {
    // Try exact match or fallback
    for (const key of Object.keys(filterSchemas)) {
      if (slug === key) {
        resolvedSlug = key;
        break;
      }
    }
  }

  const filters = filterSchemas[resolvedSlug] || filterSchemas["generic"];

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground md:mr-4 shrink-0">
        <Filter className="size-4 text-gold" />
        Filters
      </div>
      
      <div className="flex flex-wrap gap-3">
        {filters.map((filterName) => {
          const options = filterOptions[resolvedSlug]?.[filterName] || ["Popular", "Newest"];
          return (
            <div key={filterName} className="relative">
              <select
                className="appearance-none bg-surface/60 border border-border hover:border-gold/50 text-xs text-foreground px-4 py-2.5 pr-10 rounded-xl outline-none focus:ring-1 focus:ring-gold/50 transition-all font-medium min-w-[120px] cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled hidden>{filterName}</option>
                <option value="all">All {filterName}s</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
