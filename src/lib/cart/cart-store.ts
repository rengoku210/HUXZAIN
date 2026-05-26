import { ListingLike } from "../marketplace/listing-adapter";

export type CartItem = ListingLike;

const CART_KEY = "huxzain_cart";

export const cartStore = {
  getItems(): CartItem[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  addItem(item: CartItem): "added" | "exists" {
    const items = this.getItems();
    if (items.some((i) => i.id === item.id)) return "exists";
    
    const newItems = [...items, item];
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event("cart-updated"));
    return "added";
  },

  removeItem(id: string) {
    const items = this.getItems();
    const newItems = items.filter((i) => i.id !== id);
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event("cart-updated"));
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event("cart-updated"));
  },

  getCount(): number {
    return this.getItems().length;
  }
};
