import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import "../App.css";

function Login({ setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Missing info", "Please enter both email and password");
      return;
    }

    setLoading(true);
    // Simulate auth (matches original behavior; real API can drop in here)
    setTimeout(() => {
      localStorage.setItem("token", "demo-token");
      setIsLoggedIn(true);
      toast.success("Welcome back 👋", "Logged in successfully");
      setLoading(false);
      navigate("/dashboard");
    }, 700);
  };

  return (
    <div className="login-page">
      <div className="center-wrapper">
        <div className="login-card">
          <h2 className="login-title grad-text">Welcome back</h2>
          <p className="login-sub">Log in to your burnout dashboard</p>

          <form onSubmit={handleLogin} noValidate>
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
                autoComplete="current-password"
              />
              <label>Password</label>
            </div>

            <button type="submit" disabled={loading}>
              {loading && <span className="btn-spin" />}
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="login-links">
            <p onClick={() => navigate("/register")}>
              New here? Create an account →
            </p>
            <p onClick={() => navigate("/forgot")}>Forgot your password?</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;