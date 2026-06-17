import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";
import { Lock, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { logTeamLoginAttempt } from "@/lib/auth/employee-auth";
import { resolveEmployeeIdToEmail, preValidateTeamLogin } from "@/lib/admin/staff.functions";

export const Route = createFileRoute("/team-login")({
  head: () => ({
    meta: [{ title: "Team Login — HUXZAIN" }],
  }),
  component: TeamLogin,
});

const TEAM_ROLES = [
  { key: "payment_reviewer", label: "Payment Reviewer" },
  { key: "dispute_manager", label: "Dispute Manager" },
  { key: "support_agent", label: "Support Agent" },
  { key: "verification_officer", label: "Verification Officer" },
  { key: "moderator", label: "Moderator" },
  { key: "admin", label: "Admin" },
  { key: "super_admin", label: "Super Admin" },
] as const;

function TeamLogin() {
  const auth = useAuth();
  const nav = useNavigate();

  const [role, setRole] = useState<(typeof TEAM_ROLES)[number]["key"]>("payment_reviewer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roleOk = useMemo(() => auth.roles.includes(role as any), [auth.roles, role]);

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.isAuthenticated) return;

    // If user is logged in but role mismatch, block and sign out.
    if (!roleOk) {
      toast.error("This account does not have the selected team role.");
      void auth.signOut();
      return;
    }

    // Route user based on privileges
    if (auth.roles.some((r) => ["admin", "super_admin", "owner", "moderator", "payment_reviewer", "dispute_manager", "support_agent", "verification_officer"].includes(r))) {
      nav({ to: "/admin" });
    } else {
      nav({ to: "/dashboard" });
    }
  }, [auth.ready, auth.isAuthenticated, auth.roles, roleOk, auth, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    
    let loginEmail = email.trim();
    let employeeId: string | undefined = undefined;
    const device = /Mobile|Android|iP(ad|hone)/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    const input = email.trim();

    try {
      setSubmitting(true);

      // Pre-validate on server (checks employee existence, status, and role)
      const res = await preValidateTeamLogin({ data: { input, role } });
      loginEmail = res.email;
      employeeId = res.employeeId;

      try {
        await auth.signInWithPassword(loginEmail, password);
      } catch (authErr: any) {
        if (authErr.message?.includes("Invalid login credentials") || authErr.message?.includes("invalid_credentials")) {
          throw new Error("Wrong password. Please try again.");
        }
        throw authErr;
      }
      
      await logTeamLoginAttempt({ 
        data: { 
          email: loginEmail, 
          employeeId, 
          success: true, 
          device, 
          role, 
          ip: "" 
        } 
      });
      
      // The redirect happens in useEffect after roles load.
    } catch (err: any) {
      const isEmpId = input.toUpperCase().startsWith("HUX-");
      
      await logTeamLoginAttempt({ 
        data: { 
          email: isEmpId ? "Failed Employee ID Resolution" : input, 
          employeeId: isEmpId ? input.toUpperCase() : undefined, 
          success: false, 
          device, 
          role, 
          ip: "" 
        } 
      });
      
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container-page py-12 grid lg:grid-cols-[1fr_420px] gap-8 items-start">
          <div className="rounded-2xl border border-border bg-surface/30 p-8">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl border border-gold/25 bg-gold/10 flex items-center justify-center">
                <Shield className="size-6 text-gold" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">Team Login</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Secure login for employees, moderators and admins.
                </p>
              </div>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Role-based access",
                  desc: "Your account permissions control what you can see and do.",
                  icon: Users,
                },
                {
                  title: "Audit & traceability",
                  desc: "Sensitive actions should be logged and reviewable by Super Admin.",
                  icon: Lock,
                },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border border-border bg-background/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl border border-gold/20 bg-gold/10 flex items-center justify-center shrink-0">
                      <f.icon className="size-5 text-gold" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              Tip: For highest security, keep team accounts separate from customer accounts.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/30 p-8">
            <div className="text-sm font-semibold">Sign in</div>
            <p className="text-xs text-muted-foreground mt-1">
              Choose your role, then login with your Team Email/ID and password.
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] text-muted-foreground">Select Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none"
                >
                  {TEAM_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Security note: the selected role must match your assigned role in the system.
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Team Email / Employee ID</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className="mt-1 w-full h-11 rounded-xl border border-border bg-background/40 px-3 text-sm outline-none"
                  autoComplete="current-password"
                />
              </div>

              <button
                disabled={submitting || !email.trim() || !password}
                className="w-full h-11 rounded-xl bg-gold text-black font-bold text-sm hover:bg-gold/90 transition-all disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign In"}
              </button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Link to="/login" className="hover:text-foreground">
                  Customer login
                </Link>
                <Link to="/forgot-password" className="hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

