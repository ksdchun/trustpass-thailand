# TrustPass Thailand — Project Context for Claude Code

> Source of truth for Claude Code sessions on this repo. Captures decisions made
> during planning that aren't obvious from the codebase. Also read
> `INTERFACE_CONTRACT.md`, `PITCH_PREP.md`, and `DEMO_SCRIPT.md` for the cross-
> agent contracts, pitch framing, and recording instructions.

---

## What this project is

TrustPass Thailand is a **48-hour hackathon entry** for the Microsoft AIAT
Hackathon under the theme **Industrial Digital Transformation**. Submission
deadline: **Sunday May 3, 2026, 23:59**.

It is an **Azure AI-powered scam and fraud shield for tourists in Thailand**.
Tourists describe a suspicious situation (text + optional image upload), and
the app returns a structured risk assessment with grounded signals, safe next
steps, a Thai phrase, an evidence checklist, and an incident report.

### One-line pitch

> TrustPass Thailand is trust infrastructure for Thailand's tourism industry —
> a preventive layer between tourist, operator, and authority that turns messy
> evidence into trusted local guidance and structured incident reports.

### Why this matters (context for the pitch — not for code)

- Thailand earned **USD 48B from 35M tourists in 2024**
- January 2025: Chinese actor **Wang Xing** was lured via a WeChat casting
  offer, transported toward Mae Sot, and trafficked into a Myanmar scam
  compound
- Within weeks, **~10,000 Chinese tourists cancelled** Thailand trips
- TAT launched the **"Trusted Thailand Stamp"** in 2025 — trust is now a
  national tourism priority
- Existing tools (Tourist Police i-lert-u, ChatGPT) help **after** harm, not
  **before**. TrustPass fills the **before-incident** gap.

---

## Strategic positioning (DO NOT drift from this)

This project is **NOT** a tourist chatbot. It is **trust infrastructure for
the tourism industry**. When generating any content (UI copy, slides, README),
frame it as:

- ✅ "Trust Infrastructure for Thailand's $48B tourism industry"
- ✅ "Preventive layer between tourist, operator, and authority"
- ✅ "Multi-modal evidence pipeline using three Azure AI services"
- ❌ "AI chatbot for tourists" ← actively avoided
- ❌ "ChatGPT for travelers" ← actively rejected

The differentiator vs ChatGPT is:

1. Thailand-specific deterministic grounding (Mae Sot = trafficking corridor,
   real taxi fares, TAT license format, Bangkok food tiers) that runs
   **before** the model sees the prompt
2. Multi-modal: text + OCR of Thai / English / Chinese documents + optional
   geolocation context
3. Strict-schema JSON workflow output (risk level, signals, next steps, Thai
   phrase, evidence checklist, incident report), not freeform chat
4. B2G angle: aggregated signals → TAT / Tourist Police preventive
   intelligence via the `/dashboard` route

---

## Hero scenario (the one we demo live)

**Fake casting / job luring (Wang Xing-style)** — WeChat message offering paid
casting work that involves border-province travel, secrecy, free airport
pickup, and passport / phone retention. This is the wow moment of the pitch.
The hero asset lives at `public/evidence/wechat_casting.png` and is
referenced by the WeChat sample chip in `components/TrustPassChat.tsx`.

### Secondary scenarios (built and demoable, not the hero)

- Taxi overcharging (Siam → Wat Pho, "meter broken", 800 THB) — `public/evidence/taxi_situation.png`
- Motorbike rental passport retention (Pattaya) — `public/evidence/motorbike_contract.png`
- Tour booking via LINE with personal account payment — `public/evidence/line_tour_booking.png`
- QR / PromptPay account name mismatch — `public/evidence/qr_mismatch.png`
- Jet-ski damage cash pressure (Patong) — `public/evidence/jet_ski_damage.png`
- Tuk-tuk "temple closed, gem shop instead" — `public/evidence/tuktuk_detour.png`

