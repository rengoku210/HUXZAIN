/**
 * HX-004 — Email branding layer (PURE).
 *
 * Wraps a template's inner body (already interpolated) in the consistent HUXZAIN
 * shell: header, title, body, optional action button, support + footer/disclaimer.
 * No DB, no side effects, no business logic — string in, string out.
 */

export const BRAND = {
  name: "HUXZAIN",
  tagline: "India's Modern Digital Marketplace",
  supportEmail: "support@huxzain.shop",
  // Base URL for absolute links. Reading a build-time constant is allowed (no DB);
  // tests get the fallback deterministically.
  get siteUrl(): string {
    return (
      process.env.VITE_SITE_URL ||
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SITE_URL ||
      "https://huxzain.shop"
    );
  },
} as const;

/** Full branded HTML email. `bodyHtml` is already interpolated inner content. */
export function wrapHtml(
  title: string,
  bodyHtml: string,
  actionUrl?: string,
  actionLabel = "View Details",
): string {
  const button = actionUrl
    ? `<div style="margin:28px 0;text-align:center;">
         <a href="${actionUrl}" style="display:inline-block;padding:12px 26px;background:#D4AF37;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">${actionLabel}</a>
       </div>`
    : "";

  return `
  <div style="background:#0A0A0C;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;border:1px solid #1A1A22;border-radius:16px;">
    <div style="text-align:center;margin-bottom:30px;border-bottom:1px solid #1A1A22;padding-bottom:20px;">
      <h1 style="color:#D4AF37;font-size:28px;font-weight:800;letter-spacing:2px;margin:0;text-transform:uppercase;">${BRAND.name}</h1>
      <p style="color:#8F8F9A;font-size:11px;margin:5px 0 0 0;text-transform:uppercase;letter-spacing:1.5px;">${BRAND.tagline}</p>
    </div>
    <div style="padding:10px;">
      <h2 style="color:#FFFFFF;font-size:18px;font-weight:700;margin-top:0;margin-bottom:20px;border-left:3px solid #D4AF37;padding-left:12px;">${title}</h2>
      <div style="color:#C0C0C6;font-size:14px;line-height:1.6;">${bodyHtml}</div>
      ${button}
    </div>
    <div style="text-align:center;border-top:1px solid #1A1A22;padding-top:25px;margin-top:30px;color:#60606A;font-size:11px;line-height:1.5;">
      <p style="margin:0 0 8px 0;">Need help? Contact us at <a href="mailto:${BRAND.supportEmail}" style="color:#D4AF37;text-decoration:none;">${BRAND.supportEmail}</a>.</p>
      <p style="margin:0 0 8px 0;">You received this email because you are a registered user of ${BRAND.name}.</p>
      <p style="margin:0;">© 2026 ${BRAND.name}. All rights reserved.</p>
    </div>
  </div>`;
}

/** Plain-text fallback. `bodyText` is already interpolated inner content. */
export function wrapText(title: string, bodyText: string, actionUrl?: string): string {
  const lines = [BRAND.name.toUpperCase(), BRAND.tagline, "", title, "", bodyText];
  if (actionUrl) {
    lines.push("", actionUrl);
  }
  lines.push(
    "",
    "----",
    `Need help? Contact ${BRAND.supportEmail}`,
    `© 2026 ${BRAND.name}. All rights reserved.`,
  );
  return lines.join("\n");
}
