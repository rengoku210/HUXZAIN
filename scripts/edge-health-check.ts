// scripts/edge-health-check.ts
// Checks the Edge Function health endpoint and exits with code 0 on success, 1 on failure.
import { config } from "dotenv";
config();

const EDGE_HEALTH_URL = process.env.EDGE_HEALTH_URL || "http://localhost:3000/api/edge-health";

async function check() {
  try {
    const resp = await fetch(EDGE_HEALTH_URL);
    if (!resp.ok) {
      console.error(`❌ Edge health check failed: HTTP ${resp.status}`);
      process.exit(1);
    }
    const data = await resp.json();
    if (data?.status !== "ok") {
      console.error("❌ Edge health endpoint did not return status ok");
      process.exit(1);
    }
    console.log("✅ Edge health check passed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Edge health check error:", err);
    process.exit(1);
  }
}

check();
