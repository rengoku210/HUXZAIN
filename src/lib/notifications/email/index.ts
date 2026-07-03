/**
 * HX-004 — Email communication layer barrel.
 *
 * Pure rendering only. This module does NOT send email and does NOT trigger
 * notifications — per the HX-004 safety rules, only the HX-003 dispatcher
 * triggers emails. Wiring the dispatcher to use renderEmailTemplate() is a
 * later step and intentionally not done here.
 */

export { renderEmailTemplate, type RenderedEmail } from "./render";
export { EMAIL_TEMPLATES, GENERIC_TEMPLATE, type EmailTemplate } from "./templates";
export { BRAND } from "./branding";
