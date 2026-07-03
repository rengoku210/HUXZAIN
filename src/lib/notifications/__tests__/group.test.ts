import { describe, it, expect } from "vitest";
import { groupByCategory, notificationCategory, NOTIF_CATEGORIES } from "../group";

describe("notificationCategory", () => {
  it("keeps a known category", () => {
    expect(notificationCategory("orders")).toBe("orders");
    expect(notificationCategory("security")).toBe("security");
  });
  it("falls back to platform for unknown/null/empty", () => {
    expect(notificationCategory(null)).toBe("platform");
    expect(notificationCategory(undefined)).toBe("platform");
    expect(notificationCategory("")).toBe("platform");
    expect(notificationCategory("payments")).toBe("platform"); // legacy/unknown key
  });
});

describe("groupByCategory", () => {
  const rows = [
    { id: "1", category: "orders" },
    { id: "2", category: "orders" },
    { id: "3", category: "finance" },
    { id: "4", category: "security" },
    { id: "5", category: null }, // legacy -> platform
    { id: "6", category: "weird" }, // unknown -> platform
  ];

  it("returns all six categories in spec order", () => {
    const groups = groupByCategory(rows);
    expect(groups.map((g) => g.key)).toEqual([
      "orders",
      "listings",
      "finance",
      "membership",
      "security",
      "platform",
    ]);
    expect(NOTIF_CATEGORIES).toHaveLength(6);
  });

  it("places each notification in exactly one group", () => {
    const groups = groupByCategory(rows);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(rows.length);
  });

  it("buckets correctly, routing unknown/null to Platform", () => {
    const groups = groupByCategory(rows);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.items.map((i) => i.id)]));
    expect(byKey.orders).toEqual(["1", "2"]);
    expect(byKey.finance).toEqual(["3"]);
    expect(byKey.security).toEqual(["4"]);
    expect(byKey.platform).toEqual(["5", "6"]);
    expect(byKey.listings).toEqual([]);
    expect(byKey.membership).toEqual([]);
  });
});
