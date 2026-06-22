import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ChevronRight } from "lucide-react";
import type { Category } from "@/lib/marketplace/categoryService";

interface CategoryMegaMenuProps {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
  subcategories: Category[];
}

// Brand mapping using SimpleIcons
const brandLogos: Record<string, string> = {
  "amazon": "https://cdn.simpleicons.org/amazon/white",
  "netflix": "https://cdn.simpleicons.org/netflix/E50914",
  "spotify": "https://cdn.simpleicons.org/spotify/1DB954",
  "discord": "https://cdn.simpleicons.org/discord/5865F2",
  "steam": "https://cdn.simpleicons.org/steam/white",
  "roblox": "https://cdn.simpleicons.org/roblox/white",
  "valorant": "https://cdn.simpleicons.org/valorant/FF4655",
  "playstation": "https://cdn.simpleicons.org/playstation/white",
  "xbox": "https://cdn.simpleicons.org/xbox/107C10",
  "adobe": "https://cdn.simpleicons.org/adobe/FF0000",
  "chatgpt": "https://cdn.simpleicons.org/openai/white",
  "canva": "https://cdn.simpleicons.org/canva/00C4CC",
  "league-of-legends": "https://cdn.simpleicons.org/leagueoflegends/white",
  "fortnite": "https://cdn.simpleicons.org/epicgames/white", // Epic placeholder
  "apple": "https://cdn.simpleicons.org/apple/white",
  "blizzard": "https://cdn.simpleicons.org/battledotnet/0098FF",
};

const categoryShortcuts: Record<string, { name: string, brandKey?: string }[]> = {
  "gift-cards": [
    { name: "Valorant Gift Cards", brandKey: "valorant" },
    { name: "Steam Gift Cards", brandKey: "steam" },
    { name: "Discord Nitro", brandKey: "discord" },
    { name: "Amazon Gift Cards", brandKey: "amazon" },
    { name: "Roblox Gift Cards", brandKey: "roblox" },
    { name: "PlayStation Gift Card", brandKey: "playstation" },
    { name: "Apple Gift Cards", brandKey: "apple" },
    { name: "Xbox Gift Cards", brandKey: "xbox" },
  ],
  "game-buddies": [
    { name: "Valorant", brandKey: "valorant" },
    { name: "League of Legends", brandKey: "league-of-legends" },
    { name: "Roblox", brandKey: "roblox" },
  ],
  "boosting-services": [
    { name: "Valorant Boosting", brandKey: "valorant" },
    { name: "League of Legends", brandKey: "league-of-legends" },
  ],
  "software-tools": [
    { name: "Adobe Creative Cloud", brandKey: "adobe" },
    { name: "Canva Pro", brandKey: "canva" },
    { name: "ChatGPT Plus", brandKey: "chatgpt" },
  ],
  "subscriptions": [
    { name: "Netflix Premium", brandKey: "netflix" },
    { name: "Spotify Premium", brandKey: "spotify" },
    { name: "Discord Nitro", brandKey: "discord" },
  ],
  "gaming-accounts": [
    { name: "Valorant Accounts", brandKey: "valorant" },
    { name: "League of Legends", brandKey: "league-of-legends" },
    { name: "Steam Accounts", brandKey: "steam" },
  ]
};

const categoryBanners: Record<string, string> = {
  "gaming-accounts": "Gaming Accounts.png",
  "in-game-currency": "in-game currency.png",
  "gift-cards": "gift cards.png",
  "software-tools": "software and tools.png",
  "subscriptions": "Subscriptions.png",
  "coaching-services": "Coaching Services.png",
  "boosting-services": "Boosting Services.png",
  "game-buddies": "Game Buddy.png",
  "freelance-services": "Freelance Services.png",
  "editing-design": "Editing & Design.png",
  "advertising-services": "Advertising Services.png",
  "digital-marketplace": "Digital Marketplace.png"
};

export function CategoryMegaMenu({ category, isOpen, onClose, subcategories }: CategoryMegaMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  if (!isOpen) return null;

  const shortcuts = categoryShortcuts[category.slug] || categoryShortcuts["gift-cards"]; // Fallback to generic

  const filteredSubcategories = subcategories.filter(sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const banner = categoryBanners[category.slug];
  const bannerUrl = banner ? `/images/category-banners/${encodeURIComponent(banner)}` : null;

  return (
    <div 
      className="absolute top-full left-0 w-full bg-[#1e212b] border-t border-border shadow-2xl z-50 transform origin-top animate-in slide-in-from-top-2 fade-in duration-200"
      onMouseLeave={onClose}
    >
      <div className="container-page mx-auto flex h-[400px]">
        
        {/* LEFT COLUMN: Popular Items / Shortcuts */}
        <div className="w-[350px] bg-[#1a1c23] p-6 border-r border-border/40 shrink-0 overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-bold text-white mb-4">Popular {category.name.toLowerCase()}</h3>
          <div className="flex flex-col gap-2">
            {shortcuts.map((shortcut, i) => (
              <button 
                key={i}
                onClick={() => {
                  onClose();
                  navigate({ to: "/category/$slug", params: { slug: category.slug } });
                }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                {shortcut.brandKey && brandLogos[shortcut.brandKey] ? (
                  <img src={brandLogos[shortcut.brandKey]} alt={shortcut.name} className="size-5 object-contain opacity-90" />
                ) : (
                  <div className="size-5 rounded bg-surface border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground shrink-0">
                    {shortcut.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground/90">{shortcut.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Search and All Categories */}
        <div 
          className="flex-1 p-6 bg-[#16181f] flex flex-col relative overflow-hidden"
          style={bannerUrl ? {
            backgroundImage: `linear-gradient(to right, #16181f 40%, rgba(22, 24, 31, 0.85) 100%), url(${bannerUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          } : undefined}
        >
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-white">All {category.name.toLowerCase()}</h3>
            
            <div className="relative w-64">
              <input
                type="text"
                placeholder={`Search for ${category.name.toLowerCase()}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-3 pr-9 rounded-lg bg-[#111318] border border-border/40 text-sm focus:border-gold/50 focus:outline-none transition-colors text-white placeholder:text-muted-foreground/50"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 content-start relative z-10">
            {filteredSubcategories.length > 0 ? (
              filteredSubcategories.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    onClose();
                    navigate({ to: "/category/$slug", params: { slug: sub.slug } });
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="size-6 rounded bg-surface border border-border flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground group-hover:text-gold transition-colors">{sub.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-white transition-colors truncate">{sub.name}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground col-span-full pt-4">No categories found matching "{searchQuery}".</p>
            )}
            
            {/* If no dynamic subcategories exist, show a "View All" button to the main category */}
            {filteredSubcategories.length === 0 && searchQuery === "" && (
               <button
                  onClick={() => {
                    onClose();
                    navigate({ to: "/category/$slug", params: { slug: category.slug } });
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group col-span-full"
                >
                  <span className="text-sm text-gold font-medium">Browse all {category.name} <ChevronRight className="size-3 inline" /></span>
                </button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
