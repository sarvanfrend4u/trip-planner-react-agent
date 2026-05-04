// ─────────────────────────────────────────────
// TOOL FUNCTIONS
//
// webSearch: Self-Consistency applied here.
//   For cost-related queries, runs 3 parallel
//   searches with slight query variations and
//   merges the results. This reduces outlier
//   prices and improves accuracy.
//
// calculateTotal: Pure JS — no API call needed.
// ─────────────────────────────────────────────

// Single Tavily search — internal helper
async function singleSearch(query) {
  const response = await fetch("https://api.tavily.com/search", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key:       import.meta.env.VITE_TAVILY_API_KEY,
      query,
      search_depth:  "basic",
      max_results:   3,
      include_answer: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    answer:  data.answer || null,
    results: (data.results || []).map(r => ({
      title:   r.title,
      content: r.content,
      url:     r.url,
    })),
  }
}

// ── Self-Consistency web search ──────────────
// For cost queries: runs 3 variations in parallel,
// merges answers so Gemini sees a richer data set
// and picks a consensus price.
export async function webSearch(query) {
  const isCostQuery = /cost|price|rate|fare|fee|charge|budget|cheap|hotel|flight|train|bus/i.test(query)

  if (isCostQuery) {
    const variations = [
      query,
      query + " 2025 current price",
      "latest " + query
    ]

    const settled = await Promise.allSettled(variations.map(q => singleSearch(q)))
    const successful = settled
      .filter(r => r.status === "fulfilled")
      .map(r => r.value)

    if (successful.length === 0) throw new Error("All searches failed")

    // Merge: combine all answers and top results
    const answers    = successful.map(r => r.answer).filter(Boolean)
    const allResults = successful.flatMap(r => r.results || []).slice(0, 5)

    return {
      answer:  answers.length > 0 ? answers.join(" | ") : null,
      results: allResults,
      note:    "Aggregated from 3 searches for price accuracy",
    }
  }

  // Non-cost query — single search is fine
  return singleSearch(query)
}

// ── Calculate total ──────────────────────────
export function calculateTotal(items, budget) {
  const total        = Object.values(items).reduce((sum, cost) => sum + Number(cost), 0)
  const withinBudget = total <= budget

  return {
    breakdown:    items,
    total,
    budget,
    withinBudget,
    difference:   Math.abs(budget - total),
    message:      withinBudget
      ? `Within budget by ₹${(budget - total).toLocaleString("en-IN")}`
      : `Over budget by ₹${(total - budget).toLocaleString("en-IN")}`,
  }
}

// ── Tool schemas ─────────────────────────────
// Sent to Gemini so it knows what tools exist
export const toolDefinitions = [
  {
    name:        "web_search",
    description: "Search the web for real-time travel cost information: flights, hotels, food, activities. Use specific queries like 'Chennai to Goa round trip flight cost 2 passengers 2025'.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type:        "string",
          description: "A specific search query to find travel cost data",
        },
      },
      required: ["query"],
    },
  },
  {
    name:        "calculate_total",
    description: "Calculate the total trip cost from all expense categories and check if it fits within the user's budget. Call this only after gathering all individual costs.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type:        "object",
          description: "Expense categories with costs in INR. Example: { flights: 16000, hotels: 7500, food: 6000, activities: 3000 }",
        },
        budget: {
          type:        "number",
          description: "User's total trip budget in INR",
        },
      },
      required: ["items", "budget"],
    },
  },
]

// ── Tool dispatcher ──────────────────────────
export async function executeTool(name, args) {
  if (name === "web_search")      return await webSearch(args.query)
  if (name === "calculate_total") return calculateTotal(args.items, args.budget)
  throw new Error(`Unknown tool: ${name}`)
}
