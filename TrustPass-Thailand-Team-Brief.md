# TrustPass Thailand: Team Brief

## 1. Idea Summary

**TrustPass Thailand** is an AI-powered scam and fraud shield for tourists in Thailand.

It helps foreign tourists check whether a situation is suspicious before they pay, ride, rent, book, follow instructions, cross locations, or report an incident. The app uses text, image upload, location context, local risk rules, and Azure AI to produce a clear risk level, practical next steps, Thai-language support, and an incident/help report.

**One-line pitch:**

> TrustPass Thailand helps tourists detect suspicious travel situations before they become scams, using Azure AI to turn messy evidence into trusted local guidance and structured incident reports.

## 2. Problem Statement

Thailand's tourism problem is not a lack of attractions. The deeper issue is **trust and fraud perception**.

Thailand welcomed over **35 million foreign visitors in 2024**, generating over **USD 48 billion** in tourism revenue. The top source markets included China, Malaysia, India, South Korea, and Russia. This means tourist confidence is not a small UX issue; it affects one of Thailand's major economic engines. [Source: Thailand.go.th](https://www.thailand.go.th/issue-focus-detail/over-35-million-foreign-tourists-visit-thailand-last-year-valued-at-usd-48-billion?hl=en)

Safety and trust are also already recognized as national tourism priorities. In 2025, the Tourism Authority of Thailand launched the **Trusted Thailand Stamp** to strengthen global confidence and help visitors identify operators that meet safety standards. TAT explicitly framed safety as a decisive factor for travellers, especially families, female travellers, independent tourists, and visitors from markets such as China, South Korea, Japan, the US, the UK, and Europe. [Source: TAT Newsroom](https://www.tatnews.org/2025/08/thailand-unveils-trusted-thailand-stamp-to-boost-global-confidence/)

This trust issue has already translated into lost tourist demand. In January 2025, TAT reported around **10,000 Chinese tourist cancellations**, affecting charter flights and hotel bookings, after safety concerns spread through Chinese social media. Later in April 2025, Thailand's Tourism and Sports Ministry said Chinese arrivals were expected to decline, with travel-safety concerns identified as a key factor alongside domestic travel promotion in China and reduced flights after Lunar New Year. [Source: Nation Thailand, January 2025](https://www.nationthailand.com/business/economy/40045415), [Source: Nation Thailand, April 2025](https://www.nationthailand.com/business/economy/40049146)

The highest-profile trigger was the **Wang Xing / Xingxing case** in January 2025. Wang Xing, a Chinese actor, travelled to Thailand after receiving what he believed was a film casting invitation through WeChat. He was then taken toward Mae Sot near the Thailand-Myanmar border and later found in Myanmar, where scam compounds operate. Thai police said he had been tricked by fraud groups and trafficked into Myanmar. The story went viral because it matched existing fears about Southeast Asian scam compounds, fake job offers, and human trafficking. [Source: Nation Thailand](https://www.nationthailand.com/news/general/40044935), [Source: AP](https://apnews.com/article/b1d6ac8d3d65446a7e82410bc9bf8b3e), [Source: The Guardian](https://www.theguardian.com/world/2025/jan/14/wang-xing-chinese-actor-abduction-thailand-myanmar-scam-ntwnfb)

Foreign tourists may face ambiguous situations such as:

- Taxi drivers refusing the meter or asking unusual fixed fares.
- Tour sellers requesting full payment to a personal bank account.
- Motorbike rental shops asking to keep the tourist's original passport.
- Fake or unlicensed guides.
- QR payment names that do not match the business name.
- LINE chats, flyers, or contracts that tourists cannot fully understand.
- Pressure tactics around tours, shopping, transport, rentals, or nightlife.
- Fake job, casting, modelling, or business offers that ask tourists to follow a driver, change hotels, travel to a border province, or keep the plan secret.

Existing emergency tools mostly help **after** something goes wrong. Tourists need help **before** harm happens.

Thailand already has the **Tourist Police i lert u** emergency app, which lets tourists request help with GPS location, photos, and connection to Tourist Police hotline 1155. That validates the importance of tourist safety support, but our concept focuses on the earlier moment: helping tourists evaluate suspicious situations before they become incidents. [Source: Thailand.go.th](https://www.thailand.go.th/public/visit-thailand-detail/001_02_085)

**Final problem statement:**

> Thailand's tourism trust is being damaged by scams and fraud at every scale, from everyday overcharging and fake tour payments to high-risk luring and cross-border trafficking cases. Tourists often cannot verify suspicious situations before they act, while legitimate Thai operators struggle to prove they are safe and trustworthy.

## 3. Why Not Just Use ChatGPT?

General AI can answer a simple text question like:

> "Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho. Is this suspicious?"

But a dedicated TrustPass app is different because it combines AI with local context and an action workflow.

| General AI | TrustPass Thailand |
|---|---|
| Gives generic advice | Uses Thailand-specific risk patterns |
| Depends on user typing a clear prompt | Accepts screenshots, flyers, receipts, contracts, QR payment screens, and chat logs |
| Does not automatically know location or route | Uses location and Azure Maps for route/distance context |
| May not know verified operators | Can check against a curated operator or mock trusted-business database |
| Gives advice only | Generates Thai phrases, evidence checklists, and incident reports |
| Helps one user once | Creates aggregated safety intelligence for hotels, TAT, or tourist police |

**Key differentiation:**

> TrustPass is not a chatbot. It is an evidence-based tourist trust workflow.

## 4. Target Users

Primary users:

- **Foreign tourists**: first-time visitors, Chinese tourists, solo travelers, families, elderly tourists.
- **Hotels and hostels**: front desk staff who answer guest safety questions.
- **Licensed tourism operators**: guides, tour companies, transport services, rental shops, wellness providers.
- **Tourism authorities**: TAT, local tourism offices, tourist police, municipalities.

Best initial beachhead:

> Hotels + foreign tourists in Bangkok, Phuket, Pattaya, and Chiang Mai.

Hotels are a strong entry point because tourists already ask hotel staff whether something is safe, fair, or legitimate.

## 5. Proposed Solution

The MVP feature is:

## Situation Risk Check

The tourist submits:

- Situation text.
- Image or screenshot.
- Current city/location.
- Destination, business name, payment request, or meeting point if relevant.
- Preferred language.

The app returns:

- Risk level: `Low`, `Caution`, `High`, or `Emergency`.
- Suspicious signals detected.
- Local context.
- Recommended next steps.
- Thai phrase to show the person.
- Evidence to save.
- Contact recommendation.
- Optional incident/help report.

### Risk Scale

| Level | Example Situation | App Response |
|---|---|---|
| `Low` | Verified operator, normal payment, clear receipt | Proceed carefully, save receipt |
| `Caution` | Taxi meter refused, unusual fixed price | Ask for meter, save plate, use safer transport |
| `High` | Full payment to personal account, passport retention, missing license | Do not proceed until verified |
| `Emergency` | Fake job/casting offer, border travel request, phone confiscation, secrecy pressure | Stop immediately, contact hotel/police/embassy |

## 6. Demo Scenarios

For a 48-hour hackathon, we should demo only 2-3 scenarios.

### Scenario 1: Everyday Scam - Taxi Overcharging

Input:

> "Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho."

The system checks:

- Route/distance context.
- Known overcharging pattern: "meter broken".
- Unusual fixed fare.
- Tourist safety response.

Output:

- Risk: `High caution`.
- Why suspicious.
- What to say in Thai: "กรุณาเปิดมิเตอร์ครับ/ค่ะ"
- Evidence to save: taxi plate, pickup location, time.
- Suggested action: exit safely in public, use registered ride app, contact 1155 if pressured.

### Scenario 2: Payment Fraud - Suspicious Tour Booking

Input:

- Upload a LINE chat or tour flyer asking for full payment to a personal bank account.

The system checks:

- Missing license number.
- Full prepayment request.
- Payment name mismatch.
- High-pressure language.

Output:

- Risk: `Caution` or `High`.
- Questions to ask before paying.
- Thai message to request license/receipt/cancellation policy.
- Evidence checklist.

### Scenario 3: Rental Fraud - Motorbike Passport Retention

Input:

- Upload a rental contract or type: "The shop wants to keep my original passport."

The system checks:

- Passport retention risk.
- Missing damage policy.
- Deposit terms.

Output:

- Risk: `High caution`.
- Safer alternative: passport copy + deposit.
- Thai phrase asking to use a copy instead.
- Evidence checklist: bike photos, contract, shop name, receipt.

### Scenario 4: Critical Risk - Fake Casting or Job Luring

Input:

- Upload a WeChat/LINE message offering a paid photoshoot, modelling job, casting, or business opportunity.
- The message includes free transport, an airport pickup, instructions to change hotels, travel toward Mae Sot or another border area, or keep the plan secret.

The system checks:

- Fake job/casting risk pattern.
- Border travel or unusual meeting point.
- Secrecy pressure.
- Free transport controlled by unknown party.
- Request to separate from hotel/friends.

Output:

- Risk: `Emergency`.
- Stop action: do not follow the driver or travel to the meeting point.
- Contact recommendation: hotel front desk, Tourist Police 1155, embassy/consulate.
- Evidence checklist: chat screenshots, phone number, profile name, pickup location, vehicle plate if safe.
- Incident summary in English/Thai/Chinese.

## 7. Azure Stack

| Product Need | Azure Service | Use in MVP |
|---|---|---|
| AI reasoning and response generation | Azure OpenAI / Azure AI Foundry | Risk classification, explanation, Thai phrase, incident summary |
| OCR from documents/screenshots | Azure AI Document Intelligence | Extract text from flyers, contracts, receipts, LINE screenshots |
| Image understanding | Azure AI Vision | Optional for signs, plates, business cards |
| Route and distance context | Azure Maps | Taxi scenario and location-aware safety context |
| Trusted local information retrieval | Azure AI Search | Optional; use local JSON first for hackathon |
| Store cases and operators | Azure Cosmos DB | Optional; local JSON or simple database first |
| Backend workflow | Azure Functions or Next.js API routes | Run risk pipeline |
| File storage | Azure Blob Storage | Store uploaded screenshots/images if needed |
| Dashboard | Power BI or simple web dashboard | Show risk categories, cities, and repeated patterns |

Official Microsoft documentation supports these service choices:

- Azure OpenAI provides REST API access to OpenAI language models for tasks such as summarization, content generation, image understanding, semantic search, and natural-language reasoning. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview?view=rest-azureopenai-2023-10-01-preview)
- Azure AI Document Intelligence extracts text, tables, document structure, and key-value pairs from forms and documents. [Microsoft Learn](https://learn.microsoft.com/azure/ai-services/document-intelligence/overview?view=doc-intel-3.1.0)
- Azure Maps supports routing, distance, geocoding, location search, traffic, and other geospatial services. [Microsoft Learn](https://learn.microsoft.com/en-us/rest/api/maps-creator)
- Azure AI Search can ground AI/chatbot responses in indexed data through search, vector search, hybrid search, and retrieval-augmented generation patterns. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)

## 8. Cost Plan for USD 200 Azure Credit

USD 200 should be enough if we keep the MVP lean.

Use:

- Small/mini Azure OpenAI or Azure AI Foundry model.
- Azure AI Document Intelligence free tier where possible.
- Limited Azure Maps calls.
- Local JSON instead of full Azure AI Search for MVP.
- Cosmos DB free tier only if easy to set up.
- No fine-tuning.
- No provisioned throughput.
- No large-scale OCR or image processing.

Cost-control rules:

- Cache demo outputs.
- Use short prompts.
- Limit uploads to a few sample files.
- Set Azure budget alerts at USD 50, USD 100, and USD 150.
- Delete or stop paid resources after the hackathon.

## 9. Data Needed for MVP

Create small mock datasets:

### risk_patterns.json

Examples:

- Taxi meter refused.
- Personal bank transfer for tour booking.
- Passport retention by rental shop.
- Missing license number.
- QR name mismatch.
- High-pressure sales language.

### verified_operators.json

Mock records:

- Business name.
- Type: tour, hotel, taxi, rental, wellness.
- City.
- License or verification status.
- Phone number.

### emergency_contacts.json

Include:

- Tourist Police: 1155.
- Emergency medical: 1669.
- General police: 191.
- Hotel front desk placeholder.
- Embassy placeholder by nationality.

### thai_phrases.json

Useful phrases:

- "Please use the meter."
- "Can I use a passport copy instead?"
- "Can I get an official receipt?"
- "Please write the cancellation policy."
- "I would like to contact tourist police."

## 10. Risk Engine Method

Use a hybrid AI + rules approach.

### Step 1: Extract

Input text and OCR become structured fields:

- business name
- price
- payment method
- account name
- license number
- route/destination
- detected risky terms

### Step 2: Retrieve

Search local data:

- risk patterns
- verified operators
- transport rules
- emergency contacts
- Thai phrases

### Step 3: Score

Combine rule-based signals with AI reasoning.

Example signals:

- "meter broken"
- "full payment now"
- "personal bank account"
- "keep passport"
- "no license number"
- "QR name mismatch"
- "too cheap / too expensive"
- "high-pressure wording"
- "free airport pickup"
- "do not tell anyone"
- "change hotel"
- "border province"
- "Mae Sot"
- "casting/job offer"

### Step 4: Respond

Azure OpenAI returns strict JSON:

```json
{
  "risk_level": "high",
  "category": "taxi_overcharging",
  "signals": ["meter refused", "unusual fixed fare"],
  "local_context": "This route is a short inner-city trip. A fixed 800 baht fare is suspicious.",
  "actions": ["Exit safely in a public area", "Ask for the meter", "Use a registered ride app"],
  "thai_phrase": "กรุณาเปิดมิเตอร์ครับ/ค่ะ",
  "evidence": ["taxi plate", "pickup location", "time", "quoted fare"],
  "contact": "Tourist Police 1155 if pressured or threatened"
}
```

## 11. 48-Hour Build Plan

### Hour 0-4: Finalize Demo Scope

- Pick 2-3 scenarios.
- Create mock screenshots/flyers/contracts.
- Create risk pattern data.
- Finalize pitch story.

### Hour 4-12: Build Main UI

- Next.js app.
- Situation text input.
- Image upload.
- City/language selector.
- Result card.

### Hour 12-20: AI Integration

- Connect Azure OpenAI / Azure AI Foundry.
- Add structured JSON prompt.
- Render risk response in UI.

### Hour 20-28: OCR and Maps

- Add Azure AI Document Intelligence for upload extraction.
- Add Azure Maps for taxi route/distance demo.
- Add fallback sample OCR text if API setup is slow.

### Hour 28-34: Incident Pack

- Generate English/Thai summary.
- Add evidence checklist.
- Add contact recommendation.

### Hour 34-40: Dashboard

- Simple admin dashboard.
- Show cases by city, category, and risk level.
- Show repeated risk patterns.

### Hour 40-48: Polish

- Rehearse demo.
- Prepare fallback screenshots.
- Finish slides.
- Test all demo scenarios.

## 12. What We Should Avoid

Avoid building:

- Full login/auth.
- Real police integration.
- Real payment verification.
- Real operator onboarding.
- Too many tourist scenarios.
- Complex routing.
- Legal advice.
- Medical advice.
- Fully automated accusation of businesses.

The app should say:

> "This situation has risk signals. Here is what to check and what to do."

Not:

> "This business is definitely a scam."

## 13. Slide Deck Structure

Suggested slides:

1. Title: TrustPass Thailand.
2. Problem statement.
3. Why current solutions and general AI are not enough.
4. Target users.
5. Proposed solution: Situation Risk Check.
6. Demo flow.
7. Azure architecture.
8. Business and digital transformation impact.
9. Feasibility and 48-hour MVP.
10. Future roadmap.

## 14. Final Positioning

TrustPass Thailand is strongest when positioned as:

> A tourist trust and anti-scam infrastructure layer for Thailand, not another travel planning chatbot.

The winning angle is:

- Thailand-specific.
- Fraud, safety, and trust focused.
- Useful before incidents happen.
- Supports legitimate tourism SMEs.
- Gives hotels and authorities structured safety intelligence.
- Uses Azure AI in a practical, demoable way.

## 15. What We Still Need to Validate

These are the biggest gaps the team should validate before finalizing the pitch and demo.

### 1. Exact User Entry Point

We need to decide how tourists discover and use TrustPass:

- Standalone web app with QR code at hotels/airports.
- Hotel front-desk tool used by staff.
- LINE mini app or chatbot-style interface.
- TAT / tourist police partner app concept.

For a 48-hour MVP, the safest choice is a **mobile-friendly web app** with QR onboarding.

### 2. Source of Trusted Data

The demo can use mock data, but the pitch should explain future data partnerships:

- TAT Trusted Thailand operator directory.
- Department of Tourism licensed guide/operator data.
- Hotel-approved vendor lists.
- Tourist police incident categories.
- Transport fare/routing guidance.
- Embassy and emergency contact data.

Concern: without trusted local data, the product becomes too close to generic AI.

### 3. Risk Scoring Responsibility

The app must avoid making legal accusations like "this business is a scam."

Safer wording:

> "This situation contains risk signals. Verify before proceeding."

We need a clear disclaimer and human escalation path for high-risk cases.

### 4. Privacy and Evidence Handling

Tourists may upload passports, receipts, chats, faces, vehicle plates, and payment details.

We need to consider:

- Do not store sensitive evidence by default.
- Allow user-controlled deletion.
- Mask passport/payment details where possible.
- Store only anonymized risk signals for dashboard analytics.

For MVP, we can store sample/demo data only.

### 5. False Positives and Operator Fairness

If the app over-warns tourists, it could harm legitimate operators.

Mitigation:

- Use risk levels, not accusations.
- Explain detected signals.
- Provide verification steps.
- Allow verified operators to provide proof in future versions.

### 6. Language Coverage

The most relevant languages are likely:

- English.
- Chinese.
- Thai.
- Japanese/Korean as future expansion.

For MVP, use English output with Thai phrase support. Add Chinese as a demo bonus if time allows.

### 7. Strongest Demo Scenario

The team should choose whether the final pitch emphasizes:

- Everyday tourist scams: easier to understand.
- Payment/rental fraud: practical and demoable.
- Critical fake job/casting luring: strongest evidence and emotional urgency.

Recommended demo sequence:

1. Taxi overcharge: simple and relatable.
2. Suspicious tour payment: shows OCR and payment risk.
3. Fake casting/job luring: shows why this matters for Thailand's trust crisis.

### 8. Partnership and Business Model

Possible future buyers/users:

- Hotels and hotel chains.
- Tourism Authority / local municipalities.
- Tourist police support desks.
- Travel platforms.
- Insurance providers.
- Verified tourism operators.

For hackathon, present it as **B2B/B2G infrastructure with a tourist-facing app**.

### 9. Metrics for Impact

We need a few measurable outcomes:

- Reduced unsafe interactions before payment/travel.
- Faster hotel/tourist police triage.
- More structured reports.
- Increased trust in verified operators.
- Scam hotspot and pattern visibility for authorities.

For MVP dashboard, show:

- Cases by city.
- Cases by scam category.
- High-risk situations detected.
- Most common risk signals.

## 16. Sources and Evidence

### Problem Evidence

1. **Thailand tourism scale:** Thailand welcomed over 35 million foreign visitors in 2024 and generated over USD 48 billion in tourism revenue. China was the largest source market.  
   Source: [Thailand.go.th - Over 35 Million Foreign Tourists Visit Thailand Last Year](https://www.thailand.go.th/issue-focus-detail/over-35-million-foreign-tourists-visit-thailand-last-year-valued-at-usd-48-billion?hl=en)

2. **Trust and safety as a national priority:** TAT launched the Trusted Thailand Stamp in 2025 to boost international confidence and help visitors identify operators meeting safety standards. The initiative covers safety measures, secure financial transactions, foreign-language communication, and safe mobility/access.  
   Source: [TAT Newsroom - Thailand unveils Trusted Thailand Stamp](https://www.tatnews.org/2025/08/thailand-unveils-trusted-thailand-stamp-to-boost-global-confidence/)

3. **Existing tourist emergency support:** Tourist Police i lert u allows tourists to request help with GPS location, photos, and connection to Tourist Police hotline 1155. This supports the need for tourist safety tooling, but it is mainly incident-response oriented.  
   Source: [Thailand.go.th - Tourist Police i lert u](https://www.thailand.go.th/public/visit-thailand-detail/001_02_085)

4. **Tourist concern signals:** Tourism Council of Thailand survey coverage reported that foreign visitors expressed concerns around service/communication issues and scams.  
   Source: [Nation Thailand - Tourism survey: top 5 visitor concerns](https://www.nationthailand.com/news/tourism/40062037)

5. **Chinese tourist confidence risk:** Reporting in 2025 linked Thailand's tourism goal risk partly to Chinese tourists choosing destinations perceived as safer, such as Japan.  
   Source: [Bangkok Post - Thailand's tourism goal at risk as Japan lures Chinese tourists](https://www.bangkokpost.com/business/general/2966976/thailands-tourism-goal-at-risk-as-japan-lures-chinese-tourists)

6. **Lost tourist demand from safety concerns:** In January 2025, TAT reported around 10,000 Chinese tourist cancellations amid safety concerns and negative social-media coverage. In April 2025, the Tourism and Sports Ministry expected Chinese arrivals to decline, citing travel-safety concerns as one key factor.  
   Sources: [Nation Thailand - Chinese tourism to Thailand faces sharp decline amid safety concerns](https://www.nationthailand.com/business/economy/40045415), [Nation Thailand - Chinese arrivals to fall over safety concerns](https://www.nationthailand.com/business/economy/40049146)

7. **Root cause behind the Chinese social-media trust drop:** The Wang Xing case showed how a fake WeChat casting/job invitation could lead someone from Thailand toward the Myanmar border and into a scam-compound trafficking situation. Reports said the story went viral on Chinese social platforms and generated widespread cancellation questions.  
   Sources: [Nation Thailand - Chinese actor's disappearance sparks Thai tourism safety concerns](https://www.nationthailand.com/news/general/40044935), [AP - Chinese actor trafficked to Myanmar scam operation](https://apnews.com/article/b1d6ac8d3d65446a7e82410bc9bf8b3e), [The Guardian - Wang Xing case and social-media reaction](https://www.theguardian.com/world/2025/jan/14/wang-xing-chinese-actor-abduction-thailand-myanmar-scam-ntwnfb), [VnExpress - flight cancellations after Wang Xing abduction](https://e.vnexpress.net/news/travel/thailand-faces-mass-flight-cancelations-from-china-following-actor-wang-xing-s-abduction-4838953.html)

### Azure References

1. [Microsoft Learn - Azure OpenAI overview](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview?view=rest-azureopenai-2023-10-01-preview)
2. [Microsoft Learn - Azure AI Document Intelligence overview](https://learn.microsoft.com/azure/ai-services/document-intelligence/overview?view=doc-intel-3.1.0)
3. [Microsoft Learn - Azure Maps overview](https://learn.microsoft.com/en-us/rest/api/maps-creator)
4. [Microsoft Learn - Azure AI Search overview](https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search)
