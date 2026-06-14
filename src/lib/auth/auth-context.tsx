import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase-client";
import { isSupabaseConfigured, env } from "@/lib/env";
import { type Role, hasAnyRole, hasPermission, type Permission } from "@/lib/roles";

export type Profile = {
  id: string;
  email?: string | null;
  phone?: string | null;
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
  phone_verified_at?: string | null;
  seller_approved?: boolean;
  subscription_tier?: string | null;
  subscription_expires_at?: string | null;
  rating_avg?: number;
  rating_count?: number;
  updated_at?: string | null;
  role?: string | null;
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
  verifyOtp: (email: string, token: string, type: 'email' | 'signup' | 'recovery') => Promise<void>;
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
  simulateUser: (targetUserId: string | null) => Promise<void>;
  isSimulated: boolean;
};

const AuthCtx = createContext<AuthState | null>(null);

function uniqueRoles(rows: { role: Role }[] | null | undefined): Role[] {
  const out = new Set<Role>();
  for (const row of rows ?? []) out.add(row.role);
  out.add("buyer");
  return [...out];
}

async function logLogin(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    let browserName = "Unknown";
    if (userAgent.includes("Firefox")) browserName = "Firefox";
    else if (userAgent.includes("Chrome")) browserName = "Chrome";
    else if (userAgent.includes("Safari")) browserName = "Safari";
    else if (userAgent.includes("Edge")) browserName = "Edge";

    let ip = "Client Session";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const ipJson = await res.json();
      if (ipJson && ipJson.ip) {
        ip = ipJson.ip;
      }
    } catch (ipErr) {
      // ignore
    }

    await supabase.from("login_logs").insert({
      user_id: userId,
      device: isMobile ? "Mobile" : "Desktop",
      browser: browserName,
      ip_address: ip,
    });
    console.log(`[Auth] Logged login event for user: ${userId}`);
  } catch (err) {
    console.error("Failed to insert login log:", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [simulatedUserId, setSimulatedUserId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("huxzain_simulated_user_id");
    } catch (e) {
      return null;
    }
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadUserMeta = useCallback(
    async (userId: string, fallbackUser?: User | null) => {
      if (!supabase) return;

      // Validate userId as a valid UUID to prevent database 400 Bad Request (invalid input syntax for type uuid)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (!isUuid) {
        console.warn("[AuthContext] loadUserMeta called with invalid UUID:", userId);
        if (mountedRef.current) setReady(true);
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
              is_seller: false, // Users start as buyers; seller role is granted explicitly
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
              is_seller: false,
              is_verified: false,
              seller_approved: false,
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
            is_seller: false,
            is_verified: false,
            seller_approved: false,
            avatar_url: null,
          } as any;
        }
      }

      // 3. Ensure roles exist in DB
      const dbRoles = uniqueRoles((r ?? []) as { role: Role }[]);

      // Supplement with granular role from profiles.role or user_metadata
      const profileRole = (finalProfile as any)?.role as Role | undefined;
      const metaRole = (profileRole || fallbackUser?.user_metadata?.role) as Role | undefined;
      if (
        metaRole &&
        ["admin", "staff", "moderator", "manager", "employee", "developer", "super_admin", "owner"].includes(
          metaRole,
        )
      ) {
        if (metaRole === "staff") {
          const adminIdx = dbRoles.indexOf("admin");
          if (adminIdx !== -1) {
            dbRoles[adminIdx] = "staff"; // Replace 'admin' with 'staff' so they are not treated as full admins
          } else if (!dbRoles.includes("staff")) {
            dbRoles.push("staff");
          }
        } else {
          if (!dbRoles.includes(metaRole)) {
            dbRoles.push(metaRole);
          }
        }
      }
      
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

        // Only auto-grant seller role if the user signed up with explicit seller intent
        const intent = fallbackUser?.user_metadata?.intent;
        if (!p && intent === "seller" && !dbRoles.includes("seller")) {
          console.log(`[Auth] Granting seller role for new seller-intent user: ${userId}...`);
          const { error: syncErr } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "seller" as Role });
          
          if (!syncErr) {
            if (!dbRoles.includes("seller")) dbRoles.push("seller");
          } else {
            console.warn("[Auth] Seller role grant failed:", syncErr.message);
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
          const { error: revertErr } = await supabase
            .from("seller_subscriptions")
            .update({
              plan_name: "Free",
              expiry_date: null,
              status: "Active",
              updated_at: new Date().toISOString()
            })
            .eq("seller_id", userId);

          if (revertErr) {
            console.error("[Auth] Revert error:", revertErr);
          } else {
            const { data: updatedProf } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .maybeSingle();
            if (updatedProf) {
              finalProfile = updatedProf;
            }
          }
            
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
      } catch (err) {
        console.warn("[Auth] Expiration check exception:", err);
      }

      console.log(`[Auth] User meta loaded for ${userId}. Roles: ${dbRoles.join(", ")}`);
      if (!mountedRef.current) return;
      setProfile(
        finalProfile ? ({ ...(finalProfile as Profile), email, is_seller: hasSeller } as Profile) : null,
      );
      setRoles(dbRoles);
      setReady(true);
    },
    [supabase],
  );

  const refreshUserMeta = useCallback(async () => {
    const targetId = simulatedUserId || session?.user?.id;
    if (targetId) {
      console.log("[AuthContext] Refreshing user meta for target:", targetId);
      await loadUserMeta(targetId, simulatedUserId ? null : session?.user);
    }
  }, [session, loadUserMeta, simulatedUserId]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        const targetId = sessionStorage.getItem("huxzain_simulated_user_id") || s.user.id;
        setTimeout(() => loadUserMeta(targetId, targetId === s.user.id ? s.user : null), 0);
        
        if (evt === "SIGNED_IN" && targetId === s.user.id) {
          void logLogin(s.user.id);
        }
      } else {
        sessionStorage.removeItem("huxzain_simulated_user_id");
        setSimulatedUserId(null);
        setProfile(null);
        setRoles([]);
        setReady(true);
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
      if (data?.session?.user) {
        const targetId = sessionStorage.getItem("huxzain_simulated_user_id") || data.session.user.id;
        loadUserMeta(targetId, targetId === data.session.user.id ? data.session.user : null);
      } else {
        setReady(true);
      }
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
  }, [supabase, loadUserMeta, simulatedUserId]);

  const simulateUser = useCallback(async (targetUserId: string | null) => {
    if (!supabase) return;
    if (!targetUserId) {
      sessionStorage.removeItem("huxzain_simulated_user_id");
      setSimulatedUserId(null);
      if (session?.user) {
        await loadUserMeta(session.user.id, session.user);
      }
    } else {
      sessionStorage.setItem("huxzain_simulated_user_id", targetUserId);
      setSimulatedUserId(targetUserId);
      await loadUserMeta(targetUserId, null);
    }
  }, [supabase, session, loadUserMeta]);

  const value = useMemo<AuthState>(() => {
    const rawUser = session?.user ?? null;
    const user = simulatedUserId && profile ? ({
      id: simulatedUserId,
      email: profile.email || "simulated@huxzain.com",
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      }
    } as any) : rawUser;

    return {
      ready,
      configured,
      user,
      session,
      profile,
      roles,
      isAuthenticated: !!user,
      isSimulated: !!simulatedUserId,
      simulateUser,
      hasRole: (r) => {
        // Role hierarchy: super_admin/owner > admin > manager > moderator > staff > employee > seller > buyer
        if (roles.includes(r)) return true;
        // Elevated roles implicitly satisfy lower-level checks
        if (r === "admin" && roles.some(x => ["super_admin", "owner"].includes(x))) return true;
        if (r === "manager" && roles.some(x => ["admin", "super_admin", "owner"].includes(x))) return true;
        if (r === "moderator" && roles.some(x => ["admin", "super_admin", "owner"].includes(x))) return true;
        if (r === "staff" && roles.some(x => ["moderator", "manager", "admin", "super_admin", "owner"].includes(x)))
          return true;
        if (r === "employee" && roles.some(x => ["staff", "moderator", "manager", "admin", "super_admin", "owner"].includes(x)))
          return true;
        return false;
      },
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
        console.log(`[Auth] Attempting to send OTP to: ${email}`);
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
        });
        if (error) {
          console.error('[Auth] OTP send error:', error.message);
          throw error;
        }
        console.log('[Auth] OTP sent successfully.');
      },
      async verifyOtp(email, token, type) {
        if (!supabase) throw new Error("Auth not configured.");
        console.log(`[Auth] Verifying OTP for ${email} (type: ${type})`);
        
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type
        });

        if (error) {
          console.error('[Auth] OTP verification error:', error.message);
          throw error;
        }

        if (data.user) {
          console.log('[Auth] OTP verification successful.');
          await loadUserMeta(data.user.id, data.user);
        }
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
  }, [ready, configured, session, profile, roles, supabase, refreshUserMeta, simulatedUserId, simulateUser]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
