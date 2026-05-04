// ─────────────────────────────────────────────
// PLAN AND EXECUTE
//
// For multi-city trips, splits the task into
// two separate phases so the agent never loses
// track of what it has and hasn't researched:
//
// Phase 1 — PLANNER: no tools, just a task list
// Phase 2 — EXECUTOR: runs each task one by one
//            using web_search tools
// Phase 3 — SUMMARISER: assembles all results
//            into the final plan
// ─────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai"
import { toolDefinitions, executeTool } from "./tools.js"

// Detect if query is a multi-city trip
export function isMultiCity(query) {
  const lower = query.toLowerCase()

  // Explicit keywords
  const multiKeywords = ["multi-city", "multi city", "circuit", "multiple cities", "road trip across"]
  if (multiKeywords.some(k => lower.includes(k))) return true

  // Sequential connectors: "then", "followed by", "via"
  const connectors = (query.match(/\b(then|via|followed by)\b/gi) || []).length
  if (connectors >= 1) return true

  // Three or more "and" in a way that suggests multiple destinations
  const andCount = (query.match(/\band\b/gi) || []).length
  return andCount >= 2
}

export async function planAndExecute(query, apiKey, onStep) {
  const genAI = new GoogleGenerativeAI(apiKey)

  // ── Phase 1: Plan ────────────────────────────
  onStep({ type: "plan_start", content: "Multi-city trip detected. Creating research task list first..." })

  const planner = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const planResult = await planner.generateContent(`
You are a trip planning coordinator. Break this multi-city trip into a numbered list of specific research tasks.

Do NOT research anything yet. Just list what needs to be looked up.
Each task = one specific search (one city, one category).

Request: "${query}"

Output numbered tasks only, one per line:
1. [specific task]
2. [specific task]
...
`)

  const planText = planResult.response.text().trim()
  onStep({ type: "plan", content: planText })

  // Parse the numbered task list
  const tasks = planText
    .split("\n")
    .filter(line => /^\d+\./.test(line.trim()))
    .map(line => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)

  // ── Phase 2: Execute each task ────────────────
  const results = []

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    onStep({ type: "executing_task", content: `Task ${i + 1} of ${tasks.length}: ${task}` })

    // Each task runs its own mini ReAct loop with tools
    const executor = genAI.getGenerativeModel({
      model:             "gemini-2.0-flash",
      tools:             [{ functionDeclarations: toolDefinitions }],
      systemInstruction: "You are a travel researcher. Complete the given research task using web_search. Return a factual answer with INR costs.",
    })

    const chat    = executor.startChat()
    let   message = `Complete this research task: "${task}"\nContext: part of planning "${query}"`
    let   taskResult = ""

    for (let iter = 0; iter < 5; iter++) {
      const response = await chat.sendMessage(message)
      const parts    = response.response.candidates?.[0]?.content?.parts ?? []
      const funcPart = parts.find(p => p.functionCall)
      const textParts = parts.filter(p => p.text)

      if (funcPart) {
        const { name, args } = funcPart.functionCall
        let toolResult
        try   { toolResult = await executeTool(name, args) }
        catch (err) { toolResult = { error: err.message } }
        message = [{ functionResponse: { name, response: { result: toolResult } } }]
      } else {
        taskResult = textParts.map(p => p.text).join("\n").trim()
        break
      }
    }

    results.push({ task, result: taskResult })
    onStep({ type: "task_done", content: taskResult })
  }

  // ── Phase 3: Summarise ───────────────────────
  const summariser  = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  const summaryResult = await summariser.generateContent(`
Combine these research results into a complete multi-city trip plan with full INR cost breakdown.

Original request: "${query}"

Research completed:
${results.map((r, i) => `${i + 1}. ${r.task}\n   ${r.result}`).join("\n\n")}

Produce a formatted plan with:
- Cost per city or leg
- Grand total
- Budget comparison
- 10% contingency buffer included
`)

  return summaryResult.response.text().trim()
}
