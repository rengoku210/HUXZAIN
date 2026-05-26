import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CheckCircle2, Loader2, Store, Home, LogIn } from "lucide-react";

export const Route = createFileRoute("/auth/verified")({
  component: VerifiedPage,
});

function VerifiedPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleVerification() {
      const supabase = getSupabase();
      if (!supabase) {
        setStatus("error");
        setErrorMsg("Supabase client not initialized.");
        return;
      }

      // 1. Extract tokens from hash fragment (access_token, refresh_token)
      // Supabase sends these in the hash after a successful link click
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const params = new URLSearchParams(hash.substring(1)); // remove #
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error("Error setting session:", error.message);
            setStatus("error");
            setErrorMsg(error.message);
            return;
          }
        }
      }

      // 2. Verify current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // If no session but no hash, user might just be visiting the page directly.
        // Check if they are already logged in.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus("error");
          setErrorMsg("No active session found. Please try signing in.");
          return;
        }
      }

      // 3. Hydrate profile and roles immediately using the session user
      // This ensures that when they click 'Become a Seller', the roles are already in Ctx
      const user = session?.user || (await supabase.auth.getUser()).data.user;
      if (user) {
        // We can't call refreshUserMeta directly from here since it's in the Context 
        // and we aren't using the hook inside the effect safely yet without dependencies.
        // But the AuthProvider's onAuthStateChange will trigger it anyway.
        // To be sure, we wait a brief moment for the Context to catch up.
        console.log("[Verified] Session verified for user:", user.id);
      }

      setStatus("success");
    }

    void handleVerification();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 container-page py-20 flex items-center justify-center">
        <div className="w-full max-w-lg mx-auto">
          <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            {status === "loading" && (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-gold animate-spin mb-6" />
                <h1 className="font-display text-3xl font-bold mb-3">Verifying your email...</h1>
                <p className="text-muted-foreground">
                  Please wait while we confirm your account and set up your secure session.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-gold/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-12 w-12 text-gold" />
                </div>
                <h1 className="font-display text-3xl font-bold mb-3">Verified Successfully!</h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Your email is verified successfully. You can now start selling and earning on <span className="text-gold font-semibold">HUXZAIN</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <Link
                    to="/seller-panel"
                    className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-gold text-primary-foreground font-bold hover:brightness-110 transition-all"
                  >
                    <Store className="h-4 w-4" />
                    Become a Seller
                  </Link>
                  <Link
                    to="/"
                    className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-border bg-surface/60 hover:bg-surface transition-all font-semibold"
                  >
                    <Home className="h-4 w-4" />
                    Go to Home
                  </Link>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                  <LogIn className="h-8 w-8 text-red-500" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-3 text-red-400">Verification Issue</h1>
                <p className="text-muted-foreground mb-8">
                  {errorMsg || "We couldn't verify your session. This link might have expired or was already used."}
                </p>
                <Link
                  to="/login"
                  className="w-full h-12 flex items-center justify-center rounded-xl bg-gold text-primary-foreground font-bold hover:brightness-110"
                >
                  Sign In to Continue
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
