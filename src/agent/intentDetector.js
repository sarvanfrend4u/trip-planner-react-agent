// ─────────────────────────────────────────────
// INTENT DETECTOR
//
// Classifies a chat message as either:
//   TRIP_REQUEST  — user wants a trip planned
//   INSTRUCTION   — user wants to change how
//                   the agent behaves going forward
//
// INSTRUCTIONS are proposed as rules for the user
// to confirm before saving. TRIP_REQUESTs go
// straight to the agent.
// ─────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai"

export async function detectIntent(input, apiKey) {
  const genAI  = new GoogleGenerativeAI(apiKey)
  const model  = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const result = await model.generateContent(`
Classify this user message into one of two categories:

1. TRIP_REQUEST — the user wants to plan a trip or get travel cost information
2. INSTRUCTION  — the user wants to change how the agent behaves in future sessions

Examples of TRIP_REQUEST:
- "Plan a Goa trip for 2 people"
- "What would a Kerala trip cost with ₹40,000?"
- "I want to visit Mumbai next month"
- "How much does a Rajasthan trip cost?"

Examples of INSTRUCTION:
- "Always show me budget options first"
- "Stop recommending 5-star hotels"
- "Always warn me about monsoon season"
- "Never suggest flights with more than one stop"
- "Always break down food costs day by day"
- "I prefer trains over flights for short routes"

User message: "${input}"

Reply with JSON only, no markdown, no code fences:
{"type": "TRIP_REQUEST", "extracted_rule": null}
or
{"type": "INSTRUCTION", "extracted_rule": "concise rule the agent should follow"}
`)

  try {
    const text = result.response.text().trim()
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    return JSON.parse(json)
  } catch {
    // Default to trip request if classification fails
    return { type: "TRIP_REQUEST", extracted_rule: null }
  }
}
