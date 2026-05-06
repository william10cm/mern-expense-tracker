import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { setAuth } from "../auth/auth";
import "../styles/Login.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.token);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="login-page">
      <h1>Login</h1>

      <form onSubmit={handleSubmit} className="login-form">
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit">Login</button>
      </form>

      <p className="login-register-link">
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
