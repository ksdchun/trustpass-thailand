# TrustPass Thailand: Project Overview

## One-Line Pitch

TrustPass Thailand is an Azure AI-powered scam and fraud shield that helps tourists check suspicious situations before they pay, travel, rent, or follow instructions in Thailand.

## Problem

Thailand tourism trust can be damaged by scams and fraud at multiple levels:

- everyday transport overcharging
- fake tour bookings and advance payment fraud
- QR/payment account mismatch
- rental shops using passports as leverage
- rental damage cash pressure
- misleading tuk-tuk/shop detours
- high-risk fake job or casting luring linked to border/scam-compound fears
- confusing food/menu prices where tourists cannot tell whether the price is normal for the venue

The product focuses on the uncertain moment before harm happens. Instead of only helping after an incident, TrustPass helps a tourist decide whether to proceed, verify, pause, or escalate.

## Solution

TrustPass gives tourists a mobile-friendly universal chat interface where they can:

- describe what is happening in natural language
- attach evidence such as screenshots, receipts, contracts, menus, QR payment screens, or chat logs
- provide city, date, and optional location context
- receive a grounded scam/fraud risk assessment

The result includes:

- risk level: `Low`, `Caution`, `High`, or `Emergency`
- interpreted suspicious signals, not raw keyword matches
- why the situation matters
- safe next steps
- Thai phrase to show or say
- evidence checklist
- recommended support level
- incident report summary
- grounding details such as taxi fare estimates or food price comparisons

## Current Product Flow

1. Tourist opens `/check`.
2. Tourist describes the suspicious situation.
3. Tourist optionally uploads evidence.
4. Azure AI Document Intelligence extracts OCR text from evidence when configured.
5. Local deterministic scope, evidence-consistency, and grounding tools run first.
6. If the input is unrelated, the app returns `out_of_scope` instead of forcing a scam score.
7. If typed situation and uploaded evidence conflict, the app returns `evidence_mismatch` and asks which case to analyze.
8. If context is genuinely ambiguous, `/api/situation/analyze` returns `needs_clarification`.
9. The UI asks one follow-up question with suggested answers or a free-text answer.
10. After clarification, the backend returns a completed result.
11. Azure OpenAI is used for final reasoning/generation when configured; local fallback keeps the demo usable.
12. Only eligible `Caution`, `High`, and `Emergency` checks are recorded into the demo intelligence dashboard.

## Core Backend Design

The backend deliberately uses deterministic grounding before Azure OpenAI. This prevents generic model over-warning and keeps important cases stable during judging.

Main APIs:

- `POST /api/situation/analyze`
  - Main rich analysis endpoint.
  - Supports clarification, out-of-scope, and evidence-mismatch responses.
  - Records only completed checks with `Caution` or higher risk.
- `POST /api/risk-check`
  - Backward-compatible legacy endpoint.
  - Returns the original `RiskCheckResult` shape.
- `POST /api/extract`
  - Upload evidence file and return OCR text plus detected hints.
- `POST /api/evidence/extract`
  - Equivalent evidence extraction endpoint used by backend tests.
- `GET /api/intelligence`
  - Demo dashboard data.

Important response behavior:

- Food/menu ambiguity can ask for venue/location clarification.
- QR/account ambiguity can ask whether the account matches the business.
- Clear High/Emergency non-food cases bypass clarification.
- Low-risk cases avoid police escalation.
- Low-risk, out-of-scope, and evidence-mismatch-only responses are not counted in dashboard intelligence.

## Grounding Tools Implemented

### Food/Menu Price Grounding

Bangkok MVP food grounding uses curated JSON data and item-level comparisons.

Covered tiers:

- street food / local stall
- local casual restaurant
- mall food court
- department-store or higher-end mall restaurant
- premium/famous venue

Important behavior:

- Jay Fai / premium venue prices are not treated as scams by price alone.
- If GPS is near Jay Fai but the OCR does not show the venue name, the app asks for confirmation.
- If an expensive menu has no venue/location context, the app asks for context.
- OCR noisy prices like `1,500 baht` and `1,200 baht` are now parsed correctly.
- Regression test confirms Crab omelette maps to `1500` and noodles map to `800`.

### Taxi / Transport Grounding

Bangkok taxi grounding uses route/distance estimates and fare references.

Important behavior:

- `50 THB` from Siam to Wat Pho is Low when no suspicious signal exists.
- `meter broken + 800 baht` from Siam to Wat Pho becomes Caution/High.
- Detected signals are interpreted, for example:
  - `Meter refusal or meter unavailable`
  - `Fixed fare quote above route baseline`

Azure Maps is optional. If no `AZURE_MAPS_KEY` is configured, the backend uses curated local route estimates.

### Tour / Payment Fraud Grounding

Detects:

- full advance payment requested
- personal bank account transfer
- missing operator/TAT license details
- informal LINE-only seller
- time pressure

Clear fake-tour payment cases now bypass restaurant/menu clarification even if OCR includes baht prices or the word “Price.”

