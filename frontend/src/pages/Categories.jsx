import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { clearAuth } from "../auth/auth";
import "../styles/Categories.css";

export default function Categories() {
  const nav = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    color: "#64748b"
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadCategories() {
    setError("");

    try {
      const res = await api.get("/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuth();
        nav("/login");
        return;
      }

      setError(err.response?.data?.message || "Failed to load categories");
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/categories", {
        name: form.name,
        color: form.color
      });

      setForm({
        name: "",
        color: "#64748b"
      });

      await loadCategories();
      setMessage("Category created ✅");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create category");
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Delete this category?");
    if (!ok) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/categories/${id}`);
      await loadCategories();
      setMessage("Category deleted ✅");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete category");
    }
  }

  return (
    <div className="categories-page">
      <div className="categories-header">
        <h1 className="categories-title">Categories</h1>

        <div className="categories-actions">
          <button onClick={() => nav("/")}>Back to Dashboard</button>
          <button onClick={() => nav("/recurring")}>Recurring Rules</button>
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

      <p className="categories-subtitle">
        Create categories like Food, Rent, Gas, Utilities, Groceries, Income, etc.
      </p>

      <hr className="categories-divider" />

      {message && <p className="categories-message">{message}</p>}
      {error && <p className="categories-error">{error}</p>}

      <h2>Create Category</h2>

      <form
        onSubmit={handleCreate}
        className="categories-form"
      >
        <input
          placeholder="Category name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <input
          type="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />

        <button type="submit">Create</button>
      </form>

      <h2 className="categories-section-title">Your Categories</h2>

      {categories.length === 0 ? (
        <p className="categories-empty">No categories yet.</p>
      ) : (
        <table className="categories-table" width="100%" cellPadding="10">
          <thead>
            <tr className="categories-head-row">
              <th>Color</th>
              <th>Name</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => (
              <tr key={cat._id} className="categories-body-row">
                <td>
                  <input
                    type="color"
                    className="category-color-dot-input"
                    value={cat.color || "#64748b"}
                    readOnly
                    disabled
                    aria-label="Category color"
                  />
                </td>

                <td>{cat.name}</td>

                <td>{String(cat.createdAt).slice(0, 10)}</td>

                <td>
                  <button onClick={() => handleDelete(cat._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}