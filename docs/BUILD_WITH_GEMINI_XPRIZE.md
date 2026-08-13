# OpenDome × Build with Gemini XPRIZE — Qualification Cross-Check

**Date:** 2026-08-12  
**Competition:** [Build with Gemini XPRIZE](https://xprize.devpost.com) (Devpost / XPRIZE)  
**Bonus:** Circle Agentic Economy Prize ($50,000)  
**Deadline:** Aug 17, 2026 @ ~1:00–2:00pm PT / 2:00pm CST  

This document (1) describes the **multi-agent day planner** shipped in OpenDome, and (2) cross-checks the product against official XPRIZE + Circle eligibility. It is an internal readiness audit — not legal advice.

---

## Part A — Multi-agent day planner (what we built)

### Goal

Turn “plan my TDC day around this show” into a **council of specialist planners** that:

1. Lock the anchor event (doors / hard deadline)
2. Propose related amenities (affinity + persona bias)
3. Fit open hours, durations, travel buffers, and gaps
4. Score candidates and keep the winner

**Code:** `open-dome-lib/src/dayPlannerAgents.js`  
**Entry:** `buildItineraryProposal()` / `buildItineraryForEvent()` in `itinerary.js` / `planner.js`  
**UI:** Wallet Agent → select event → Plan day → itinerary card/sheet  

### Agents (personas)

| ID | Name | Role | Bias |
|----|------|------|------|
| `pulse` | Pulse | High-energy scout | thrill, sport, play |
| `zen` | Zen | Calm pre-show scout | relax, spa, culture |
| `curator` | Curator | Culture scout | culture |
| `local` | Local | Neighborhood day scout | family, food, play |

Default **4 agents** (`agentCount`); each drafts a full candidate day.

### Pipeline

```
User picks event + “Plan day”
        │
        ▼
┌─────────────────┐
│  AnchorAgent    │  doors, travel buffer (20m), latest activity end
└────────┬────────┘
         ▼
┌─────────────────┐
│  ScoutAgent ×N  │  rank amenities per slot (morning / lunch / afternoon)
│  (Pulse/Zen/…)  │  affinity score + persona tagBias + user intent keywords
└────────┬────────┘
         ▼
┌─────────────────┐
│ SchedulerAgent  │  openFrom/openTo, duration, gaps (15m), squeeze/drop if
│                 │  activity cannot finish before doors − buffer
└────────┬────────┘
         ▼
┌─────────────────┐
│  CriticAgent    │  score: completeness, feasibility, affinity, gaps,
│                 │  cushion to doors → pick highest
└────────┬────────┘
         ▼
   Winning itinerary + council metadata
```

### What the critic optimizes

- Full morning → lunch → afternoon when possible  
- Open-hours + doors compliance (hard)  
- Affinity to event type (baseball / concert / combat / …) and user text (“spa”, “golf”, …)  
- Penalize long idle gaps and illegal overruns  

### Outputs for product / judges

Proposal fields include:

- `stops[]` — timed itinerary (fillers + anchor event)  
- `insight` — human line (“Council of 4: Zen won …”)  
- `council.winner` / `council.candidates[]` — scores, feasibility, summaries  

Wallet Agent surfaces the winner + insight in the chat bubble after Plan day.

### Important distinction (for XPRIZE narrative)

| Layer | Implementation | LLM? |
|-------|----------------|------|
| Day planner council (Pulse/Zen/…) | Deterministic multi-agent pipeline in `opendome` | **No** — local scoring |
| Free-chat / Circle tools Agent | `@google/genai` on Vertex / Gemini via App `/api/agent` | **Yes** — Gemini |
| Payment | x402 + Circle developer-controlled wallets / USDC | Circle stack (see Part C) |

Judges care that **AI is live and decides**; document both the Gemini agent path and this planning council as complementary AI-native operations.

---

## Part B — Build with Gemini XPRIZE (main prize) cross-check

### Verdict (summary)

| Area | Status | Notes |
|------|--------|--------|
| Google Cloud product | **Likely YES** | Firestore + Vertex/Gemini GenAI (`GCP_*`, `@google-cloud/firestore`, `@google/genai`) |
| Gemini API / LLM call in deployed app | **Likely YES** | Host `/api/agent` uses Gemini after payment settle |
| AI operates key workflows | **PARTIAL → YES if framed** | Planner council + agent chat + mint/pay flows; strengthen production logs |
| Category fit | **YES (pick one)** | Strongest: **Money & Financial Access** and/or **Professional Services Access** / Small Business (venue ops) |
| Real business + revenue + customers | **UNKNOWN / CRITICAL** | Must prove arms-length revenue in May–Aug 2026 window |
| New project after May 19, 2026 | **RISK** | Codebase predates window; rules require *newly created* after start — need “what was built in-window” narrative + honest disclosure of prior boilerplate |
| Submission materials | **TODO** | Video ≤3min, 500–1000 word narrative, GitHub share, P&L, product/customer evidence |
| Deadline | **Aug 17, 2026** | ~5 days from this audit |

### Required building blocks

| Requirement | OpenDome evidence | Gap / action |
|-------------|-------------------|--------------|
| Use ≥1 Google Cloud product | Firestore (users/passkeys/tickets), Vertex Gemini | Keep ADC / project IDs documented; screenshots of GCP console usage |
| Gemini for ≥1 LLM call in deployed app | `OpenDomeApp` agent API + GenAI | Confirm production URL still hits Gemini (not only local bypass); log one live call for evidence |
| Business operated by AI agents | Day-plan council; agent chat; optional Circle nanopayment tools | Add durable **agent execution logs** (council winner, Gemini tool calls, x402 settle hashes) |
| Category | TBD on Devpost form | Recommend primary: **Money & Financial Access** (USDC / x402 / NFT passes) with secondary narrative on venue/guest experience |
| Real customers + revenue | Not verifiable from repo alone | Stripe/bank/P&L template; arms-length vs related-party split |
| New projects only | Historical OpenDome monorepo | Explicitly list features built after May 19 2026 (agent, checkout, planner council, Wallet UX, etc.) and how pre-existing SDK was extended |

### Judging criteria mapping

1. **Business Viability** — Needs real revenue, users, sustainability story. Product alone is insufficient.  
2. **AI-Native Operations** — Strongest OpenDome angle: agent-mediated pay → mint → plan; council executes schedule decisions without a human picking amenities. Show continuous production evidence.  
3. **Category Impact** — Frame as programmable guest economy / nano-payments for experiences at Tokyo Dome City scale.

### Submission checklist (main)

- [ ] Devpost project created; category selected  
- [ ] GitHub shared with `testing@devpost.com` and `judging@hacker.fund`  
- [ ] ≤3 min public video (YouTube/Vimeo/Youku) showing **live** AI decisions + pay/mint/plan  
- [ ] Written narrative 500–1000 words (human vs AI roles, jobs/impact beyond founders)  
- [ ] Revenue by month (May–Aug 2026), total expenses, marketing CAC (even if $0)  
- [ ] Corporate ID if org  
- [ ] Product evidence: agent logs, GCP/Gemini usage, dashboards, Basescan links  
- [ ] Customer evidence / testimonials (with consent)  
- [ ] English materials  

---

## Part C — Circle Agentic Economy Prize ($50k) cross-check

### Extra rules (on top of main)

- Opt-in on Devpost: “Circle Agentic Economy Prize?”  
- Must use **Circle’s Agent Stack** so agents **autonomously make and/or receive** USDC payments  
- Proof bundle (all required):  
  1. Public GitHub verifying integration  
  2. Recorded demo of **real, verifiable USDC** tx  
  3. Agent Circle wallet address + clickable explorer URL  
- Payment must be **agent-driven** — human manually completing checkout **does not qualify**  
- Still need Google Cloud hosting / base XPRIZE rules  
- Prize stacking: can win one main/category prize **plus** this bonus  

### OpenDome vs Circle eligibility

| Requirement | Current OpenDome | Status |
|-------------|------------------|--------|
| Circle wallets / USDC | Developer-controlled wallets, EIP-3009 / x402, Base USDC | **Partial** |
| Agent Stack branded APIs (Agent Wallets, Nanopayments Gateway, Marketplace, CLI, Skills) | Integration looks **custom x402 + Circle DCW**, not clearly the Agent Stack starter kit | **GAP — verify or migrate** |
| Agent autonomously pays (no human checkout) | User often confirms via payment sheet / passkey; host signs via Circle HSM | **RISK** — judges may call this human-gated; need a path where the **agent** initiates settle within policy |
| Real USDC tx + Basescan | Achievable on Base when bypass is off | **Doable** — keep FORCE_SKIP / OD_BYPASS off for demo recording |
| Public repo proof | Monorepo can be public or shared | **Doable** |

### Circle judging focus

- Creativeness & innovation of agentic payments  
- Centrality to business (not bolted-on)  
- Technical depth & autonomy  
- Customer experience  

OpenDome’s best story: **agent pays for Gemini turns and/or itinerary checkout in USDC**, then platform mints passes — payments are the product spine, not a sidebar.

### Circle checklist

- [ ] Opt-in on submission form  
- [ ] Confirm or port to Circle Agent Stack (wallet + nanopayments) with policy limits  
- [ ] Demo path: agent triggers USDC without human clicking “Sign & pay” (or clearly agent-initiated with policy)  
- [ ] Capture wallet address + Basescan URL in submission  
- [ ] Public GitHub path to payment code (`x402`, Circle client, agent pay bridge)  

---

## Part D — Suggested narrative spine (for video + 500–1000 words)

1. **Problem:** Guests can’t assemble a Tokyo Dome City day (show + spa + food + play) and pay/mint access in one agentic loop.  
2. **AI ops:** Gemini agent for open chat/tools; **planner council** for schedule decisions; x402/USDC for machine-speed settlement.  
3. **Google Cloud:** Firestore identity + tickets; Vertex Gemini.  
4. **Circle:** USDC agent payments on Base (target Agent Stack for bonus).  
5. **Humans:** Venue ops, passkey identity, exception handling; AI runs planning + payment + mint orchestration.  
6. **Impact:** Staff scanners, merchants, guests — financial access to experiences at nano scale.  

---

## Part E — Honest go / no-go

| Track | Qualifiable today? | What must happen before Aug 17 |
|-------|--------------------|--------------------------------|
| Main XPRIZE | **Yes on tech + B2B story** if TDC revenue + users are documented for the window | Submission pack: video, P&L showing TDC revenue, GCP/Gemini/council logs |
| Circle $50k | **Not yet — product intent is right, autonomy gap remains** | After council wins: **agent** settles USDC for tickets/NFTs (no human Sign & pay); Agent Stack + Basescan proof |

**Product intent (confirmed with team):** Multi-agent council investigates the day → reaches a decision → **pays** for tickets / amenity reservations / NFT mint. Human taps today are a temporary UX, not the end state.

**Client context:** Built for **Tokyo Dome City** as an update to their guest systems; revenue is B2B from that relationship — frame as arms-length enterprise customer evidence on Devpost (with consent / high-level breakdown).

**Recommendation:** Main prize narrative = TDC digital guest economy operated by AI (plan + pay + mint). Circle bonus = finish the autonomous pay leg this week so the same loop is on-chain without a human checkout tap.


---

## Appendix — Key code paths

| Concern | Path |
|---------|------|
| Multi-agent council | `open-dome-lib/src/dayPlannerAgents.js` |
| Affinity / intent | `open-dome-lib/src/amenityAffinity.js` |
| Proposal API | `open-dome-lib/src/itinerary.js` → `buildItineraryProposal` |
| Wallet routing | `OpenDome/OpenDomeMiniApps/Wallet/src/features/agent/routeAgentTurn.js` |
| Gemini host agent | `OpenDome/OpenDomeApp/src/app/api/agent+api.js` |
| x402 pay | `OpenDome/OpenDomeApp/src/app/api/x402-pay+api.js` |
| Checkout / mint | `OpenDome/OpenDomeApp/src/app/api/checkout+api.js` |
| Firestore | `OpenDome/OpenDomeApp/src/utilsAPI/passkeyDb.js`, tickets DB |

---

*Last updated for internal XPRIZE readiness. Re-verify against Devpost rules page before final submit.*
