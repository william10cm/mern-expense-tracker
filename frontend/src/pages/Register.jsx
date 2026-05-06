import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { setAuth } from "../auth/auth";
import "../styles/Register.css";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/register", { name, email, password });
      setAuth(res.data.token);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Register failed");
    }
  }

  return (
    <div className="register-page">
      <h1>Register</h1>

      <form onSubmit={handleSubmit} className="register-form">
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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

        {error && <p className="register-error">{error}</p>}

        <button type="submit">Create account</button>
      </form>

      <p className="register-login-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
