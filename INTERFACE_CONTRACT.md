# Interface Contract — Parallel Agent Implementation

> Source of truth for the 4 parallel agents implementing TrustPass Thailand full-scale demo. Each agent reads this file first. Do not modify without orchestrator approval.

## Merge order: A → B → D → C

A is independent. B defines types C consumes. D is independent. C merges last.

## File-Ownership Matrix

- Agent A owns: `data/eval/`, `scripts/run-evals.mjs`, `lib/telemetry.ts`, `app/api/feedback/`, package.json scripts
- Agent B owns: `lib/situation-service.ts`, `lib/risk-engine.ts`, `lib/system-prompt.ts`, `lib/evidence-service.ts`, `lib/sanitize-evidence.ts` (new), `lib/schemas.ts` (new), `lib/types.ts`, `app/api/situation/analyze/`, `data/cached_responses/`, `.env.example`
- Agent C owns: `components/TrustPassChat.tsx`, `data/verified_operators.demo.json`, `lib/grounding-tools.ts`, `lib/intelligence-store.ts`, `app/welcome/`, `app/dashboard/`, `app/scenarios/`, `components/SiteNav.tsx`
- Agent D owns: `app/responsible-ai/`, `public/evidence/*.png`, `public/trustpass-risk-ladder.png`, `demo-evidence/`, `DEMO_SCRIPT.md`, `CLAUDE.md` rewrite, repo hygiene deletions

## Type contracts (Agent B writes lib/types.ts; A, C, D read)

```ts
export type GroundingSignal = {
  tool: string;
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
  source_file?: string;          // NEW: e.g. "data/taxi_fare_reference.json"
  source_label?: string;         // NEW: e.g. "Azure Maps route lookup"
  confidence_percentage?: number; // NEW: low=60, medium=80, high=95
};

export type TrustedOperatorSignal = {
  operator_name: string;
  status: "verified" | "no_license" | "not_in_directory";
  tat_license?: string;           // e.g. "TAT 11/12345"
  operator_type?: "tour" | "rental" | "restaurant" | "transport" | "wellness";
  city?: string;
  notes?: string;
};

export type CommunityCorroboration = {
  similar_incident_count: number;
  window_days: number;
  location_label: string;
  link_to_dashboard?: string;
};

export type DegradedResponse = {
  status: "degraded";
  reason: "azure_unavailable" | "schema_validation_failed" | "azure_timeout" | "content_safety_blocked";
  reason_text: string;
  fallback_result: CompletedResponse;
  grounding: GroundingSignal[];
};

// CompletedResponse gains: trusted_operator?, community?, source ("azure-openai"|"local-demo"|"demo-mode-cache"), request_id?, latency_ms?
```

## Eval result JSON shape (`data/eval/results-latest.json`) — Agent A produces this

```json
{
  "timestamp_iso": "2026-05-16T18:00:00Z",
  "model": "gpt-4o",
  "case_count": 50,
  "summary": {
    "risk_level_accuracy": 0.92,
    "risk_level_proximity": 0.96,
    "category_recall": 0.88,
    "signal_f1": 0.85,
    "grounding_tool_coverage": 0.94,
    "latency_p50_ms": 2100,
    "latency_p95_ms": 4800
  },
  "per_case": [
    {
      "id": "wechat-casting-mae-sot-01",
      "passed": true,
      "expected_level": "Emergency",
      "actual_level": "Emergency",
      "category_match": true,
      "signal_f1": 1.0,
      "grounding_tools_present": ["job_lure_reference"],
      "latency_ms": 3200
    }
  ]
}
```

## Telemetry log key names (`lib/telemetry.ts`)

All log calls use these exact keys:
- request_id, input_hash, city, language, model, grounding_tools_called, latency_ms, risk_level_returned, parse_status (valid|invalid|degraded), fallback_used, had_image, prompt_shield_triggered, demo_mode_active

Public API: `logEvent(eventName, payload)`, `hashInput(text)`, `redactPII(text)`, `newRequestId()`.

## API contract — `POST /api/feedback` (Agent A creates)

Request: `{ "request_id": "uuid", "rating": "up"|"down", "reason"?: "string" }`
Response: `{ "ok": true }` always (silent fail to not block UI)

## Branching

Agent A: `agent-a-tooling` | Agent B: `agent-b-backend` | Agent C: `agent-c-frontend` | Agent D: `agent-d-static`

PR titles:
- [A] Eval harness, telemetry, feedback endpoint
- [B] Backend precision: strict schema, vision, injection defense, DEMO_MODE
- [C] Frontend hero features + dashboard payoff + page polish
- [D] Static content: /responsible-ai, assets, DEMO_SCRIPT, repo hygiene
