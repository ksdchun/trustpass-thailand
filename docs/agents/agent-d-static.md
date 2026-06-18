# Agent D — Static content: /responsible-ai, assets, DEMO_SCRIPT, repo hygiene

> Read `INTERFACE_CONTRACT.md`, `PITCH_PREP.md`, and the build plan first.
> Branch: `agent-d-static`. PR title: `[D] Static content: /responsible-ai, assets, DEMO_SCRIPT, repo hygiene`.

## Mission

Ship every static asset, page, and documentation update that the recorded
pitch video and judge-clickable Vercel deployment need to look complete and
defensible: the /responsible-ai page, all missing image assets, DEMO_SCRIPT,
and repo hygiene cleanup.

## Files owned

- `app/responsible-ai/page.tsx` *(new)*
- `public/evidence/wechat_casting.png` *(new — hero asset)*
- `public/evidence/taxi_situation.png` *(new)*
- `public/evidence/motorbike_contract.png` *(new)*
- `public/evidence/line_tour_booking.png` *(new)*
- `public/evidence/qr_mismatch.png` *(new)*
- `public/evidence/jet_ski_damage.png` *(new)*
- `public/evidence/tuktuk_detour.png` *(new)*
- `public/trustpass-risk-ladder.png` *(new)*
- `demo-evidence/*` *(generate via existing PowerShell script + commit outputs)*
- `DEMO_SCRIPT.md` *(new at repo root)*
- `CLAUDE.md` *(rewrite to match current reality)*
- `package.json` *(modify — drop `@azure/ai-form-recognizer` unused dep)*
- DELETE: `components/TrustPassChat.tsx.bak`
- DELETE: `app/playground/page.tsx`
- DELETE: `components/AzureChatPlayground.tsx`

## Tasks

### 1. `/responsible-ai` page (Priority 1.5.5)

**New file `app/responsible-ai/page.tsx`:**

Single static route. Sections in order:

- **Header:** "Responsible AI at TrustPass Thailand"
- **Model card:** GPT-4o deployment via Azure OpenAI. System prompt summary (paraphrased from `lib/system-prompt.ts`). Temperature 0.1, seed 42, json_schema strict mode.
- **Evaluation methodology:** Describes the 50-case gold set, the 5 categories (hero / negative / edge / adversarial / mid-risk), the scoring metrics. **Reads `data/eval/results-latest.json` server-side and renders the accuracy / latency numbers inline.** If the file doesn't exist yet (eval not run), show placeholder text "Evaluation run pending; see `scripts/run-evals.mjs`."
- **Known failure modes (honest list):**
  - Ambiguous food prices at street stalls without venue context (system asks clarifying question)
  - Legitimate Mae Sot visa runs (pattern requires combination of signals, not location alone)
  - OCR with no readable text (system asks user to paste key text)
  - Highly informal conversational input without specifics (system returns generic verification advice)
- **Bias statement:**
  - Mae Sot is flagged by *pattern combination*, not location alone. Cite the public sources: Reuters, AP, the Guardian on Wang Xing, Tourist Police published advisories.
  - System never accuses specific operators; surfaces signals only.
  - Inputs are textual + uploaded evidence; model receives no demographic data.
- **Data sources:**
  - Link each grounding JSON file in `data/` as a clickable code block. List the purpose of each: `risk_patterns.json` (10 scam patterns), `taxi_fare_reference.json` (Bangkok routes), `food_price_reference.json` (Bangkok tiers), `verified_operators.demo.json` (15 demo TAT operators), `emergency_contacts.json`, `location_context.json`, `thai_phrases.json`, `damage_claim_reference.json`.
- **Disclaimers + escalation guidance:**
  - "This is a risk assessment based on observed signals, not a legal accusation."
  - "Tourist Police 1155 is for emergencies, serious pressure, threats, refusal to let you leave, or clear fraud escalation."
  - "Not legal advice, not medical advice. In doubt, contact hotel staff or your embassy."

