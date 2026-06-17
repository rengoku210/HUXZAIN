import { getSupabase } from "../supabase-client";

// Buckets that are private and must be accessed via short-lived signed URLs.
export type PrivateBucket = "dispute-evidence" | "chat-attachments" | "report-screenshots";

const DEFAULT_EXPIRY = 60 * 60; // 1 hour

/**
 * Extract the in-bucket object path from a stored value. Accepts either a raw
 * path ("evidence/123_file.png") or a legacy Supabase public URL
 * (".../object/public/<bucket>/evidence/123_file.png").
 */
export function extractObjectPath(stored: string, bucket: PrivateBucket): string {
  if (!stored) return stored;
  const marker = `/${bucket}/`;
  const idx = stored.indexOf(marker);
  if (idx !== -1) return stored.slice(idx + marker.length);
  return stored; // already a raw path
}

/** Resolve a stored value (raw path or legacy public URL) to a fresh signed URL. */
export async function resolveSignedUrl(
  stored: string | null | undefined,
  bucket: PrivateBucket,
  expiresIn = DEFAULT_EXPIRY
): Promise<string> {
  if (!stored) return "";
  const supabase = getSupabase();
  if (!supabase) return "";
  const path = extractObjectPath(stored, bucket);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.error(`[signedUrls] Failed to sign ${bucket}/${path}:`, error.message);
    return "";
  }
  return data?.signedUrl ?? "";
}

/** Resolve a list of stored values to signed URLs (preserving order). */
export async function resolveSignedUrls(
  stored: (string | null | undefined)[] | null | undefined,
  bucket: PrivateBucket,
  expiresIn = DEFAULT_EXPIRY
): Promise<string[]> {
  if (!stored || stored.length === 0) return [];
  return Promise.all(stored.map((s) => resolveSignedUrl(s, bucket, expiresIn)));
}
