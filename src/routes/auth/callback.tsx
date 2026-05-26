import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabase } from "@/lib/supabase-client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const { ready, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuth() {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Auth not configured");
        return;
      }

      try {
        // 1. Check for session in hash (standard Supabase redirect)
        const hash = window.location.hash;
        if (hash && hash.includes("access_token=")) {
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            console.log("[AuthCallback] Setting session from hash...");
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }

        // 1.5 Check for PKCE code in query params
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          console.log("[AuthCallback] Exchanging code for session...");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // 2. Wait for AuthProvider to be ready and sync state
        // The ready flag in useAuth() is driven by getSession and onAuthStateChange
      } catch (e: any) {
        console.error("[AuthCallback] error:", e.message);
        setError(e.message);
        toast.error(`Sign in failed: ${e.message}`);
      }
    }

    void handleAuth();
  }, []);

  useEffect(() => {
    // 3. Once auth is ready, redirect
    if (ready) {
      if (isAuthenticated) {
        console.log("[AuthCallback] Success. Redirecting to dashboard.");
        void navigate({ to: "/dashboard" });
      } else if (error) {
        console.log("[AuthCallback] Failed. Redirecting to login.");
        void navigate({ to: "/login" });
      } else {
        // Fallback for direct navigation or weird states
        setTimeout(() => {
          if (ready) void navigate({ to: isAuthenticated ? "/dashboard" : "/" });
        }, 1500);
      }
    }
  }, [ready, isAuthenticated, error, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center max-w-sm text-center">
        {error ? (
          <>
            <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
              !
            </div>
            <h1 className="text-xl font-bold mb-2">Login failed</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {error}. Please try signing in again.
            </p>
            <button
              onClick={() => navigate({ to: "/login" })}
              className="h-10 px-6 rounded-lg bg-gold text-primary-foreground text-sm font-semibold hover:brightness-110"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="size-10 text-gold animate-spin mb-6" />
            <h1 className="text-2xl font-display font-bold mb-2 text-foreground">Signing you in...</h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we secure your session and prepare your dashboard.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
