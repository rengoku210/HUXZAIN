/**
 * Centralized, ENV-driven configuration for HUXZAIN.
 * Reads only VITE_* vars in the browser. Server-only secrets
 * live in process.env and are read inside server functions.
 */

const v = (typeof import.meta !== "undefined" ? import.meta.env : {}) as Record<string, string | undefined>;

export const env = {
  supabase: {
    url: v.VITE_SUPABASE_URL ?? "",
    anonKey: v.VITE_SUPABASE_ANON_KEY ?? "",
    projectId: v.VITE_SUPABASE_PROJECT_ID ?? "",
  },
  wordpress: {
    apiBase: v.VITE_WORDPRESS_API_BASE ?? "",
  },
  razorpay: {
    keyId: v.VITE_RAZORPAY_KEY_ID ?? "",
  },
  cloudinary: {
    // existing cloudinary config
    cloudName: v.VITE_CLOUDINARY_CLOUD_NAME ?? "",
    uploadPreset: v.VITE_CLOUDINARY_UPLOAD_PRESET ?? "",
  },
  // Resend SMTP configuration
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    fromEmail: process.env.RESEND_FROM_EMAIL ?? '',
    testRecipient: process.env.RESEND_TO_EMAIL ?? '',
  },
} as const;

export const isSupabaseConfigured = () =>
  Boolean(env.supabase.url && env.supabase.anonKey);

export const isWordPressConfigured = () => Boolean(env.wordpress.apiBase);
export const isRazorpayConfigured = () => Boolean(env.razorpay.keyId);
