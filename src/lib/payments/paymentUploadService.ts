// src/lib/payments/paymentUploadService.ts
//
// IMPORTANT: This module runs in the browser (client-side).
// All processing uses Web APIs only — no Node.js modules.
import { getSupabase } from "../supabase-client";
import { v4 as uuidv4 } from "uuid";

export interface UploadResult {
  signedUrl: string;
  hash: string;
  duplicate: boolean;
}

/**
 * Resize an image File to 256×256 in the browser using OffscreenCanvas,
 * then return the resulting pixel data as a Uint8ClampedArray.
 * Falls back to the raw arrayBuffer on environments without OffscreenCanvas.
 */
async function resizeImageBrowser(file: File): Promise<ArrayBuffer> {
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: 256, resizeHeight: 256, resizeQuality: "medium" });
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, 256, 256);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return blob.arrayBuffer();
  } catch {
    // Fallback — hash the raw file bytes
    return file.arrayBuffer();
  }
}

/**
 * Upload a payment proof image to Supabase Storage.
 * Generates a SHA-256 perceptual hash via the Web Crypto API,
 * deduplicates against screenshot_hashes, then returns a signed URL.
 *
 * Includes exponential back-off retry (max 3 attempts).
 */
export async function uploadPaymentProof(params: {
  file: File;
  userId: string;
  orderId: string;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not configured");

  const { file, userId, orderId, signal } = params;
  const fileExt = file.name.split(".").pop() ?? "png";
  const timestamp = Date.now();
  const path = `${userId}/${orderId}/${timestamp}_${uuidv4()}.${fileExt}`;

  // Resize & hash using browser-native APIs (no Node.js required)
  const resizedBuffer = await resizeImageBrowser(file);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", resizedBuffer);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Check for duplicate hash
  const { data: dupData } = await supabase
    .from("screenshot_hashes")
    .select("id")
    .eq("hash", hash)
    .maybeSingle();

  const duplicate = !!dupData;

  // Record hash (upsert — ignore conflict)
  await supabase.from("screenshot_hashes").upsert(
    { user_id: userId, order_id: orderId, hash, path },
    { onConflict: ["hash"] }
  );

  // Upload with exponential back-off retry
  const maxRetries = 3;
  let attempt = 0;
  let uploadError: unknown = null;

  while (attempt < maxRetries) {
    try {
      if (signal?.aborted) {
        throw new DOMException("Upload aborted", "AbortError");
      }
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      uploadError = null;
      break;
    } catch (e) {
      uploadError = e;
      attempt++;
      const backoff = Math.pow(2, attempt) * 200;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  if (uploadError) {
    throw new Error(`Upload failed after ${maxRetries} attempts: ${uploadError}`);
  }

  // Generate signed URL (1-hour expiry)
  const { data: signedData, error: signedErr } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 60);
  if (signedErr) throw signedErr;

  return {
    signedUrl: signedData?.signedUrl ?? "",
    hash,
    duplicate,
  };
}
