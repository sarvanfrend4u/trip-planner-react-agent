# Trip Cost Planner — AI Agent with 8 Reasoning Concepts

A Trip Cost Planner built to understand how **AI agents reason** — by implementing 8 reasoning concepts from scratch, in plain JavaScript, without any agent framework.

The goal was never the trip planner. The goal was to see each reasoning concept fail without the fix, then watch the fix work.

---

## Reasoning Concepts Implemented

| # | Concept | Problem It Solves |
|---|---|---|
| 1 | **Chain of Thought** | Model rushes, skips cost categories |
| 2 | **ReAct** | Model doesn't know current prices |
| 3 | **Self-Consistency** | Same query returns different prices each run |
| 4 | **Plan & Execute** | Agent loses track on multi-city trips |
| 5 | **Tree of Thoughts** | Agent commits to one path, never explores alternatives |
| 6 | **Self-Refine** | First draft is never the best draft |
| 7 | **Reflexion** | Retrying without knowing why you failed is just repetition |
| 8 | **Memory** | Every session starts from zero |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| LLM | Gemini 2.0 Flash |
| Web Search | Tavily API |
| Agent Loop | Plain JavaScript — no LangChain, no framework |
| File Storage | File System Access API + IndexedDB |

---

## How Each Concept Works in This Agent

### 1. Chain of Thought
Before calling any tool, the agent writes out its full reasoning plan:
- What cost categories do I need to research?
- What specific query will I use for each?
- In what order will I search?

This is enforced in the system prompt. The act of writing the plan improves the answer.

### 2. ReAct (Reasoning + Acting)
The core loop — already present in the base agent:
```
Thought → Action (web_search / calculate_total) → Observation → repeat
```
Gemini decides which tool to call. The code runs it. The result feeds back. Repeats until final answer.

### 3. Self-Consistency
For cost-related searches, the agent runs **3 parallel searches** with slight query variations and merges the results. Gemini sees all three and picks the consensus price. Outliers are naturally discarded.

```
"Chennai to Goa flight cost 2 people"
"Chennai to Goa flight cost 2 people 2025 current price"
"latest Chennai to Goa flight cost 2 people"
→ merged results → consensus price
```

### 4. Plan & Execute
Triggered automatically for multi-city trips.

**Phase 1 — Planner** (no tools): breaks the trip into a numbered task list
**Phase 2 — Executor**: runs each task one by one using web_search
**Phase 3 — Summariser**: assembles all results into the final plan

The agent can never lose track because the task list is fixed upfront.

### 5. Tree of Thoughts
Triggered for budget-sensitive queries ("cheap", "affordable", "tight budget").

Generates 3 approaches in parallel:
- **A) Comfort** — mid-range hotels, direct flights
- **B) Budget** — hostels, sleeper trains, budget airlines
- **C) Balanced** — mix of both

Scores each against the user's budget. Picks the best path. Continues down that path only.

### 6. Self-Refine
After the ReAct loop produces a draft answer, a second Gemini call critiques it:
- Missing cost categories?
- No contingency buffer?
- Budget exceeded with no alternative?
- Seasonal risk (monsoon) not mentioned?
- Math error?

If issues are found, a third call rewrites only the problematic parts. Stops early if no issues found.

### 7. Reflexion
If the plan is over budget after Self-Refine, the agent writes an explicit reflection before retrying:

```
What I chose: [the expensive choices]
Why it's over budget: [specific reason]
What I'll change: [specific cheaper alternatives]
```

That reflection is passed as context into the next attempt. Maximum 2 retries.

### 8. Memory
Three files stored on the user's local machine via the **File System Access API**:

| File | Contents | How Updated |
|---|---|---|
| `memory.json` | Facts about the user | Auto-saved after each session |
| `rules.json` | Behavioural rules | User confirms in UI before saving |
| `system_prompt.txt` | Base agent instructions | User edits in the Memory Panel |

At the start of every session, all three are loaded and injected into the system prompt. The agent behaves as if it remembers you — because it does.

**User-confirmed rules**: when the agent detects an instruction in chat ("always show budget hotels first"), it proposes saving it as a standing rule. The user sees a Save / Discard card before anything is written.

