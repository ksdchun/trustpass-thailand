# Interface Contract — Parallel Agent Implementation

> Source of truth for the 4 parallel agents. Do not modify without orchestrator approval.

## Merge order: A → B → D → C (YOU LAST)

## File-Ownership Matrix

- Agent A owns: data/eval/, scripts/run-evals.mjs, lib/telemetry.ts, app/api/feedback/
- Agent B owns: lib/situation-service.ts, lib/risk-engine.ts, lib/system-prompt.ts, lib/evidence-service.ts, lib/sanitize-evidence.ts (new), lib/schemas.ts (new), lib/types.ts, app/api/situation/analyze/, data/cached_responses/, .env.example
- Agent C (YOU) own: components/TrustPassChat.tsx, data/verified_operators.demo.json, lib/grounding-tools.ts, lib/intelligence-store.ts, app/welcome/, app/dashboard/, app/scenarios/, components/SiteNav.tsx
- Agent D owns: app/responsible-ai/, public/evidence/, demo-evidence/, DEMO_SCRIPT.md, CLAUDE.md rewrite, deletions

## Type contracts (Agent B writes these in lib/types.ts; YOU read)

```ts
export type GroundingSignal = {
  tool: string;
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
  source_file?: string;          // NEW
  source_label?: string;         // NEW
  confidence_percentage?: number; // low=60, medium=80, high=95
};

export type TrustedOperatorSignal = {
  operator_name: string;
  status: "verified" | "no_license" | "not_in_directory";
  tat_license?: string;
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

// CompletedResponse gains: trusted_operator?, community?, source ("azure-openai"|"local-demo"|"demo-mode-cache"), request_id?, latency_ms?

export type DegradedResponse = {
  status: "degraded";
  reason: "azure_unavailable" | "schema_validation_failed" | "azure_timeout" | "content_safety_blocked";
  reason_text: string;
  fallback_result: CompletedResponse;
  grounding: GroundingSignal[];
};
```

**Since Agent B hasn't merged yet,** YOU define these types locally in `components/TrustPassChat.tsx` (or a local types file you own like `components/types.ts`) so your branch compiles. Mark with a comment `// TODO: replace with import from @/lib/types once Agent B merges`. When B merges to master and you rebase, the types will align.

## CSS / data attributes you add (B and D may rely on these)

- `data-status="degraded"` on result card
- `data-confidence="high|medium|low"` on grounding chip
- `data-source="azure|local|demo"` on result card
- `data-operator-status="verified|no_license|not_in_directory"` on operator card

## API contract that affects you

`POST /api/situation/analyze` now accepts new optional field: `evidenceImage` (base64 data URL). New possible response status: `degraded`. YOU update TrustPassChat.tsx to send the image and render degraded state.

`POST /api/feedback` (Agent A) accepts: `{ request_id, rating: "up"|"down", reason? }`. YOU wire up the thumbs widget to call it.

## Branching
- Agent C: `agent-c-frontend`
- PR title: `[C] Frontend hero features + dashboard payoff + page polish`
