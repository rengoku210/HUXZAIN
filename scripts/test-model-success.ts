// scripts/test-model-success.ts
const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";
const NVIDIA_API_KEY = "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";

const modelsToTest = [
  "microsoft/phi-4-multimodal-instruct",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-70b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/nemotron-mini-4b-instruct",
  "google/gemma-3-12b-it"
];

async function testModel(model: string) {
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
      console.log(`✅ ${model.padEnd(45)} Status: ${res.status} | Reply: "${reply}"`);
      return true;
    } else {
      const text = await res.text();
      let detail = text;
      try {
        detail = JSON.parse(text).detail || text;
      } catch {}
      console.log(`❌ ${model.padEnd(45)} Status: ${res.status} | Error: ${detail.substring(0, 100)}`);
      return false;
    }
  } catch (err: any) {
    console.log(`❌ ${model.padEnd(45)} Exception: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("Testing model access with the current API key...\n");
  for (const model of modelsToTest) {
    await testModel(model);
  }
}

main();