### Pages built (expanded multi-page scope — intentional)

The earlier "one page only" decision was revisited during build. The hackathon
deliverable now includes a full clickable site to make the pitch landable
without the live demo:

- `/` — landing page with the trust crisis framing and risk ladder
- `/check` — main risk-check workspace (the live demo target)
- `/dashboard` — B2G preventive-intelligence dashboard (Mae Sot heatmap +
  recent reports)
- `/scenarios` — guided product scenarios with sample chips
- `/architecture` — Azure AI architecture diagram
- `/welcome` — hotel QR onboarding flow (answers the "how do tourists
  discover this?" question in 5 seconds)
- `/responsible-ai` — model card, eval methodology, failure modes, bias
  statement, data sources, escalation guidance (linked from footer)

### Still out of scope

- User authentication / accounts
- Persistent database / Cosmos DB
- Real operator verification system (we use a curated demo JSON list)
- Real police / embassy integration
- Payment processing
- Multi-language UI chrome (English UI only; the AI responds in EN / TH / ZH)
- Mobile native apps
- Legal advice / medical advice
- Real-time location tracking

If a request expands scope into any of the above, **push back and remind that
we have a 48-hour hackathon budget**.

---

## Azure services used

| Service                              | Status                          | Purpose                                                          |
|--------------------------------------|---------------------------------|------------------------------------------------------------------|
| Azure OpenAI (GPT-4o)                | Required                        | Risk reasoning + strict-JSON-schema output                       |
| Azure AI Document Intelligence       | Required                        | OCR Thai / English / Chinese from uploaded evidence              |
| Azure AI Content Safety Prompt Shields | Optional (graceful degrade)   | Prompt-injection defense on untrusted OCR text                   |
| Azure Maps                           | Optional (only if time permits) | Route distance for taxi fare grounding; falls back to local data |
| Azure AI Search                      | Cut                             | Replaced by local JSON grounding                                 |
| Cosmos DB                            | Cut                             | In-memory `lib/intelligence-store.ts` only                       |
| Azure Vision                         | Cut                             | Not needed for hero scenario                                     |

The Document Intelligence client uses the raw REST API (no
`@azure/ai-form-recognizer` SDK dependency — dropped during repo hygiene).

---

## Tech stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS with Microsoft Fluent-inspired theme. Primary blue
  `#0078D4`, white background, dark mode supported via `html.dark` class
- **AI SDK:** `openai` package configured against Azure OpenAI's OpenAI-
  compatible v1 endpoint
- **OCR:** Azure Document Intelligence via raw REST (no SDK)

### Environment variables

```env
# Azure OpenAI (required)
AZURE_OPENAI_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>/openai/v1
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_TIMEOUT_MS=12000
AZURE_OPENAI_SEED=42

# Azure AI Services shared endpoint (Document Intelligence; required)
AZURE_AI_SERVICES_ENDPOINT=https://<resource>.cognitiveservices.azure.com
AZURE_AI_SERVICES_API_KEY=<key>

# Optional explicit Document Intelligence override
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=
AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS=10000

# Azure Content Safety Prompt Shields (optional, graceful degrade)
AZURE_CONTENT_SAFETY_ENDPOINT=
AZURE_CONTENT_SAFETY_KEY=

# Optional Azure Maps for live route distance
AZURE_MAPS_KEY=
AZURE_MAPS_TIMEOUT_MS=5000

# Hackathon demo flag — true forces cached responses, zero Azure dependency
DEMO_MODE=false

# Optional telemetry
APPLICATIONINSIGHTS_CONNECTION_STRING=
```

> Use `AZURE_OPENAI_API_KEY`, not `AZURE_OPENAI_KEY`. Older docs may say
> `AZURE_OPENAI_KEY`; that key name is no longer read.

---

## File structure (actual layout)

```
/
├── CLAUDE.md                              # this file
├── README.md
├── INTERFACE_CONTRACT.md                  # cross-agent contract (read first)
├── PITCH_PREP.md                          # pitch + Q&A drilled answers
├── DEMO_SCRIPT.md                         # beat-by-beat recording instructions
├── PROJECT_OVERVIEW.md                    # product framing
├── TrustPass-Thailand-Team-Brief.md       # original team brief (historical)
├── app/
│   ├── layout.tsx                         # Root layout, Fluent theme
│   ├── page.tsx                           # Landing page (`/`)
│   ├── check/page.tsx                     # Main risk-check page
│   ├── dashboard/page.tsx                 # B2G preventive intelligence dashboard
│   ├── scenarios/page.tsx                 # Guided product scenarios
│   ├── architecture/page.tsx              # Azure AI architecture diagram
│   ├── welcome/page.tsx                   # Hotel QR onboarding flow
│   ├── responsible-ai/page.tsx            # Model card + eval + bias + data sources
│   └── api/
│       ├── situation/analyze/route.ts     # Main rich analysis endpoint
│       ├── risk-check/route.ts            # Legacy compatibility endpoint
│       ├── extract/route.ts               # Evidence OCR
│       ├── evidence/extract/route.ts      # Equivalent OCR used by backend tests
│       ├── intelligence/route.ts          # Dashboard data
│       ├── feedback/route.ts              # Thumbs up / down telemetry
│       └── azure-chat/route.ts            # Legacy direct chat (not used by UI)
├── components/
│   ├── TrustPassChat.tsx                  # ONE big component: chat UI, OCR readout, result cards, clarification flow
│   ├── SiteNav.tsx                        # Top nav + footer responsible-ai link
│   ├── ThaiHeatmap.tsx                    # SVG Thailand heatmap for dashboard
│   └── ThemeToggle.tsx                    # Light / dark toggle
├── lib/
│   ├── situation-service.ts               # Orchestration, clarification, Azure call, DEMO_MODE short-circuit
│   ├── risk-engine.ts                     # Local pattern matching + prompt construction
│   ├── system-prompt.ts                   # Single source of truth for the system prompt
│   ├── evidence-service.ts                # Document Intelligence wrapper
│   ├── evidence-hints.ts                  # OCR hint extraction
│   ├── grounding-tools.ts                 # Deterministic location/food/taxi/tour/QR/rental/damage/job-lure grounding
│   ├── intelligence-store.ts              # In-memory dashboard store + pre-seed
│   ├── relevance.ts                       # Evidence relevance classification
│   ├── sanitize-evidence.ts               # OCR sanitization before model context
│   ├── schemas.ts                         # JSON schema for strict-mode responses
│   ├── telemetry.ts                       # Public `logEvent(event, payload)` for App Insights
│   ├── types.ts                           # Shared types (RiskLevel, GroundingSignal, CompletedResponse, etc.)
│   ├── demo-content.ts                    # Static page content (scenarios, evidence cards, nav items)
│   └── azure-openai.ts                    # Azure OpenAI client setup (when present)
├── public/
│   ├── trustpass-risk-ladder.png          # 4-level color ladder used on landing
│   ├── trustpass-architecture-current.svg # Architecture diagram
│   ├── trustpass-product-flow-current.svg # Product flow diagram
│   └── evidence/                          # Synthetic demo evidence shown in scenarios and chips
│       ├── wechat_casting.png             # HERO asset (Wang Xing-style WeChat lure)
│       ├── taxi_situation.png
│       ├── motorbike_contract.png
│       ├── line_tour_booking.png
│       ├── qr_mismatch.png
│       ├── jet_ski_damage.png
│       ├── tuktuk_detour.png
│       └── *-demo.png                      # Older legacy filenames still referenced by lib/demo-content.ts
├── data/
│   ├── risk_patterns.json                 # Thailand scam patterns (10 patterns)
│   ├── taxi_fare_reference.json           # Bangkok routes + flag-fall baselines
│   ├── food_price_reference.json          # Bangkok venue tiers + item bands
│   ├── verified_operators.demo.json       # Demo TAT-licensed operators
│   ├── emergency_contacts.json            # Tourist Police, embassies, hotel emergency
│   ├── location_context.json              # Zones, neighborhoods, known venues
│   ├── thai_phrases.json                  # Reusable Thai phrases by situation type
│   ├── damage_claim_reference.json        # Rental damage references (jet-ski, motorbike)
│   ├── demo_cases.json                    # Static demo scenarios
│   ├── cached_responses/                  # DEMO_MODE answers (4 hero scenarios)
│   └── eval/                              # Eval gold set + run results
├── scripts/
│   ├── build-agent-d-assets.ps1           # Generates evidence + risk-ladder PNGs
│   ├── generate-demo-evidence.ps1         # Generates demo-evidence/ legacy assets
│   ├── run-evals.mjs                      # Eval harness (writes data/eval/results-latest.json)
│   ├── test-backend-contract.mjs          # Backend scenario contract tests
│   └── test-azure-openai.mjs              # Azure OpenAI connectivity smoke test
└── demo-evidence/                          # Legacy synthetic evidence (OCR test set)
```

---

## API contract (current)

### `POST /api/situation/analyze`

Main rich analysis endpoint. See `INTERFACE_CONTRACT.md` for the exact request
and response shapes. Top-level response statuses:

- `completed` — full risk assessment with grounding, trusted operator card,
  community corroboration line
- `needs_clarification` — one targeted follow-up question with suggested
  answers
- `evidence_mismatch` — typed situation and OCR conflict; ask which to analyze
- `out_of_scope` — input is not tourism-related; respond politely
- `degraded` — Azure schema validation failed or Azure unreachable; local
  fallback shape returned with `reason` and `reason_text`

The endpoint supports an optional `evidenceImage` base64 data URL for
multi-modal evidence (vision is read when configured).

### `POST /api/extract` and `POST /api/evidence/extract`

`multipart/form-data` with `image` field; returns OCR text plus detected hints
(prices, phone numbers, account names, business names, place names, risky
phrases, visible dates) and a relevance classification.

### `POST /api/feedback`

`{ "request_id": "uuid", "rating": "up" | "down", "reason": "optional" }`.
Always returns 200; fails silently to avoid blocking UI.

### `GET /api/intelligence`

Read-only dashboard data — recent eligible reports + heatmap counts. Only
Caution / High / Emergency cases are recorded.

### `POST /api/risk-check`

Backward-compatible legacy endpoint that returns the original
`RiskCheckResult` shape (no clarification / out-of-scope variants). Kept so the
backend contract test in `scripts/test-backend-contract.mjs` continues to pass.

---

## Risk levels and UI colors

| Level     | Color  | Hex      | Tailwind class          | Range     |
|-----------|--------|----------|-------------------------|-----------|
| Low       | green  | #107C10  | `text-risk-low`         | 0–25      |
| Caution   | yellow | #FFB900  | `text-risk-caution`     | 26–55     |
| High      | orange | #D83B01  | `text-risk-high`        | 56–80     |
| Emergency | red    | #A4262C  | `text-risk-emergency`   | 81–100    |

Defined in `tailwind.config.ts` as `risk.low | caution | high | emergency`.
The risk ladder PNG at `public/trustpass-risk-ladder.png` shows these colors
with one example each.

---

## DEMO_MODE and the cached-response contract

Azure can be slow or fail during a live demo. To guarantee zero failures on
tape:

- `DEMO_MODE=true` in `.env.local` short-circuits Azure OpenAI calls in
  `lib/situation-service.ts` and returns a hand-tuned cached response from
  `data/cached_responses/<scenario>.json`.
- The short-circuit picks a cache file based on case-insensitive keywords in
  the input (see `INTERFACE_CONTRACT.md` for the keyword routing table).
- Cached responses have `source: "demo-mode-cache"`; live responses have
  `source: "azure-openai"`; local pattern matches have `source: "local-demo"`.
- For the recorded video, set `DEMO_MODE=true` and re-test all five demo
  beats; for the deployed Vercel site that judges can click, leave
  `DEMO_MODE=false` so they see real Azure latency and grounding.

The fallback ladder is:

1. `DEMO_MODE=true` → cache (instant)
2. Live Azure OpenAI call with a 5-second timeout
3. On timeout / error → `local-demo` response from the local risk engine
4. On schema validation failure → `degraded` status with the local-demo
   payload and a human-readable `reason_text` shown in the UI

The user never sees a raw error.

---

## Disclaimers (must appear in UI)

Every result card surfaces a variant of:

> This is a risk assessment based on observed signals, not a legal accusation.
> Always verify before acting. In emergencies call Tourist Police 1155.

The system never says "this business is a scam" or "this person is a
criminal." It says "the situation contains risk signals consistent with
[pattern]." Escalation is proportional: Low → no escalation, Caution →
hotel / verified operator, High → pause and verify (1155 only if pressured),
Emergency → 1155, embassy, hotel security.

---

## Pitch story (for context — affects copy choices)

The pitch opens with the Wang Xing case. Every UI element should support this
narrative:

- The hero demo example IS Wang Xing-style WeChat luring
- The risk card prominently shows "Mae Sot" detection
- The contact recommendations include the Chinese embassy
- The incident report is generated in English + Thai (+ Chinese for the hero
  scenario)

`PITCH_PREP.md` has the full 5-minute structure, the 10 most-likely Q&A
answers (each drilled to ~30 seconds crisp + ~30 seconds backup), and the
honest limitation we volunteer in the close.

---

## Cross-agent contracts and parallel build

This repo was built using four parallel agents in isolated git worktrees:

| Agent | Branch              | Owns                                                          |
|-------|---------------------|---------------------------------------------------------------|
| A     | `agent-a-tooling`   | Eval harness, telemetry, feedback endpoint                    |
| B     | `agent-b-backend`   | Situation service, strict schema, sanitize, cached responses, DEMO_MODE plumbing |
| C     | `agent-c-frontend`  | TrustPassChat, dashboard, scenarios, welcome, SiteNav, operator card |
| D     | `agent-d-static`    | /responsible-ai, evidence assets, risk ladder, DEMO_SCRIPT, CLAUDE.md, repo hygiene |

Merge order: **A → B → D → C**.

`INTERFACE_CONTRACT.md` pins every cross-agent interface (type shapes, env
vars, JSON schemas, CSS data-attribute hooks). Read it before touching
anything that crosses an agent boundary.

---

## Common commands

```powershell
# Dev
npm run dev

# Build (must be clean before recording)
npm run build

# Lint
npm run lint

# Backend contract test (requires localhost dev server running)
npm run test:backend

# Azure OpenAI connectivity smoke test
npm run test:azure

# Generate /responsible-ai page assets and risk ladder
powershell -ExecutionPolicy Bypass -File scripts/build-agent-d-assets.ps1

# Generate the legacy demo-evidence/ OCR test set
powershell -ExecutionPolicy Bypass -File scripts/generate-demo-evidence.ps1

# Run eval harness (writes data/eval/results-latest.json)
node scripts/run-evals.mjs
```

---

## When in doubt

- Cut scope, don't expand it.
- Cache the demo response; don't trust live API at pitch time.
- Position as infrastructure, not chatbot.
- Lead with Wang Xing case, not taxi overcharging.
- The hero demo on `/check` is the proof; the dashboard cut is the payoff.
- `INTERFACE_CONTRACT.md` is the source of truth for any cross-agent change.
- `DEMO_SCRIPT.md` is the source of truth for the recorded video.
- `PITCH_PREP.md` is the source of truth for live Q&A.
