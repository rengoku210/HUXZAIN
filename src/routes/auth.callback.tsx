import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const auth = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (auth.ready) nav({ to: auth.isAuthenticated ? "/dashboard" : "/login" });
  }, [auth.ready, auth.isAuthenticated, nav]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Finishing sign in…
    </div>
  );
}
