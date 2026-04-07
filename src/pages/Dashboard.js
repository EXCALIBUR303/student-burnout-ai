import React from "react";
import "../App.css";
import ChatBot from "../components/ChatBot";
import CountUp from "react-countup";
import GaugeChart from "react-gauge-chart"; 

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from "recharts";

function Dashboard() {

  const stats = [
    { title: "Total Predictions", value: 12 },
    { title: "High Risk Cases", value: 5 },
    { title: "Low Risk Cases", value: 7 },
    { title: "Avg Stress Level", value: "3.8" }
  ];

  const stressData = [
    { day: "Mon", stress: 2 },
    { day: "Tue", stress: 3 },
    { day: "Wed", stress: 4 },
    { day: "Thu", stress: 3 },
    { day: "Fri", stress: 5 }
  ];

  const studySleepData = [
    { name: "Student A", study: 5, sleep: 6 },
    { name: "Student B", study: 6, sleep: 5 },
    { name: "Student C", study: 4, sleep: 7 },
  ];

  const riskData = [
    { name: "High Risk", value: 5 },
    { name: "Low Risk", value: 7 }
  ];

  const COLORS = ["#9333ea", "#4e73df"];

  return (
    <div className="dashboard-container">

      <h1 className="dashboard-title">Dashboard 📊</h1>

      {/* Stats cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index}>
            <h2>
              <CountUp end={stat.value} duration={2} />
            </h2>
            <p>{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">

        {/* Stress Trend */}
        <div className="chart-card">
          <h3>Stress Trend</h3>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={stressData}>
                <CartesianGrid stroke="#444" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="stress" stroke="#9333ea" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study vs Sleep */}
        <div className="chart-card">
          <h3>Study vs Sleep Hours</h3>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={studySleepData}>
                <CartesianGrid stroke="#444" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="study" fill="#4e73df" />
                <Bar dataKey="sleep" fill="#9333ea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Burnout distribution */}
        <div className="chart-card">
          <h3>Burnout Risk Distribution</h3>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  outerRadius={100}
                  label
                >
                  {riskData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
                  
      {/* AI Insight Card */}
      <div
        className="chart-card"
        style={{
        background: "linear-gradient(135deg,#4e73df,#9333ea)",
        color: "white"
        }}
      >

        <h3>AI Insight</h3>

        <p style={{ marginTop: "10px", lineHeight: "1.6" }}>
        Students sleeping less than <strong>6 hours</strong> and studying more
        than <strong>5 hours</strong> show a significantly higher risk of burnout.
        The model detected this pattern across recent predictions.
        </p>

      </div>

      <ChatBot />

    </div>
  );
}

export default Dashboard;