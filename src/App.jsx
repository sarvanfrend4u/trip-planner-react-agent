import { useState } from "react";
import TripForm from "./components/TripForm";
import ReasoningPanel from "./components/ReasoningPanel";
import { runTripAgent } from "./agent/reactAgent";
import "./App.css";

export default function App() {
  const [steps, setSteps] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleSubmit = async (formData) => {
    // Clear previous run
    setSteps([]);
    setIsRunning(true);

    // Build a natural language query for the agent
    const query = `Plan a ${formData.days}-day trip from ${formData.from} to ${formData.to} for ${formData.people} ${formData.people === "1" ? "person" : "people"} with a total budget of ₹${Number(formData.budget).toLocaleString("en-IN")}. Research real current costs for flights, hotels, food, and activities.`;

    // onStep is called by the agent for every reasoning step.
    // We append each step to state so the UI updates live.
    await runTripAgent(query, (step) => {
      setSteps((prev) => [...prev, step]);
    });

    setIsRunning(false);
  };

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
          <TripForm onSubmit={handleSubmit} isRunning={isRunning} />
        </aside>

        <section className="panel-section">
          <ReasoningPanel steps={steps} isRunning={isRunning} />
        </section>
      </main>
    </div>
  );
}
