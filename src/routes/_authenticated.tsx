import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Auth boundary. Any route file placed under
 * `src/routes/_authenticated/` automatically requires sign-in.
 * Auth state is hydrated client-side, so the guard runs in the
 * component body (beforeLoad can't see the Supabase session).
 */
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && !auth.isAuthenticated) {
      navigate({ to: "/login", search: { redirect: window.location.pathname + window.location.search } });
    }
  }, [auth.ready, auth.isAuthenticated, navigate]);

  if (!auth.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }
  if (!auth.isAuthenticated) return null;
  return <Outlet />;
}

export { redirect };
