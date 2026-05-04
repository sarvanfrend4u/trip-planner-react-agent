// ─────────────────────────────────────────────
// REFLEXION
//
// If the plan is over budget after Self-Refine,
// the agent writes an explicit reflection:
//   - What choices caused the overspend?
//   - What specific cheaper alternatives to try?
//
// That reflection is passed as context into the
// next retry. Max 2 retries before giving up.
//
// Different from Self-Refine:
//   Self-Refine — polishes a good plan
//   Reflexion   — recovers from a failed plan
// ─────────────────────────────────────────────

export async function runWithReflexion(query, answer, model, onStep, maxRetries = 2) {
  let currentAnswer = answer

  // Only apply if query contains a budget constraint
  const hasBudget = /₹[\d,]+|budget|rupee/i.test(query)
  if (!hasBudget) return currentAnswer

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check if the current plan is over budget
    const overBudget =
      currentAnswer.toLowerCase().includes("over budget") &&
      !currentAnswer.toLowerCase().includes("within budget")

    if (!overBudget) break // Success — exit loop

    onStep({
      type:    "reflexion",
      content: `Plan is over budget (attempt ${attempt + 1}/${maxRetries}). Reflecting on what to change...`
    })

    const chat = model.startChat()

    // Write reflection — diagnose the failure
    const reflectResult = await chat.sendMessage(`
Your trip plan came in over budget. Write a short focused reflection.

Plan: ${currentAnswer}
Original request: ${query}

Use this exact format:
What I chose: [the expensive choices that caused overspend]
Why it's over budget: [specific reason with numbers if possible]
What I'll change: [specific cheaper alternatives to try next]
`)

    const reflection = reflectResult.response.text().trim()
    onStep({ type: "reflexion", content: reflection })

    // Retry with the reflection as explicit context
    const retryResult = await chat.sendMessage(`
Retry the trip plan applying these exact lessons:
${reflection}

Original request: ${query}

Hard requirement: The total MUST be within the stated budget.
Use the cheaper alternatives identified above. Show the full revised breakdown.
`)

    currentAnswer = retryResult.response.text().trim()
  }

  return currentAnswer
}
