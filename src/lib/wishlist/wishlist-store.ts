import { ListingLike } from "../marketplace/listing-adapter";

const WISHLIST_KEY = "huxzain_wishlist";

export const wishlistStore = {
  getItems(): string[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  toggle(id: string): "added" | "removed" {
    const items = this.getItems();
    const exists = items.includes(id);
    
    let newItems;
    let status: "added" | "removed";
    
    if (exists) {
      newItems = items.filter((i) => i !== id);
      status = "removed";
    } else {
      newItems = [...items, id];
      status = "added";
    }
    
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event("wishlist-updated"));
    return status;
  },

  isWishlisted(id: string): boolean {
    return this.getItems().includes(id);
  }
};
