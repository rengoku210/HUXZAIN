/**
 * HUXZAIN Security Utilities
 * Shared sanitization and validation helpers used across the platform.
 */

/**
 * Validates that a string is a well-formed hex color (#RRGGBB or #RGB).
 * Returns the input if valid, or the fallback if not.
 * Prevents CSS injection via dangerouslySetInnerHTML style blocks.
 */
export function sanitizeHexColor(
  input: string | null | undefined,
  fallback = "#d4b46a"
): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  // Only allow strict 3 or 6 character hex colors
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback;
}

/**
 * Strips HTML tags from a string for safe text display.
 * Use when displaying user-provided content in non-markdown contexts.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validates a UUID v4 string.
 * Use before passing user-supplied IDs to database queries to
 * prevent malformed query errors and SQL injection attempts.
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}

/**
 * Sanitizes a URL to only allow http/https schemes.
 * Prevents javascript: protocol injection in href or src attributes.
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input) return "";
  try {
    const url = new URL(input);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return input;
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Rate-limit check: returns true if the given timestamp is within
 * the specified cooldown seconds from now.
 */
export function isWithinCooldown(
  lastActionAt: string | null | undefined,
  cooldownSeconds: number
): boolean {
  if (!lastActionAt) return false;
  return Date.now() - new Date(lastActionAt).getTime() < cooldownSeconds * 1000;
}
