import React from "react";
import "../App.css";

function Dashboard() {
  return (
    <div style={{ padding: "50px", color: "white" }}>
      <h1 style={{ marginBottom: "30px" }}>Dashboard 📊</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        <div className="stat-card">
          <h2>12</h2>
          <p>Total Predictions</p>
        </div>

        <div className="stat-card">
          <h2>5</h2>
          <p>High Risk Cases</p>
        </div>

        <div className="stat-card">
          <h2>7</h2>
          <p>Low Risk Cases</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;