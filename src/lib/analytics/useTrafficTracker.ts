import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Traffic telemetry hook. Mounted in __root.tsx to track
 * page views, durations, and product-level interactions.
 *
 * Sends data to `trackUserActivity` and `updateActivityDuration`
 * server functions via fetch to avoid importing server code on client.
 */
export function useTrafficTracker() {
  const { location } = useRouterState();
  const activityIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;

    // Don't track admin pages or auth pages
    if (path.startsWith("/admin") || path.startsWith("/auth") || path.startsWith("/team-login")) {
      return;
    }

    // Avoid double-tracking same path
    if (path === lastPathRef.current) return;

    // Flush duration for previous page
    if (activityIdRef.current && lastPathRef.current) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (duration > 0 && duration < 3600) {
        // Use sendBeacon-style fire-and-forget
        try {
          navigator.sendBeacon(
            "/_server/trackDuration",
            JSON.stringify({
              activityId: activityIdRef.current,
              durationSeconds: duration,
            })
          );
        } catch {
          // Silently fail - telemetry is best-effort
        }
      }
    }

    // Reset for new page
    lastPathRef.current = path;
    startTimeRef.current = Date.now();
    activityIdRef.current = null;

    // Extract listing ID from product pages
    const listingMatch = path.match(/^\/product\/([^/]+)$/);
    const listingId = listingMatch ? listingMatch[1] : undefined;

    // Log the page view (fire-and-forget)
    const trackPageView = async () => {
      try {
        const { trackUserActivity } = await import("@/lib/terms-analytics.functions");
        const result = await trackUserActivity({
          data: {
            pagePath: path,
            eventType: "page_view" as const,
            listingId,
          },
        });
        if (result && typeof result === "object" && "activityId" in result) {
          activityIdRef.current = (result as any).activityId;
        }
      } catch {
        // Silently fail
      }
    };

    trackPageView();

    // Handle tab/window close
    const handleUnload = () => {
      if (activityIdRef.current) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        if (duration > 0 && duration < 3600) {
          try {
            navigator.sendBeacon(
              "/_server/trackDuration",
              JSON.stringify({
                activityId: activityIdRef.current,
                durationSeconds: duration,
              })
            );
          } catch {
            // Silently fail
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [location.pathname]);
}
