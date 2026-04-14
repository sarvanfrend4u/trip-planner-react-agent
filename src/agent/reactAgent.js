import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolDefinitions, executeTool } from "./tools.js";

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// Tells Gemini its role, reasoning rules, and
// what process to follow. This is the "React"
// part — it enforces Thought → Action → Observe.
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a trip cost planning assistant. Your job is to research real travel costs and give users an accurate budget breakdown.

You have two tools:
- web_search: search the web for real travel costs (flights, hotels, food, activities)
- calculate_total: sum all costs and check against the user's budget

Process you must follow:
1. Before every tool call, write one sentence explaining WHY you are calling it
2. Search for each cost category separately: flights, hotels, food, activities
3. Use specific queries like "Chennai to Goa round trip flight cost 2 passengers June 2025"
4. Once you have gathered all costs, call calculate_total
5. End with a clear formatted breakdown using ₹ amounts

Rules:
- Never guess or assume numbers — always use web_search to get real data
- Search for each category one at a time
- Always call calculate_total as your last tool call before the final answer`;

// ─────────────────────────────────────────────
// MAIN AGENT FUNCTION
//
// userQuery  — the trip planning request from the user
// onStep     — callback called for every reasoning step
//              so the UI can display it live
//
// Step types emitted:
//   { type: "thought",      content: string }
//   { type: "action",       tool: string, args: object }
//   { type: "observation",  result: object }
//   { type: "final_answer", content: string }
//   { type: "error",        message: string }
// ─────────────────────────────────────────────

export async function runTripAgent(userQuery, onStep) {
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ functionDeclarations: toolDefinitions }],
    systemInstruction: SYSTEM_PROMPT,
  });

  // Start a multi-turn chat — Gemini remembers the full
  // conversation history including tool results
  const chat = model.startChat();

  // The first message is the user's trip query.
  // After each tool call, we send the tool result back
  // as the next message.
  let message = userQuery;

  // Safety cap — prevents infinite loops if Gemini
  // keeps calling tools without reaching a final answer
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response;

    try {
      const result = await chat.sendMessage(message);
      response = result.response;
    } catch (err) {
      onStep({ type: "error", message: `Gemini API error: ${err.message}` });
      return;
    }

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    // A response can have text parts (reasoning) and/or
    // a functionCall part (tool request) in the same turn.
    const textParts = parts.filter((p) => p.text);
    const funcPart  = parts.find((p) => p.functionCall);

    // ── TOOL CALL TURN ──────────────────────────────────
    if (funcPart) {
      const { name, args } = funcPart.functionCall;

      // Emit the thought — either what Gemini wrote before
      // calling the tool, or a synthesized fallback
      const thoughtText =
        textParts.length > 0
          ? textParts.map((p) => p.text).join(" ").trim()
          : synthesizeThought(name, args);

      onStep({ type: "thought", content: thoughtText });

      // Emit the action so the UI shows the tool + args
      onStep({ type: "action", tool: name, args });

      // Run the actual tool function
      let toolResult;
      try {
        toolResult = await executeTool(name, args);
      } catch (err) {
        toolResult = { error: err.message };
      }

      // Emit the observation so the UI shows what the tool returned
      onStep({ type: "observation", result: toolResult });

      // Feed the tool result back to Gemini as a functionResponse
      // so it can continue reasoning in the next turn
      message = [
        {
          functionResponse: {
            name,
            response: { result: toolResult },
          },
        },
      ];

    // ── FINAL ANSWER TURN ────────────────────────────────
    } else {
      const finalText = textParts.map((p) => p.text).join("\n").trim();
      onStep({ type: "final_answer", content: finalText });
      return;
    }
  }

  // If we hit the iteration cap without a final answer
  onStep({
    type: "error",
    message: "Agent reached maximum steps without a final answer.",
  });
}

// ─────────────────────────────────────────────
// THOUGHT SYNTHESIZER
// When Gemini jumps straight to a function call
// without any text, we generate a readable thought
// so the UI always has something to show.
// ─────────────────────────────────────────────

function synthesizeThought(toolName, args) {
  if (toolName === "web_search") {
    return `Searching for: "${args.query}"`;
  }
  if (toolName === "calculate_total") {
    return "I have all the cost data. Calculating total and checking the budget.";
  }
  return `Calling ${toolName}...`;
}
