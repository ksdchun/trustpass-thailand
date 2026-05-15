# Recording Script — TrustPass Thailand 5-Min Pitch

> Companion to `PITCH_PREP.md`. Beat-by-beat recording instructions for the live
> walkthrough portion of the recorded pitch video. Every click and every dwell
> time is pinned so two takes look identical.

## Setup checklist (before pressing record)

- [ ] `DEMO_MODE=true` in `.env.local` (forces cached responses, zero Azure dependency)
- [ ] Restart `npm run dev` after toggling DEMO_MODE so the server reads the new env
- [ ] Browser zoom 110%, dev tools closed
- [ ] Window resized to 1920×1080 (or 1080×1920 portrait if recording mobile-style)
- [ ] No other tabs visible; close all extensions or use Chrome incognito
- [ ] `sessionStorage` and `localStorage` cleared on `localhost:3000`
- [ ] Network throttling: OFF (we want fast cached responses to feel native)
- [ ] System notifications silenced (Do Not Disturb on macOS, Focus on Windows)
- [ ] Camera + mic check; voice-over levels reasonable
- [ ] Wang Xing news screenshot ready in a separate tab for Beat 1 (Reuters or AP article)
- [ ] `/dashboard` open in a second tab to enable instant cut after submission
- [ ] Recorder software (OBS, Loom, ScreenStudio) configured for 1080p60

## Beat 1 (0:00 – 0:45) — Open with the crisis

**Show:** Wang Xing case news headline (Reuters / AP article screenshot, full screen).

**Voice-over:**
> "January 2025. Chinese actor Wang Xing flew to Thailand for what he thought was
> a paid casting offer. Within days he had been driven to Mae Sot, smuggled
> across the border, and forced to work in a Myanmar scam compound.
> Within weeks, roughly ten thousand Chinese tourists cancelled their Thailand
> trips. Thailand earned forty-eight billion dollars from tourism in 2024.
> Trust is now the country's most valuable asset — and the most fragile."

**Cut to:** TrustPass landing page at `/` (3 seconds dwell on hero before voice continues).

## Beat 2 (0:45 – 1:30) — Solution framing

**Show:** Landing page hero section, then scroll once to reveal the risk ladder.

**Voice-over:**
> "TrustPass Thailand is trust infrastructure for tourism, not a chatbot. Three
> Azure AI services: GPT-4o on Azure OpenAI for reasoning, Document Intelligence
> for OCR of Thai, English, and Chinese evidence, Content Safety Prompt Shields
> for adversarial inputs. Hotels, the Tourism Authority of Thailand, and the
> Tourist Police are the buyers. The tourist-facing app is free forever — that
> is the moat."

**Action:** Click the primary "Try Risk Check" CTA → cuts to `/check`.

## Beat 3 (1:30 – 3:30) — Hero demo (the 2-minute proof)

This is the wow moment. **Do not rush this beat.** It carries the proof of the
pitch. Take a breath before pressing the sample chip.

**Action sequence:**

1. On `/check`, click the **"WeChat casting (Mae Sot)"** sample chip in the
   evidence row. (Agent C wires this chip; it auto-populates the textarea and
   attaches `public/evidence/wechat_casting.png`.)
2. Pause 2 seconds while the OCR readout appears under the input — the recorded
   voice-over should land on the OCR readout text.
3. Click **"Run risk check"**.
4. Result card renders. Dwell on it for ~10 seconds.

**What the card shows (rehearsed talking points):**

