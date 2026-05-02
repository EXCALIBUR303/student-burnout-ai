import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import "../App.css";
import API_BASE from "../utils/api";

const BRAND_FEATURES = [
  { icon: "🆓", text: "100% free, forever" },
  { icon: "🔒", text: "Anonymous by default — no tracking" },
  { icon: "🧠", text: "AI trained on real student patterns" },
  { icon: "🌱", text: "Recovery plans that actually work" },
];

const getStrength = (pw) => {
  if (!pw)        return { label: "",       color: "var(--text-dim)", width: 0 };
  if (pw.length < 6)  return { label: "Weak",   color: "var(--danger)",  width: 33 };
  if (pw.length < 10) return { label: "Medium", color: "var(--warning)", width: 66 };
  return               { label: "Strong",  color: "var(--success)", width: 100 };
};

function Register() {
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPw]     = useState("");
  const [loading, setLoading]               = useState(false);
  const [showPw, setShowPw]                 = useState(false);
  const { toast }                           = useToast();
  const navigate                            = useNavigate();
  const strength                            = getStrength(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Missing info", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password too short", "Must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match", "Re-enter and try again");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Registration failed", data.error);
        return;
      }
      toast.success("Account created ✨", "Redirecting to login...");
      setTimeout(() => navigate("/login"), 1100);
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
            One snapshot.<br />Endless clarity.
          </h2>
          <p className="auth-brand-sub">
            Create your free account and take the first step toward understanding
            your wellbeing with real AI insights.
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

          <h2 className="login-title grad-text">Create account</h2>
          <p className="login-sub">Free forever. No credit card.</p>

          <form onSubmit={handleRegister} noValidate>
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
                placeholder=" " autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <label>Password</label>
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}
                tabIndex={-1} aria-label="Toggle password visibility">
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
              <div style={{ marginTop: -10, marginBottom: 16 }}>
                <div style={{ height: 4, background: "var(--surface-strong)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${strength.width}%`, height: "100%",
                    background: strength.color,
                    transition: "width 0.3s ease, background 0.3s ease",
                  }} />
                </div>
                <p style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: strength.color, marginTop: 5,
                }}>{strength.label}</p>
              </div>
            )}

            <div className="input-group">
              <input type="password" required value={confirmPassword}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder=" " autoComplete="new-password" />
              <label>Confirm password</label>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading && <span className="btn-spin" />}
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <div className="login-links">
            <p onClick={() => navigate("/login")}>Already have an account? Log in →</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;
