/**
 * HX-005 — Notification Center grouping (PURE).
 *
 * Groups notifications into the six spec categories using the HX-001 `category`
 * column. Rows whose category is missing or unrecognised (e.g. legacy rows that
 * were backfilled to 'platform') fall under Platform. Pure + UI-agnostic so it
 * can be unit-tested and shared by the bell, the buyer dashboard and the seller
 * notifications page.
 */

export const NOTIF_CATEGORIES: { key: string; label: string }[] = [
  { key: "orders", label: "Orders" },
  { key: "listings", label: "Listings" },
  { key: "finance", label: "Finance" },
  { key: "membership", label: "Seller Membership" },
  { key: "security", label: "Security" },
  { key: "platform", label: "Platform" },
];

const KNOWN_CATEGORIES = new Set<string>(NOTIF_CATEGORIES.map((c) => c.key));

/** Normalise any stored category to one of the six known keys. */
export function notificationCategory(category: string | null | undefined): string {
  return category && KNOWN_CATEGORIES.has(category) ? category : "platform";
}

export interface CategoryGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Split notifications into the six ordered category groups (some may be empty). */
export function groupByCategory<T extends { category?: string | null }>(
  notifications: T[],
): CategoryGroup<T>[] {
  return NOTIF_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    items: notifications.filter((n) => notificationCategory(n.category) === c.key),
  }));
}