### QR / Account Mismatch Grounding

Detects:

- personal or mismatched account name
- QR payment before identity is verified
- missing/unclear business identity

If the case is ambiguous, the app asks whether the account name matches the business. If it is clearly part of tour/payment fraud, it completes as High instead of asking.

### Rental / Passport Grounding

Detects:

- original passport requested as deposit
- unclear deposit or contract terms
- vehicle rental leverage risk

Recommended safer path: passport copy plus deposit, written terms, receipt, and before/after photos.

### Rental Damage Pressure Grounding

Detects:

- large immediate cash demand
- no receipt or written damage estimate
- pressure to avoid police/insurer/neutral process
- rental damage claim under pressure

### Fake Job / Casting Lure Grounding

Detects:

- informal job/casting offer
- controlled pickup or free transport
- Mae Sot / Myanmar / border travel
- secrecy or isolation instruction

This is treated as Emergency.

### Tuk-Tuk / Detour Pattern

The pattern data includes temple-closed / gem-shop / tailor-shop detour cases. This is currently represented in scenarios and local risk patterns, but could still be expanded with a dedicated grounding card later.

## Current Demo Routes

- `/` - product overview and problem framing
- `/check` - live chat + evidence risk check
- `/scenarios` - guided product scenarios
- `/dashboard` - B2G tourism trust intelligence dashboard
- `/architecture` - Azure AI architecture
- `/playground` - hidden from navigation and redirects to `/check`

## Scenario Coverage

The Scenario page now covers:

1. normal taxi fare
2. taxi overcharging
3. Jay Fai / premium menu context
4. high street-food price clarification
5. fake tour payment OCR
6. QR/account mismatch
7. passport retention
8. rental damage pressure
9. tuk-tuk detour
10. fake casting/job luring

## Azure AI Configuration

Local secrets live in `.env.local`, which is ignored by git.

Required for Azure OpenAI:

```env
AZURE_OPENAI_ENDPOINT=https://trustpass-resource.services.ai.azure.com/api/projects/trustpass/openai/v1
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_TIMEOUT_MS=12000
```

Required for OCR:

```env
AZURE_AI_SERVICES_ENDPOINT=https://trustpass-resource.cognitiveservices.azure.com
AZURE_AI_SERVICES_API_KEY=your-key
AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS=10000
```

`AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` and `AZURE_DOCUMENT_INTELLIGENCE_KEY` are optional overrides. If unset, OCR uses the shared Azure AI Services endpoint/key. The service can also infer `https://<resource>.cognitiveservices.azure.com` from compatible Azure endpoints.

Optional for live route distance:

```env
AZURE_MAPS_KEY=your-azure-maps-key
AZURE_MAPS_TIMEOUT_MS=5000
```

## Verification Status

Last successful checks before handoff:

```powershell
corepack pnpm build
```

The backend contract test is:

```powershell
corepack pnpm test:backend
```

Important: `test:backend` calls the running localhost server through `TRUSTPASS_BASE_URL` or `http://localhost:3000`. Restart the server after code changes before running this test, otherwise it may test an old process.

Azure access was verified after `.env.local` was created:

- Azure OpenAI returned `{"status":"ok","product":"TrustPass Thailand"}`.
- Azure Document Intelligence extracted real OCR from the realistic Jay Fai menu image.

## Git / Collaboration Notes

Current branch:

```text
codex/ai-grounding-integration
```

Remotes:

- `origin`: `https://github.com/ksdchun/trustpass-thailand.git`
- `kim`: `https://github.com/kim-yukonthorn/trustpass-thailand.git`
- `private`: `https://github.com/ksdchun/trustpass-thailand-ai-backend-private.git`

Work should continue from the private remote first. Do not push directly to Kim’s repository until ready for a PR.

## Important Files

- `components/TrustPassChat.tsx` - main live demo UI, clarification flow, OCR readout, result cards
- `lib/situation-service.ts` - main orchestration, clarification rules, Azure OpenAI call
- `lib/grounding-tools.ts` - deterministic grounding for location, food, taxi, tour/payment, rental, damage, job lure
- `lib/evidence-service.ts` - Azure Document Intelligence OCR with fallback
- `lib/evidence-hints.ts` - OCR hint extraction
- `lib/risk-engine.ts` - local pattern matching and prompt construction
- `data/food_price_reference.json` - Bangkok food tier/item references
- `data/risk_patterns.json` - local scam patterns
- `scripts/test-backend-contract.mjs` - backend scenario contract tests

## Suggested Next Work

1. Restart localhost and rerun `corepack pnpm test:backend`.
2. Manually test fake-tour OCR screenshot and confirm it returns High, not restaurant clarification.
3. Manually test `/scenarios` after restart to confirm the expanded scenario list is visible.
4. Consider adding a dedicated tuk-tuk detour grounding card.
5. Consider adding sample-evidence buttons for each scenario so the committee demo can run without file browsing.
