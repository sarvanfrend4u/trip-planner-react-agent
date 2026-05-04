// ─────────────────────────────────────────────
// SELF-REFINE
//
// After the ReAct loop produces a draft answer,
// a second Gemini call critiques it for specific
// issues. If issues are found, a third call
// rewrites the plan fixing only those issues.
//
// Stops early if no issues found ("LOOKS_GOOD").
// ─────────────────────────────────────────────

export async function refineAnswer(query, draftAnswer, model) {
  const chat = model.startChat()

  // Step 1 — Critique the draft
  const critiqueResult = await chat.sendMessage(`
You are reviewing a trip plan draft. Find specific problems only.

User request: "${query}"
Draft plan:
${draftAnswer}

Check for these specific issues:
1. Missing cost categories (activities, local transport within city, visa fees for international)
2. No contingency buffer (should be at least 5-10% of total)
3. Plan exceeds budget but offers no cheaper alternative
4. Seasonal risk not mentioned (monsoon June-Sept for coastal, extreme heat, peak pricing)
5. Math error: line items don't add up to the stated total

Reply with exactly "LOOKS_GOOD" if none of these apply.
Otherwise list only the specific problems found, one per line.
`)

  const critique = critiqueResult.response.text().trim()

  // Early exit — plan is good
  if (critique === "LOOKS_GOOD" || critique.toLowerCase().startsWith("looks good")) {
    return draftAnswer
  }

  // Step 2 — Rewrite fixing only the identified issues
  const rewriteResult = await chat.sendMessage(`
Rewrite the trip plan fixing exactly these issues:
${critique}

Keep all other content the same. Return only the improved plan, no preamble.
`)

  return rewriteResult.response.text().trim()
}
