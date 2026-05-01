import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import "../App.css";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const getPasswordStrength = () => {
    if (!password) return { label: "", color: "var(--text-dim)", width: 0 };
    if (password.length < 6) return { label: "Weak", color: "var(--danger)", width: 33 };
    if (password.length < 10) return { label: "Medium", color: "var(--warning)", width: 66 };
    return { label: "Strong", color: "var(--success)", width: 100 };
  };
  const strength = getPasswordStrength();

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
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Account created ✨", data.message || "Redirecting to login...");
        setTimeout(() => navigate("/login"), 1100);
      } else {
        toast.error("Registration failed", data.message || "Please try again");
      }
    } catch (err) {
      // Fallback for when backend isn't running (matches original behavior)
      toast.success("Demo account created", "Redirecting to login...");
      setTimeout(() => navigate("/login"), 1100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="center-wrapper">
        <div className="login-card">
          <h2 className="login-title grad-text">Create account</h2>
          <p className="login-sub">Free forever. No credit card.</p>

          <form onSubmit={handleRegister} noValidate>
            <div className="input-group">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoComplete="email"
              />
              <label>Email</label>
            </div>

            <div className="input-group">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="new-password"
              />
              <label>Password</label>
            </div>

            {password && (
              <div style={{ marginTop: -8, marginBottom: 16 }}>
                <div
                  style={{
                    height: 4,
                    background: "var(--surface-strong)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${strength.width}%`,
                      height: "100%",
                      background: strength.color,
                      transition: "width 0.3s ease, background 0.3s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: strength.color,
                    marginTop: 6,
                  }}
                >
                  {strength.label}
                </p>
              </div>
            )}

            <div className="input-group">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
                autoComplete="new-password"
              />
              <label>Confirm password</label>
            </div>

            <button type="submit" disabled={loading}>
              {loading && <span className="btn-spin" />}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="login-links">
            <p onClick={() => navigate("/login")}>
              Already have an account? Log in →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;