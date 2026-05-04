// ─────────────────────────────────────────────
// MEMORY PANEL
//
// Collapsible panel at the bottom of the app.
// Shows all three persistent stores:
//
//   Facts          — auto-saved user facts
//   Rules          — user-confirmed instructions
//                    (can be removed)
//   System Prompt  — editable base instructions
//
// refreshTrigger prop increments whenever
// memory or rules change — forces a re-read.
// ─────────────────────────────────────────────

import { useState, useEffect } from "react"
import {
  getMemory,
  getRules,
  getSystemPrompt,
  removeRule,
  saveSystemPrompt,
} from "../storage/dataStore"

export default function MemoryPanel({ refreshTrigger }) {
  const [open,          setOpen]          = useState(false)
  const [memory,        setMemory]        = useState([])
  const [rules,         setRules]         = useState([])
  const [prompt,        setPrompt]        = useState("")
  const [promptDraft,   setPromptDraft]   = useState("")
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [saving,        setSaving]        = useState(false)

  // Re-read files whenever panel opens or data changes
  useEffect(() => {
    if (!open) return
    getMemory().then(setMemory)
    getRules().then(setRules)
    getSystemPrompt().then(p => {
      setPrompt(p)
      setPromptDraft(p)
    })
  }, [open, refreshTrigger])

  const handleRemoveRule = async (rule) => {
    await removeRule(rule)
    setRules(r => r.filter(x => x !== rule))
  }

  const handleSavePrompt = async () => {
    setSaving(true)
    await saveSystemPrompt(promptDraft)
    setPrompt(promptDraft)
    setEditingPrompt(false)
    setSaving(false)
  }

  const handleCancelEdit = () => {
    setPromptDraft(prompt)
    setEditingPrompt(false)
  }

  return (
    <div className="memory-panel">
      <button className="memory-toggle" onClick={() => setOpen(o => !o)}>
        <span className="memory-toggle-arrow">{open ? "▼" : "▶"}</span>
        Agent Memory &amp; Settings
        <span className="memory-badge">
          {memory.length} facts · {rules.length} rules
        </span>
      </button>

      {open && (
        <div className="memory-content">

          {/* Facts */}
          <section className="memory-section">
            <h3 className="memory-section-title">
              Facts about you
              <span className="memory-count">{memory.length}</span>
            </h3>
            {memory.length === 0
              ? <p className="memory-empty">No facts stored yet. Facts are saved automatically after each session.</p>
              : memory.map((m, i) => (
                  <p key={i} className="memory-item">· {m}</p>
                ))
            }
          </section>

          {/* Rules */}
          <section className="memory-section">
            <h3 className="memory-section-title">
              Standing instructions
              <span className="memory-count">{rules.length}</span>
            </h3>
            {rules.length === 0
              ? <p className="memory-empty">No rules saved yet. Type an instruction in the chat to add one.</p>
              : rules.map((r, i) => (
                  <div key={i} className="memory-rule-item">
                    <span>· {r}</span>
                    <button
                      className="btn-remove-rule"
                      onClick={() => handleRemoveRule(r)}
                      title="Remove this rule"
                    >
                      ✕
                    </button>
                  </div>
                ))
            }
          </section>

          {/* System Prompt */}
          <section className="memory-section">
            <h3 className="memory-section-title">System prompt</h3>
            <p className="memory-empty" style={{ marginBottom: 8 }}>
              Base instructions the agent always follows. Edit carefully.
            </p>
            {editingPrompt ? (
              <>
                <textarea
                  className="prompt-editor"
                  value={promptDraft}
                  onChange={e => setPromptDraft(e.target.value)}
                  rows={10}
                />
                <div className="prompt-actions">
                  <button className="btn-save" onClick={handleSavePrompt} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="btn-discard" onClick={handleCancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <pre className="prompt-preview">{prompt}</pre>
                <button className="btn-edit-prompt" onClick={() => setEditingPrompt(true)}>
                  Edit System Prompt
                </button>
              </>
            )}
          </section>

        </div>
      )}
    </div>
  )
}
