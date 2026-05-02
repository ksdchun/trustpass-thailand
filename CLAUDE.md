# TrustPass Thailand — Project Context for Claude Code

> This file is the source of truth for Claude Code sessions on this repo.
> It captures decisions made during planning that aren't obvious from the codebase.

---

## What this project is

TrustPass Thailand is a **48-hour hackathon entry** for the Microsoft AIAT Hackathon under the theme **Industrial Digital Transformation**. Submission deadline: **Sunday May 3, 2026, 23:59**.

It is an **Azure AI-powered scam and fraud shield for tourists in Thailand**. Tourists describe a suspicious situation (text + optional image upload), and the app returns a structured risk assessment with actions, Thai phrases, evidence checklist, and incident report.

### One-line pitch
> TrustPass Thailand helps tourists detect suspicious travel situations before they become scams, using Azure AI to turn messy evidence into trusted local guidance and structured incident reports.

### Why this matters (context for the pitch — not for code)
- Thailand earned **USD 48B from 35M tourists in 2024**
- January 2025: Chinese actor **Wang Xing** was lured via WeChat casting offer, transported toward Mae Sot, trafficked into Myanmar scam compound
- Within weeks, **~10,000 Chinese tourists cancelled** Thailand trips
- TAT launched the "Trusted Thailand Stamp" in 2025 — trust is now a national tourism priority
- Existing tools (Tourist Police i lert u, ChatGPT) help **after** harm, not **before**
- TrustPass fills the **before-incident gap**

---

## Strategic positioning (DO NOT drift from this)

This project is **NOT** a tourist chatbot. It is **trust infrastructure for the tourism industry**. When generating any content (UI copy, slides, README), frame it as:

- ✅ "Trust Infrastructure for Thailand's $48B tourism industry"
- ✅ "Preventive layer between tourist, operator, and authority"
- ✅ "Multi-modal evidence pipeline using 3 Azure AI services"
- ❌ "AI chatbot for tourists" ← this is what we are AVOIDING
- ❌ "ChatGPT for travelers" ← actively rejected positioning

The differentiator vs ChatGPT is:
1. Thailand-specific knowledge (Mae Sot = trafficking corridor, real taxi fares, TAT license format)
2. Multi-modal: text + OCR of Thai documents + (optionally) location/route context
3. Structured workflow output, not freeform chat
4. B2G angle: aggregated signals → TAT/police preventive intelligence

---

## Scope decisions (locked — do not expand)

We have ~34 hours and 1 dev. The original team brief had 4 scenarios and 7 Azure services. **We have explicitly cut scope to:**

### Hero scenario (the ONE we demo live)
**Fake casting/job luring (Wang Xing-style)** — WeChat message offering modeling/casting work that involves border province travel, secrecy, and phone confiscation. This is the wow moment of the pitch.

### Secondary scenarios (shown as screenshots in slides only, not built)
- Taxi overcharging (Siam → Wat Pho, "meter broken", 800 THB)
- Motorbike rental passport retention (Phuket Patong)
- Tour booking via LINE with personal account payment

### Pages to build
Only **one page**: `/check`

Do NOT build:
- `/dashboard` (mockup screenshot in slides only)
- `/scenarios`, `/architecture`, `/` landing — single page is enough for hackathon demo
- Authentication, accounts, real database — use in-memory state
- Real operator verification — JSON file is enough

### Azure services used
| Service | Status | Purpose |
|---|---|---|
| Azure OpenAI (gpt-4o-mini) | ✅ Required | Risk reasoning + JSON output |
| Azure AI Document Intelligence | ✅ Required | OCR Thai/English/Chinese from uploaded images |
| Azure Maps | ⚠️ Optional, only if time permits | Static map showing Mae Sot location |
| Azure Vision | ❌ Cut | Not needed for hero scenario |
| Azure AI Search | ❌ Cut | Use local JSON instead |
| Cosmos DB | ❌ Cut | In-memory only |

---

## Tech stack

- **Framework:** Next.js (App Router, TypeScript)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS (Microsoft blue theme: `#0078D4` primary, white background, dark mode optional)
- **AI SDK:** `openai` package configured against Azure OpenAI endpoint
- **OCR SDK:** `@azure/ai-form-recognizer` (Document Intelligence)

### Environment variables
```
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_KEY=<key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
```

---

## File structure

