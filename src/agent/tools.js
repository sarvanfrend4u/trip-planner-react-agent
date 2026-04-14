// ─────────────────────────────────────────────
// TOOL FUNCTIONS
// These are the actual functions that run when
// Gemini decides to call a tool.
// ─────────────────────────────────────────────

/**
 * Searches the web via Tavily and returns a clean summary.
 * Called when the agent needs real-time travel cost data.
 */
export async function webSearch(query) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: import.meta.env.VITE_TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 3,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    answer: data.answer || null,
    results: (data.results || []).map((r) => ({
      title: r.title,
      content: r.content,
      url: r.url,
    })),
  };
}

/**
 * Sums all cost items and checks against the user's budget.
 * Pure JS — no API call needed.
 */
export function calculateTotal(items, budget) {
  const total = Object.values(items).reduce((sum, cost) => sum + Number(cost), 0);
  const withinBudget = total <= budget;

  return {
    breakdown: items,
    total,
    budget,
    withinBudget,
    difference: Math.abs(budget - total),
    message: withinBudget
      ? `Within budget by ₹${(budget - total).toLocaleString("en-IN")}`
      : `Over budget by ₹${(total - budget).toLocaleString("en-IN")}`,
  };
}

// ─────────────────────────────────────────────
// TOOL SCHEMAS
// These JSON descriptions are sent to Gemini so
// it knows what tools exist and when to call them.
// ─────────────────────────────────────────────

export const toolDefinitions = [
  {
    name: "web_search",
    description:
      "Search the web for real-time travel cost information: flights, hotels, food, activities. Use specific queries like 'Chennai to Goa flight cost 2 passengers 2025'.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A specific search query to find travel cost data",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate_total",
    description:
      "Calculate the total trip cost from all expense categories and check if it fits within the user's budget. Call this only after gathering all individual costs.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "object",
          description:
            "Expense categories with costs in INR. Example: { flights: 16000, hotels: 7500, food: 6000, activities: 3000 }",
        },
        budget: {
          type: "number",
          description: "User's total trip budget in INR",
        },
      },
      required: ["items", "budget"],
    },
  },
];

// ─────────────────────────────────────────────
// TOOL DISPATCHER
// The agent loop calls this with the tool name
// and args returned by Gemini.
// ─────────────────────────────────────────────

export async function executeTool(name, args) {
  if (name === "web_search") {
    return await webSearch(args.query);
  }
  if (name === "calculate_total") {
    return calculateTotal(args.items, args.budget);
  }
  throw new Error(`Unknown tool: ${name}`);
}
