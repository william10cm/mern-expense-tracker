import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { clearAuth } from "../auth/auth";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import {
  PieChart, Pie, Tooltip as ReTooltip, Legend, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip
} from "recharts";


function getCurrentMonthYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
    async function generateRecurring() {
      setError("");
      try {
        await api.post(`/recurring/generate?month=${month}`);
        await refreshAll(); // updates summary, charts, table
      } catch (err) {
        setError(err.response?.data?.message || "Failed to generate recurring expenses");
      }
    }
  const nav = useNavigate();
  const [user, setUser] = useState(null);

  const [month, setMonth] = useState(getCurrentMonthYYYYMM());
  const [summary, setSummary] = useState(null);

  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);

  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: "",
    type: "expense"
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    date: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const netLabel = useMemo(() => {
    if (!summary) return "";
    return summary.net >= 0 ? "Net (Profit)" : "Net (Loss)";
  }, [summary]);

  useEffect(() => {
    setForm((f) => ({ ...f, date: f.date || todayISO() }));
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
      } catch (err) {
        clearAuth();
        nav("/login");
      }
    }
    loadUser();
  }, [nav]);

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/reports/summary?month=${month}`);
        setSummary(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load summary");
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [month]);

  useEffect(() => {
    async function loadCharts() {
      setError("");

      try {
        const [catRes, trendRes] = await Promise.all([
          api.get(`/reports/by-category?month=${month}&type=expense`),
          api.get(`/reports/trend?month=${month}&type=expense`)
        ]);

        setByCategory(catRes.data.rows || []);
        setTrend(trendRes.data.rows || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load charts");
        setByCategory([]);
        setTrend([]);
      }
    }

    loadCharts();
  }, [month]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get("/categories");
        const cats = res.data.categories || [];
        setCategories(cats);
        setForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?._id || "" }));
      } catch (err) {
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const res = await api.get(`/transactions?month=${month}`);
        setTransactions(res.data.transactions || []);
      } catch (err) {
        setTransactions([]);
      }
    }
    loadTransactions();
  }, [month]);


  async function downloadCSV() {
    try {
      const res = await api.get(`/exports/transactions?month=${month}`, {
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download CSV");
    }
  }

  async function refreshAll() {
    const [sumRes, catRes, trendRes, txRes] = await Promise.all([
      api.get(`/reports/summary?month=${month}`),
      api.get(`/reports/by-category?month=${month}&type=expense`),
      api.get(`/reports/trend?month=${month}&type=expense`),
      api.get(`/transactions?month=${month}`)
    ]);

    setSummary(sumRes.data);
    setByCategory(catRes.data.rows || []);
    setTrend(trendRes.data.rows || []);
    setTransactions(txRes.data.transactions || []);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");

    try {
      await api.post("/transactions", {
        amount: Number(form.amount),
        description: form.description,
        category: form.categoryId,
        date: form.date,
        type: form.type
      });

      setForm((f) => ({ ...f, amount: "", description: "" }));
      await refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add transaction");
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await api.delete(`/transactions/${id}`);
      await refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete transaction");
    }
  }

  async function handleEdit(id) {
    setEditingId(id);
    const tx = transactions.find((t) => t._id === id);
    if (tx) {
      setEditForm({
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        categoryId: tx.category._id,
        date: tx.date
      });
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError("");

    try {
      await api.put(`/transactions/${editingId}`, {
        amount: Number(editForm.amount),
        description: editForm.description,
        category: editForm.categoryId,
        date: editForm.date,
        type: editForm.type
      });

      setEditingId(null);
      setEditForm({
        type: "expense",
        amount: "",
        description: "",
        categoryId: "",
        date: ""
      });
      await refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update transaction");
    }
  }

  function startEdit(t) {
    setEditingId(t._id);
    setEditForm({
      type: t.type,
      amount: String(t.amount),
      description: t.description || "",
      categoryId: t.category?._id || "",
      date: String(t.date).slice(0, 10)
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.patch(`/transactions/${id}`, {
        type: editForm.type,
        amount: Number(editForm.amount),
        description: editForm.description,
        category: editForm.categoryId,
        date: editForm.date
      });

      setEditingId(null);
      await refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update transaction");
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-title-block">
          <h1 className="dashboard-title">Dashboard</h1>
          {user && <p className="dashboard-welcome">Welcome, {user.name} ({user.email})</p>}
        </div>

        <button
          onClick={() => {
            clearAuth();
            nav("/login");
          }}
        >
          Logout
        </button>
      </div>

      <hr className="dashboard-divider" />

      <div className="dashboard-controls">
        <label className="dashboard-month-label">
          <strong>Month:</strong>{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        <button onClick={() => nav("/categories")}>Categories</button>  
        </label>
        <button onClick={() => nav("/recurring")}>Recurring Rules</button>
        <button onClick={downloadCSV}>Download CSV</button>
        <button onClick={generateRecurring}>Generate Recurring</button>
        {loading && <span className="dashboard-loading">Loading...</span>}
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      {summary && (
        <div className="dashboard-summary-grid">
          <Card title="Total Expense" value={`$${summary.totalExpense.toFixed(2)}`} />
          <Card title="Total Income" value={`$${summary.totalIncome.toFixed(2)}`} />
          <Card title={netLabel} value={`$${summary.net.toFixed(2)}`} />
          <Card title="Transactions" value={`${summary.count}`} />
        </div>
      )}

      {(byCategory.length > 0 || trend.length > 0) && (
        <div className="dashboard-charts-grid">
          {/* Pie Chart */}
          <div className="dashboard-panel">
            <h3 className="dashboard-panel-title">Expenses by Category</h3>

            {byCategory.length === 0 ? (
              <p className="dashboard-muted">No expense data for this month.</p>
            ) : (
              <div className="dashboard-chart-wrap">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={(entry) => entry.name}
                    >
                      {byCategory.map((row) => (
                        <Cell key={row.categoryId} fill={row.color || "#8884d8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Line Chart */}
          <div className="dashboard-panel">
            <h3 className="dashboard-panel-title">Daily Spending Trend</h3>

            {trend.length === 0 ? (
              <p className="dashboard-muted">No trend data for this month.</p>
            ) : (
              <div className="dashboard-chart-wrap">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      <hr className="dashboard-divider dashboard-divider-secondary" />

      <h2 className="dashboard-section-title">Add Transaction</h2>

      <form onSubmit={handleAdd} className="dashboard-add-form">
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
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="span-1"
          required
        />

        <button type="submit" className="span-6">
          Add
        </button>
      </form>

      <h2 className="dashboard-transactions-title">Transactions</h2>

      {transactions.length === 0 ? (
        <p className="dashboard-muted">No transactions for this month.</p>
      ) : (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table" width="100%" cellPadding="10">
            <thead>
              <tr className="dashboard-table-head-row">
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t._id} className="dashboard-table-row">
                  {editingId === t._id ? (
                    <>
                      <td>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        >
                          <option value="expense">expense</option>
                          <option value="income">income</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={editForm.categoryId}
                          onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                        >
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Description"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        />
                      </td>
                      <td className="dashboard-actions-cell">
                        <button onClick={() => saveEdit(t._id)}>Save</button>
                        <button onClick={cancelEdit}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{String(t.date).slice(0, 10)}</td>
                      <td>{t.type}</td>
                      <td>{t.category?.name || "-"}</td>
                      <td>{t.description}</td>
                      <td>${Number(t.amount).toFixed(2)}</td>
                      <td className="dashboard-actions-cell">
                        <button onClick={() => startEdit(t)}>Edit</button>
                        <button onClick={() => handleDelete(t._id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-title">{title}</div>
      <div className="dashboard-card-value">{value}</div>
    </div>
  );
}
