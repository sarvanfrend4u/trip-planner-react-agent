// ─────────────────────────────────────────────
// RULE CONFIRMATION
//
// Shown when the agent proposes saving a new
// behavioural rule — either from a chat instruction
// or extracted from a completed session.
//
// User clicks Save or Discard.
// Facts are auto-saved without confirmation.
// Only rules need user approval.
// ─────────────────────────────────────────────

export default function RuleConfirmation({ rule, onConfirm, onDiscard }) {
  return (
    <div className="rule-confirmation">
      <p className="rule-conf-label">Save this as a standing instruction?</p>
      <p className="rule-conf-text">"{rule}"</p>
      <p className="rule-conf-hint">
        The agent will follow this in all future sessions.
      </p>
      <div className="rule-conf-actions">
        <button className="btn-save"    onClick={onConfirm}>Save</button>
        <button className="btn-discard" onClick={onDiscard}>Discard</button>
      </div>
    </div>
  )
}
