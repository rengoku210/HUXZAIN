import type { Category } from "@/lib/marketplace/categoryService";

const bannerMap: Record<string, string> = {
  "gaming-accounts": "Gaming Accounts.png",
  "in-game-currency": "in-game currency.png",
  "gift-cards": "gift cards.png",
  "software-tools": "software and tools.png",
  "subscriptions": "Subscriptions.png",
  "coaching-services": "Coach.jpg",
  "boosting-services": "Boosting Services.png",
  "game-buddies": "Game Buddy.jpg",
  "freelance-services": "Freelance Services.png",
  "editing-design": "Editing & Design.png",
  "advertising-services": "Advertising Services.png",
  "digital-marketplace": "Digital Marketplace.png"
};

interface CategoryHeroBannerProps {
  category: Category;
  staticMeta?: { title: string; count?: string };
}

export function CategoryHeroBanner({ category, staticMeta }: CategoryHeroBannerProps) {
  const defaultBanner = "Digital Marketplace.png";
  const bannerFilename = bannerMap[category.slug] ?? defaultBanner;
  // If the category has a customized banner in the DB, prefer that, otherwise use the static mapped one
  const bannerUrl = (category as any)?.banner_image_url || `/images/category-banners/${bannerFilename}`;

  return (
    <div 
      className="relative rounded-[2rem] overflow-hidden mb-10 min-h-[360px] flex items-end border border-border/50 shadow-2xl"
      style={{
        backgroundImage: `url('${bannerUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent opacity-80" />
      
      <div className="relative z-10 p-8 md:p-12 w-full max-w-4xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 drop-shadow-md text-white">
          {(category as any)?.banner_title || staticMeta?.title || category.name}
        </h1>
        {((category as any)?.banner_subtitle || staticMeta?.count) && (
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed drop-shadow-sm font-medium">
            {(category as any)?.banner_subtitle || staticMeta?.count}
          </p>
        )}
        {/* Eldorado uses a CTA or interactive elements sometimes, but mostly a clean hero */}
        {(category as any)?.cta_text && (
          <button className="px-8 h-12 rounded-xl bg-gold text-primary-foreground font-bold hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:-translate-y-0.5 transition-all">
            {(category as any).cta_text}
          </button>
        )}
      </div>
    </div>
  );
}
