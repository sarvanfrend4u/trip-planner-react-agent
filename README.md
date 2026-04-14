# Trip Cost Planner — Learning ReAct Agents

A Trip Cost Planner built to understand how **ReAct (Reasoning + Acting) Agents** work — by building one from scratch, without any agent framework.

The agent searches the web for real travel costs, reasons about the results, and streams every Thought → Action → Observation step live to the UI.

---

## What is a ReAct Agent?

ReAct agents loop through three steps until they have a final answer:

```
Thought     → reason about what is needed next
Action      → call a tool (e.g. web search)
Observation → read the result
              (repeat)
Final Answer
```

This project makes that loop visible. Every step the agent takes appears on screen in real time.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| LLM | Gemini 2.0 Flash (Google AI) |
| Web Search Tool | Tavily API |
| Agent Loop | Plain JavaScript — no LangChain, no framework |

---

## How It Works

1. User fills in trip details (From / To / Days / People / Budget)
2. A natural language query is built and sent to Gemini
3. Gemini decides which tool to call — `web_search` or `calculate_total`
4. Your code runs the tool and feeds the result back to Gemini
5. Gemini keeps reasoning until it has all costs, then returns a final answer
6. Every step streams live to the UI

The agent loop is a single `for` loop in `src/agent/reactAgent.js`. That is the entire agent.

---

## Project Structure

```
src/
├── agent/
│   ├── reactAgent.js   ← The ReAct loop (core of the project)
│   └── tools.js        ← Tool functions + schemas sent to Gemini
└── components/
    ├── TripForm.jsx     ← Input form
    └── ReasoningPanel.jsx ← Live reasoning display
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

---

## Key Learning

The ReAct loop is just this:

```js
while (true) {
  const response = await gemini.sendMessage(message)

  if (response.hasFunctionCall()) {
    const result = await runTool(response.functionCall())
    message = feedResultBack(result)   // loop continues
  } else {
    return response.text()             // final answer — done
  }
}
```

Gemini says which tool to call. Your code runs it. The result feeds back. Repeat.

---

## Note

API keys are never committed. The `.env` file is excluded via `.gitignore`.