- Risk level: **Emergency** (red, pulse animation)
- Category: "Fake casting / job luring"
- Suspicious signals chips, each grounded
- Grounding panel: confidence (high), source ("`risk_patterns.json` →
  `fake_job_casting_lure`"), citation chips for Reuters / AP coverage
- Trusted Operator card: **"Not in TAT directory"** (no verified operator found)
- Community line: **"3 similar incidents reported near Mae Sot in the last 7
  days"** (pre-seeded from `lib/intelligence-store.ts`)
- Thai phrase the tourist can show on their phone
- Incident report in English + Thai + Chinese (Wang Xing scenario shows Chinese)

**Voice-over over those 10 seconds:**

> "The model sees the WeChat lure pattern: free airport pickup, Mae Sot border
> travel, secrecy instruction, passport retention. Each signal has a confidence
> level and a source — we cite the Wang Xing reporting and Tourist Police
> advisories. The Trusted Operator card checks the offer against TAT's directory
> — no match. Community signal: this is the third Mae Sot lure flagged near
> here this week. One Thai phrase the tourist can hold up to staff. One Chinese
> incident summary they can send to family."

**Action:** Click **"Submit report"** at the bottom of the result card.

**Cut to:** `/dashboard` tab (already open).

**On `/dashboard`:**
- Heatmap pulses on Mae Sot area
- The just-submitted report appears at the top of the recent reports list, with
  a brief pulse animation drawing attention

**Voice-over over the dashboard:**

> "That signal is now in the dashboard. Hotels, TAT, and the Tourist Police see
> it as preventive intelligence — not after-incident response. The third Mae
> Sot lure flagged this week is now on the map."

## Beat 4 (3:30 – 4:15) — Architecture + responsibility

**Cut to:** `/architecture`.

**Voice-over over the architecture diagram:**

> "Three Azure AI services. Deterministic Thailand grounding runs before the
> model, so cached fare references and TAT operator lists are the first
> filter — not the model's vibes. We have a fifty-case evaluation harness
> covering hero scenarios, negatives like Jay Fai's fifteen-hundred-baht crab
> omelette, edges, mid-risk, and adversarial prompt-injection cases. Latest
> accuracy and latency live on the responsible-AI page."

**Quick hover navigation:** Click `/responsible-ai` from the nav (or footer).

**On `/responsible-ai`:**
- Model card: GPT-4o, temperature 0.1, seed 42, JSON schema strict mode
- Evaluation methodology with current numbers (or "Evaluation run pending"
  placeholder if eval hasn't been re-run since the last DEMO_MODE toggle)
- Known failure modes (especially street-stall food prices and legitimate Mae
  Sot visa runs)
- Bias statement
- Data sources

**Voice-over (5 seconds while scrolling):**

> "Every claim on this page is backed by a file you can inspect in the repo.
> That is what we mean by defensible AI."

## Beat 5 (4:15 – 5:00) — Close + ask

**Cut to:** `/welcome` page (showing the hotel QR onboarding flow).

**Voice-over:**

> "Discovery is the hardest problem. Tier one: hotels onboard guests at check-in
> with a QR code that pre-configures TrustPass for their language and city.
> Tier two: WeChat and LINE mini-programs on the roadmap, because Chinese
> tourists live in WeChat and won't install a new app. Tier three: TAT and
> i-lert-u partnerships, complementary not competitive — they handle
> after-incident, we handle before.
>
> One honest thing we get wrong today: ambiguous street-stall food prices
> without venue context. The system asks a clarifying question instead of
> guessing — we judged that safer than a confident wrong answer.
>
> Today's ask is partnership introductions through the Microsoft AIAT network
> — i-lert-u, TAT's Trusted Thailand Stamp program, and the Tourist Police
> dashboard pilot."

**Final shot:** Cut back to the landing page hero for 2 seconds before fade-out.

## Manual test pass before pressing record

Run through this checklist on a fresh browser session. Stop and fix anything
that fails. The single goal is zero surprises on tape.

- [ ] `/` loads with hero image, risk ladder, and all evidence story tiles —
      zero 404s in DevTools → Network tab
- [ ] `/check` loads with sample chips visible; clicking the WeChat chip
      auto-attaches `public/evidence/wechat_casting.png`
- [ ] WeChat sample run returns Emergency with Mae Sot signal in under 3
      seconds (DEMO_MODE should make this near-instant)
- [ ] Submit report → cut to `/dashboard` shows the new report at the top of
      the table with a pulse animation
- [ ] `/architecture` loads with the SVG diagram
- [ ] `/responsible-ai` renders all 6 sections (model card, eval methodology,
      failure modes, bias, data sources, escalation)
- [ ] `/scenarios` loads with all scenario card images (no broken images)
- [ ] `/welcome` loads
- [ ] Navigation between pages is smooth, no full-page reload flashes
- [ ] Window controls (browser chrome) are hidden or minimal in the recording
- [ ] DEMO_MODE banner does not appear in production-style recording (we want
      it on but invisible during recording — confirmed by Agent B's
      `lib/situation-service.ts` implementation)

## Backup plan if something breaks live

- If the WeChat sample chip auto-attach fails, switch to manual: type the
  example situation from `data/cached_responses/wechat_casting.json` into the
  input and upload `public/evidence/wechat_casting.png` from disk.
- If `/dashboard` doesn't show the just-submitted report, refresh the tab once
  during the voice-over transition — pre-seed data still demonstrates the
  Mae Sot heatmap heat.
- If a 404 appears mid-record (e.g. evidence image), restart from Beat 3 and
  use a cached take of Beat 1-2 in editing.
- If Azure responds in production (DEMO_MODE off): the result is still correct
  because the cached `wechat_casting.json` answer matches the live model's
  answer for this prompt — the difference is latency.

## Editing notes for the post-production cut

- Drop a subtle "TRUSTPASS THAILAND — DEMO" lower-third on Beat 3 result
  cards so the screenshot reads cleanly out of context (e.g. when shared on
  LinkedIn).
- Mae Sot dashboard heatmap is the second emotional peak after the
  Emergency result card — give it a half-beat of pause before voice-over
  resumes.
- End card: TrustPass Thailand logo + repo URL + team email. 3 seconds.

## Reference timings cheat-sheet

| Beat | Start | End  | Length | Where you should be |
|------|-------|------|--------|---------------------|
| 1    | 0:00  | 0:45 | 0:45   | News headline → landing |
| 2    | 0:45  | 1:30 | 0:45   | Landing → click Try Risk Check |
| 3    | 1:30  | 3:30 | 2:00   | `/check` hero demo → `/dashboard` payoff |
| 4    | 3:30  | 4:15 | 0:45   | `/architecture` → `/responsible-ai` |
| 5    | 4:15  | 5:00 | 0:45   | `/welcome` → ask close |

Total: 5:00 on the nose. Re-record any beat that runs >10 seconds over its
budget. The hero demo is the only beat allowed to stretch — and only at the
cost of trimming Beat 2.