Footer link added in `components/SiteNav.tsx` is Agent C's responsibility — coordinate via PR description.

### 2. Hero WeChat screenshot asset

This is the single most important asset in the entire pitch.

**`public/evidence/wechat_casting.png`** must look like a real WeChat conversation:

- Chinese-language messages
- Recruiter offers paid casting/modeling work in Bangkok
- Mentions free airport pickup
- Mentions Mae Sot or "border area" for "final interview location"
- Instruction to not tell hotel or friends
- WeChat UI chrome: green message bubbles for the recruiter, white for the user, timestamps, profile pic (use a placeholder silhouette)
- Dimensions: portrait, 1080×2400 ish (phone aspect ratio)

**Two options to produce it:**
- **Option A (preferred):** Design in Figma → export PNG. Higher quality, looks real.
- **Option B (fallback):** Run `scripts/generate-demo-evidence.ps1` and use the synthetic output. Acceptable if Figma is unavailable.

This asset is referenced by Agent C's hero chip — naming must be exact:
`public/evidence/wechat_casting.png`.

### 3. The other 6 evidence assets

Run `scripts/generate-demo-evidence.ps1` and commit outputs. Inspect each:

- `public/evidence/taxi_situation.png` — taxi meter or receipt photo
- `public/evidence/motorbike_contract.png` — rental contract excerpt with passport-retention clause
- `public/evidence/line_tour_booking.png` — LINE chat with personal-account bank transfer ask
- `public/evidence/qr_mismatch.png` — QR payment screen with mismatched account name
- `public/evidence/jet_ski_damage.png` — damage demand text + photo
- `public/evidence/tuktuk_detour.png` — temple closed / gem shop messaging

If any output looks too obviously synthetic, hand-touch in an image editor or
re-generate with adjusted text. Quality bar: a viewer pausing the video on
that image should believe it.

### 4. Risk ladder PNG

**`public/trustpass-risk-ladder.png`** — visual showing the 4 risk levels with their colors from `tailwind.config.ts`:

- Low: `#107C10` (green)
- Caution: `#FFB900` (yellow)
- High: `#D83B01` (orange)
- Emergency: `#A4262C` (red)

Format: horizontal banded bar or vertical staircase, each level labeled with a 1-line example. Used in the landing page hero section.

Tools: Figma export, Excalidraw export, or a small `scripts/build-risk-ladder.mjs` Node script using `canvas` package.

### 5. `DEMO_SCRIPT.md` (Priority 7)

New file at repo root. Beat-by-beat recording instructions matching the 5-minute structure in `PITCH_PREP.md`.

Structure:

```
# Recording Script — TrustPass Thailand 5-Min Pitch

## Setup checklist (before pressing record)
- [ ] DEMO_MODE=true in .env.local
- [ ] Browser zoom 110%, dev tools closed
- [ ] Window 1920x1080, no other tabs
- [ ] Chrome incognito (no extension chrome)
- [ ] sessionStorage cleared
- [ ] Network throttling off

## Beat 1 (0:00 - 0:45) — Open
- Show: Wang Xing case news headline screenshot
- Voice-over: "January 2025. Chinese actor Wang Xing flew to Thailand for a casting offer. Within days he was trafficked toward Mae Sot. Within weeks, 10,000 Chinese tourist cancellations."
- Cut to: TrustPass landing page

## Beat 2 (0:45 - 1:30) — Solution framing
... (continue per PITCH_PREP.md 5-min structure)
```

Include exact clicks, exact dwell times, voice-over guide.

### 6. `CLAUDE.md` rewrite

The existing `CLAUDE.md` references routes and components that don't exist (`/api/check`, `/api/ocr`, separate `RiskCard.tsx` etc.). Rewrite to match current reality:

