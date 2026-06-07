import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { trackVisit } from "@/lib/analytics.functions";

import "../styles.css";
import { AuthProvider } from "@/lib/auth/auth-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HUXZAIN — Digital Marketplace" },
      {
        name: "description",
        content:
          "Moderated marketplace for digital products and services. Verified sellers, order protection, dispute resolution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "HUXZAIN — Digital Marketplace" },
      { name: "twitter:title", content: "HUXZAIN — Digital Marketplace" },
      {
        property: "og:description",
        content:
          "Moderated marketplace for digital products and services. Verified sellers, order protection, dispute resolution.",
      },
      {
        name: "twitter:description",
        content:
          "Moderated marketplace for digital products and services. Verified sellers, order protection, dispute resolution.",
      },
      { property: "og:image", content: "https://huxzain.shop/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "HUXZAIN — India's Secure Digital Marketplace" },
      { name: "twitter:image", content: "https://huxzain.shop/og-image.png" },
      { property: "og:url", content: "https://huxzain.shop" },
      { property: "og:site_name", content: "HUXZAIN" },
      { name: "theme-color", content: "#0B0C10" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayout() {
  const auth = useAuth();
  const routerState = useRouterState();
  const path = routerState.location.pathname;

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    let browserName = "Unknown";
    if (userAgent.includes("Firefox")) browserName = "Firefox";
    else if (userAgent.includes("Chrome")) browserName = "Chrome";
    else if (userAgent.includes("Safari")) browserName = "Safari";
    else if (userAgent.includes("Edge")) browserName = "Edge";

    trackVisit({
      data: {
        path,
        referrer: typeof document !== "undefined" && document.referrer ? document.referrer : "Direct",
        device: isMobile ? "Mobile" : "Desktop",
        browser: browserName,
      }
    });
  }, [path]);

  return (
    <>
      {auth.isSimulated && (
        <div className="bg-amber-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span>
              SIMULATION ACTIVE: Logged in as <span className="underline">{auth.profile?.display_name || auth.profile?.username}</span> (ID: {auth.profile?.id.slice(0, 8)})
            </span>
          </div>
          <button
            onClick={() => {
              auth.simulateUser(null);
              toast.success("Simulation exited. Restored admin session.");
            }}
            className="px-3 py-1 rounded bg-black text-amber-500 font-extrabold hover:brightness-110 active:scale-95 transition-all text-[10px] border-none cursor-pointer uppercase tracking-wider"
          >
            Exit Simulation
          </button>
        </div>
      )}
      <Outlet />
    </>
  );
}
