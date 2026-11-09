# Wayfinder — 3-Minute Demo Video Script
**IceHacks 2026 Hackathon Demo**  
*Video Target Duration: ≤ 2:55*

---

## Video Outline & Timestamps

| Timestamp | Screen / Visual | Spoken Narration | Key Action |
|---|---|---|---|
| **0:00 – 0:15** | Webcam / Title Slide | *"Every year, millions of college students lose financial aid or fail classes not because of academics, but because university bureaucracy is an impenetrable black hole."* | Show raw confusing university regulation wall of text |
| **0:15 – 0:30** | Raw Policy Page vs. Wayfinder Home | *"Wayfinder turns a university's published policy pages into an interactive, visual procedure map where every single step is grounded in verbatim policy text."* | Show Wayfinder Home with 3 situation cards (No chat box anywhere!) |
| **0:30 – 0:55** | Situation Card Selection & Map Screen | *"A student never types into a chatbot. They choose a situation — like 'I need to appeal a grade' at Rochester. Instantly, the bureaucratic maze becomes a deterministic, branching map auto-laid out by DAG algorithms."* | Click "I need to appeal a grade" card. Map renders smoothly. |
| **0:55 – 1:25** | Interactive Branch Click & Path Dimming | *"At this decision point — 'Instructor Determination' — what if the professor refuses to correct the grade? I click 'If resolution not reached'. Notice how the chosen branch highlights in sky-blue, while alternate paths dim. It feels like a real map, not a wizard."* | Click branch `If resolution not reached`. Downstream path highlights. |
| **1:25 – 1:55** | Grounding Guarantee & Citation Panel | *"Our core architecture invariant: AI is used at build-time only, never at runtime. No LLM hallucination happens when you click. When I click any step and open the Source panel, you see the exact sentence quoted verbatim from the university's handbook with a direct link."* | Click `[ACTION] Appeal to Dean of College`. Expand "Verbatim Policy Citation" section. |
| **1:55 – 2:25** | The Gap Moment (Emotional Peak) | *"Now here is the critical breakthrough: what happens when university regulations omit a case? Rather than pretending it knows, Wayfinder detects a 'Policy Gap'. When I click this dashed gap node, it tells me: 'The official policy stops here.' And it gives me an exact, build-time phone script ready to read to the Dean."* | Click `⚠️ [POLICY GAP] This policy does not specify...`. Show phone script and click "Copy Script". |
| **2:25 – 2:45** | Action Plan, .ics Sync & Counselor Share | *"In the sticky bottom bar, my path accumulates into an actionable plan. I can download an RFC 5545 `.ics` file for Google Calendar, copy a shareable link for my counselor, or click 'Export Action Checklist' to print a clean one-page action sheet with checkboxes."* | Click "Add to Calendar", copy Share Path, open "Export Action Checklist". |
| **2:45 – 3:00** | Live URL & Closing | *"Wayfinder is live right now at our deployment URL. Thank you!"* | Show live URL and close. |

---

## Narrator Failure-State Practice Tour

During judging Q&A, navigate to these query parameters to demonstrate failure states as first-class architectural features:

### 1. Unverified Procedure Banner (`?tour=unverified`)
- **URL**: `/map/rochester-grade-appeal?tour=unverified`
- **Narration**: *"If a policy page scraper extracts a claim that cannot be validated as a verbatim substring in the raw text, the ingestion pipeline marks it unverified and the UI surfaces this prominent amber warning. We refuse to show ungrounded information as truth."*

### 2. Policy Gap Encounter (`?tour=gap`)
- **URL**: `/map/rochester-grade-appeal?tour=gap`
- **Narration**: *"Policy gaps are not software bugs; they are policy bugs. When a decision fork has only one handled branch, our deterministic graph builder emits a gap node with an immediate self-advocacy phone script."*

### 3. Date-Unknown Deadline (`?tour=date-unknown`)
- **URL**: `/map/berkeley-aid-disbursement-adjustments?tour=date-unknown`
- **Narration**: *"When a policy mentions a deadline requirement like 'at census freeze' without a calendar date, we never guess. In the calendar export, it is explicitly excluded from scheduled dates and listed under 'Dates unknown — call to confirm'."*

### 4. Developer Ingestion Lab (`/lab`)
- **URL**: `/lab`
- **Narration**: *"In our developer lab, feeding a non-process page (like a university mission statement) triggers our extractor's strict refusal schema: `{'error': 'not_a_process'}`. The system refuses to invent processes where none exist."*
