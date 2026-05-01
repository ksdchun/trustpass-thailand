# TrustPass Thailand: Project Overview

## One-Line Pitch

TrustPass Thailand is an Azure AI-powered scam and fraud shield that helps tourists check suspicious situations before they pay, travel, rent, or follow instructions.

## Problem

Tourists in Thailand can face uncertainty before harm happens: taxi overcharging, fake tour payments, passport retention, suspicious QR transfers, misleading guides, and high-risk fake job or casting luring. These situations damage tourist confidence and make legitimate tourism operators harder to distinguish from unsafe actors.

## Solution

TrustPass gives tourists a universal chat interface where they can:

- Describe what is happening.
- Attach evidence such as screenshots, receipts, contracts, or chat logs.
- Select city and language context.
- Receive a structured risk result.

The result includes:

- Risk level: `Low`, `Caution`, `High`, or `Emergency`.
- Suspicious signals.
- Why the situation matters.
- Safe next steps.
- Thai phrase to show or say.
- Evidence checklist.
- Contact recommendation.
- Incident report summary.

## User Journey

1. A tourist encounters an uncertain situation.
2. They open TrustPass and chat naturally.
3. They attach evidence if available.
4. Azure AI extracts and reasons over the case.
5. TrustPass returns a risk card and action workflow.
6. High-risk cases can generate a report for hotel staff, tourist police, embassy, or insurer.

## Stakeholders

- **Tourists:** safer decisions before payment or travel.
- **Hotels:** faster guest support and clearer evidence summaries.
- **TAT / local tourism offices:** visibility into trust issues by location and category.
- **Tourist police:** more structured incident reports.
- **Legitimate operators:** stronger differentiation from suspicious services.

## Azure AI Services

- **Azure OpenAI / Azure AI Foundry:** risk reasoning, multilingual guidance, incident summaries.
- **Azure AI Document Intelligence:** OCR and text extraction from evidence.
- **Azure AI Vision:** future support for signs, vehicle plates, storefronts, and richer visual evidence.

## Demo Pages

- `/` - overview and product value
- `/check` - live chat and evidence risk check
- `/scenarios` - guided product scenarios
- `/dashboard` - trust intelligence dashboard
- `/architecture` - Azure AI workflow

## Public Deployment

[https://trustpass-thailand.vercel.app](https://trustpass-thailand.vercel.app)

## Current Status

The full product demo is implemented with:

- Microsoft/Azure-inspired visual theme
- light and dark mode
- generated product visuals
- live risk-check API
- evidence extraction API
- scenario walkthroughs
- trust intelligence dashboard
- public Vercel deployment

