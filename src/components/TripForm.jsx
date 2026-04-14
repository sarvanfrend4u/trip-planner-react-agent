import { useState } from "react";

const DEFAULTS = {
  from: "",
  to: "",
  days: "",
  people: "",
  budget: "",
};

export default function TripForm({ onSubmit, isRunning }) {
  const [form, setForm] = useState(DEFAULTS);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const isValid =
    form.from.trim() &&
    form.to.trim() &&
    Number(form.days) > 0 &&
    Number(form.people) > 0 &&
    Number(form.budget) > 0;

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Plan Your Trip</h2>

      <div className="field">
        <label htmlFor="from">From</label>
        <input
          id="from"
          name="from"
          type="text"
          placeholder="e.g. Chennai"
          value={form.from}
          onChange={handleChange}
          disabled={isRunning}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="to">To</label>
        <input
          id="to"
          name="to"
          type="text"
          placeholder="e.g. Goa"
          value={form.to}
          onChange={handleChange}
          disabled={isRunning}
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="days">Days</label>
          <input
            id="days"
            name="days"
            type="number"
            placeholder="5"
            min="1"
            max="90"
            value={form.days}
            onChange={handleChange}
            disabled={isRunning}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="people">People</label>
          <input
            id="people"
            name="people"
            type="number"
            placeholder="2"
            min="1"
            max="20"
            value={form.people}
            onChange={handleChange}
            disabled={isRunning}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="budget">Budget (₹)</label>
        <input
          id="budget"
          name="budget"
          type="number"
          placeholder="e.g. 30000"
          min="1"
          value={form.budget}
          onChange={handleChange}
          disabled={isRunning}
          required
        />
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={!isValid || isRunning}
      >
        {isRunning ? (
          <span className="btn-running">
            <span className="spinner" /> Planning...
          </span>
        ) : (
          "Plan My Trip"
        )}
      </button>
    </form>
  );
}
