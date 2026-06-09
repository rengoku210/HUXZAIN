import { createFileRoute } from "@tanstack/react-router";
import { updateActivityDuration } from "@/lib/terms-analytics.functions";

export const Route = createFileRoute("/_server/trackDuration")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const text = await request.text();
          const { activityId, durationSeconds } = JSON.parse(text);

          if (activityId && typeof durationSeconds === "number") {
            await updateActivityDuration({
              data: {
                activityId,
                durationSeconds,
              },
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (err: any) {
          console.error("[Telemetry API] Error recording duration:", err.message);
          return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      },
    },
  },
});
