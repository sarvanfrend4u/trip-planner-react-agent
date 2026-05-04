// ─────────────────────────────────────────────
// FOLDER SETUP
//
// Shown on first launch (or if folder permission
// is lost). User picks a folder on their hard drive
// where memory.json, rules.json, and
// system_prompt.txt will be stored.
//
// Only shown once — after that the browser
// restores permission automatically.
// ─────────────────────────────────────────────

import { useState } from "react"
import { setupStorage } from "../storage/dataStore"

export default function FolderSetup({ onComplete }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handlePickFolder = async () => {
    setLoading(true)
    setError(null)
    try {
      await setupStorage()
      onComplete()
    } catch (err) {
      // AbortError = user cancelled the picker — not an error
      if (err.name !== "AbortError") {
        setError("Could not set up storage folder. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="folder-setup">
      <div className="folder-setup-card">
        <div className="folder-icon">📁</div>
        <h2>Choose a folder for agent memory</h2>
        <p>
          Your preferences, standing instructions, and system prompt will be
          saved as real files on your Mac. You only need to do this once.
        </p>
        <ul className="folder-file-list">
          <li><code>memory.json</code> — facts about you (auto-saved)</li>
          <li><code>rules.json</code> — your confirmed instructions</li>
          <li><code>system_prompt.txt</code> — agent base instructions</li>
        </ul>
        <button
          className="submit-btn"
          onClick={handlePickFolder}
          disabled={loading}
        >
          {loading ? "Setting up..." : "Choose Folder"}
        </button>
        {error && <p className="setup-error">{error}</p>}
      </div>
    </div>
  )
}