```
/
├── CLAUDE.md                          # this file
├── system_prompt.md                   # Azure OpenAI system prompt + API code example
├── risk_patterns.json                 # Thailand scam patterns (10 patterns)
├── mock_evidence.md                   # 4 demo scenarios with expected outputs
├── app/
│   ├── layout.tsx                     # Root layout, Microsoft theme
│   ├── page.tsx                       # Redirect to /check or simple landing
│   ├── check/
│   │   └── page.tsx                   # Main demo page (the one users hit)
│   └── api/
│       ├── check/route.ts             # POST: situation analysis with Azure OpenAI
│       └── ocr/route.ts               # POST: image upload → Document Intelligence
├── lib/
│   ├── azure-openai.ts                # Azure OpenAI client setup
│   ├── azure-doc-intelligence.ts      # Document Intelligence client setup
│   ├── risk-patterns.ts               # imports risk_patterns.json
│   └── types.ts                       # RiskAssessment, Signal, etc.
├── components/
│   ├── SituationInput.tsx             # textarea + image upload + city select
│   ├── RiskCard.tsx                   # main result display
│   ├── SignalList.tsx
│   ├── ActionList.tsx
│   ├── ThaiPhraseCard.tsx
│   ├── EvidenceChecklist.tsx
│   └── IncidentReport.tsx
├── public/
│   └── mock_evidence/
│       ├── wechat_casting.png         # the hero demo screenshot
│       ├── taxi_situation.png
│       ├── motorbike_contract.png
│       └── line_tour_booking.png
└── data/
    └── cached_responses/              # Azure OpenAI responses cached for demo fallback
        ├── wechat_casting.json
        ├── taxi.json
        ├── motorbike.json
        └── tour.json
```

---

## API contract

### POST `/api/check`

**Request:**
```json
{
  "situation": "string",
  "ocrText": "string | null",
  "city": "Bangkok" | "Phuket" | "Pattaya" | "Chiang Mai",
  "language": "en" | "zh" | "th"
}
```

**Response:** see `system_prompt.md` for full JSON schema. Top-level fields:
```
risk_level, risk_score, category, headline, signals[], local_context,
actions[], thai_phrase, evidence_to_save[], contact_recommendation,
incident_report, disclaimer
```

### POST `/api/ocr`

**Request:** `multipart/form-data` with `image` field
**Response:** `{ "text": "string", "language_detected": "string" }`

---

## Risk levels and UI colors

| Level | Color | Hex | Score range |
|---|---|---|---|
| `low` | green | `#107C10` | 0-25 |
| `caution` | yellow | `#FFB900` | 26-55 |
| `high` | orange | `#D83B01` | 56-80 |
| `emergency` | red | `#A4262C` | 81-100 |

---

## Demo fallback strategy (CRITICAL)

Azure API can be slow or fail during live demo. **Always cache the 4 demo responses** in `/data/cached_responses/`. The `/check` page should:

1. Try real Azure OpenAI call with 5-second timeout
2. On timeout/error, fall back to cached response matching the input
3. Never show a raw error to the user during demo

There should be an environment flag `DEMO_MODE=true` that **always returns cached responses** — use this for the recorded video pitch to guarantee zero failures.

---

## What we are explicitly NOT building

- User authentication / accounts
- Persistent database / Cosmos DB
- Real operator verification system
- Real police/embassy integration
- Payment processing
- Multiple language UI (English UI only; Thai/Chinese only inside AI responses)
- Mobile native apps
- Complex routing logic
- Legal advice / medical advice
- Real-time location tracking

If a request expands scope into any of the above, **push back and remind that we have ~34 hours**.

---

## Disclaimers (must appear in UI)

The risk card must display:

> **This is a risk assessment based on observed signals, not a legal accusation. Always verify before acting. In emergencies call Tourist Police 1155.**

The system never says "this business is a scam" or "this person is a criminal." It says "the situation contains risk signals consistent with [pattern]."

---

## Development priorities (in order)

1. ✅ Azure setup (OpenAI + Document Intelligence) — block everything else if not done
2. Build `/check` page UI with mock data first (no API calls)
3. Wire up `/api/check` with system prompt + risk_patterns.json
4. Wire up `/api/ocr` for image upload
5. Generate and cache the 4 demo responses
6. Polish UI (Microsoft theme, smooth transitions, mobile responsive)
7. Deploy to Vercel
8. Record video demo with `DEMO_MODE=true`

---

## Pitch story (for context — affects copy choices)

The pitch opens with the Wang Xing case. Every UI element should support this narrative:
- The hero demo example IS Wang Xing-style WeChat luring
- The risk card prominently shows "Mae Sot" detection
- The contact recommendations include Chinese embassy
- The incident report is generated in English + Thai (+ Chinese for hero scenario)

---

## Team

- 1 dev (Next.js/React) — code
- 1 data scientist — system prompt tuning, mock data, response quality
- 2 students — slides, video, pitch script, mock screenshot creation

When generating code, assume **single dev working alone** — keep components simple, avoid premature abstraction, prefer inline JSX over deeply nested component trees.

---

## Common commands

```bash
# Dev
npm run dev

# Type check
npm run typecheck

# Build
npm run build

# Test risk pattern matching against mock scenarios
npm run test:scenarios
```

---

## When in doubt

- Cut scope, don't expand it.
- Cache the demo response, don't trust live API at pitch time.
- Position as infrastructure, not chatbot.
- Lead with Wang Xing case, not taxi overcharging.
- One page done well > four pages half-built.