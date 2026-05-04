// ─────────────────────────────────────────────
// CHAT INPUT
//
// Free-form input below the structured form.
// Handles two types of messages:
//
//   Trip request  — "Plan a Goa trip for 2 people"
//   Instruction   — "Always show budget hotels first"
//
// Intent detection happens in App.jsx after send.
// Enter submits, Shift+Enter adds a new line.
// ─────────────────────────────────────────────

import { useState } from "react"

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("")

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText("")
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-wrapper">
      <p className="chat-input-label">Chat with the agent</p>
      <p className="chat-input-hint">
        Ask a trip question or type an instruction like<br />
        <em>"Always warn me about monsoon season"</em>
      </p>
      <div className="chat-input-row">
        <textarea
          className="chat-textarea"
          placeholder='e.g. "Plan a Goa trip" or "Always search budget hotels first"'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={2}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
        >
          Send
        </button>
      </div>
    </div>
  )
}
