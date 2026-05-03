# TrustPass Thailand Handoff

## Immediate Context

Continue from this local repo:

```text
C:\Users\kasid\Documents\Codex\2026-05-01\i-m-currently-participate-in-microsoft\teammate-trustpass-thailand
```

Current branch:

```text
codex/ai-grounding-integration
```

Private remote to use for this handoff:

```text
private  https://github.com/ksdchun/trustpass-thailand-ai-backend-private.git
```

Do not push directly to Kim’s repo yet. Kim’s repo is the teammate base and should receive this later through a branch/PR when ready.

## What This Project Is

TrustPass Thailand is a Microsoft/Azure AI hackathon product for restoring tourist trust in Thailand. It is a mobile-friendly web app where a tourist can describe a suspicious situation, attach evidence, and receive a grounded risk assessment.

The product is not just a generic chatbot. It combines:

- Azure OpenAI for reasoning and generation
- Azure AI Document Intelligence for OCR
- deterministic local grounding tools for Thailand-specific context
- a clarification-first flow when context is ambiguous
- a dashboard for tourism trust intelligence

## What Was Implemented

### Full-Scale Demo UI

The app has these pages:

- `/` overview landing page
- `/check` live product demo
- `/scenarios` guided scenario walkthroughs
- `/dashboard` B2G tourism trust intelligence dashboard
- `/architecture` Azure AI architecture explanation

The visual style is Microsoft/Azure-inspired with light/dark mode.

The old AI playground is hidden from navigation and redirects to `/check`.

### Risk Check UX

The `/check` page now prioritizes the core workflow:

- Describe Situation is visible first.
- Add Evidence is directly underneath.
- Context controls are in a compact bar above the workspace.
- Check Risk button stays visible/sticky.
- New Check lets the user run another case without leaving the page.

### Azure Integration

`.env.local` was created locally and is ignored by git. It should contain:

```env
AZURE_OPENAI_ENDPOINT=https://trustpass-resource.services.ai.azure.com/api/projects/trustpass/openai/v1
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_TIMEOUT_MS=12000

AZURE_AI_SERVICES_ENDPOINT=https://trustpass-resource.cognitiveservices.azure.com
AZURE_AI_SERVICES_API_KEY=your-key
AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS=10000
```

Do not commit `.env.local`.

Azure was verified:

- Azure OpenAI smoke test passed with deployment `gpt-4o`.
- Azure Document Intelligence OCR worked through `/api/extract`.

### OCR / Evidence Flow

Evidence upload now shows a visible Evidence Readout:

- OCR source
- extracted text preview
- detected prices
- account names
- business names
- places
- risky phrases
- dates
- fallback/recoverable notes

OCR uses:

1. explicit `AZURE_DOCUMENT_INTELLIGENCE_*` if set
2. shared `AZURE_AI_SERVICES_*` if set
3. inferred Cognitive Services endpoint from Azure endpoint where possible
4. demo fallback extraction if Azure is unavailable

### Clarification Flow

The live UI now calls `/api/situation/analyze`, not `/api/risk-check`.

The backend can return:

- `status: "needs_clarification"`
- `clarification_key`
- `question`
- `reason`
- `suggested_answers`

The UI renders a follow-up card with suggested answers and free-text input. The answer is sent back in `clarificationAnswers`.

Clarification keys include:

- `venue_confirmation`
- `venue_location`
- `qr_account_match`

Clear non-food High/Emergency cases bypass clarification.

### Food/Menu Grounding

Bangkok food grounding supports:

- street/local stall
- local casual restaurant
- mall food court
- department-store/higher-end mall restaurant
- premium/famous venue

The app compares menu item prices against curated tier references.

Fixed OCR price parsing bug:

- `1,500 baht` is now parsed as `1500`, not `500`.
- `1,200 baht` is now parsed as `1200`, not `200`.

Regression test added for noisy Jay Fai OCR:

- Crab omelette -> `1500`
- Noodle soup/drunken noodles -> `800`

### Taxi Grounding

Bangkok taxi grounding supports route/fare context.

Important behavior:

- normal cheap fares return Low if no suspicious signal exists
- meter broken + 800 baht from Siam to Wat Pho returns Caution/High
- signals are interpreted, not raw keyword matches

Example user-facing signals:

- `Meter refusal or meter unavailable`
- `Fixed fare quote above route baseline`

### Core Scam Grounding

Added deterministic grounding for:

- tour/operator payment fraud
- QR/payment account mismatch
- rental/passport retention
- rental damage cash pressure
- fake job/casting luring