---

## Intent Detection

The chat input handles two types of messages:

```
"Plan a Goa trip for 2 people"        → TRIP_REQUEST → runs the agent
"Always warn me about monsoon season" → INSTRUCTION  → proposes a rule for confirmation
```

Gemini classifies the intent. Rules are never saved without user approval.

---

## How the Flow Routes

```
User query
    │
    ├── Multi-city?    → Plan & Execute
    ├── Tight budget?  → Tree of Thoughts → then ReAct
    └── Standard?      → ReAct loop
                              │
                         Self-Refine
                              │
                          Reflexion (if over budget)
                              │
                         Final Answer
                              │
                    Extract facts + propose rules
                    Facts → memory.json (auto)
                    Rules → user confirmation → rules.json
```

---

## Project Structure

```
src/
├── agent/
│   ├── reactAgent.js      ← Orchestrator — routes and runs all concepts
│   ├── tools.js           ← web_search (with Self-Consistency) + calculate_total
│   ├── intentDetector.js  ← classifies chat input as trip request or instruction
│   ├── selfRefine.js      ← critiques draft and rewrites only what's wrong
│   ├── reflexion.js       ← reflects on budget failure, retries with fix
│   ├── planExecute.js     ← splits multi-city trips into tasks, executes each
│   └── treeOfThoughts.js  ← explores 3 approaches, picks best for budget trips
├── storage/
│   ├── fileSystem.js      ← IndexedDB — persists folder handle across sessions
│   └── dataStore.js       ← reads/writes memory.json, rules.json, system_prompt.txt
└── components/
    ├── TripForm.jsx        ← structured trip input form
    ├── ChatInput.jsx       ← free-form chat (trip requests + instructions)
    ├── ReasoningPanel.jsx  ← live reasoning display for all step types
    ├── FolderSetup.jsx     ← one-time folder picker on first launch
    ├── RuleConfirmation.jsx ← Save/Discard card for proposed rules
    └── MemoryPanel.jsx     ← view/edit facts, rules, and system prompt

memory.json        ← sample of what gets stored (yours will grow over sessions)
rules.json         ← sample standing instructions
system_prompt.txt  ← base agent instructions (editable in the UI)
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/sarvanfrend4u/trip-planner-react-agent.git
cd trip-planner-react-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add API keys

Create a `.env` file in the root:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here
```

- Gemini API key → [Google AI Studio](https://aistudio.google.com)
- Tavily API key → [app.tavily.com](https://app.tavily.com) (free tier: 1,000 searches/month)

### 4. Run

```bash
npm run dev
```

Open `http://localhost:5173`

### 5. First launch

On first launch, the app will ask you to choose a folder on your machine. This is where `memory.json`, `rules.json`, and `system_prompt.txt` will be stored. You only need to do this once.

> Requires Chrome or Edge — File System Access API is not supported in Safari.

---

## Query to Test the Full Stack

This query triggers every concept simultaneously:

```
Plan an affordable 10-day trip across Mumbai, Goa, and Cochin
for 2 people on a tight budget of ₹70,000.
We are vegetarian and prefer trains over flights wherever possible.
```

What gets triggered:
- `"affordable"` + `"tight budget"` → Tree of Thoughts
- `"Mumbai, Goa, and Cochin"` → Plan & Execute
- Cost searches across 3 cities → Self-Consistency
- ₹70,000 for 10 days × 3 cities → likely over budget → Reflexion
- After final answer → Self-Refine
- `"vegetarian"` → auto-saved as Memory fact
- `"prefer trains over flights"` → proposed as a Rule (Save / Discard in UI)

---

## Key Learning

Each concept fixes exactly one failure mode. Stack them in the right order and the agent goes from brittle to reliable.

The order matters:

```
Plan & Execute / Tree of Thoughts  — route first
    ↓
ReAct loop                         — execute
    ↓
Self-Refine                        — improve
    ↓
Reflexion                          — recover if still failing
    ↓
Memory                             — learn for next time
```

---

## Note

API keys are never committed. The `.env` file is excluded via `.gitignore`.
