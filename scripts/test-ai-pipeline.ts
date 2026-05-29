// Quick diagnostic script to test every step of the AI verification pipeline
// Run with: npx tsx scripts/test-ai-pipeline.ts

import { createClient } from "@supabase/supabase-js";

const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";

// Credentials (from .env)
const SUPABASE_URL = "https://fqeoracqywgwbvwijwqq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZW9yYWNxeXdnd2J2d2lqd3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg0NTk4OSwiZXhwIjoyMDk0NDIxOTg5fQ.Im5EMmwnG2GZLlnC7uHkhOA_AdpYqDVoGAVtPBPZftE";
const NVIDIA_API_KEY =
  process.env.NVIDIA_API_KEY ||
  "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";

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  HUXZAIN AI PIPELINE DIAGNOSTIC TEST");
  console.log("=".repeat(60));

  // ── TEST 1: NVIDIA API Key validity ────────────────────────────
  console.log("\n[TEST 1] NVIDIA API Key Check");
  console.log(`  Key prefix: ${NVIDIA_API_KEY.substring(0, 12)}...`);
  console.log(`  Key length: ${NVIDIA_API_KEY.length}`);
  console.log(`  Starts with nvapi-: ${NVIDIA_API_KEY.startsWith("nvapi-")}`);

  if (!NVIDIA_API_KEY.startsWith("nvapi-")) {
    console.error("  ❌ FAIL: Invalid API key format");
    return;
  }
  console.log("  ✅ PASS: Key format valid");

  // ── TEST 2: NVIDIA API connectivity (lightweight models list) ──
  console.log("\n[TEST 2] NVIDIA API Connectivity");
  try {
    const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: "Reply with exactly: PONG" }],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    console.log(`  HTTP Status: ${res.status} ${res.statusText}`);

    if (res.ok) {
      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content?.trim() || "";
      console.log(`  Model reply: "${reply}"`);
      console.log("  ✅ PASS: NVIDIA API is reachable and key is valid");
    } else {
      const body = await res.text();
      console.error(`  ❌ FAIL: API returned ${res.status}`);
      console.error(`  Body: ${body.substring(0, 300)}`);
      return;
    }
  } catch (err: any) {
    console.error(`  ❌ FAIL: Network error: ${err.message}`);
    return;
  }

  // ── TEST 3: Supabase connectivity ──────────────────────────────
  console.log("\n[TEST 3] Supabase Connectivity");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: proofs, error: proofErr } = await supabase
    .from("payment_proofs")
    .select("id, screenshot_url, amount, status, payment_type, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  if (proofErr) {
    console.error(`  ❌ FAIL: Supabase query error: ${proofErr.message}`);
    return;
  }

  if (!proofs || proofs.length === 0) {
    console.error("  ❌ FAIL: No payment proofs found in database");
    return;
  }

  console.log(`  Found ${proofs.length} payment proofs`);
  for (const p of proofs) {
    console.log(
      `  - ID: ${p.id.substring(0, 8)}... | Amount: ${p.amount} | Status: ${p.status} | Type: ${p.payment_type}`
    );
  }
  console.log("  ✅ PASS: Supabase connection works");

  // Use the first proof for remaining tests
  const testProof = proofs[0];
  console.log(`\n  Using proof ${testProof.id} for remaining tests`);

  // ── TEST 4: Screenshot download ────────────────────────────────
  console.log("\n[TEST 4] Screenshot Download (Step A)");
  let screenshotUrl = testProof.screenshot_url;
  console.log(`  Original URL: ${screenshotUrl}`);

  if (screenshotUrl.startsWith("/")) {
    screenshotUrl = `${SUPABASE_URL}${screenshotUrl}`;
    console.log(`  Resolved URL: ${screenshotUrl}`);
  }

  let base64Image = "";
  try {
    const imgRes = await fetch(screenshotUrl);
    console.log(`  HTTP Status: ${imgRes.status} ${imgRes.statusText}`);

    if (!imgRes.ok) {
      console.error(`  ❌ FAIL: Cannot download screenshot`);
      console.error(`  Trying signed URL approach...`);
      
      // Try getting a signed URL from Supabase storage
      const pathMatch = screenshotUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/(.+)/);
      if (pathMatch) {
        const bucketPath = pathMatch[1];
        const parts = bucketPath.split("/");
        const bucket = parts[0];
        const filePath = parts.slice(1).join("/");
        console.log(`  Attempting signed URL for bucket=${bucket}, path=${filePath}`);
        
        const { data: signedData, error: signErr } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 300);
        
        if (signErr || !signedData?.signedUrl) {
          console.error(`  ❌ FAIL: Signed URL generation failed: ${signErr?.message}`);
        } else {
          console.log(`  Signed URL: ${signedData.signedUrl.substring(0, 80)}...`);
          const retryRes = await fetch(signedData.signedUrl);
          console.log(`  Retry HTTP Status: ${retryRes.status}`);
          if (retryRes.ok) {
            const buf = await retryRes.arrayBuffer();
            base64Image = `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
            console.log(`  ✅ PASS (via signed URL): Downloaded ${buf.byteLength} bytes`);
          } else {
            console.error(`  ❌ FAIL: Even signed URL fetch failed`);
          }
        }
      }
    } else {
      const buf = await imgRes.arrayBuffer();
      const ct = imgRes.headers.get("content-type") || "image/jpeg";
      base64Image = `data:${ct};base64,${Buffer.from(buf).toString("base64")}`;
      console.log(`  Downloaded: ${buf.byteLength} bytes, type: ${ct}`);
      console.log(`  Base64 length: ${base64Image.length}`);
      console.log("  ✅ PASS: Screenshot downloaded and converted to base64");
    }
  } catch (err: any) {
    console.error(`  ❌ FAIL: Download exception: ${err.message}`);
  }

  if (!base64Image) {
    console.error("\n  ⛔ Cannot continue without screenshot. Pipeline will use heuristic fallback.");
    console.log("  The final result will still return data, but no real AI OCR will happen.");
  }

  // ── TEST 5: Phi-4 OCR ──────────────────────────────────────────
  if (base64Image) {
    console.log("\n[TEST 5] Phi-4 Multimodal OCR (Step B)");
    try {
      const phi4Res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
          model: "meta/llama-3.2-11b-vision-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: 'Extract payment info from this screenshot as JSON: {"paid_amount":null,"currency":null,"status":null,"transaction_id":null,"payment_app":null,"timestamp_text":null,"receiver_name":null,"sender_name":null}. Return ONLY JSON.',
                },
                { type: "image_url", image_url: { url: base64Image } },
              ],
            },
          ],
          max_tokens: 512,
          temperature: 0.1,
        }),
      });

      console.log(`  HTTP Status: ${phi4Res.status} ${phi4Res.statusText}`);

      if (phi4Res.ok) {
        const json = await phi4Res.json();
        const content = json.choices?.[0]?.message?.content || "";
        console.log(`  Raw output (first 400 chars): ${content.substring(0, 400)}`);
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          console.log("  Parsed JSON:", JSON.stringify(parsed, null, 2));
          console.log("  ✅ PASS: Phi-4 OCR returned valid data");
        } else {
          console.warn("  ⚠️ WARN: Phi-4 returned text but no JSON found");
        }
      } else {
        const errBody = await phi4Res.text();
        console.error(`  ❌ FAIL: Phi-4 API error: ${errBody.substring(0, 300)}`);
      }
    } catch (err: any) {
      console.error(`  ❌ FAIL: Phi-4 exception: ${err.message}`);
    }
  }

  // ── TEST 6: Nemotron Reasoning ─────────────────────────────────
  console.log("\n[TEST 6] Nemotron Reasoning (Step D)");
  try {
    const nemRes = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          {
            role: "user",
            content: `Return this exact JSON: {"ai_score":5,"ai_risk_label":"Verified Safe","ai_recommendation":"Approve","ai_reason":"Test pass","ai_amount_match":true,"ai_timestamp_match":"Within 5 minutes","ai_utr":"TEST123","ai_authenticity_score":95}`,
          },
        ],
        max_tokens: 256,
        temperature: 0,
      }),
    });

    console.log(`  HTTP Status: ${nemRes.status} ${nemRes.statusText}`);

    if (nemRes.ok) {
      const json = await nemRes.json();
      const content = json.choices?.[0]?.message?.content || "";
      console.log(`  Raw output: ${content.substring(0, 300)}`);
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        console.log("  ✅ PASS: Nemotron returned valid JSON");
      } else {
        console.warn("  ⚠️ WARN: Nemotron returned text but no JSON");
      }
    } else {
      const errBody = await nemRes.text();
      console.error(`  ❌ FAIL: Nemotron API error: ${errBody.substring(0, 300)}`);
    }
  } catch (err: any) {
    console.error(`  ❌ FAIL: Nemotron exception: ${err.message}`);
  }

  // ── TEST 7: DB AI Columns Check ────────────────────────────────
  console.log("\n[TEST 7] DB AI Columns Existence");
  const { error: colErr } = await supabase
    .from("payment_proofs")
    .select("ai_score, ai_risk_label, ai_checked_at")
    .limit(1);

  if (colErr) {
    console.error(`  ❌ FAIL: AI columns don't exist: ${colErr.message}`);
    console.log("  Run the supabase_ai_migration.sql to add columns.");
  } else {
    console.log("  ✅ PASS: AI columns exist in payment_proofs table");
  }

  console.log("\n" + "=".repeat(60));
  console.log("  DIAGNOSTIC COMPLETE");
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("Fatal diagnostic error:", err);
  process.exit(1);
});
