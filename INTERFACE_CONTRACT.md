# Interface Contract — Parallel Agent Implementation

> Source of truth for the 4 parallel agents implementing TrustPass Thailand
> full-scale demo. Each agent reads this file as its first action.
> Created 2026-05-16. Do not modify without orchestrator approval.

## Why this exists

Four agents work in parallel git worktrees on isolated branches. Without a
shared contract, they would invent conflicting type names, env vars, and JSON
shapes. This file pins every cross-agent interface so each PR merges cleanly.

## Hard rules

- **Read this file before writing any code.**
- **Do not change anything in this file.** If you need a contract change, open
  a PR against this file only and notify the orchestrator before proceeding.
- **Respect the file-ownership matrix below.** If you need to touch a file
  owned by another agent, document it in the PR description.
- **Acceptance criteria are non-negotiable.** A PR that doesn't meet them
  blocks the merge train.

## Merge order

`A` → `B` → `D` → `C`

Rationale: A is pure new files (no conflicts). B defines types C consumes.
D is independent and can merge anywhere. C consumes B's types so merges last.

## File-Ownership Matrix

| File / Directory | Owner | Notes |
|---|---|---|
| `lib/situation-service.ts` | B | Includes DEMO_MODE short-circuit |
| `lib/risk-engine.ts` | B | |
| `lib/system-prompt.ts` | B | |
| `lib/evidence-service.ts` | B | Includes DEMO_MODE short-circuit |
| `lib/sanitize-evidence.ts` *(new)* | B | |
| `lib/schemas.ts` *(new)* | B | JSON schema for strict mode |
| `lib/types.ts` | B writes, C reads | C waits for B's PR or uses contract below |
| `lib/telemetry.ts` *(new)* | A | B + C may import its `logEvent` function |
| `lib/grounding-tools.ts` | C small modify | Add operator-lookup function |
| `lib/intelligence-store.ts` | C | Pre-seed + similar-incidents query |
| `components/TrustPassChat.tsx` | C | Large surgery (all 4 hero features) |
| `components/SiteNav.tsx` | C | Footer responsible-ai link + page polish |
| `app/api/situation/analyze/route.ts` | B | |
| `app/api/feedback/route.ts` *(new)* | A | |
| `app/welcome/page.tsx` *(new)* | C | |
| `app/responsible-ai/page.tsx` *(new)* | D | Reads results from `data/eval/results-latest.json` |
| `app/dashboard/page.tsx` | C | Pulse highlight + row drawer |
| `app/scenarios/page.tsx` | C | Deep-link CTAs |
| `data/eval/gold_cases.json` *(new)* | A | |
| `data/cached_responses/*.json` *(new)* | B | 4 hero scenario responses |
| `data/verified_operators.demo.json` | C | Expand to ~15 realistic entries |
| `scripts/run-evals.mjs` *(new)* | A | |
| `package.json` | A+B+D append | Trivial three-way merge |
| `.env.example` | B | |
| `CLAUDE.md` | D rewrites | All read |
| `DEMO_SCRIPT.md` *(new)* | D | |
| `public/evidence/*.png` *(new)* | D | Hero WeChat + 6 others |
| `public/trustpass-risk-ladder.png` *(new)* | D | |
| `demo-evidence/*` *(new)* | D | |

## Type contracts (`lib/types.ts`)

Agent B writes these. Agent C reads them. Both must use these exact names and shapes.

```ts
export type GroundingSignal = {
  tool: string;
  title: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
  // NEW (Agent B adds, Agent C renders)
  source_file?: string;          // e.g. "data/taxi_fare_reference.json"
  source_label?: string;         // e.g. "Bangkok taxi fare reference" or "Azure Maps route lookup"
  confidence_percentage?: number; // mapping: low=60, medium=80, high=95
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
  similar_incident_count: number;       // e.g. 3
  window_days: number;                  // e.g. 7
  location_label: string;               // e.g. "Mae Sot border area"
  link_to_dashboard?: string;           // e.g. "/dashboard?pattern=fake_job_casting_lure"
};

export type CompletedResponse = {
  status: "completed";
  risk_level: "Low" | "Caution" | "High" | "Emergency";
  category: string;
  signals: string[];
  next_steps: string[];
  why_it_matters: string;
  thai_phrase: string;
  evidence_to_save: string[];
  contact_recommendation: string;
  report: { english: string; thai: string };
  grounding: GroundingSignal[];
  // NEW (Agent B adds, Agent C renders)
  trusted_operator?: TrustedOperatorSignal;
  community?: CommunityCorroboration;
  source: "azure-openai" | "local-demo" | "demo-mode-cache";
  request_id?: string;                  // UUIDv4 for telemetry
  latency_ms?: number;
};

export type DegradedResponse = {
  status: "degraded";
  reason: "azure_unavailable" | "schema_validation_failed" | "azure_timeout" | "content_safety_blocked";
  reason_text: string;                  // human-readable, shown in UI
  fallback_result: CompletedResponse;   // the local-rules result, full shape
  grounding: GroundingSignal[];
};

export type SituationAnalyzeResponse =
  | CompletedResponse
  | NeedsClarificationResponse
  | EvidenceMismatchResponse
  | OutOfScopeResponse
  | DegradedResponse;  // NEW union member
```

