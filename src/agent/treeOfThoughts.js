// ─────────────────────────────────────────────
// TREE OF THOUGHTS
//
// For budget-sensitive trips, explores 3 different
// approaches before committing to one:
//
//   A) Comfort   — best transport + accommodation
//   B) Budget    — cheapest practical options
//   C) Balanced  — mix of savings and comfort
//
// Each branch gets a rough cost estimate.
// An evaluator picks the one that best fits
// the user's budget. The chosen approach is
// then passed to the standard ReAct loop.
// ─────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai"

// Detect if the query is budget-sensitive
export function isTightBudget(query) {
  const lower = query.toLowerCase()
  return (
    lower.includes("tight budget")  ||
    lower.includes("cheap")         ||
    lower.includes("budget trip")   ||
    lower.includes("affordable")    ||
    lower.includes("low budget")    ||
    lower.includes("save money")    ||
    lower.includes("as cheap as")   ||
    lower.includes("economical")    ||
    lower.includes("backpacker")
  )
}

export async function treeOfThoughts(query, apiKey, onStep) {
  const genAI  = new GoogleGenerativeAI(apiKey)
  const model  = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  onStep({ type: "tree_start", content: "Budget trip detected. Exploring 3 approaches before committing..." })

  // ── Step 1: Generate 3 branches ───────────────
  const branchResult = await model.generateContent(`
For this trip request, generate 3 different approaches with rough cost estimates in INR.

A) Comfort: mid-range to good hotels, direct flights or AC trains
B) Budget: hostels or guesthouses, sleeper trains or budget airlines, shared transport
C) Balanced: budget accommodation but comfortable transport, or vice versa

For each, give:
- Estimated total in INR
- 2-3 specific key choices

Request: "${query}"

Format exactly:
A) Comfort: ~₹X total
- [choice 1]
- [choice 2]

B) Budget: ~₹X total
- [choice 1]
- [choice 2]

C) Balanced: ~₹X total
- [choice 1]
- [choice 2]
`)

  const branches = branchResult.response.text().trim()
  onStep({ type: "tree_branches", content: branches })

  // ── Step 2: Evaluate and pick best branch ─────
  const evalResult = await model.generateContent(`
Given this trip request and 3 approaches, choose the BEST one.

Selection criteria (in order):
1. Must fit within the stated budget
2. If multiple fit, choose the one with best travel experience
3. If none fit, choose the cheapest and note what to cut

Request: "${query}"
Approaches:
${branches}

Reply in two parts:
1. One sentence: which approach you chose and the key reason.
2. The specific choices from that approach to use in the detailed plan.
`)

  const choice = evalResult.response.text().trim()
  onStep({ type: "tree_choice", content: choice })

  // Return the chosen approach — reactAgent appends this to the query
  return choice
}
