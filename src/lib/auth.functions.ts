"use server";

import { createServerFn } from "@tanstack/react-start";
import { getAdminClient } from "@/server/supabase-admin";
import { isDisposableEmail, DISPOSABLE_EMAIL_MESSAGE } from "@/lib/security/disposable-email";
import crypto from "crypto";

// Memory fallback cache for environments without the pg table migration active yet
interface OtpRecord {
  otp_hash: string;
  expires_at: string;
  attempts: number;
  created_at: string;
}
const memoryOtpCache = new Map<string, OtpRecord>();

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function sendOtpEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY || (import.meta as any).env?.VITE_RESEND_API_KEY || (import.meta as any).env?.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || (import.meta as any).env?.VITE_RESEND_FROM_EMAIL || "noreply@huxzain.shop";

  if (!apiKey) {
    console.warn(`[Resend Config Warning] RESEND_API_KEY not found in environment. Logging code for dev: ${code}`);
    return { success: true };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your HUXZAIN Verification Code</title>
      </head>
      <body style="background-color: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center;">
          
          <!-- Logo Section -->
          <div style="margin-bottom: 40px;">
            <h1 style="color: #D4AF37; font-size: 28px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase;">
              HUXZAIN
            </h1>
            <div style="height: 1px; width: 60px; background-color: #D4AF37; margin: 15px auto;"></div>
          </div>

          <!-- Card Section -->
          <div style="background-color: #101114; border: 1px solid rgba(212, 175, 55, 0.15); border-radius: 16px; padding: 40px 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 10px;">
              Verify Your Email
            </h2>
            <p style="color: #a0a0ab; font-size: 14px; line-height: 1.5; margin-bottom: 30px;">
              We've received a request to log in or register your account. Enter the verification code below to continue.
            </p>

            <!-- Code Box -->
            <div style="background-color: #000000; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; display: inline-block; padding: 15px 40px; margin-bottom: 30px;">
              <span style="color: #D4AF37; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px;">
                ${code}
              </span>
            </div>

            <p style="color: #71717a; font-size: 12px; margin-top: 0; margin-bottom: 0;">
              This code expires in <strong>10 minutes</strong>.
            </p>
          </div>

          <!-- Footer Section -->
          <div style="color: #52525b; font-size: 11px; line-height: 1.6;">
            <p style="margin-bottom: 10px;">
              If you did not request this code, you can safely ignore this email.
            </p>
            <p style="margin-bottom: 0;">
              &copy; 2026 HUXZAIN. All rights reserved.
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `HUXZAIN <${fromEmail}>`,
        to: [email],
        subject: "Your HUXZAIN Verification Code",
        html
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Auth] Resend API error:", errText);
      return { success: false, error: `Resend API returned error: ${errText}` };
    }

    console.log(`[Auth] Resend email successfully dispatched to ${email}`);
    return { success: true };
  } catch (err: any) {
    console.error("[Auth] Resend dispatch exception:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Server function to generate and send an OTP code to a user's email.
 */
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { email: rawEmail } = data;
    const email = rawEmail.trim().toLowerCase();

    // Security: reject disposable / temporary mailboxes at the server (the client
    // check in signup.tsx is UX only and can be bypassed). Blocks fake-account /
    // OTP-abuse vectors before an OTP is ever generated or sent.
    if (isDisposableEmail(email)) {
      throw new Error(DISPOSABLE_EMAIL_MESSAGE);
    }

    console.log(`[Auth Server] Request OTP for: ${email}`);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Log the generated OTP to the server console for dev only — NEVER in production
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n========================================\n[DEV OTP FOR ${email}]: ${code}\n========================================\n`);
    }

    const supabase = getAdminClient();
    if (!supabase) {
      // Memory fallback if Supabase is offline
      const existing = memoryOtpCache.get(email);
      if (existing) {
        const timeDiff = Date.now() - new Date(existing.created_at).getTime();
        if (timeDiff < 60 * 1000) {
          throw new Error("Please wait 60 seconds before requesting another code.");
        }
      }
      memoryOtpCache.set(email, {
        otp_hash: hash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString()
      });
    } else {
      // Database check for resend cooldown (60 seconds)
      try {
        const { data: existing, error: selectError } = await supabase
          .from("otps")
          .select("created_at")
          .eq("email", email)
          .maybeSingle();

        if (selectError) {
          console.warn("[Auth] Select query error, falling back to memory:", selectError.message);
        } else if (existing) {
          const timeDiff = Date.now() - new Date(existing.created_at).getTime();
          if (timeDiff < 60 * 1000) {
            throw new Error("Please wait 60 seconds before requesting another code.");
          }
        }

        const { error: upsertError } = await supabase
          .from("otps")
          .upsert({
            email,
            otp_hash: hash,
            expires_at: expiresAt.toISOString(),
            attempts: 0,
            created_at: new Date().toISOString()
          });

        if (upsertError) {
          console.warn("[Auth] Database upsert failed, falling back to memory:", upsertError.message);
          memoryOtpCache.set(email, {
            otp_hash: hash,
            expires_at: expiresAt.toISOString(),
            attempts: 0,
            created_at: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error("[Auth] Database operation failed:", err.message);
        // Direct memory fallback
        memoryOtpCache.set(email, {
          otp_hash: hash,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          created_at: new Date().toISOString()
        });
      }
    }

    // Send email
    const sendResult = await sendOtpEmail(email, code);
    if (!sendResult.success) {
      throw new Error(sendResult.error || "Failed to send email");
    }

    return { success: true, email };
  });

/**
 * Server function to verify the OTP code and establish a session.
 */
export const verifyOtpCode = createServerFn({ method: "POST" })
  .inputValidator((d: { 
    email: string; 
    code: string; 
    signupMetadata?: { name: string; password?: string; intent?: string };
    redirectTo?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { email: rawEmail, code, signupMetadata, redirectTo } = data;
    const email = rawEmail.trim().toLowerCase();

    console.log(`[Auth Server] Verify OTP for: ${email}`);

    const supabase = getAdminClient();
    if (!supabase) {
      throw new Error("Auth service is not configured (Admin Client missing).");
    }

    let record: OtpRecord | null = null;
    let isDb = false;

    try {
      const { data: dbRecord, error: fetchError } = await supabase
        .from("otps")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (fetchError) {
        console.warn("[Auth] DB fetch error, checking memory:", fetchError.message);
        record = memoryOtpCache.get(email) || null;
      } else if (dbRecord) {
        record = dbRecord as OtpRecord;
        isDb = true;
      } else {
        record = memoryOtpCache.get(email) || null;
      }
    } catch (err: any) {
      console.warn("[Auth] Exception during DB fetch, checking memory:", err.message);
      record = memoryOtpCache.get(email) || null;
    }

    if (!record) {
      throw new Error("Verification code expired or not found. Please request a new code.");
    }

    // Check expiration
    if (Date.now() > new Date(record.expires_at).getTime()) {
      if (isDb) {
        await supabase.from("otps").delete().eq("email", email);
      } else {
        memoryOtpCache.delete(email);
      }
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // Check attempts limit
    if (record.attempts >= 5) {
      throw new Error("Too many failed verification attempts. Please request a new code.");
    }

    // Verify hash
    const targetHash = hashOtp(code);
    if (targetHash !== record.otp_hash) {
      const nextAttempts = record.attempts + 1;
      if (isDb) {
        await supabase.from("otps").update({ attempts: nextAttempts }).eq("email", email);
      } else {
        record.attempts = nextAttempts;
      }

      if (nextAttempts >= 5) {
        if (isDb) await supabase.from("otps").delete().eq("email", email);
        else memoryOtpCache.delete(email);
        throw new Error("Too many failed verification attempts. Please request a new code.");
      }

      throw new Error(`Incorrect verification code. ${5 - nextAttempts} attempts remaining.`);
    }

    // Success! Delete OTP record
    if (isDb) {
      await supabase.from("otps").delete().eq("email", email);
    } else {
      memoryOtpCache.delete(email);
    }

    // Check if user already has a login record in Supabase Auth
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      
      if (!profile) {
        // Sign-up flow: Auto-create confirmed user
        console.log(`[Auth Server] No profile found. Auto-registering new user: ${email}`);
        
        const randomPassword = crypto.randomBytes(24).toString("hex");
        const displayName = signupMetadata?.name || email.split("@")[0];

        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: signupMetadata?.password || randomPassword,
          user_metadata: {
            display_name: displayName,
            intent: signupMetadata?.intent || "buyer"
          }
        });

        if (createError) {
          const isAlreadyExists = 
            createError.message?.toLowerCase().includes("already registered") ||
            createError.message?.toLowerCase().includes("already exists") ||
            createError.status === 422;

          if (!isAlreadyExists) {
            console.error("[Auth Server] Auto-registration failed:", createError.message);
            throw new Error(`Account creation failed: ${createError.message}`);
          }
          console.log(`[Auth Server] Existing user found via duplicate createUser conflict: ${email}`);
        } else {
          console.log(`[Auth Server] Confirmed account created for ${email}. User ID: ${createData.user.id}`);
        }
      } else {
        console.log(`[Auth Server] Existing user found via profile lookup: ${email}. Logging in...`);
      }
    } catch (err: any) {
      console.error("[Auth Server] Auth inspection/auto-create exception:", err.message);
      throw new Error(err.message || "Failed during authentication flow.");
    }

    // Generate login callback link
    const appUrl = process.env.VITE_SITE_URL || 
                   (import.meta as any).env?.VITE_SITE_URL || 
                   "http://localhost:8080";

    const finalRedirect = redirectTo || `${appUrl}/dashboard`;
    console.log(`[Auth Server] Generating login redirect to: ${finalRedirect}`);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: finalRedirect
      }
    });

    if (linkError) {
      console.error("[Auth Server] Magic link exchange failed:", linkError.message);
      throw new Error(`Session generation failed: ${linkError.message}`);
    }

    const actionLink = linkData.properties.action_link;
    return { success: true, actionLink };
  });

/**
 * Change a logged-in user's email after verifying an OTP that was sent to the
 * NEW address via `requestOtp`. This never updates the email without a verified
 * code. Kept separate from `verifyOtpCode` (which handles login/signup sessions).
 */
export const changeEmailWithOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; newEmail: string; code: string }) => d)
  .handler(async ({ data }) => {
    const { userId, code } = data;
    const email = data.newEmail.trim().toLowerCase();

    if (!userId) throw new Error("Not authenticated.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");

    const supabase = getAdminClient();
    if (!supabase) throw new Error("Auth service is not configured (Admin Client missing).");

    // 1. Verify the OTP for the new address (mirror of verifyOtpCode's checks).
    let record: OtpRecord | null = null;
    let isDb = false;
    try {
      const { data: dbRecord, error } = await supabase.from("otps").select("*").eq("email", email).maybeSingle();
      if (!error && dbRecord) { record = dbRecord as OtpRecord; isDb = true; }
      else record = memoryOtpCache.get(email) || null;
    } catch {
      record = memoryOtpCache.get(email) || null;
    }
    if (!record) throw new Error("Verification code expired or not found. Please request a new code.");

    if (Date.now() > new Date(record.expires_at).getTime()) {
      if (isDb) await supabase.from("otps").delete().eq("email", email); else memoryOtpCache.delete(email);
      throw new Error("Verification code has expired. Please request a new one.");
    }
    if (record.attempts >= 5) throw new Error("Too many failed verification attempts. Please request a new code.");

    if (hashOtp(code) !== record.otp_hash) {
      const nextAttempts = record.attempts + 1;
      if (isDb) await supabase.from("otps").update({ attempts: nextAttempts }).eq("email", email);
      else record.attempts = nextAttempts;
      if (nextAttempts >= 5) {
        if (isDb) await supabase.from("otps").delete().eq("email", email); else memoryOtpCache.delete(email);
        throw new Error("Too many failed verification attempts. Please request a new code.");
      }
      throw new Error(`Incorrect verification code. ${5 - nextAttempts} attempts remaining.`);
    }

    // 2. Code is valid — consume it.
    if (isDb) await supabase.from("otps").delete().eq("email", email); else memoryOtpCache.delete(email);

    // 3. Reject if the address already belongs to a different account.
    const { data: clash } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (clash && clash.id !== userId) throw new Error("That email is already in use by another account.");

    // 4. Update the auth email (confirmed) and the profile record.
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (authErr) throw new Error(`Failed to update email: ${authErr.message}`);

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ email, email_verified: true, email_verified_at: new Date().toISOString() })
      .eq("id", userId);
    if (profErr) console.warn("[Auth] Email updated in auth but profile sync failed:", profErr.message);

    return { success: true, email };
  });
