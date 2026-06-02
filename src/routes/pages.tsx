import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/pages")({
  head: () => ({
    meta: [{ title: "All Pages — HUXZAIN" }],
  }),
  component: PagesHub,
});

type HubLink = {
  label: string;
  to: string;
  description?: string;
  needsAuth?: boolean;
  needsRoles?: string[];
};

function PagesHub() {
  const auth = useAuth();

  const links: { title: string; items: HubLink[] }[] = [
    {
      title: "Public Pages",
      items: [
        { label: "Home", to: "/", description: "Homepage" },
        { label: "Categories", to: "/categories", description: "Browse all categories" },
        { label: "Game Buddies", to: "/game-buddies", description: "Find & book buddies" },
        { label: "Coaching", to: "/coaching", description: "Find & book coaches" },
        { label: "Become a Game Buddy", to: "/become-game-buddy", description: "Application form", needsAuth: true },
        { label: "Become a Coach", to: "/become-coach", description: "Application form", needsAuth: true },
        { label: "Login", to: "/login", description: "Customer login" },
        { label: "Signup", to: "/signup", description: "Create account" },
        { label: "Team Login", to: "/team-login", description: "Staff / admin login" },
      ],
    },
    {
      title: "Customer",
      items: [
        { label: "Dashboard", to: "/dashboard", needsAuth: true },
        { label: "My Account", to: "/account", needsAuth: true },
        { label: "My Orders", to: "/orders", needsAuth: true },
        { label: "Messages", to: "/messages", needsAuth: true },
      ],
    },
    {
      title: "Seller Portal",
      items: [
        { label: "Seller Dashboard", to: "/seller", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
        { label: "Seller Listings", to: "/seller/listings", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
        { label: "Seller Orders", to: "/seller/orders", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
        { label: "Seller Disputes", to: "/seller/disputes", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
        { label: "Seller Notifications", to: "/seller/notifications", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
        { label: "Seller Support", to: "/seller/support", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
        { label: "Seller Settings", to: "/seller/settings", needsAuth: true, needsRoles: ["seller", "admin", "super_admin", "owner"] },
      ],
    },
    {
      title: "Admin Panel",
      items: [
        { label: "Admin Overview", to: "/admin", needsAuth: true, needsRoles: ["staff", "moderator", "admin", "super_admin", "owner"] },
        { label: "Users", to: "/admin/users", needsAuth: true, needsRoles: ["admin", "super_admin", "owner", "staff", "moderator"] },
        { label: "Listings", to: "/admin/listings", needsAuth: true, needsRoles: ["admin", "super_admin", "owner", "staff", "moderator"] },
        { label: "Categories", to: "/admin/categories", needsAuth: true, needsRoles: ["admin", "super_admin", "owner"] },
        { label: "Payments", to: "/admin/payments", needsAuth: true, needsRoles: ["staff", "admin", "super_admin", "owner"] },
        { label: "Withdrawals", to: "/admin/withdrawals", needsAuth: true, needsRoles: ["staff", "admin", "super_admin", "owner"] },
        { label: "Verifications", to: "/admin/verifications", needsAuth: true, needsRoles: ["staff", "admin", "super_admin", "owner"] },
        { label: "Support Tickets", to: "/admin/tickets", needsAuth: true, needsRoles: ["staff", "admin", "super_admin", "owner"] },
        { label: "Disputes", to: "/admin/disputes", needsAuth: true, needsRoles: ["moderator", "admin", "super_admin", "owner"] },
        { label: "Analytics", to: "/admin/analytics", needsAuth: true, needsRoles: ["admin", "super_admin", "owner"] },
        { label: "SEO", to: "/admin/seo", needsAuth: true, needsRoles: ["admin", "super_admin", "owner"] },
        { label: "Settings", to: "/admin/settings", needsAuth: true, needsRoles: ["admin", "super_admin", "owner"] },
      ],
    },
  ];

  const canSee = (item: HubLink) => {
    if (item.needsAuth && !auth.isAuthenticated) return false;
    if (item.needsRoles?.length) {
      return auth.roles.some((r) => item.needsRoles!.includes(r));
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="container-page py-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-bold">All Pages</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Quick access buttons to every main HUXZAIN page (public + seller + admin).
              </p>
            </div>
            {!auth.isAuthenticated ? (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  className="h-10 px-5 rounded-xl border border-border bg-background/40 hover:bg-surface/40 inline-flex items-center justify-center text-sm font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="h-10 px-5 rounded-xl bg-gold text-black hover:bg-gold/90 inline-flex items-center justify-center text-sm font-bold"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Signed in as <span className="text-gold font-semibold">{auth.user?.email}</span>
              </div>
            )}
          </div>
        </section>

        <section className="container-page pb-12 space-y-8">
          {links.map((group) => {
            const visible = group.items.filter(canSee);
            if (visible.length === 0) return null;

            return (
              <div key={group.title} className="rounded-2xl border border-border bg-surface/30 p-6">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70 font-semibold">
                  {group.title}
                </div>
                <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visible.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      className="rounded-2xl border border-border bg-background/30 hover:bg-surface/40 hover:border-gold/35 transition-all p-4"
                    >
                      <div className="font-semibold">{item.label}</div>
                      {item.description ? (
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>
      <Footer />
    </div>
  );
}

