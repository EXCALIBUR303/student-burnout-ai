import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center", width: "600px" }}>
        <h1 style={{ marginBottom: "10px" }}>
          Student Burnout Detection AI
        </h1>

        <p style={{ marginBottom: "30px", opacity: 0.8 }}>
          Predict burnout risk using AI and get personalized recovery guidance.
        </p>

        <button
          style={{ marginBottom: "15px" }}
          onClick={() => navigate("/predict")}
        >
          Start Assessment
        </button>

        <button
          style={{
            background: "linear-gradient(90deg,#1cc88a,#4e73df)",
          }}
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Landing;