// Test which NVIDIA NIM models are available with this API key
const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";
const NVIDIA_API_KEY = "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";

const modelsToTest = [
  // Vision/multimodal models (for OCR)
  "microsoft/phi-4-multimodal-instruct",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "google/gemma-3-27b-it",
  // Text reasoning models (for scoring)
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "nvidia/nemotron-mini-4b-instruct",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.3-70b-instruct",
  "nvidia/llama-3.1-nemotron-70b-reward",
  "deepseek-ai/deepseek-r1",
  "qwen/qwen2.5-72b-instruct",
  "mistralai/mistral-large-2-instruct",
];

async function testModel(model: string): Promise<string> {
  try {
    const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const reply = json.choices?.[0]?.message?.content?.trim() || "";
      return `✅ ${res.status} — "${reply}"`;
    } else {
      const body = await res.text();
      const detail = JSON.parse(body).detail || body.substring(0, 80);
      return `❌ ${res.status} — ${detail}`;
    }
  } catch (err: any) {
    return `❌ ERR — ${err.message}`;
  }
}

async function main() {
  console.log("\nTesting NVIDIA NIM model availability...\n");
  
  for (const model of modelsToTest) {
    const result = await testModel(model);
    console.log(`  ${model.padEnd(50)} ${result}`);
  }

  console.log("\nDone.\n");
}

main();
