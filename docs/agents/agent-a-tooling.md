# Agent A — Tooling, Evals, Telemetry, Feedback

> Brief for the agent working on `agent-a-tooling`. Mirror of the original orchestrator brief, kept in-repo so future contributors can re-read it.

## Scope

Agent A delivers the production-grade tooling underneath TrustPass Thailand:

1. A 50-case gold dataset used to score backend accuracy.
2. An eval harness that POSTs against the running backend and produces machine + human-readable result files.
3. A telemetry utility that emits structured events (console or Azure Application Insights) with PII redaction.
4. A `/api/feedback` endpoint that captures up/down + reason from the UI without ever blocking the user.
5. A package.json script entry + the new `applicationinsights` dependency.

## Branch / merge order

- Branch: `agent-a-tooling`
- Merge order: A → B → D → C (A is independent of the other agents)
- Agent A must not edit files owned by B, C, or D (see `INTERFACE_CONTRACT.md`).

## Files Agent A is allowed to create or edit

- `data/eval/gold_cases.json`
- `data/eval/README.md`
- `data/eval/results-latest.json` (generated at runtime; checked in only as a placeholder if useful)
- `scripts/run-evals.mjs`
- `lib/telemetry.ts`
- `app/api/feedback/route.ts`
- `package.json` (scripts + applicationinsights dep)
- `INTERFACE_CONTRACT.md`
- `docs/agents/agent-a-tooling.md`

Agent A must NOT touch:

- `components/TrustPassChat.tsx`
- `lib/situation-service.ts`, `lib/risk-engine.ts`, `lib/system-prompt.ts`, `lib/types.ts`
- `lib/evidence-service.ts`
- `app/api/situation/analyze/*`
- `data/cached_responses/*`
- `.env.example`

## Tasks

### Task 1 — Gold dataset (`data/eval/gold_cases.json`)

50 cases across 5 categories:

- 4 hero cases (WeChat casting Mae Sot, taxi meter, motorbike passport, LINE tour personal account)
- 10 negative cases (legitimately Low scenarios that must not over-classify)
- 10 edge cases (borderline scenarios where Caution↔High proximity is acceptable)
- 8 adversarial cases (prompt injection, evidence/topic mismatch, empty/emoji input, multi-language)
- 18 mid-risk cases spanning the 7 grounded patterns evenly

Each case has:

```json
{
  "id": "wechat-casting-mae-sot-01",
  "tags": ["hero", "emergency", "vision-relevant"],
  "input": {
    "message": "...",
    "city": "Bangkok",
    "language": "English",
    "evidenceText": "...",
    "incidentDateIso": "2026-05-16T12:00:00Z"
  },
  "expected": {
    "risk_level": "Emergency",
    "risk_level_proximity_acceptable": [],
    "category_keywords": ["casting", "luring", "trafficking", "Mae Sot"],
    "must_include_signals": ["Travel toward Mae Sot, Myanmar, or border area"],
    "must_not_include_signals": [],
    "min_grounding_tools": ["job_lure_reference"]
  }
}
```

### Task 2 — Eval harness (`scripts/run-evals.mjs`)

Node ESM script. Reads `data/eval/gold_cases.json`. POSTs each case to
`${TRUSTPASS_BASE_URL ?? "http://localhost:3000"}/api/situation/analyze`.

Scores per case:

- `passed` (overall boolean)
- `risk_level_exact`
- `risk_level_proximity` (Caution↔High off-by-one only when listed in `risk_level_proximity_acceptable`; Low↔Emergency always fails)
- `category_match` (any keyword from `category_keywords` appears in returned `category`, case-insensitive)
- `signal_f1` (F1 on `signals` vs `must_include_signals` / `must_not_include_signals`, simple substring match)
- `grounding_tools_present` (must contain every tool in `min_grounding_tools`)
- `latency_ms`

Summary metrics:

- `risk_level_accuracy` (exact)
- `risk_level_proximity` (exact OR allowed proximity)
- `category_recall`
- `signal_f1` (macro avg)
- `grounding_tool_coverage`
- `latency_p50_ms`, `latency_p95_ms`

Outputs:

- `data/eval/results-latest.json` (machine-readable; matches contract shape)
- `data/eval/results-<ISO-timestamp>.md` (human-readable per-case pass/fail with reasoning)

Exits non-zero if `risk_level_accuracy < 0.80`.

### Task 3 — Telemetry (`lib/telemetry.ts`)

Public API:

```ts
export type TelemetryPayload = Record<string, string | number | boolean | null | string[]>;
export function logEvent(eventName: string, payload: TelemetryPayload): void;
export function hashInput(input: string): string;
export function redactPII(text: string): string;
export function newRequestId(): string;
```

Behavior:

- If `APPLICATIONINSIGHTS_CONNECTION_STRING` is set, send custom events via `applicationinsights`.
- Otherwise, log a single JSON-line per event to `console.log` so Vercel logs are greppable.
- Never throw — fail silently.
- PII redaction patterns:
  - Passport numbers `[A-Z]{1,2}\d{6,9}`
  - Thai phone `0\d{8,9}`
  - International phone `\+\d{6,15}`
  - Email `\S+@\S+\.\S+`
  - Thai national ID `\d{1}-\d{4}-\d{5}-\d{2}-\d{1}`
  - Replace each match with `[REDACTED]`.
- `hashInput` returns SHA-256 hex of the input.
- `newRequestId` returns `crypto.randomUUID()`.

### Task 4 — Feedback endpoint (`app/api/feedback/route.ts`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logEvent("trustpass.feedback", {
      request_id: body?.request_id ?? null,
      rating: body?.rating ?? null,
      reason: body?.reason ?? null
    });
  } catch {
    // swallow errors silently so UI never breaks
  }
  return NextResponse.json({ ok: true });
}
```

### Task 5 — `package.json` updates

- Add script: `"test:eval": "node scripts/run-evals.mjs"`
- Add dependency: `applicationinsights` (use `npm install applicationinsights` to pick latest stable; do not invent a version).

### Task 6 — `data/eval/README.md`

Document:

- What the gold set is and how it is structured.
- How to run evals locally (`npm run dev` in one shell, `npm run test:eval` in another).
- How to add new cases without breaking the harness.
- How `risk_level_proximity_acceptable` and the substring signal F1 work.

## Verification

1. `npm run build` must succeed with zero TypeScript errors.
2. `npm run lint` must pass (warnings OK, no errors).
3. If `.env.local` has working Azure creds, run the dev server and execute `npm run test:eval`. Record the accuracy + p95 latency in the final report. The `≥ 0.80` floor is a soft target post-merge; do not fail the agent for missing the bar.
4. If Azure is unavailable or the dev server cannot start in the worktree, skip the eval run and note the blocker.

## Definition of done

- All files in the matrix above are created.
- Branch committed and pushed: `git push -u origin agent-a-tooling`.
- No edits to files owned by B, C, or D.
- `npm run build` and `npm run lint` pass.
- Final report includes: files changed, commit list, eval results (or skip reason), blockers, and manual verification steps.

## Important constraints

- Do NOT touch backend / frontend code outside the file matrix.
- Do NOT use `gh` CLI — push the branch and let the user open the PR via the GitHub web UI.
- Do NOT invent dependency versions — use `npm install <pkg>` for the latest stable.
- Do NOT add gold cases you cannot justify with a clear expected answer.
- If you hit a blocker, commit work-in-progress and call it out in the final summary.
