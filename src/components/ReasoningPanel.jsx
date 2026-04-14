import { useEffect, useRef } from "react";

export default function ReasoningPanel({ steps, isRunning }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  if (steps.length === 0 && !isRunning) {
    return (
      <div className="reasoning-panel empty">
        <p className="empty-hint">
          Fill in the form and click <strong>Plan My Trip</strong> to watch the
          agent reason step by step.
        </p>
      </div>
    );
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
  );
}

function StepRow({ step }) {
  switch (step.type) {
    case "thought":
      return (
        <div className="log-row log-thought">
          <span className="log-tag">💭 Thought</span>
          <span className="log-text">{step.content}</span>
        </div>
      );

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
      );

    case "observation":
      return (
        <div className="log-row log-observation">
          <span className="log-tag">👁 Result</span>
          <span className="log-text">
            <ObservationText result={step.result} />
          </span>
        </div>
      );

    case "final_answer":
      return (
        <div className="log-row log-final">
          <span className="log-tag">✅ Answer</span>
          <pre className="log-final-text">{step.content}</pre>
        </div>
      );

    case "error":
      return (
        <div className="log-row log-error">
          <span className="log-tag">❌ Error</span>
          <span className="log-text">{step.message}</span>
        </div>
      );

    default:
      return null;
  }
}

// Extracts the most useful single line from a tool result
function ObservationText({ result }) {
  if (result?.error) return result.error;

  // web_search — show the AI-generated answer summary
  if (result?.answer) return result.answer;

  // calculate_total — show compact inline breakdown
  if (result?.breakdown) {
    const lines = Object.entries(result.breakdown)
      .map(([k, v]) => `${k}: ₹${Number(v).toLocaleString("en-IN")}`)
      .join("  ·  ");
    return `${lines}  |  Total: ₹${result.total.toLocaleString("en-IN")}  (${result.message})`;
  }

  // Fallback
  return JSON.stringify(result);
}
