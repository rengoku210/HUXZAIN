import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "../render";
import { EMAIL_TEMPLATES } from "../templates";
import { BRAND } from "../branding";

// Resolve the configured site base URL so link assertions are env-independent.
const SITE = BRAND.siteUrl;

/** Realistic-ish context covering every variable our templates reference. */
const FULL_CONTEXT = {
  userName: "Asha",
  orderId: "HX-ORD-1001",
  listingId: "HX-LST-22",
  listingTitle: "Valorant Radiant Account",
  disputeId: "HX-DSP-7",
  withdrawalId: "HX-WD-9",
  plan: "Pro",
  amount: "4,919",
  reason: "Missing information",
  date: "2026-07-15",
  link: "/orders/HX-ORD-1001",
};

const KEYS = Object.keys(EMAIL_TEMPLATES);

function assertClean(out: { subject: string; html: string; text: string }) {
  for (const part of [out.subject, out.html, out.text]) {
    expect(part.length).toBeGreaterThan(0);
    expect(part).not.toContain("{{"); // no unreplaced tokens
    expect(part).not.toContain("}}");
    expect(part).not.toContain("undefined");
    expect(part).not.toContain("null");
  }
}

describe("renderEmailTemplate — all template keys", () => {
  it("has at least the 13 brief-mandated templates", () => {
    expect(KEYS.length).toBeGreaterThanOrEqual(13);
  });

  for (const key of KEYS) {
    it(`renders "${key}" with full context`, () => {
      const out = renderEmailTemplate(key, FULL_CONTEXT);
      assertClean(out);
      // branding present
      expect(out.html).toContain("HUXZAIN");
      expect(out.html).toContain("support@huxzain.shop");
      // link injected as absolute action URL
      expect(out.html).toContain(`${SITE}/orders/HX-ORD-1001`);
    });
  }
});

describe("missing-variable safety", () => {
  for (const key of KEYS) {
    it(`renders "${key}" with EMPTY context without crashing or leaking tokens`, () => {
      const out = renderEmailTemplate(key, {});
      assertClean(out);
      // greeting default applied
      expect(out.text).toContain("Hi there");
    });
  }
});

describe("unknown event_key falls back to generic", () => {
  it("does not crash and produces branded content", () => {
    const out = renderEmailTemplate("some.unknown.event", {
      title: "Heads up",
      body: "Something happened.",
    });
    assertClean(out);
    expect(out.subject).toBe("Heads up");
    expect(out.html).toContain("Something happened.");
  });

  it("generic with no title/body still produces a safe non-empty email", () => {
    const out = renderEmailTemplate("another.unknown", {});
    expect(out.subject).toBe("Update from HUXZAIN");
    expect(out.html).toContain("new update on your HUXZAIN account");
    expect(out.html).not.toContain("undefined");
  });
});

describe("link injection", () => {
  it("omits the action button when no link is provided", () => {
    const out = renderEmailTemplate("order.placed", { userName: "Sam", orderId: "X1" });
    expect(out.html).not.toContain(`href="${SITE}/`);
  });
  it("injects an absolute URL when link is provided", () => {
    const out = renderEmailTemplate("order.placed", { link: "/checkout/payment" });
    expect(out.html).toContain(`${SITE}/checkout/payment`);
  });
});
