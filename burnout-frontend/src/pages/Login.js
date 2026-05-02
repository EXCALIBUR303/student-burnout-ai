import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import API_BASE from "../utils/api";
import "../App.css";

const BRAND_FEATURES = [
  { icon: "⚡", text: "Predict burnout risk in under 2 minutes" },
  { icon: "📊", text: "Live dashboard with real student data" },
  { icon: "🌱", text: "Personalised recovery plans" },
  { icon: "🤖", text: "24/7 AI counselor support" },
];

function Login({ setIsLoggedIn }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const { toast }               = useToast();
  const navigate                = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Missing info", "Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Login failed", data.error);
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email);
      setIsLoggedIn(true);
      toast.success("Welcome back 👋", "Logged in successfully");
      navigate("/dashboard");
    } catch {
      toast.error("Connection error", "Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-page">

      {/* ── Left: brand panel ── */}
      <div className="auth-brand-panel">
        <motion.div className="auth-brand-content"
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>

          <div className="auth-logo">🔥 BurnoutAI</div>

          <h2 className="auth-brand-title">
            Your mental health<br />deserves data.
          </h2>
          <p className="auth-brand-sub">
            Join thousands of students using AI-powered insights to manage
            burnout before it manages them.
          </p>

          <div className="auth-features-list">
            {BRAND_FEATURES.map((f, i) => (
              <motion.div key={f.text} className="auth-feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * i + 0.35, duration: 0.45 }}>
                <span className="auth-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="auth-brand-decoration" aria-hidden="true" />
        </motion.div>
      </div>

      {/* ── Right: form ── */}
      <div className="auth-form-panel">
        <motion.div className="auth-form-card"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

          <h2 className="login-title grad-text">Welcome back</h2>
          <p className="login-sub">Log in to your burnout dashboard</p>

          <form onSubmit={handleLogin} noValidate>
            <div className="input-group">
              <input type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" " autoComplete="email" />
              <label>Email</label>
            </div>

            <div className="input-group" style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" " autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <label>Password</label>
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}
                tabIndex={-1} aria-label="Toggle password visibility">
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading && <span className="btn-spin" />}
              {loading ? "Logging in..." : "Log in →"}
            </button>
          </form>

          <div className="login-links">
            <p onClick={() => navigate("/register")}>New here? Create an account →</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
