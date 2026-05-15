# TrustPass Thailand — Eval Harness

This folder contains the gold dataset and eval results for the TrustPass Thailand backend. The harness is owned by Agent A (see `INTERFACE_CONTRACT.md`) and is intended to be run during local development and against staging deploys.

## What is here

- `gold_cases.json` — 50 hand-curated cases that exercise the backend across hero, negative, edge, adversarial, and mid-risk scenarios.
- `results-latest.json` — machine-readable output of the most recent eval run. Overwritten on every run.
- `results-<timestamp>.md` — human-readable run log produced alongside `results-latest.json`.
- `README.md` — this file.

## What the gold set covers

The 50 cases are split into five groups (tags on each case mark the group):

| Group | Count | Purpose |
|---|---|---|
| `hero` | 4 | The pitch demo scenarios. Must classify correctly to pass the demo. |
| `negative` | 10 | Legitimate situations. Must NOT over-classify into Caution/High/Emergency. |
| `edge` | 10 | Borderline cases. `risk_level_proximity_acceptable` allows neighboring levels. |
| `adversarial` | 8 | Prompt injection, mismatched evidence, empty/emoji input, multi-language. |
| `mid` | 18 | Caution/High mixture across taxi, food, payment, rental, tour, QR, tuk-tuk, and job lure patterns. |

## Case shape

Each case is a JSON object with this shape:

```json
{
  "id": "wechat-casting-mae-sot-01",
  "tags": ["hero", "emergency"],
  "input": {
    "message": "string",
    "city": "Bangkok",
    "language": "English",
    "evidenceText": "optional OCR string",
    "incidentDateIso": "2026-05-16T12:00:00Z",
    "clarificationAnswers": { "key": "value" }
  },
  "expected": {
    "risk_level": "Emergency",
    "risk_level_proximity_acceptable": ["High"],
    "category_keywords": ["casting", "luring"],
    "must_include_signals": ["Travel toward Mae Sot, Myanmar, or border area"],
    "must_not_include_signals": ["No strong scam pattern detected"],
    "min_grounding_tools": ["job_lure_reference"]
  }
}
```

### Field guide

- `input.message` is required. `city`, `language`, and `incidentDateIso` are passed through to `/api/situation/analyze`.
- `input.evidenceText` simulates OCR output from the evidence upload flow.
- `input.clarificationAnswers` lets you simulate a user's previous clarification reply.
- `expected.risk_level` is the canonical answer.
- `expected.risk_level_proximity_acceptable` is an array of other acceptable risk levels. Caution↔High proximity counts as "proximity match" but not exact. `Low ↔ Emergency` is never accepted as proximity (the harness enforces this rule).
- `expected.category_keywords` is a list of lower-cased keywords. The eval passes the category check if any keyword appears as a substring of the returned `category` field. An empty array skips the check.
- `expected.must_include_signals` and `expected.must_not_include_signals` are matched via substring containment against the backend's `signals` array (case-insensitive). F1 is computed across required/forbidden signals.
- `expected.min_grounding_tools` lists `tool` values that must appear in the response's `grounding` array. An empty array skips the check.

## How to run the eval

1. Start the Next.js dev server with Azure credentials configured in `.env.local`:

   ```bash
   npm run dev
   ```

2. In a second shell, run the eval:

   ```bash
   npm run test:eval
   ```

3. Look at the summary that prints to stdout, then open the markdown report or `results-latest.json` for details.

### Useful env vars

- `TRUSTPASS_BASE_URL` — defaults to `http://localhost:3000`. Point this at a staging deployment to grade prod.
- `EVAL_TIMEOUT_MS` — per-request timeout for the harness in ms. Default is `25000`.
- `EVAL_ACCURACY_FLOOR` — the minimum `risk_level_accuracy` (0..1) below which the harness exits with a non-zero code. Default is `0.80`.

### How scoring works (per case)

- `risk_level_exact` — strict equality between returned and expected level (status-mapped: `out_of_scope`/`evidence_mismatch` → `Low`, `needs_clarification` → `Caution`).
- `risk_level_proximity` — true if exact, OR if the actual level is in `risk_level_proximity_acceptable` AND the pair is not `Low ↔ Emergency`.
- `category_match` — case-insensitive substring match on any `category_keywords`. Trivially `true` when no keywords are supplied.
- `signal_f1` — F1 over the required signals (precision penalizes any forbidden signals that appear).
- `grounding_tool_coverage` — true if every tool in `min_grounding_tools` shows up in the `grounding` array.

A case is `passed` when: `risk_level_exact` AND (no category keywords OR `category_match`) AND `signal_f1 >= 0.5` AND grounding tools coverage holds.

## How to add a new case

1. Pick the right tag group based on what you're stress-testing.
2. Construct a realistic tourist-facing message + optional evidence text.
3. Write the `expected` block.
   - Be honest about your `risk_level`. If you'd rate it Caution but the system could reasonably go High, set `risk_level_proximity_acceptable: ["High"]`.
   - Only list signals you can justify; the harness penalizes false positives via the F1 forbidden-signals term.
   - Only list grounding tools the backend actually emits today (see `lib/grounding-tools.ts`).
4. Re-run `npm run test:eval` and confirm the case behaves as you expect.
5. Commit `data/eval/gold_cases.json`.

If you can't articulate the right answer for a case, do not add it. The eval is only useful if the gold labels are trustworthy.

## CI guidance

The harness exits non-zero when `risk_level_accuracy < EVAL_ACCURACY_FLOOR`. Hook it into CI once the backend is consistently above the floor; until then, run it as a local guardrail.
