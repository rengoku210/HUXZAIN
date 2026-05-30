import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase-client";
import { isSupabaseConfigured, env } from "@/lib/env";
import { type Role, hasAnyRole, hasPermission, type Permission } from "@/lib/roles";

export type Profile = {
  id: string;
  email?: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  country?: string | null;
  email_visibility?: string | null;
  is_seller: boolean;
  is_verified: boolean;
  email_verified?: boolean | null;
  phone_verified?: boolean | null;
  seller_approved?: boolean;
  subscription_tier?: string | null;
  subscription_expires_at?: string | null;
  updated_at?: string | null;
};

type AuthState = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: Role[];
  isAuthenticated: boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  can: (p: Permission) => boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    intent?: string,
  ) => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserMeta: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  becomeSeller: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

function uniqueRoles(rows: { role: Role }[] | null | undefined): Role[] {
  const out = new Set<Role>();
  for (const row of rows ?? []) out.add(row.role);
  out.add("buyer");
  return [...out];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const loadUserMeta = useCallback(
    async (userId: string, fallbackUser?: User | null) => {
      if (!supabase) return;

      // Validate userId as a valid UUID to prevent database 400 Bad Request (invalid input syntax for type uuid)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (!isUuid) {
        console.warn("[AuthContext] loadUserMeta called with invalid UUID:", userId);
        setReady(true);
        return;
      }

      // 1. Fetch existing profile and roles first
      // We use try-catch and specific checks to ensure null safety
      let p, r;
      try {
        const [resP, resR] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);
        p = resP.data;
        r = resR.data;
        
        if (resP.error) console.warn("Profile load error:", resP.error.message);
        if (resR.error) console.warn("Role load error:", resR.error.message);
      } catch (err) {
        console.error("Critical error loading user meta:", err);
      }

      const email = fallbackUser?.email ?? null;
      let finalProfile = p;

      // 2. Only insert if profile does not exist
      if (!p) {
        console.log(`[Auth] Creating missing profile for ${userId}...`);
        const displayName =
          (fallbackUser?.user_metadata?.display_name as string | undefined) ??
          email?.split("@")[0] ??
          "User";

        // Safely generate a unique-ish username
        const baseUsername = email?.split("@")[0]?.toLowerCase()?.replace(/[^a-z0-9_]/g, "") || "user";
        const generatedUsername = `${baseUsername}_${Math.random().toString(36).substring(2, 7)}`;

        try {
          // We omit 'email' column because it does not exist in the public.profiles table schema
          const { data: newProfile, error: insErr } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              display_name: displayName,
              username: generatedUsername,
              is_seller: true, // Mark as seller by default when recovering
            })
            .select()
            .maybeSingle();

          if (insErr) {
            console.error("Failed to create initial profile in DB:", insErr.message);
            // Memory fallback to prevent listing creation crashes
            finalProfile = {
              id: userId,
              display_name: displayName,
              username: generatedUsername,
              is_seller: true,
              is_verified: false,
              seller_approved: true,
              avatar_url: null,
            } as any;
          } else if (newProfile) {
            finalProfile = newProfile;
          }
        } catch (e: any) {
          console.error("Exception creating profile:", e.message);
          // Memory fallback
          finalProfile = {
            id: userId,
            display_name: displayName,
            username: generatedUsername,
            is_seller: true,
            is_verified: false,
            seller_approved: true,
            avatar_url: null,
          } as any;
        }
      }

      // 3. Ensure roles exist in DB
      const dbRoles = uniqueRoles((r ?? []) as { role: Role }[]);
      
      try {
        // Always ensure "buyer" role for every user
        if (!dbRoles.includes("buyer")) {
          console.log(`[Auth] Adding missing buyer role for ${userId}...`);
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "buyer" as Role })
            .maybeSingle();
          dbRoles.push("buyer");
        }

        // If the profile did not exist previously (!p), also ensure they get the "seller" role automatically
        if (!p || !dbRoles.includes("seller")) {
          console.log(`[Auth] Ensuring seller role for ${userId}...`);
          const { error: syncErr } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "seller" as Role });
          
          if (!syncErr) {
            if (!dbRoles.includes("seller")) dbRoles.push("seller");
          } else {
            console.warn("[Auth] Seller role auto-grant failed:", syncErr.message);
          }
        }

        // Sync seller intent from metadata if they don't have the role yet
        const intent = fallbackUser?.user_metadata?.intent;
        if (intent === "seller" && !dbRoles.includes("seller")) {
          console.log(`[Auth] Syncing seller intent from metadata for ${userId}...`);
          const { error: syncErr } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "seller" as Role });
          
          if (!syncErr) {
            if (!dbRoles.includes("seller")) dbRoles.push("seller");
          } else {
            console.warn("[Auth] Seller intent sync failed:", syncErr.message);
          }
        }
      } catch (err) {
        console.warn("[Auth] Role sync exception:", err);
      }

      const hasSeller = dbRoles.includes("seller");

      try {
        // 4. Sync profile.is_seller flag if it doesn't match the user_roles state
        if (finalProfile && Boolean((finalProfile as Profile).is_seller) !== hasSeller) {
          console.log(`[Auth] Syncing is_seller flag in DB for ${userId}...`);
          const { data: syncedProfile, error: profileSyncErr } = await supabase
            .from("profiles")
            .update({ is_seller: hasSeller })
            .eq("id", userId)
            .select()
            .maybeSingle();
          
          if (profileSyncErr) console.warn("[Auth] Profile sync failed:", profileSyncErr.message);
          else if (syncedProfile) {
            finalProfile = syncedProfile;
          }
        }
      } catch (err) {
        console.warn("[Auth] Profile sync exception:", err);
      }

      // Check for subscription plan/coupon expiration
      try {
        if (
          finalProfile && 
          finalProfile.subscription_tier && 
          finalProfile.subscription_tier !== "standard" && 
          finalProfile.subscription_expires_at && 
          new Date().getTime() > new Date(finalProfile.subscription_expires_at).getTime()
        ) {
          console.log("[Auth] Subscription/Coupon expired! Reverting user to standard plan...");
          const { data: revertedProfile, error: revertErr } = await supabase
            .from("profiles")
            .update({
              subscription_tier: "standard",
              subscription_expires_at: null,
              updated_at: new Date().toISOString()
            })
            .eq("id", userId)
            .select()
            .maybeSingle();
          if (revertErr) {
            console.error("[Auth] Revert error:", revertErr);
          } else if (revertedProfile) {
            finalProfile = revertedProfile;
            
            // Notify user
            try {
              await supabase.from("notifications").insert({
                user_id: userId,
                kind: "subscription.expired",
                title: "Subscription Plan Expired",
                body: "Your premium Pro/Elite/Enterprise trial or plan has expired. Your store customization has been reverted to the Standard plan."
              });
            } catch (e) { console.error("Notification trigger error:", e); }
          }
        }
      } catch (err) {
        console.warn("[Auth] Expiration check exception:", err);
      }

      console.log(`[Auth] User meta loaded for ${userId}. Roles: ${dbRoles.join(", ")}`);
      setProfile(
        finalProfile ? ({ ...(finalProfile as Profile), email, is_seller: hasSeller } as Profile) : null,
      );
      setRoles(dbRoles);
    },
    [supabase],
  );

  const refreshUserMeta = useCallback(async () => {
    if (session?.user) {
      console.log("[AuthContext] Refreshing user meta...");
      await loadUserMeta(session.user.id, session.user);
    }
  }, [session, loadUserMeta]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadUserMeta(s.user.id, s.user), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    // Fallback: if Supabase takes too long to wake up (e.g. paused project), force ready state
    const timeoutId = setTimeout(() => {
      if (mounted) setReady(true);
    }, 4000);

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("[AuthContext] getSession error:", error);
      setSession(data?.session ?? null);
      if (data?.session?.user) loadUserMeta(data.session.user.id, data.session.user);
      setReady(true);
    }).catch(err => {
      console.error("[AuthContext] getSession exception:", err);
      if (mounted) setReady(true);
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadUserMeta]);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    return {
      ready,
      configured,
      user,
      session,
      profile,
      roles,
      isAuthenticated: !!user,
      hasRole: (r) => roles.includes(r),
      hasAnyRole: (rs) => hasAnyRole(roles, rs),
      can: (p) => hasPermission(roles, p),
      async signInWithPassword(email, password) {
        if (!supabase)
          throw new Error("Auth not configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await loadUserMeta(data.user.id, data.user);
      },
      async signInWithOtp(email) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirect = `${env.siteUrl}/auth/callback`;
        console.log(`[Auth] Attempting to send magic link to: ${email} (Redirect: ${redirect})`);
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirect },
        });
        console.log('[Auth] signInWithOtp response data:', data);
        console.log('[Auth] signInWithOtp response error:', error);
        if (error) {
          console.error('[Auth] Magic link error:', error.message);
          throw error;
        }
        console.log('[Auth] Magic link sent successfully.');
      },
      async signUp(email, password, displayName, intent) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirect = `${env.siteUrl}/auth/verified`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirect,
            data: { 
              display_name: displayName ?? null,
              intent: intent ?? null
            },
          },
        });
        if (error) throw error;
        if (data.user) await loadUserMeta(data.user.id, data.user);
      },
      async signInWithOAuth(provider) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirectTo = `${env.siteUrl}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (error) throw error;
      },
      async sendPasswordReset(email) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirectTo = `${env.siteUrl}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!supabase) throw new Error("Auth not configured.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      async resendVerification(email) {
        if (!supabase) throw new Error("Auth not configured.");
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error) throw error;
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
      refreshUserMeta,
      async updateProfile(updates) {
        if (!supabase || !session?.user) throw new Error("Not authenticated");
        
        const { data, error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", session.user.id)
          .select()
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setProfile((prev) => (prev ? { ...prev, ...data } : (data as Profile)));
        }
      },
      async becomeSeller() {
        if (!supabase || !session?.user) throw new Error("Not authenticated");
        
        console.log("[AuthContext] Attempting to grant seller role...");
        // 1. Add role
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: session.user.id, role: "seller" as Role });
        
        // Postgres code 23505 is unique violation (already has role)
        if (roleErr && roleErr.code !== "23505") {
          throw roleErr;
        }

        // 2. Explicitly update profile flag for immediate consistency
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ is_seller: true })
          .eq("id", session.user.id);
        
        if (profileErr) console.warn("[AuthContext] Profile flag update failed:", profileErr.message);

        // 3. Update local state immediately
        setRoles((prev) => prev.includes("seller") ? prev : [...prev, "seller"]);
        setProfile((prev) => prev ? { ...prev, is_seller: true } : prev);
        
        console.log("[AuthContext] Seller role activated.");
      },
    };
  }, [ready, configured, session, profile, roles, supabase, refreshUserMeta]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