## Cached response shape (`data/cached_responses/*.json`)

Each file matches `CompletedResponse` exactly with `source: "demo-mode-cache"`. Filenames pinned:

- `wechat_casting.json` — Emergency, Mae Sot detected, Chinese embassy recommended
- `taxi.json` — High or Caution, fare-reference grounded
- `motorbike_passport.json` — High, passport-retention pattern
- `line_tour.json` — Caution or High, payment-to-personal-account pattern

DEMO_MODE short-circuit matches input keywords (case-insensitive):
- WeChat cache → message contains `wechat` AND (`casting` OR `model` OR `audition`)
- Taxi cache → message contains `taxi` OR `meter` OR `cab` OR `tuk-tuk`
- Motorbike cache → message contains `motorbike` OR `bike rental` OR `passport`
- LINE tour cache → message contains `line` AND (`tour` OR `payment` OR `booking`)

## Eval result JSON shape (`data/eval/results-latest.json`)

Agent A produces this. Agent D's `/responsible-ai` page reads it.

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

## Env vars (Agent B adds to `.env.example`)

```env
# Strict schema + reproducibility
AZURE_OPENAI_SEED=42

# Content Safety Prompt Shields (optional, graceful degrade if absent)
AZURE_CONTENT_SAFETY_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com
AZURE_CONTENT_SAFETY_KEY=<key>

# DEMO_MODE — short-circuits Azure calls with hand-tuned cached responses
DEMO_MODE=false

# Telemetry (Agent A wires; optional)
APPLICATIONINSIGHTS_CONNECTION_STRING=<optional-if-using-app-insights>
```

## Telemetry log key names (`lib/telemetry.ts`)

All agents that log events use these key names exactly:

- `request_id` — UUIDv4
- `input_hash` — sha256 of message+evidence (PII redacted)
- `city` — Bangkok | Phuket | Pattaya | Chiang Mai
- `language` — English | Thai | Chinese
- `model` — deployment name from env
- `grounding_tools_called` — array of tool names
- `latency_ms` — number
- `risk_level_returned` — Low | Caution | High | Emergency | null
- `parse_status` — valid | invalid | degraded
- `fallback_used` — boolean
- `had_image` — boolean
- `prompt_shield_triggered` — boolean
- `demo_mode_active` — boolean

Public `logEvent(event_name: string, payload: Record<string, unknown>): void` is
the only function other agents call. Agent A implements; B + C import.

## CSS / data-attribute hooks

Agent C adds these attributes; B and D may rely on them for cross-cutting styling:

- `data-status="degraded"` — applied to result card when `status === "degraded"`
- `data-confidence="high|medium|low"` — applied to each grounding chip
- `data-source="azure|local|demo"` — applied to result card by response source
- `data-operator-status="verified|no_license|not_in_directory"` — Trusted Operator card

## API contract changes

### `POST /api/situation/analyze` (Agent B)

New optional request field:
```ts
{
  evidenceImage?: string;  // base64 data URL of uploaded image
}
```

New possible response status: `degraded` (see `DegradedResponse` shape above).

### `POST /api/feedback` (Agent A, new)

Request:
```json
{
  "request_id": "uuid",
  "rating": "up" | "down",
  "reason": "optional string"
}
```

Response: `{ "ok": true }` (always 200, fails silently to not block UI).

## Branching and PR naming

Each agent works in `agent-<letter>-<topic>` branch:

- Agent A: `agent-a-tooling`
- Agent B: `agent-b-backend`
- Agent C: `agent-c-frontend`
- Agent D: `agent-d-static`

PR titles:

- `[A] Eval harness, telemetry, feedback endpoint`
- `[B] Backend precision: strict schema, vision, injection defense, DEMO_MODE`
- `[C] Frontend hero features + dashboard payoff + page polish`
- `[D] Static content: /responsible-ai, assets, DEMO_SCRIPT, repo hygiene`

PR descriptions follow the template in each agent's brief file.

## Definition of done (every agent)

1. Branch contains all changes specified in the agent's brief.
2. `npm run build` succeeds with zero TypeScript errors and zero `next` warnings.
3. `npm run lint` passes (warnings tolerated, no errors).
4. PR opened with title and description matching the template.
5. PR description includes: list of files changed, manual test steps, screenshots if UI.
6. Agent's acceptance criteria all explicitly checked off in the PR description.
7. No edits to files owned by other agents (verified via `git diff --stat main`).

## What to do if blocked

If the agent finds the contract is wrong or missing something:

1. **Do not invent.** Stop and open a PR titled `[CONTRACT] <description>` against this file only with the proposed change.
2. **Leave your branch in a state the orchestrator can resume.** Commit work-in-progress with a clear message.
3. **Document the blocker** in the PR description so the orchestrator can decide.
