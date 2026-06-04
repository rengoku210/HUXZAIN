import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";
import type { Category } from "@/lib/marketplace/categoryService";

interface CategoryEmptyStateProps {
  category: Category | null;
}

export function CategoryEmptyState({ category }: CategoryEmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-border/50 bg-surface/20 backdrop-blur-sm py-20 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden my-8">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="relative z-10 size-20 rounded-3xl bg-gradient-to-br from-surface to-background border border-gold/20 shadow-[0_0_30px_rgba(255,215,0,0.1)] flex items-center justify-center mb-6">
        <PackageOpen className="size-8 text-gold" />
      </div>
      
      <div className="relative z-10 max-w-md mx-auto">
        <h3 className="font-display text-2xl font-bold mb-3">No active listings yet</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          The {category?.name ?? "marketplace"} category is waiting for its first seller. Be the pioneer to establish your presence and capture the market!
        </p>
        
        <Link
          to="/seller-panel"
          className="h-11 px-8 rounded-xl bg-gold text-primary-foreground text-sm font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
        >
          <PackageOpen className="size-4" /> Start Selling
        </Link>
      </div>
    </div>
  );
}
