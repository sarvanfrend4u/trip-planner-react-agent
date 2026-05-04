import { useEffect, useRef } from "react"

export default function ReasoningPanel({ steps, isRunning }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [steps])

  if (steps.length === 0 && !isRunning) {
    return (
      <div className="reasoning-panel empty">
        <p className="empty-hint">
          Fill in the form and click <strong>Plan My Trip</strong>, or type a
          request in the chat below to watch the agent reason step by step.
        </p>
      </div>
    )
  }

  return (
    <div className="reasoning-panel">
      <h2 className="panel-title">Agent Reasoning</h2>
      <div className="log">
        {steps.map((step, i) => (
          <StepRow key={i} step={step} />
        ))}
        {isRunning && (
          <div className="log-row log-thinking">
            <span className="dot-pulse" />
            <span className="dot-pulse" />
            <span className="dot-pulse" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function StepRow({ step }) {
  switch (step.type) {

    // ── ReAct steps ───────────────────────────
    case "thought":
      return (
        <div className="log-row log-thought">
          <span className="log-tag">💭 Thought</span>
          <span className="log-text">{step.content}</span>
        </div>
      )

    case "action":
      return (
        <div className="log-row log-action">
          <span className="log-tag">🔧 Action</span>
          <span className="log-text">
            <code>{step.tool}</code>
            {" → "}
            <code>{JSON.stringify(step.args)}</code>
          </span>
        </div>
      )

    case "observation":
      return (
        <div className="log-row log-observation">
          <span className="log-tag">👁 Result</span>
          <span className="log-text">
            <ObservationText result={step.result} />
          </span>
        </div>
      )

    case "final_answer":
      return (
        <div className="log-row log-final">
          <span className="log-tag">✅ Answer</span>
          <pre className="log-final-text">{step.content}</pre>
        </div>
      )

    case "error":
      return (
        <div className="log-row log-error">
          <span className="log-tag">❌ Error</span>
          <span className="log-text">{step.message}</span>
        </div>
      )

    // ── Plan & Execute steps ──────────────────
    case "plan_start":
      return (
        <div className="log-row log-plan-start">
          <span className="log-tag">📋 Planning</span>
          <span className="log-text">{step.content}</span>
        </div>
      )

    case "plan":
      return (
        <div className="log-row log-plan">
          <span className="log-tag">📋 Task List</span>
          <pre className="log-plan-text">{step.content}</pre>
        </div>
      )

    case "executing_task":
      return (
        <div className="log-row log-executing">
          <span className="log-tag">⚙️ Executing</span>
          <span className="log-text">{step.content}</span>
        </div>
      )

    case "task_done":
      return (
        <div className="log-row log-task-done">
          <span className="log-tag">✓ Done</span>
          <span className="log-text">{step.content}</span>
        </div>
      )

    // ── Tree of Thoughts steps ────────────────
    case "tree_start":
      return (
        <div className="log-row log-tree-start">
          <span className="log-tag">🌳 Branches</span>
          <span className="log-text">{step.content}</span>
        </div>
      )

    case "tree_branches":
      return (
        <div className="log-row log-tree-branches">
          <span className="log-tag">🌳 Options</span>
          <pre className="log-plan-text">{step.content}</pre>
        </div>
      )

    case "tree_choice":
      return (
        <div className="log-row log-tree-choice">
          <span className="log-tag">🌳 Chosen</span>
          <span className="log-text">{step.content}</span>
        </div>
      )

    // ── Reflexion steps ───────────────────────
    case "reflexion":
      return (
        <div className="log-row log-reflexion">
          <span className="log-tag">🔄 Reflexion</span>
          <pre className="log-plan-text">{step.content}</pre>
        </div>
      )

    default:
      return null
  }
}

// Extracts the most useful single line from a tool result
function ObservationText({ result }) {
  if (result?.error)     return result.error

  // web_search — show the AI-generated answer summary
  if (result?.answer)    return result.answer

  // calculate_total — show compact inline breakdown
  if (result?.breakdown) {
    const lines = Object.entries(result.breakdown)
      .map(([k, v]) => `${k}: ₹${Number(v).toLocaleString("en-IN")}`)
      .join("  ·  ")
    return `${lines}  |  Total: ₹${result.total.toLocaleString("en-IN")}  (${result.message})`
  }

  return JSON.stringify(result)
}
