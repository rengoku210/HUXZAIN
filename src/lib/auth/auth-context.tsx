/**
 * Auth context: wraps the app, exposes the current user, profile,
 * and role list. Backed by Supabase when env is configured; falls
 * back to an unauthenticated stub otherwise (so the UI stays usable
 * for design preview).
 */
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
import { isSupabaseConfigured } from "@/lib/env";
import {
  type Role,
  hasAnyRole,
  hasPermission,
  type Permission,
} from "@/lib/roles";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_seller: boolean;
  is_verified: boolean;
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
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserMeta: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const loadUserMeta = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      console.log("[AuthContext] Loading user metadata for user ID:", userId);
      try {
        const [{ data: p, error: pErr }, { data: r, error: rErr }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);
        
        if (pErr) console.warn("[AuthContext] Profiles table fetch warning:", pErr.message);
        if (rErr) console.warn("[AuthContext] User roles table fetch warning:", rErr.message);

        const rolesList = ((r ?? []) as { role: Role }[]).map((x) => x.role);
        
        // Support database profile is_seller state
        if (p && p.is_seller && !rolesList.includes("seller" as Role)) {
          console.log("[AuthContext] Synthesizing 'seller' role from profiles.is_seller = true");
          rolesList.push("seller" as Role);
        }

        // Support Client-Side localStorage role overrides for testing
        if (typeof window !== "undefined") {
          const overrides = localStorage.getItem(`huxzain_roles_${userId}`);
          if (overrides) {
            try {
              const extraRoles = JSON.parse(overrides) as Role[];
              console.log("[AuthContext] Found localStorage role overrides:", extraRoles);
              extraRoles.forEach((role) => {
                if (!rolesList.includes(role)) {
                  rolesList.push(role);
                }
              });
            } catch (jsonErr) {
              console.error("[AuthContext] Failed to parse localStorage overrides:", jsonErr);
            }
          }
        }

        console.log("[AuthContext] Final loaded roles for session:", rolesList);
        setProfile((p as Profile) ?? null);
        setRoles(rolesList);
      } catch (err: any) {
        console.error("[AuthContext] Critical exception in loadUserMeta:", err.message);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    // Listener FIRST, then getSession (avoids missed events).
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        // defer DB calls to avoid deadlocks inside the callback
        setTimeout(() => loadUserMeta(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) loadUserMeta(data.session.user.id);
      setReady(true);
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
        if (!supabase) throw new Error("Auth not configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, displayName) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirect = typeof window !== "undefined" ? `${window.location.origin}/auth/verified` : undefined;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirect,
            data: { display_name: displayName ?? null },
          },
        });
        if (error) throw error;
        // Assign default buyer role
        if (data?.user?.id) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role: 'buyer' as Role });
          if (roleError) console.error('Failed to assign default buyer role', roleError);
        }
      },
      async signInWithOAuth(provider) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw error;
      },
      async sendPasswordReset(email) {
        if (!supabase) throw new Error("Auth not configured.");
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
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
        if (typeof window !== "undefined" && session?.user) {
          localStorage.removeItem(`huxzain_roles_${session.user.id}`);
        }
        await supabase.auth.signOut();
      },
      async refreshUserMeta() {
        if (session?.user) {
          await loadUserMeta(session.user.id);
        }
      },
    };
  }, [ready, configured, session, profile, roles, supabase, loadUserMeta]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
