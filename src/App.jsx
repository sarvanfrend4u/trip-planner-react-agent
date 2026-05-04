import { useState, useEffect } from "react"
import TripForm        from "./components/TripForm"
import ReasoningPanel  from "./components/ReasoningPanel"
import FolderSetup     from "./components/FolderSetup"
import RuleConfirmation from "./components/RuleConfirmation"
import MemoryPanel     from "./components/MemoryPanel"
import ChatInput       from "./components/ChatInput"
import { runTripAgent, extractSessionLearnings } from "./agent/reactAgent"
import { detectIntent } from "./agent/intentDetector"
import {
  initStorage,
  getMemory,
  getRules,
  getSystemPrompt,
  addMemoryFact,
  addRule,
} from "./storage/dataStore"
import "./App.css"

export default function App() {
  const [storageReady,   setStorageReady]   = useState(false)
  const [storageLoading, setStorageLoading] = useState(true)
  const [steps,          setSteps]          = useState([])
  const [isRunning,      setIsRunning]      = useState(false)
  const [pendingRules,   setPendingRules]   = useState([])  // queue of rules to confirm
  const [memoryRefresh,  setMemoryRefresh]  = useState(0)

  // Try to restore folder access on mount
  useEffect(() => {
    initStorage().then(ready => {
      setStorageReady(ready)
      setStorageLoading(false)
    })
  }, [])

  // Load all three context files
  const loadContext = async () => {
    const [memory, rules, systemPrompt] = await Promise.all([
      getMemory(),
      getRules(),
      getSystemPrompt(),
    ])
    return { memory, rules, systemPrompt }
  }

  // After a session ends, extract and save learnings
  const handleSessionLearnings = async (query, answer) => {
    const apiKey   = import.meta.env.VITE_GEMINI_API_KEY
    const learnings = await extractSessionLearnings(query, answer, apiKey)

    // Auto-save facts — no confirmation needed
    for (const fact of learnings.facts) {
      await addMemoryFact(fact)
    }

    // Queue rules for user confirmation
    if (learnings.rules.length > 0) {
      setPendingRules(prev => [...prev, ...learnings.rules])
    }

    setMemoryRefresh(n => n + 1)
  }

  // Run agent from the structured form
  const handleTripSubmit = async (formData) => {
    setSteps([])
    setIsRunning(true)

    const query = `Plan a ${formData.days}-day trip from ${formData.from} to ${formData.to} for ${formData.people} ${formData.people === "1" ? "person" : "people"} with a total budget of ₹${Number(formData.budget).toLocaleString("en-IN")}. Research real current costs for flights, hotels, food, and activities.`

    const context = await loadContext()
    const result  = await runTripAgent(query, step => setSteps(prev => [...prev, step]), context)

    setIsRunning(false)

    if (result?.answer) {
      await handleSessionLearnings(query, result.answer)
    }
  }

  // Handle chat messages — detect intent first
  const handleChatSend = async (text) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    const intent = await detectIntent(text, apiKey)

    if (intent.type === "INSTRUCTION") {
      // Propose as a rule — user confirms before saving
      setPendingRules(prev => [...prev, intent.extracted_rule || text])
      return
    }

    // Trip request — run the agent
    setSteps([])
    setIsRunning(true)

    const context = await loadContext()
    const result  = await runTripAgent(text, step => setSteps(prev => [...prev, step]), context)

    setIsRunning(false)

    if (result?.answer) {
      await handleSessionLearnings(text, result.answer)
    }
  }

  // User confirmed a rule — save it and move to next in queue
  const handleRuleConfirm = async () => {
    await addRule(pendingRules[0])
    setPendingRules(prev => prev.slice(1))
    setMemoryRefresh(n => n + 1)
  }

  // User discarded a rule — just move to next
  const handleRuleDiscard = () => {
    setPendingRules(prev => prev.slice(1))
  }

  // ── Loading state ──────────────────────────
  if (storageLoading) {
    return (
      <div className="app">
        <div className="storage-loading">Initialising...</div>
      </div>
    )
  }

  // ── First-time setup ───────────────────────
  if (!storageReady) {
    return (
      <div className="app">
        <header className="app-header">
          <span className="header-icon">🗺</span>
          <div>
            <h1>Trip Cost Planner</h1>
            <p className="header-sub">Powered by a ReAct AI Agent</p>
          </div>
        </header>
        <FolderSetup onComplete={() => setStorageReady(true)} />
      </div>
    )
  }

  // ── Main app ───────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <span className="header-icon">🗺</span>
        <div>
          <h1>Trip Cost Planner</h1>
          <p className="header-sub">Powered by a ReAct AI Agent</p>
        </div>
      </header>

      <main className="app-main">
        <aside className="form-panel">
          <TripForm onSubmit={handleTripSubmit} isRunning={isRunning} />

          <div className="form-divider" />

          <ChatInput onSend={handleChatSend} disabled={isRunning} />

          {/* Rule confirmation — shown when a rule is pending */}
          {pendingRules.length > 0 && (
            <RuleConfirmation
              rule={pendingRules[0]}
              onConfirm={handleRuleConfirm}
              onDiscard={handleRuleDiscard}
            />
          )}
        </aside>

        <section className="panel-section">
          <ReasoningPanel steps={steps} isRunning={isRunning} />
        </section>
      </main>

      <MemoryPanel refreshTrigger={memoryRefresh} />
    </div>
  )
}
