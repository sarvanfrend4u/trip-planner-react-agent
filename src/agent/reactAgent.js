// ─────────────────────────────────────────────
// REACT AGENT — ORCHESTRATOR
//
// Routes the query to the right flow:
//
//   Multi-city trip  → Plan & Execute
//   Tight budget     → Tree of Thoughts first
//   Standard trip    → ReAct loop
//
// All flows then go through:
//   Self-Refine  → critique and improve the draft
//   Reflexion    → retry if over budget
//
// Memory and rules are loaded by the caller (App.jsx)
// and injected into the system prompt here.
// ─────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai"
import { toolDefinitions, executeTool } from "./tools.js"
import { refineAnswer } from "./selfRefine.js"
import { runWithReflexion } from "./reflexion.js"
import { isMultiCity, planAndExecute } from "./planExecute.js"
import { isTightBudget, treeOfThoughts } from "./treeOfThoughts.js"

const BASE_SYSTEM_PROMPT =
`You are a trip cost planning assistant. Your job is to research real travel costs and give users an accurate budget breakdown.

You have two tools:
- web_search: search the web for real travel costs (flights, hotels, food, activities)
- calculate_total: sum all costs and check against the user's budget

Chain of Thought — before your first tool call, write out:
1. What cost categories do I need to research? (flights, hotels, food, activities, local transport, visa if international)
2. What specific search query will I use for each category?
3. What order will I search in?

Rules:
- Never guess or assume numbers — always use web_search to get real data
- Search for each category one at a time
- Always call calculate_total as your last tool call
- Always use ₹ (INR) amounts
- Always include a 10% contingency buffer in the final total`

// Build the full system prompt by combining:
//   base instructions + user-confirmed rules + user facts from memory
export function buildSystemPrompt(memory, rules, customPrompt) {
  let prompt = customPrompt || BASE_SYSTEM_PROMPT

  if (rules.length > 0) {
    prompt += "\n\nStanding instructions from this user:\n"
    rules.forEach(r => { prompt += `- ${r}\n` })
  }

  if (memory.length > 0) {
    prompt += "\n\nWhat you know about this user:\n"
    memory.forEach(m => { prompt += `- ${m}\n` })
  }

  return prompt
}

// ── Main agent entry point ───────────────────
export async function runTripAgent(userQuery, onStep, context = {}) {
  const { memory = [], rules = [], systemPrompt = null } = context
  const apiKey     = import.meta.env.VITE_GEMINI_API_KEY
  const fullPrompt = buildSystemPrompt(memory, rules, systemPrompt)
  const genAI      = new GoogleGenerativeAI(apiKey)

  // ── Route: multi-city → Plan & Execute ──────
  if (isMultiCity(userQuery)) {
    const result  = await planAndExecute(userQuery, apiKey, onStep)
    const model   = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const refined = await refineAnswer(userQuery, result, model)
    const final   = await runWithReflexion(userQuery, refined, model, onStep)
    onStep({ type: "final_answer", content: final })
    return { answer: final }
  }

  const model = genAI.getGenerativeModel({
    model:             "gemini-2.0-flash",
    tools:             [{ functionDeclarations: toolDefinitions }],
    systemInstruction: fullPrompt,
  })

  // ── Route: tight budget → Tree of Thoughts ──
  let queryToUse = userQuery
  if (isTightBudget(userQuery)) {
    const chosenApproach = await treeOfThoughts(userQuery, apiKey, onStep)
    queryToUse = userQuery + "\n\nUse this approach: " + chosenApproach
  }

  // ── Standard ReAct loop ──────────────────────
  const chat          = model.startChat()
  let   message       = queryToUse
  const MAX_ITERATIONS = 12
  let   draftAnswer   = null

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response
    try {
      const result = await chat.sendMessage(message)
      response     = result.response
    } catch (err) {
      onStep({ type: "error", message: `Gemini API error: ${err.message}` })
      return
    }

    const parts     = response.candidates?.[0]?.content?.parts ?? []
    const textParts = parts.filter(p => p.text)
    const funcPart  = parts.find(p => p.functionCall)

    if (funcPart) {
      const { name, args } = funcPart.functionCall

      const thoughtText = textParts.length > 0
        ? textParts.map(p => p.text).join(" ").trim()
        : synthesizeThought(name, args)

      onStep({ type: "thought",      content: thoughtText })
      onStep({ type: "action",       tool: name, args })

      let toolResult
      try   { toolResult = await executeTool(name, args) }
      catch (err) { toolResult = { error: err.message } }

      onStep({ type: "observation", result: toolResult })

      message = [{ functionResponse: { name, response: { result: toolResult } } }]
    } else {
      draftAnswer = textParts.map(p => p.text).join("\n").trim()
      break
    }
  }

  if (!draftAnswer) {
    onStep({ type: "error", message: "Agent reached maximum steps without a final answer." })
    return
  }

  // ── Self-Refine ──────────────────────────────
  onStep({ type: "thought", content: "Reviewing and refining the plan..." })
  const refined = await refineAnswer(userQuery, draftAnswer, model)

  // ── Reflexion ────────────────────────────────
  const final = await runWithReflexion(userQuery, refined, model, onStep)

  onStep({ type: "final_answer", content: final })
  return { answer: final }
}

// ── Session learning extractor ───────────────
// Called after each session to extract facts and
// rules from what happened in the conversation.
export async function extractSessionLearnings(query, answer, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const result = await model.generateContent(`
Analyze this trip planning session and extract two types of learnings.

User query: "${query}"
Answer summary: "${answer.slice(0, 600)}"

FACTS: Personal facts about the user revealed in this session.
  - Only things explicitly stated (companions, dietary needs, home city, budget range, preferences)
  - Do not infer or guess

RULES: Behavioural rules the agent should follow in future sessions.
  - Based on what the user asked for or what the plan required
  - Only rules that would genuinely improve future responses

Reply with JSON only, no markdown:
{"facts": ["fact1", "fact2"], "rules": ["rule1", "rule2"]}

Return empty arrays if nothing clearly useful was revealed.
`)

  try {
    const text = result.response.text().trim()
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    return JSON.parse(json)
  } catch {
    return { facts: [], rules: [] }
  }
}

// ── Internal helpers ─────────────────────────

function synthesizeThought(toolName, args) {
  if (toolName === "web_search")      return `Searching for: "${args.query}"`
  if (toolName === "calculate_total") return "I have all the cost data. Calculating total and checking the budget."
  return `Calling ${toolName}...`
}
