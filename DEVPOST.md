# Wayfinder — Devpost Submission Write-Up
**IceHacks 2026 Hackathon Project**

## Inspiration
Every academic year, thousands of university students drop out, lose their federal grants, or miss out on graduation not because of poor grades, but because university bureaucracy is an opaque, high-stakes black hole. 

Standard university procedure pages (such as financial aid verification, grade appeals, and fee waivers) are written in dense administrative legalese. When students turn to conversational AI chatbots, they encounter hallucinations: plausible-sounding deadlines, invented contacts, and confident answers to questions that the university's regulations never actually answered.

We built **Wayfinder** to solve this once and for all. Wayfinder replaces conversational chatbots with deterministic, visual procedure maps.

---

## What It Does
Wayfinder transforms published university policy pages into interactive, navigable decision maps:
1. **Zero Chat Interface**: Students never type into a prompt box. Interaction is 100% selection, clicking, and exploring.
2. **Interactive Branching**: Students click the situation branch matching their circumstances. The chosen path highlights while alternative branches dim but remain visible.
3. **100% Verbatim Grounding Citations**: Every single node displays the exact sentence quoted from the university's official policy page, with a direct link.
4. **Policy Gap Detection**: When university regulations fail to specify what happens next, Wayfinder doesn't hallucinate. It surfaces an amber "Policy Gap" node with the best fallback contact and a phone script ready for the student to read aloud.
5. **Action Plan Exports**:
   - One-page printable action checklist with checkboxes.
   - Client-side RFC 5545 `.ics` calendar sync for deadlines.
   - "Share Path" URL encoding and counselor review dashboard with advisory notes.

---

## How We Built It (Core Architecture Invariants)

Wayfinder was built under strict architectural rules to guarantee trust:

### 1. AI is Build-Time Only (Zero Runtime LLMs)
The language model is utilized **strictly during ingestion**, never when a student clicks on the map. Once a procedure map is generated, the student navigates plain, deterministic data. No network lag, no unpredictable outputs, zero runtime inference costs.

### 2. The Verbatim Grounding Validator
Before any extracted step can enter a procedure map, plain deterministic TypeScript code normalizes whitespace and verifies that its `source_sentence` is an exact substring of the scraped raw text. If any step cannot be grounded verbatim in the university's policy, the ingestion CLI flags it and exits with code 2, marking the procedure unverified.

### 3. Strict Refusal Over Invention
The extractor operates at temperature 0 with a strict Zod boundary schema. If an informational page (like a university mission statement) is fed to the pipeline, it returns `{"error": "not_a_process"}`. If dates, documents, or contacts are missing from the text, fields remain `null`. The system refuses rather than invents.

### 4. Deterministic Graph Builder & Auto-Layout
Graph assembly uses zero AI. Plain code maps steps into React Flow nodes and wires edges from conditions and dependencies. Graph layout is computed deterministically using `@dagrejs/dagre` (rank separation and node separation), preventing any overlapping nodes.

### 5. Rule-Based Policy Gap Detection
Gap nodes are a first-class feature:
- If a decision step has fewer than 2 outgoing edges, code emits an unhandled branch gap node.
- If a step is marked as a deadline but contains no date in the text, code emits an unspecified deadline gap node.
- Human-sounding advocacy phone scripts are pre-generated at build-time and stored directly in the static graph JSON.

### 6. Swappable Repository Interface
The persistence layer is abstracted behind `IProcedureRepository` with a single factory file (`factory.ts`). The demo runs on `LocalStorageRepository` with static JSON graphs, allowing full offline operation. The documented `RestRepository` adapter can be swapped in with exactly one import change to connect to Momen's PostgreSQL cloud backend.

---

## Challenges We Ran Into
- **Scraping Real University Walls of Text**: University web layouts vary wildly. We combined `@mozilla/readability` with `JSDOM` and regex cleanup to extract clean procedural sentences while keeping verbatim sentence boundaries intact.
- **Enforcing Verbatim Grounding Without False Negatives**: Minor unicode discrepancies (e.g. non-breaking spaces `\u00A0`, directional curly quotes, and line breaks) initially caused exact substring checks to fail. We engineered a whitespace normalization algorithm that standardizes whitespace while preserving exact character sequencing.
- **Layout Consistency for Complex Branching**: Ensuring decision nodes, standard steps, and newly emitted policy gap nodes lay out without overlapping required fine-tuning Dagre's bounding box constraints and rank directions.

---

## Accomplishments We're Proud Of
- **100% Offline Capability**: All 3 demonstration procedures (`rochester-grade-appeal`, `uw-irs-verification-nonfiling`, `berkeley-aid-disbursement-adjustments`) run entirely from committed static graphs.
- **24 Automated Vitest Unit & Snapshot Tests**: 100% pass rate covering schema validation, pure auto-layout snapshots, verbatim grounding spot-checks, `.ics` calendar generation, and repository persistence.
- **The Gap Moment**: Turning what traditional chatbots hide (policy omissions) into the emotional peak of the demo where the student is empowered with a script to advocate for themselves.

---

## What's Next for Wayfinder
- **Campus Multi-Tenancy**: Expanding the scraper to automatically index university policy portals across all 50 states.
- **Momen Cloud Production Deployment**: Connecting the `RestRepository` adapter to Momen for real-time counselor-student collaborative roadmap annotations.
- **Mobile PWA & SMS Alerts**: Pushing deadline reminders and checklist updates to students via SMS for urgent financial aid priority dates.
