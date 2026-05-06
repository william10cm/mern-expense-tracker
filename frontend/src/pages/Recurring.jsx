import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { clearAuth } from "../auth/auth";
import "../styles/Recurring.css";

function getCurrentMonthYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function Recurring() {
  const nav = useNavigate();

  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);

  const [month, setMonth] = useState(getCurrentMonthYYYYMM());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    dayOfMonth: 1,
    isActive: true
  });

  async function loadAll() {
    setError("");
    try {
      const [catsRes, rulesRes] = await Promise.all([
        api.get("/categories"),
        api.get("/recurring")
      ]);

      const cats = catsRes.data.categories || [];
      setCategories(cats);

      const r = rulesRes.data.rules || [];
      setRules(r);

      // default category selection
      setForm((f) => ({
        ...f,
        categoryId: f.categoryId || cats[0]?._id || ""
      }));
    } catch (err) {
      // if auth breaks, kick to login
      if (err.response?.status === 401) {
        clearAuth();
        nav("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load recurring page");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/recurring", {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        category: form.categoryId,
        dayOfMonth: Number(form.dayOfMonth),
        isActive: Boolean(form.isActive)
      });

      setForm((f) => ({ ...f, amount: "", description: "" }));
      await loadAll();
      setMessage("Recurring rule created ✅");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create rule");
    }
  }

  async function toggleActive(rule) {
    setError("");
    setMessage("");

    try {
      await api.patch(`/recurring/${rule._id}`, { isActive: !rule.isActive });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update rule");
    }
  }

  async function deleteRule(id) {
    setError("");
    setMessage("");

    const ok = window.confirm("Delete this recurring rule?");
    if (!ok) return;

    try {
      await api.delete(`/recurring/${id}`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete rule");
    }
  }

  async function generateForMonth() {
    setError("");
    setMessage("");

    try {
      const res = await api.post(`/recurring/generate?month=${month}`);
      setMessage(`Generated ${res.data.createdCount} transaction(s) for ${res.data.month} ✅`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate recurring transactions");
    }
  }

  return (
    <div className="recurring-page">
      <div className="recurring-header">
        <h1 className="recurring-title">Recurring Rules</h1>
        <div className="recurring-header-actions">
          <button onClick={() => nav("/")}>Back to Dashboard</button>
          <button
            onClick={() => {
              clearAuth();
              nav("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <p className="recurring-subtitle">
        Create monthly rules (day 1–28). Use Generate to create transactions for the selected month (no duplicates).
      </p>

      <hr className="recurring-divider" />

      <div className="recurring-controls">
        <label className="recurring-month-label">
          <strong>Month:</strong>{" "}
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button onClick={generateForMonth}>Generate for Month</button>
      </div>

      {message && <p className="recurring-message">{message}</p>}
      {error && <p className="recurring-error">{error}</p>}

      <h2 className="recurring-create-title">Create Rule</h2>

      <form
        onSubmit={handleCreate}
        className="recurring-form"
      >
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="span-1"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="span-1"
          required
        />

        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="span-2"
        />

        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="span-1"
          required
        >
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          max="28"
          value={form.dayOfMonth}
          onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
          className="span-1"
          required
          placeholder="Day (1-28)"
        />

        <label className="span-6 recurring-active-label">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active
        </label>

        <button type="submit" className="span-6">
          Create Rule
        </button>
      </form>

      <h2 className="recurring-rules-title">Your Rules</h2>

      {rules.length === 0 ? (
        <p className="recurring-muted">No recurring rules yet.</p>
      ) : (
        <div className="recurring-table-wrap">
          <table className="recurring-table" width="100%" cellPadding="10">
            <thead>
              <tr className="recurring-table-head-row">
                <th>Active</th>
                <th>Type</th>
                <th>Day</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r._id} className="recurring-table-row">
                  <td>
                    <button onClick={() => toggleActive(r)}>
                      {r.isActive ? "✅ Active" : "⏸️ Paused"}
                    </button>
                  </td>
                  <td>{r.type}</td>
                  <td>{r.dayOfMonth}</td>
                  <td>
                    {/* rule.category may be an id; we’ll resolve name from categories */}
                    {categories.find((c) => c._id === r.category)?.name || "—"}
                  </td>
                  <td>{r.description || "—"}</td>
                  <td>${Number(r.amount).toFixed(2)}</td>
                  <td>
                    <button onClick={() => deleteRule(r._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="recurring-tip">
            Tip: Click Active/Paused to toggle.
          </p>
        </div>
      )}
    </div>
  );
}
