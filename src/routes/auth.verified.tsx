import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase-client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/auth/verified")({
  component: VerifiedPage,
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as string) ?? "",
    token: (search.token as string) ?? "",
  }),
});

function VerifiedPage() {
  const navigate = useNavigate();
  const supabase = getSupabase();
  const { type, token } = Route.useSearch();

  useEffect(() => {
    async function verify() {
      if (!supabase) return;
      if (type && token) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "signup" | "email_change",
          token,
        });
        if (!error) {
          // Success – navigate to dashboard or login
          navigate({ to: "/dashboard" });
        } else {
          console.error("Verification failed", error);
          // Show error UI could be added later
        }
      }
    }
    verify();
  }, [supabase, type, token, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-page py-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Verifying your email…</h1>
          <p className="text-sm text-muted-foreground">Please wait while we confirm your account.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