- Update file structure section to reflect actual layout (one big `TrustPassChat.tsx`, real API routes `/api/situation/analyze`, `/api/extract`, `/api/intelligence`, `/api/feedback`)
- Document the expanded multi-page scope (`/`, `/check`, `/dashboard`, `/scenarios`, `/architecture`, `/welcome`, `/responsible-ai`) as intentional
- Document DEMO_MODE and the cached-responses contract
- Add references to `INTERFACE_CONTRACT.md`, `PITCH_PREP.md`, `DEMO_SCRIPT.md`
- Update env var section: `AZURE_OPENAI_API_KEY` (not `AZURE_OPENAI_KEY`), include all new vars from `INTERFACE_CONTRACT.md`
- Preserve the strategic positioning section (do not weaken "trust infrastructure not chatbot" framing)

### 7. Repo hygiene deletions

- `git rm components/TrustPassChat.tsx.bak`
- `git rm -r app/playground/` (the entire route directory)
- `git rm components/AzureChatPlayground.tsx`
- In `package.json`, remove the `@azure/ai-form-recognizer` dependency (unused; OCR uses raw REST)

## Acceptance criteria

- [ ] `app/responsible-ai/page.tsx` renders all 5 sections; reads eval results JSON if present
- [ ] `public/evidence/wechat_casting.png` exists, looks like a real WeChat conversation
- [ ] All 6 other `public/evidence/*.png` exist and look credible at video resolution
- [ ] `public/trustpass-risk-ladder.png` exists, uses correct color hex values
- [ ] `demo-evidence/` directory contains all 7 synthetic files
- [ ] `DEMO_SCRIPT.md` covers all 5 beats with exact clicks and timings
- [ ] `CLAUDE.md` matches current reality: actual route names, actual file structure, actual env vars, DEMO_MODE documented
- [ ] `components/TrustPassChat.tsx.bak` deleted
- [ ] `app/playground/` directory deleted
- [ ] `components/AzureChatPlayground.tsx` deleted
- [ ] `package.json` no longer depends on `@azure/ai-form-recognizer`
- [ ] All landing-page / scenarios-page image references resolve (zero 404s in DevTools Network tab)
- [ ] `npm run build` clean, `npm run lint` passes
- [ ] Branch contains zero edits to files owned by A, B, or C (verify `git diff --stat main`)
- [ ] PR opened with title `[D] Static content: /responsible-ai, assets, DEMO_SCRIPT, repo hygiene`

## PR description template

```
## Summary
- /responsible-ai page with model card, eval methodology, failure modes, bias statement, data sources
- Hero WeChat asset hand-crafted + 6 other evidence assets generated
- Risk ladder PNG built with Tailwind risk colors
- DEMO_SCRIPT.md with beat-by-beat recording instructions
- CLAUDE.md rewritten to match current code reality
- Repo hygiene: deleted .bak, playground/, AzureChatPlayground; dropped unused @azure/ai-form-recognizer dep

## Test plan
- [ ] `npm run build` clean
- [ ] Visit `/responsible-ai` — all 5 sections render, eval numbers show if results-latest.json exists
- [ ] Open landing page in DevTools Network tab — zero 404s
- [ ] Open `/scenarios` — all scenario images load
- [ ] Visual review: WeChat hero screenshot looks like a real WeChat conversation
- [ ] Verify deleted routes return 404, deleted component not imported anywhere

## Files changed
<list>

## Acceptance criteria
<all checked from agent brief>
```

## What NOT to do

- Do not modify `components/TrustPassChat.tsx` (C-owned) — even for the footer responsible-ai link
- Do not modify any `lib/*` file (B and C own)
- Do not modify any API route (B owns analyze, A owns feedback)
- Do not edit `INTERFACE_CONTRACT.md` or `PITCH_PREP.md` (orchestrator-owned)
- Do not fabricate eval numbers in /responsible-ai — read them from the file or show placeholder
- Do not delete or modify `components/SiteNav.tsx` — C owns the footer link addition
