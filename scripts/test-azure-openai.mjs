import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};

  const values = {};
  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }

  return values;
}

function getOpenAICompatibleBaseUrl(endpoint) {
  if (endpoint.endsWith("/openai/v1")) return endpoint;
  if (endpoint.includes(".services.ai.azure.com") && endpoint.includes("/api/projects/")) {
    return `${endpoint}/openai/v1`;
  }
  return null;
}

const env = {
  ...process.env,
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...loadEnvFile(resolve(process.cwd(), "..", ".env.local"))
};

const required = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_DEPLOYMENT"
];

const missing = required.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const endpoint = env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, "");
const deployment = env.AZURE_OPENAI_DEPLOYMENT;
const openAICompatibleBaseUrl = getOpenAICompatibleBaseUrl(endpoint);
let content;

if (openAICompatibleBaseUrl) {
  const client = new OpenAI({
    baseURL: openAICompatibleBaseUrl,
    apiKey: env.AZURE_OPENAI_API_KEY,
    timeout: Number(env.AZURE_OPENAI_TIMEOUT_MS || 12000)
  });

  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: "Return compact JSON only." },
      { role: "user", content: "Return a JSON object with status ok and product TrustPass Thailand." }
    ],
    temperature: 0,
    max_tokens: 80,
    response_format: { type: "json_object" }
  });

  content = completion.choices[0]?.message?.content;
} else {
  if (!env.AZURE_OPENAI_API_VERSION) {
    console.error("Missing required environment variable for classic Azure OpenAI endpoint: AZURE_OPENAI_API_VERSION");
    process.exit(1);
  }

  const encodedDeployment = encodeURIComponent(deployment);
  const apiVersion = encodeURIComponent(env.AZURE_OPENAI_API_VERSION);
  const url = `${endpoint}/openai/deployments/${encodedDeployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": env.AZURE_OPENAI_API_KEY
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "Return compact JSON only." },
        { role: "user", content: "Return a JSON object with status ok and product TrustPass Thailand." }
      ],
      temperature: 0,
      max_tokens: 80,
      response_format: { type: "json_object" }
    })
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("Azure OpenAI test failed.");
    console.error(`HTTP ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  const data = JSON.parse(text);
  content = data?.choices?.[0]?.message?.content;
}

console.log("Azure OpenAI test passed.");
console.log(`Endpoint: ${endpoint}`);
console.log(`Deployment: ${deployment}`);
console.log(`Mode: ${openAICompatibleBaseUrl ? "openai-compatible" : "classic-azure-openai"}`);
console.log(`Response: ${content}`);
