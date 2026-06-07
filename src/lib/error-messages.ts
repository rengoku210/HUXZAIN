/**
 * HUXZAIN Friendly Error Messages
 *
 * Maps raw Supabase/Postgres/network error strings to user-friendly messages.
 * Use this everywhere instead of exposing raw `.message` to the UI.
 *
 * Usage:
 *   import { friendlyError } from "@/lib/error-messages";
 *   toast.error(friendlyError(err));
 */

type ErrorCategory =
  | "auth"
  | "payment"
  | "upload"
  | "network"
  | "permission"
  | "validation"
  | "generic";

const ERROR_MAP: Array<{
  patterns: RegExp[];
  message: string;
  category: ErrorCategory;
}> = [
  // ─── Auth errors ──────────────────────────────────────────────────────────
  {
    patterns: [/invalid login credentials/i, /invalid email or password/i],
    message: "Incorrect email or password. Please try again.",
    category: "auth",
  },
  {
    patterns: [/user not found/i, /user does not exist/i],
    message: "No account found with that email. Please sign up first.",
    category: "auth",
  },
  {
    patterns: [/email not confirmed/i, /email confirmation required/i],
    message: "Please verify your email before signing in.",
    category: "auth",
  },
  {
    patterns: [/already registered/i, /user already exists/i, /already exists/i],
    message: "An account with this email already exists. Try signing in instead.",
    category: "auth",
  },
  {
    patterns: [/otp expired/i, /verification code has expired/i, /token is expired/i],
    message: "Verification code expired. Please request a new one.",
    category: "auth",
  },
  {
    patterns: [/incorrect verification code/i, /invalid token/i, /otp.*invalid/i],
    message: "That code is incorrect. Please check your email and try again.",
    category: "auth",
  },
  {
    patterns: [/too many.*attempt/i, /rate limit/i, /too many requests/i],
    message: "Too many attempts. Please wait a moment before trying again.",
    category: "auth",
  },
  {
    patterns: [/session.*expired/i, /jwt expired/i, /not authenticated/i],
    message: "Your session has expired. Please sign in again.",
    category: "auth",
  },
  {
    patterns: [/wait 60 seconds/i, /please wait/i],
    message: "Please wait 60 seconds before requesting a new code.",
    category: "auth",
  },

  // ─── Permission errors ────────────────────────────────────────────────────
  {
    patterns: [/permission denied/i, /row-level security/i, /rls/i, /not authorized/i, /forbidden/i, /unauthorized/i],
    message: "You don't have permission to perform this action.",
    category: "permission",
  },
  {
    patterns: [/policy.*violated/i, /violates.*policy/i],
    message: "This action is restricted by platform security policy.",
    category: "permission",
  },

  // ─── Validation / DB constraint errors ───────────────────────────────────
  {
    patterns: [/duplicate key/i, /unique constraint/i, /unique violation/i],
    message: "This item already exists. Duplicate entries are not allowed.",
    category: "validation",
  },
  {
    patterns: [/foreign key/i, /violates foreign key constraint/i],
    message: "This action references something that no longer exists.",
    category: "validation",
  },
  {
    patterns: [/null value.*not.*null/i, /not-null constraint/i],
    message: "Some required fields are missing. Please fill in all details.",
    category: "validation",
  },
  {
    patterns: [/invalid input.*uuid/i, /invalid uuid/i, /invalid syntax.*uuid/i],
    message: "Invalid reference ID. Please refresh and try again.",
    category: "validation",
  },
  {
    patterns: [/value too long/i, /character varying.*length/i],
    message: "One of the fields exceeds the maximum length allowed.",
    category: "validation",
  },

  // ─── Upload / Storage errors ──────────────────────────────────────────────
  {
    patterns: [/file.*too large/i, /payload too large/i, /413/i, /object too large/i],
    message: "File is too large. Maximum allowed size is 5MB.",
    category: "upload",
  },
  {
    patterns: [/invalid.*file type/i, /unsupported.*format/i, /mime type/i],
    message: "Invalid file type. Please upload a JPG, PNG, or PDF file.",
    category: "upload",
  },
  {
    patterns: [/storage.*error/i, /upload.*failed/i, /bucket.*not found/i],
    message: "File upload failed. Please check your connection and try again.",
    category: "upload",
  },

  // ─── Payment errors ───────────────────────────────────────────────────────
  {
    patterns: [/payment.*failed/i, /transaction.*failed/i, /charge.*fail/i],
    message: "Payment processing failed. Please try again or contact support.",
    category: "payment",
  },
  {
    patterns: [/insufficient.*balance/i, /not enough.*funds/i, /wallet.*insufficient/i],
    message: "Insufficient wallet balance for this transaction.",
    category: "payment",
  },

  // ─── Network errors ───────────────────────────────────────────────────────
  {
    patterns: [/network.*error/i, /fetch.*failed/i, /failed to fetch/i, /connection.*refused/i, /ECONNREFUSED/i],
    message: "Network error. Please check your internet connection and try again.",
    category: "network",
  },
  {
    patterns: [/timeout/i, /request.*timed out/i, /ETIMEDOUT/i],
    message: "Request timed out. Please try again.",
    category: "network",
  },
  {
    patterns: [/service.*unavailable/i, /503/i, /502/i],
    message: "Service is temporarily unavailable. Please try again in a moment.",
    category: "network",
  },
];

/**
 * Maps a raw error (Error object, string, or unknown) to a user-friendly message.
 * Falls back to a generic message if no pattern matches.
 *
 * @param err - The caught error
 * @param fallback - Optional custom fallback message
 */
export function friendlyError(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : String(err ?? "");

  for (const { patterns, message } of ERROR_MAP) {
    if (patterns.some((p) => p.test(raw))) {
      return message;
    }
  }

  // If the raw message is short and doesn't contain DB internals, show it
  if (raw.length > 0 && raw.length < 120 && !containsInternals(raw)) {
    return raw;
  }

  return fallback;
}

/**
 * Detects if a raw error string contains internal Supabase/Postgres details
 * that should NOT be shown to end users.
 */
function containsInternals(msg: string): boolean {
  const internalPatterns = [
    /pgsql/i,
    /ERROR:\s+\d{5}/,
    /HINT:/i,
    /DETAIL:/i,
    /CONTEXT:/i,
    /\bpg_\w+/,
    /\boid\b/i,
    /supabase\.com/i,
    /supabase-anon/i,
    /service_role/i,
    /storage\.objects/i,
    /public\.\w+/,
    /\bSQL\b/,
  ];
  return internalPatterns.some((p) => p.test(msg));
}