Signals are now specific:

- `Full advance payment requested`
- `Payment account appears personal`
- `Missing operator or TAT license details`
- `Payment account appears personal or mismatched`
- `Original passport requested as deposit`
- `Large cash damage demand without neutral inspection`
- `No receipt or written damage estimate offered`
- `Controlled pickup or free transport offered`
- `Travel toward Mae Sot, Myanmar, or border area`
- `Secrecy or isolation instruction`

### Fake Tour OCR Bug

User reported that fake-tour OCR text triggered restaurant-name clarification because it contained `2,999 THB` and `Price will go up tomorrow`.

Fixes made:

- Food/menu detection no longer triggers only from generic `price` / `ราคา`.
- Clear tour/payment grounding bypasses clarification.
- Regression test added using the reported fake-tour OCR text.

Important: this latest fake-tour fix needs a server restart before `test:backend` can verify it against localhost.

### Scenario Page

`/scenarios` now covers:

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

## Important API Contracts

### `/api/situation/analyze`

Input:

```ts
{
  message: string;
  city: string;
  language: "English" | "Thai" | "Chinese";
  incidentDateIso: string;
  userLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    source: "browser" | "manual";
  };
  evidenceText?: string;
  attachmentsMetadata?: Array<{ name: string; type: string; size: number }>;
  clarificationAnswers?: Record<string, string>;
}
```

May return clarification:

```ts
{
  status: "needs_clarification";
  clarification_key?: string;
  question: string;
  reason: string;
  suggested_answers: string[];
  grounding: GroundingSignal[];
}
```

Or completed:

```ts
{
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
  source: "azure-openai" | "local-demo";
}
```

### `/api/risk-check`

Backward-compatible legacy endpoint. Keep this stable.

### `/api/extract`

Multipart file upload endpoint for OCR.

## Key Files

- `components/TrustPassChat.tsx`
  - main live demo UI
  - evidence upload/readout
  - clarification panel
  - result cards
  - case-specific guidance cards

- `lib/situation-service.ts`
  - main orchestration
  - clarification rules
  - deterministic-vs-Azure decision
  - Azure OpenAI call

- `lib/grounding-tools.ts`
  - location, venue, food/menu, taxi, tour/payment, QR, rental, damage, job lure grounding

- `lib/evidence-service.ts`
  - Azure Document Intelligence OCR
  - shared Azure AI Services credential fallback

- `lib/evidence-hints.ts`
  - OCR hint extraction
  - price parsing fix lives here

- `lib/risk-engine.ts`
  - local pattern classification
  - interpreted signal labels
  - system prompt payload construction

- `data/food_price_reference.json`
  - Bangkok food tiers and item references

- `data/risk_patterns.json`
  - local scam pattern definitions

- `lib/demo-content.ts`
  - nav items, landing evidence cards, scenario page data

- `scripts/test-backend-contract.mjs`
  - end-to-end backend contract tests against localhost

## Verification Commands

Install dependencies if needed:

```powershell
corepack pnpm install
```

Build:

```powershell
corepack pnpm build
```

Start app:

```powershell
corepack pnpm start
```

Backend contract tests:

```powershell
corepack pnpm test:backend
```

Azure OpenAI smoke test:

```powershell
corepack pnpm test:azure
```

Important: `test:backend` talks to the running server. Restart localhost after code changes before running it.

## Latest Verification

Verified before this handoff:

- `corepack pnpm build` passed.
- Azure OpenAI smoke test previously passed.
- Azure Document Intelligence OCR previously returned `source: "azure-document-intelligence"`.

Needs follow-up verification after restarting localhost:

- `corepack pnpm test:backend`
- fake-tour OCR case should complete as High and not ask restaurant clarification
- `/scenarios` should show all 10 scenarios

## Known Caveats

- `.env.local` is not committed. Recreate it after switching machines/accounts.
- The latest backend test may fail if it hits an old server process.
- Azure Maps is optional. Without it, taxi route grounding uses curated local estimates.
- Tuk-tuk detour is in pattern/scenario coverage but does not yet have a dedicated rich grounding card like payment/rental/job-lure cases.
- Public Vercel deployment may not reflect these latest local changes until deployed again.

## Recommended Next Steps

1. Restart local server.
2. Run `corepack pnpm test:backend`.
3. Manually test the fake-tour OCR screenshot.
4. Manually test the Jay Fai menu screenshot.
5. Check `/scenarios`.
6. If everything is stable, push a PR to Kim’s repository from this branch later.
