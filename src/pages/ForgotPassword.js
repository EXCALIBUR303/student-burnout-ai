import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import "../App.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return toast.error("Email required", "Please enter your email");
    if (!emailRegex.test(email)) return toast.error("Invalid email", "Check the format and try again");

    setLoading(true);
    setTimeout(() => {
      setSent(true);
      setLoading(false);
      toast.success("Reset link sent", `Check ${email}`);
    }, 1000);
  };

  return (
    <div className="login-page">
      <div className="center-wrapper">
        <div className="login-card">
          <h2 className="login-title grad-text">Reset password</h2>

          {!sent ? (
            <>
              <p className="login-sub">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} noValidate>
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

                <button type="submit" disabled={loading}>
                  {loading && <span className="btn-spin" />}
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 54, marginBottom: 16 }}>📧</div>
              <h3 style={{ color: "var(--success)", marginBottom: 10 }}>
                Check your inbox
              </h3>
              <p style={{ fontSize: 14 }}>
                We sent a reset link to <strong style={{ color: "var(--text)" }}>{email}</strong>
              </p>
            </div>
          )}

          <div className="login-links">
            <p onClick={() => navigate("/login")}>← Back to log in</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;