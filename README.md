# TrustPass Thailand

**TrustPass Thailand** is an AI scam and fraud shield for tourists in Thailand. It lets tourists chat naturally, attach evidence such as screenshots or receipts, and receive a clear scam-risk assessment with safe next steps, Thai phrases, and a structured incident report.

Live demo: [https://trustpass-thailand.vercel.app](https://trustpass-thailand.vercel.app)

## Product Goal

Thailand tourism trust can be damaged by scams and fraud at many levels: taxi overcharging, fake tour payments, passport retention during rentals, QR/payment mismatches, and high-risk fake job or casting luring. TrustPass focuses on the uncertain moment **before** a tourist pays, travels, rents, or follows instructions.

The product is designed for:

- Foreign tourists who need fast safety guidance.
- Hotels and hostels that help guests verify suspicious situations.
- Tourism authorities and tourist police who need structured trust signals.
- Legitimate tourism operators who benefit when safe providers are easier to distinguish.

## Core Features

- Universal chat interface for suspicious travel situations.
- Evidence upload for screenshots, receipts, contracts, flyers, QR payment screens, and chat logs.
- Risk levels: `Low`, `Caution`, `High`, `Emergency`.
- Suspicious signal explanation.
- Safe next steps and Thai phrases.
- Evidence checklist.
- Incident report summary for hotel staff, tourist police, embassies, or insurers.
- Trust intelligence dashboard for eligible `Caution`, `High`, and `Emergency` cases by city, scam category, and risk pattern.
- Light/dark mode with a Microsoft/Azure-inspired visual theme.

## Azure AI Architecture

TrustPass is designed around Azure AI services:

- **Azure OpenAI**: final structured risk reasoning, response generation, Thai phrases, and incident reports using the configured deployment.
- **Azure AI Document Intelligence**: OCR and extraction from uploaded screenshots, images, and PDFs.
- **Optional Azure Maps**: route-distance grounding for taxi fare estimates when `AZURE_MAPS_KEY` is configured.

The application also includes deterministic TrustPass grounding before Azure OpenAI: scope checking, evidence-topic consistency, taxi fare references, Bangkok food price tiers, payment-fraud patterns, rental/document risk, rental damage pressure, and fake job/casting luring. Azure AI Vision and live Bing grounding are not used in the current MVP.

## Demo Routes

- `/` - product overview and problem framing
- `/check` - live chat + evidence risk check
- `/scenarios` - guided scenario walkthroughs
- `/dashboard` - tourism trust intelligence dashboard
- `/architecture` - Azure AI architecture

## Demo Scenarios

1. **Transport overcharging and detours**
   - Input: `Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho.`
   - Expected risk: `Caution` or `High`

2. **Food and menu price verification**
   - Input: uploaded menu evidence plus venue/location context such as Jay Fai or a mall restaurant.
   - Expected risk: clarification first when venue is uncertain; `Low` or `Caution` when a premium venue explains the price.

3. **Tour, QR, and payment fraud**
   - Input: a LINE/tour seller asks for full payment to a personal bank account and shows no license number.
   - Expected risk: `High`

4. **Rental passport/document risk**
   - Input: `The rental shop wants to keep my original passport.`
   - Expected risk: `High`

5. **Rental damage cash pressure**
   - Input: a jet ski or motorbike shop demands cash now for damage with no receipt or neutral inspection.
   - Expected risk: `High`

6. **Fake casting or job luring**
   - Input: a WeChat/LINE message offers paid casting, free airport pickup, border travel, secrecy, or travel toward Mae Sot.
   - Expected risk: `Emergency`

## Run Locally

```powershell
corepack pnpm install
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local` from `.env.example` to enable Azure AI services:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-10-21

AZURE_AI_SERVICES_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_AI_SERVICES_API_KEY=your-key

AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

AZURE_MAPS_KEY=optional-route-grounding-key
```

`AZURE_DOCUMENT_INTELLIGENCE_*` is optional when `AZURE_AI_SERVICES_*` is set. TrustPass uses the shared Azure AI Services endpoint/key from Foundry for OCR, and only falls back to demo extraction when no usable Azure AI Services credentials are configured.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Lucide React icons
- Azure OpenAI API route
- Azure AI Document Intelligence OCR route
- Optional Azure Maps route grounding
- Vercel deployment

## Responsible Use

TrustPass does not declare a business or person guilty of wrongdoing. It identifies risk signals, recommends verification steps, and helps tourists preserve useful evidence or contact appropriate help when needed.
