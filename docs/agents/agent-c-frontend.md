# Agent C — Frontend hero features + dashboard payoff

# Your Mission

Ship the 4 hero features (grounding panel confidence + sources, Trusted Operator card, community corroboration line, /welcome hotel QR deep-link), plus the dashboard payoff narrative and per-page polish. This is the frontend that makes the recorded pitch video cinematic.

# Your tasks (do these IN ORDER)

## Task 1. Define local types (since Agent B's types aren't merged yet)

Add these types either in `components/TrustPassChat.tsx` or a new local file like `components/types.ts`:
- `GroundingSignal` with `source_file?`, `source_label?`, `confidence_percentage?`
- `TrustedOperatorSignal`
- `CommunityCorroboration`
- `DegradedResponse`

Mark with `// TODO: import from @/lib/types after Agent B merges`. When B's PR is merged into master, you'll rebase and replace the local types with imports.

## Task 2. Grounding panel with confidence + source citations

In `components/TrustPassChat.tsx`, find the existing grounding-display block:
- For each `GroundingSignal`:
  - Render confidence chip with `data-confidence={signal.confidence}` and showing `{signal.confidence_percentage}%` (fallback to mapping if percentage missing: low→60, medium→80, high→95)
  - Below the summary, render a citation line styled like an academic citation: `Source: {signal.source_label ?? signal.tool} · {signal.source_file ?? "internal"}`
  - If `source_file` starts with `data/`, render it as `<code>` styled as inline file path
- Apply Tailwind: green chip for high (90%+), yellow for medium (70-89%), grey for low (<70%)

## Task 3. Trusted Operator card

**Expand `data/verified_operators.demo.json` from 3 to 15+ entries:**
- Bangkok: 4 entries — tour, restaurant, transport, rental
- Phuket: 3 entries
- Chiang Mai: 3 entries
- Pattaya: 3 entries
- 2 with `status: "no_license"` for the "we caught this one" demo
- License format: `TAT 11/12345`, `TAT 33/01234` (TAT format is region-code/serial)
- Operator types mix: tour, rental, restaurant, transport, wellness

**Add operator-lookup function to `lib/grounding-tools.ts`:**
```ts
export function lookupOperator(operatorName: string | null, city?: string): TrustedOperatorSignal | null;
```
- Case-insensitive substring match first, then word-overlap fallback
- Returns the signal per contract
- Returns `{ operator_name: <input>, status: "not_in_directory" }` if no match
- Called from existing grounding-building flow when operator name detected in `evidence-hints.ts` output

**Render the card in `components/TrustPassChat.tsx`:**
- Apply `data-operator-status={trusted_operator.status}` for styling hooks
- Verified (green): `✓ Verified Trusted Thailand operator — {tat_license}` with operator type subtext
- No license (yellow): `✗ No TAT license found for "{operator_name}" — verify before paying`
- Not in directory (grey): `? "{operator_name}" not in our directory — check with hotel desk`
- Place above the suspicious_signals list so it's the first thing the eye lands on

## Task 4. Community corroboration line

**In `lib/intelligence-store.ts`,** add a query function:
```ts
export function getSimilarIncidentCount(opts: {
  category?: string;
  cityOrLocation?: string;
  windowDays: number;
}): { count: number; location_label: string };
```

**Pre-seed the store with 8-12 realistic reports** across cities including 2 prior fake-casting cases near Mae Sot so the WeChat hero case shows "3 similar reported in last 7 days" believably.

**In `components/TrustPassChat.tsx`** result card:
- Below the suspicious_signals list, render `community` if present
- Format: `{count} similar incident(s) reported near {location_label} in the last {window_days} days`
- Wrap in `<Link href="/dashboard?pattern={category}">`
- Hide entirely if `community` absent

## Task 5. Hotel QR onboarding `/welcome`

**New file `app/welcome/page.tsx`:**
- Reads URL search params: `hotel`, `city`, `lang`
- Renders branded splash: "Welcome from {hotel} — TrustPass is here for your stay"
- Microsoft blue (`#0078D4`) styling consistent with rest of app
- Auto-redirect to `/check?city={city}&lang={lang}&referrer=hotel:{hotel}` after 2-second dwell, OR single button "Continue to TrustPass"
- Defaults: if no `hotel`, show generic "Welcome to TrustPass"

**Modify `components/TrustPassChat.tsx`:**
- Accept `city`, `lang`, `referrer` URL params (use `useSearchParams` from `next/navigation`) and pre-fill the form
- Store referrer in form state, include in analyze request payload (just send it in the payload — Agent B will accept any extra fields)

**Modify `lib/intelligence-store.ts`:**
- When recording an eligible check with `referrer` like `hotel:ManoraHotel`, attribute to hotel. Surface in dashboard as small text: "Manora Hotel referred N checks this week"

## Task 6. Dashboard payoff

**In `app/dashboard/page.tsx`:**
- When merging the just-submitted report from sessionStorage into displayed list, give it `data-fresh="true"` + Tailwind animation `animate-emergencyPulse` for ~3 seconds
- Add row-click drawer/modal showing structured incident report (signals, actions, Thai phrase, contact_recommendation, full report.english + report.thai)

**Read `components/ThailandHeatmap.tsx`** to verify the data path goes through the intelligence-store. If not, wire it so a freshly-submitted Mae Sot report visibly increases the Mae Sot dot.

## Task 7. Hero chip upgrade

**In `components/TrustPassChat.tsx` sample chips:**

WeChat chip behavior:
- Auto-fills tourist message (verbatim English translation of typical WeChat casting lure)
- Auto-attaches `/evidence/wechat_casting.png` as `evidenceImage` (fetch as blob, convert to base64 data URL)
- Pre-sets `city = "Bangkok"`, `language = "English"`, `incidentDateIso = today`
- Triggers analyze immediately

Same one-click for 3 secondary scenarios (taxi, motorbike, line tour) without auto-attach.

Visual prominence: large pill buttons with scenario icon, color-coded by risk level produced.

**Modify `app/scenarios/page.tsx`:**
- Each scenario card gets "Try this case" CTA: `/check?chip={scenarioId}&autoplay=1`
- `/check` reads `chip` param and triggers chip on load if `autoplay=1`

## Task 8. Degraded state UI

**In `components/TrustPassChat.tsx`:**
When response `status === "degraded"`, render `fallback_result` content normally but with:
- Yellow banner at top: "Live AI service unavailable. Showing rule-based assessment instead. ({reason_text})"
- `data-status="degraded"` attribute on the card
- Source attribution shows "local-demo" instead of "azure-openai"

## Task 9. Thumbs up/down feedback widget

**In `components/TrustPassChat.tsx`** below result card:
- Compact thumbs up / thumbs down buttons
- Thumbs down opens inline textarea for optional reason
- POSTs to `/api/feedback` with `{ request_id: response.request_id ?? null, rating: "up"|"down", reason?: string }`
- If Agent A's `/api/feedback` endpoint isn't merged yet, the POST will 404 — that's fine, fail silently
- Visual confirmation: "Thanks for the feedback" replaces buttons after submit

## Task 10. Page polish pass

- Replace any "assistant" / "chat" copy in TrustPassChat with "analysis" / "risk check" / "evidence pipeline"
- Verify Microsoft blue `#0078D4` consistency across all interactive elements
- Verify dark mode renders cleanly
- Loading states feel premium, not janky
- `components/SiteNav.tsx`: add footer with `/responsible-ai` link

# Definition of done

- All files modified/created per tasks
- Branch committed and pushed: `git push -u origin agent-c-frontend`
- No edits to files owned by A, B, or D
- `npm run build` and `npm run lint` pass
