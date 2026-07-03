/**
 * HX-004 — Email render engine (PURE).
 *
 * renderEmailTemplate(eventKey, context) -> { subject, html, text }
 *
 * - fetches the static template by event_key (falls back to GENERIC),
 * - merges context with {{variable}} / {variable} interpolation,
 * - sanitizes undefined/missing variables to "" (greeting names -> "there"),
 * - injects the deep link from context.link as an absolute action URL,
 * - wraps the body in the HUXZAIN branding shell.
 *
 * No DB access, no side effects, never throws on missing variables.
 */

import { BRAND, wrapHtml, wrapText } from "./branding";
import { EMAIL_TEMPLATES, GENERIC_TEMPLATE, type EmailTemplate } from "./templates";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Friendly defaults so a missing variable never produces awkward copy. */
const VARIABLE_DEFAULTS: Record<string, string> = {
  userName: "there",
};

/** Replace {key} and {{key}} from context; missing -> default or "". Never throws. */
function interpolate(template: string, context: Record<string, unknown>): string {
  if (!template) return "";
  return template.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (_match, key: string) => {
    const value = context[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
    return VARIABLE_DEFAULTS[key] ?? "";
  });
}

export function renderEmailTemplate(
  eventKey: string,
  context: Record<string, unknown> = {},
): RenderedEmail {
  const template: EmailTemplate = EMAIL_TEMPLATES[eventKey] ?? GENERIC_TEMPLATE;
  const isGeneric = !(eventKey in EMAIL_TEMPLATES);

  // Safety net: the generic fallback relies on context.body. If a caller fires an
  // email-channel event with no body, substitute a meaningful default so we never
  // ship an empty paragraph.
  let renderContext = context;
  if (isGeneric && !(typeof context.body === "string" && context.body.trim() !== "")) {
    renderContext = { ...context, body: `You have a new update on your ${BRAND.name} account.` };
  }

  const subject =
    interpolate(template.subject, renderContext).trim() || `Update from ${BRAND.name}`;
  const bodyHtml = interpolate(template.html, renderContext);
  const bodyText = interpolate(template.text, renderContext);

  // Deep-link injection (HX-001 link field -> absolute action URL).
  const path =
    typeof context.link === "string"
      ? context.link
      : typeof context.actionPath === "string"
        ? context.actionPath
        : undefined;
  const actionUrl = path ? `${BRAND.siteUrl}${path}` : undefined;
  const actionLabel =
    typeof context.actionLabel === "string" ? context.actionLabel : template.actionLabel;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml, actionUrl, actionLabel),
    text: wrapText(subject, bodyText, actionUrl),
  };
}
