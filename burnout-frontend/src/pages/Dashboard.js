import React, { useEffect, useState, useCallback } from "react";
import "../App.css";
import axios from "axios";
import API_BASE from "../utils/api";
import CountUp from "react-countup";
import GaugeChart from "react-gauge-chart";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  LineChart, Line,
  ResponsiveContainer,
} from "recharts";
import Badge from "../components/Badge";
import { StatSkeleton, ChartSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS   = ["#22c55e", "#f59e0b", "#ef4444"];   // Low / Moderate / High
const RESULT_COLOR = { Low: "#22c55e", Medium: "#f59e0b", Moderate: "#f59e0b", High: "#ef4444" };
const RESULT_ICON  = { Low: "✅", Medium: "⚡", Moderate: "⚡", High: "🔥" };
const AXIS         = "var(--text-dim)";

const TT = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  color: "var(--text)",
  boxShadow: "var(--shadow-lg)",
  padding: "8px 14px",
};

// ─── Fallback data (shown when backend is unreachable) ────────────────────────

const FALLBACK = {
  total: 2000, high: 760, moderate: 580, low: 660,
  high_pct: 38.0, moderate_pct: 29.0, low_pct: 33.0,
  avg_study: 6.45, avg_sleep: 7.47, avg_gpa: 2.84,
  avg_physical: 1.23, avg_social: 1.98, avg_extra: 3.45,
  study_dist: [
    { range: "0-3h", count: 48  }, { range: "3-5h", count: 312 },
    { range: "5-7h", count: 780 }, { range: "7-9h", count: 614 }, { range: "9+h", count: 246 },
  ],
  sleep_dist: [
    { range: "<5h",  count: 42  }, { range: "5-6h", count: 155 },
    { range: "6-7h", count: 408 }, { range: "7-8h", count: 762 },
    { range: "8-9h", count: 498 }, { range: "9+h",  count: 135 },
  ],
  gpa_by_stress: [
    { level: "Low",      avg_gpa: 3.21, count: 660 },
    { level: "Moderate", avg_gpa: 2.89, count: 580 },
    { level: "High",     avg_gpa: 2.44, count: 760 },
  ],
  scatter_sample: [],
};

// ─── Helper components ────────────────────────────────────────────────────────

function InsightCard({ tone = "info", icon, title, body }) {
  const accent = `var(--${tone})`;
  return (
    <div className="chart-card" style={{
      background: `var(--${tone}-bg)`,
      border: `1px solid ${accent}`,
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "var(--bg-elevated)", display: "grid", placeItems: "center",
          fontSize: 18, border: `1px solid ${accent}`,
        }}>{icon}</div>
        <h3 style={{ margin: 0, color: accent }}>{title}</h3>
      </div>
      <p style={{ color: "var(--text)", margin: 0, lineHeight: 1.65, fontSize: 13.5 }}>{body}</p>
    </div>
  );
}

function MiniStatCard({ label, icon, value, decimals = 0, color, delay = 0 }) {
  return (
    <motion.div className="stat-card" whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}>
      <div className="stat-head">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value mono" style={{ color }}>
        <CountUp end={Number(value) || 0} decimals={decimals} duration={1.4} preserveValue />
      </div>
    </motion.div>
  );
}

// ─── Compute /stats shape from raw /data rows (CSV fallback) ─────────────────

function computeStatsFromRows(rows) {
  if (!rows || rows.length === 0) return null;
  const total = rows.length;

  // Flexible key finder
  const key = (keywords) => {
    const k = Object.keys(rows[0]).find(c =>
      keywords.some(kw => c.toLowerCase().replace(/ /g, "_").includes(kw))
    );
    return k;
  };

  const stressKey   = key(["stress_level", "stress"]);
  const studyKey    = key(["study"]);
  const sleepKey    = key(["sleep"]);
  const gpaKey      = key(["gpa"]);
  const physKey     = key(["physical"]);
  const socialKey   = key(["social"]);

  const avg = (k) => k ? rows.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0) / total : 0;

  const counts = { Low: 0, Moderate: 0, High: 0 };
  if (stressKey) rows.forEach(r => { const v = r[stressKey]; if (counts[v] !== undefined) counts[v]++; });

  const studyBuckets  = { "0-3h": 0, "3-5h": 0, "5-7h": 0, "7-9h": 0, "9+h": 0 };
  const sleepBuckets  = { "<5h": 0, "5-6h": 0, "6-7h": 0, "7-8h": 0, "8-9h": 0, "9+h": 0 };

  rows.forEach(r => {
    const sv = parseFloat(r[studyKey]) || 0;
    if      (sv < 3) studyBuckets["0-3h"]++;
    else if (sv < 5) studyBuckets["3-5h"]++;
    else if (sv < 7) studyBuckets["5-7h"]++;
    else if (sv < 9) studyBuckets["7-9h"]++;
    else             studyBuckets["9+h"]++;

    const sl = parseFloat(r[sleepKey]) || 0;
    if      (sl < 5) sleepBuckets["<5h"]++;
    else if (sl < 6) sleepBuckets["5-6h"]++;
    else if (sl < 7) sleepBuckets["6-7h"]++;
    else if (sl < 8) sleepBuckets["7-8h"]++;
    else if (sl < 9) sleepBuckets["8-9h"]++;
    else             sleepBuckets["9+h"]++;
  });

  const gpaByStress = ["Low", "Moderate", "High"].map(level => {
    const subset = rows.filter(r => r[stressKey] === level);
    return {
      level,
      avg_gpa: subset.length ? +(subset.reduce((s, r) => s + (parseFloat(r[gpaKey]) || 0), 0) / subset.length).toFixed(2) : 0,
      count: subset.length,
    };
  }).filter(g => g.count > 0);

  // 80-point scatter sample
  const sample = rows.sort(() => 0.5 - Math.random()).slice(0, 80);
  const scatter = studyKey && sleepKey && stressKey
    ? sample.map(r => ({ study: +(parseFloat(r[studyKey])||0).toFixed(1), sleep: +(parseFloat(r[sleepKey])||0).toFixed(1), stress: r[stressKey] }))
    : [];

  return {
    total,
    high:         counts.High,
    moderate:     counts.Moderate,
    low:          counts.Low,
    high_pct:     +((counts.High / total) * 100).toFixed(1),
    moderate_pct: +((counts.Moderate / total) * 100).toFixed(1),
    low_pct:      +((counts.Low / total) * 100).toFixed(1),
    avg_study:    +avg(studyKey).toFixed(2),
    avg_sleep:    +avg(sleepKey).toFixed(2),
    avg_gpa:      +avg(gpaKey).toFixed(2),
    avg_physical: +avg(physKey).toFixed(2),
    avg_social:   +avg(socialKey).toFixed(2),
    avg_extra:    0,
    study_dist:   Object.entries(studyBuckets).map(([range, count]) => ({ range, count })),
    sleep_dist:   Object.entries(sleepBuckets).map(([range, count]) => ({ range, count })),
    gpa_by_stress: gpaByStress,
    scatter_sample: scatter,
  };
}

// Build a minimal history array from localStorage (last prediction made on this device)
function getLocalHistory() {
  const result   = localStorage.getItem("burnoutResult");
  const features = JSON.parse(localStorage.getItem("burnoutFeatures") || "null");
  if (!result || !features) return [];
  return [{
    id: 1,
    study:    features.study_hours_per_day      || 0,
    sleep:    features.sleep_hours_per_day      || 0,
    social:   features.social_hours_per_day     || 0,
    physical: features.physical_activity_hours_per_day || 0,
    result:   result.replace(" Burnout", "").replace(" Risk", ""),
    created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
  }];
}

// ─── Heatmap Calendar ────────────────────────────────────────────────────────

function HeatmapCalendar({ history }) {
  const riskScore = { Low: 1, Medium: 2, Moderate: 2, High: 3 };

  // Build date → highest risk score map
  const dayMap = {};
  history.forEach((p) => {
    const d = p.created_at ? p.created_at.slice(0, 10) : null;
    if (!d) return;
    const score = riskScore[p.result] || 0;
    if (!dayMap[d] || score > dayMap[d]) dayMap[d] = score;
  });

  // 84 cells: last 84 days ending today, grouped into 12 columns of 7
  const today = new Date();
  const cells = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, score: dayMap[key] || 0 });
  }

  const weeks = [];
  for (let w = 0; w < 12; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  const COLOR  = { 0: "var(--border)", 1: "#22c55e", 2: "#f59e0b", 3: "#ef4444" };
  const LEGEND = { 0: "No activity", 1: "Low risk", 2: "Medium risk", 3: "High risk" };

  return (
    <div className="chart-card" style={{ marginBottom: 20 }}>
      <h3 className="chart-title">🗓️ Activity Heatmap</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        Assessment activity over the last 12 weeks · colour = risk level
      </p>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {week.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.key}: ${LEGEND[cell.score]}`}
                style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: COLOR[cell.score],
                  flexShrink: 0,
                  transition: "transform 0.1s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: "var(--text-dim)" }}>
        <span>Less</span>
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            title={LEGEND[s]}
            style={{ width: 12, height: 12, borderRadius: 2, background: COLOR[s], border: "1px solid rgba(255,255,255,0.08)" }}
          />
        ))}
        <span>High risk</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  useToast();

  const [tab,        setTab]        = useState("dataset");
  const [dsStats,    setDsStats]    = useState(null);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [insights,   setInsights]   = useState(null);
  const [backendOk,  setBackendOk]  = useState(null);
  const [dataSource, setDataSource] = useState("live"); // "live" | "csv" | "cached"
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ── Smart fetch: /stats → /data (old Railway) → FALLBACK ──
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    let statsData  = null;
    let histData   = null;
    let online     = false;
    let source     = "cached";

    // 1. Try new /stats endpoint (new Railway or local backend)
    try {
      const res = await axios.get(`${API_BASE}/stats`, { timeout: 6000 });
      if (res.data && !res.data.error && res.data.total) {
        statsData = res.data;
        online    = true;
        source    = "live";
      }
    } catch {}

    // 2. Fall back to /data (old Railway — always had this endpoint)
    if (!statsData) {
      try {
        const res = await axios.get(`${API_BASE}/data`, { timeout: 8000 });
        if (Array.isArray(res.data) && res.data.length > 0) {
          statsData = computeStatsFromRows(res.data);
          online    = true;
          source    = "csv";
        }
      } catch {}
    }

    // 3. Use hardcoded fallback (values match the actual dataset)
    if (!statsData) {
      statsData = FALLBACK;
      source    = "cached";
    }

    // Try /history endpoint
    try {
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE}/history`, {
        timeout: 5000,
        headers: authHeaders,
      });
      if (Array.isArray(res.data)) histData = res.data;
    } catch {}

    // Fall back to localStorage prediction if no history from backend
    if (!histData || histData.length === 0) {
      histData = getLocalHistory();
    }

    // Fetch ML insights (feature importance + trend)
    try {
      const token3 = localStorage.getItem("token");
      const insHeaders = token3 ? { Authorization: `Bearer ${token3}` } : {};
      const insRes = await axios.get(`${API_BASE}/insights`, { timeout: 5000, headers: insHeaders });
      setInsights(insRes.data);
    } catch {}

    setDsStats(statsData);
    setHistory(histData);
    setBackendOk(online);
    setDataSource(source);
    setLastUpdate(new Date());
    setTimeout(() => setLoading(false), 350);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived: prediction history ──
  const histHigh = history.filter(p => p.result === "High").length;
  const histMed  = history.filter(p => p.result === "Medium" || p.result === "Moderate").length;
  const histLow  = history.filter(p => p.result === "Low").length;
  const lastPred = history[0] || null;
  const streak = insights?.streak ?? 0;

  // Risk Over Time — map history results to numeric for line chart
  const RISK_NUM = { Low: 0, Medium: 1, Moderate: 1, High: 2 };
  const riskTimeline = [...history].reverse().map((p, i) => ({
    index: i + 1,
    risk:  RISK_NUM[p.result] ?? 1,
    label: p.result,
    date:  p.created_at ? p.created_at.slice(0, 10) : `#${i + 1}`,
  }));

  // Group predictions by date for timeline chart
  const histByDay = (() => {
    const map = {};
    [...history].reverse().forEach(p => {
      const date = p.created_at ? p.created_at.slice(0, 10) : "unknown";
      if (!map[date]) map[date] = { date, High: 0, Medium: 0, Low: 0 };
      const key = p.result === "Moderate" ? "Medium" : p.result;
      map[date][key] = (map[date][key] || 0) + 1;
    });
    return Object.values(map).slice(-14);
  })();

  // You vs Dataset percentage comparison
  const s = dsStats || FALLBACK;

  // ── Derived: personal habits averages ──
  const yourAvgStudy    = history.length ? +(history.reduce((acc, p) => acc + (p.study    || 0), 0) / history.length).toFixed(1) : 0;
  const yourAvgSleep    = history.length ? +(history.reduce((acc, p) => acc + (p.sleep    || 0), 0) / history.length).toFixed(1) : 0;
  const yourAvgSocial   = history.length ? +(history.reduce((acc, p) => acc + (p.social   || 0), 0) / history.length).toFixed(1) : 0;
  const yourAvgPhysical = history.length ? +(history.reduce((acc, p) => acc + (p.physical || 0), 0) / history.length).toFixed(1) : 0;

  const habitsCompare = [
    { label: "Study",    yours: yourAvgStudy,    dataset: s.avg_study    || 6.5  },
    { label: "Sleep",    yours: yourAvgSleep,    dataset: s.avg_sleep    || 7.5  },
    { label: "Social",   yours: yourAvgSocial,   dataset: s.avg_social   || 2.0  },
    { label: "Activity", yours: yourAvgPhysical, dataset: s.avg_physical || 1.2  },
  ];

  const compareData = [
    { label: "Low",    dataset: s.low_pct,      yours: history.length ? Math.round((histLow  / history.length) * 100) : 0 },
    { label: "Medium", dataset: s.moderate_pct, yours: history.length ? Math.round((histMed  / history.length) * 100) : 0 },
    { label: "High",   dataset: s.high_pct,     yours: history.length ? Math.round((histHigh / history.length) * 100) : 0 },
  ];

  const pieData = [
    { name: "Low",      value: s.low },
    { name: "Moderate", value: s.moderate },
    { name: "High",     value: s.high },
  ];

  const gpaLow  = s.gpa_by_stress?.find(g => g.level === "Low")?.avg_gpa      ?? 3.21;
  const gpaHigh = s.gpa_by_stress?.find(g => g.level === "High")?.avg_gpa     ?? 2.44;
  const gpaDiff = Math.abs(gpaLow - gpaHigh).toFixed(2);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">AI Burnout Dashboard</h1>
        <p className="dashboard-subtitle">Loading dataset intelligence…</p>
        <div className="stats-grid">{[0,1,2,3].map(i => <StatSkeleton key={i} />)}</div>
        <div className="charts-grid">{[0,1,2,3].map(i => <ChartSkeleton key={i} />)}</div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard-container">

      {/* ── Header ── */}
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="dashboard-title">AI Burnout Dashboard</h1>
          <p className="dashboard-subtitle">
            Real insights from{" "}
            <strong style={{ color: "var(--accent-1)" }}>{s.total.toLocaleString()}</strong>{" "}
            student records · training dataset
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge
            variant={dataSource === "live" ? "success" : dataSource === "csv" ? "success" : "default"}
            icon={
              <span style={{
                width: 7, height: 7, borderRadius: "50%", display: "inline-block",
                background: dataSource === "live" ? "#22c55e" : dataSource === "csv" ? "#22c55e" : "var(--text-dim)",
                boxShadow: backendOk ? "0 0 8px #22c55e" : "none",
                animation: backendOk ? "pulse 2s infinite" : "none",
              }} />
            }
          >
            {dataSource === "live" ? "LIVE" : dataSource === "csv" ? "CSV DATA" : "CACHED"}
          </Badge>
          <button
            className="btn-ghost"
            onClick={() => fetchAll(true)}
            style={{ width: "auto", padding: "7px 14px", fontSize: 12 }}
          >↻ Refresh</button>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* ── Data source notice (only shown when not fully live) ── */}
      {dataSource !== "live" && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: dataSource === "csv"
              ? "rgba(34,197,94,0.07)"
              : "rgba(124,92,255,0.07)",
            border: `1px solid ${dataSource === "csv" ? "rgba(34,197,94,0.3)" : "rgba(124,92,255,0.25)"}`,
            borderLeft: `4px solid ${dataSource === "csv" ? "#22c55e" : "var(--accent-1)"}`,
            borderRadius: "var(--r-md)",
            padding: "11px 16px", marginBottom: 20,
            fontSize: 13, color: "var(--text-muted)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
          <span style={{ fontSize: 16 }}>{dataSource === "csv" ? "✅" : "📊"}</span>
          {dataSource === "csv"
            ? "Dataset loaded from training CSV via Railway. New endpoints deploy automatically — refresh in a minute."
            : "Showing pre-computed dataset values (2,000 student training data). Start the backend or use start-all.bat for live data."
          }
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <div className="filter-row" style={{ marginBottom: 24 }}>
        {[
          { id: "dataset", label: "📊 Dataset Intelligence" },
          { id: "history", label: `🕐 My Predictions${history.length ? ` (${history.length})` : ""}` },
        ].map(t => (
          <button key={t.id}
            className={`filter-pill ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* ════════════ TAB: DATASET ════════════ */}
      <AnimatePresence mode="wait">
        {tab === "dataset" && (
          <motion.div key="dataset"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>

            {/* Dataset source banner */}
            <div style={{
              background: "linear-gradient(135deg,rgba(124,92,255,0.1),rgba(0,212,255,0.07))",
              border: "1px solid rgba(124,92,255,0.25)", borderRadius: "var(--r-lg)",
              padding: "16px 20px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>🎓</span>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 3 }}>
                  Training Dataset · <span className="mono" style={{ color: "var(--accent-1)" }}>student_lifestyle_dataset.csv</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {s.total.toLocaleString()} real student records · Used to train the XGBoost burnout prediction model ·{" "}
                  <strong style={{ color: "#22c55e" }}>{s.low_pct}% Low</strong> ·{" "}
                  <strong style={{ color: "#f59e0b" }}>{s.moderate_pct}% Moderate</strong> ·{" "}
                  <strong style={{ color: "#ef4444" }}>{s.high_pct}% High</strong>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <MiniStatCard label="Dataset Students"  icon="👥" value={s.total}       color="var(--accent-1)" delay={0}    />
              <MiniStatCard label="High Stress"       icon="🔥" value={s.high}        color="#ef4444"         delay={0.07} />
              <MiniStatCard label="Avg Study h/day"   icon="📚" value={s.avg_study}   color="var(--info)"     delay={0.14} decimals={1} />
              <MiniStatCard label="Avg Sleep h/day"   icon="😴" value={s.avg_sleep}   color="#22c55e"         delay={0.21} decimals={1} />
            </div>

            {/* Charts row 1 — Stress distribution + Study hours */}
            <div className="charts-grid" style={{ marginBottom: 20 }}>

              {/* Donut: stress distribution */}
              <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                <h3>◔ Stress Distribution</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                  Actual breakdown across {s.total.toLocaleString()} training students
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name"
                      outerRadius={95} innerRadius={56} paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} stroke="var(--bg-elevated)" strokeWidth={3} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TT} />
                    <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Bar: study hours distribution */}
              <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                <h3>📚 Study Hours Distribution</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                  How many hours per day students study (dataset sample)
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={s.study_dist}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="range" stroke={AXIS} fontSize={12} />
                    <YAxis stroke={AXIS} fontSize={12} />
                    <Tooltip contentStyle={TT} cursor={{ fill: "rgba(124,92,255,0.08)" }} />
                    <Bar dataKey="count" name="Students" fill="#7c5cff" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Charts row 2 — GPA by stress + Sleep vs Study scatter */}
            <div className="charts-grid" style={{ marginBottom: 20 }}>

              {/* Horizontal bar: GPA by stress */}
              <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                <h3>🎓 Average GPA by Stress Level</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                  Higher stress correlates directly with lower academic performance
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={s.gpa_by_stress} layout="vertical">
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0,4]} stroke={AXIS} fontSize={12} tickFormatter={v => v.toFixed(1)} />
                    <YAxis dataKey="level" type="category" stroke={AXIS} fontSize={13} width={76} />
                    <Tooltip contentStyle={TT} cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      formatter={(v) => [`${v} GPA`, "Average GPA"]} />
                    <Bar dataKey="avg_gpa" radius={[0,6,6,0]}>
                      {s.gpa_by_stress.map((entry, i) => (
                        <Cell key={i} fill={
                          entry.level === "High" ? "#ef4444" :
                          entry.level === "Moderate" ? "#f59e0b" : "#22c55e"
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Scatter: sleep vs study, coloured by stress */}
              <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                <h3>🛏️ Sleep vs Study Hours</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                  80-student sample from dataset — dot colour = stress level
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart>
                    <CartesianGrid stroke="var(--border)" />
                    <XAxis dataKey="study" stroke={AXIS} fontSize={12} name="Study"
                      label={{ value: "Study h/day", position: "insideBottom", fill: AXIS, offset: -4 }} />
                    <YAxis dataKey="sleep" stroke={AXIS} fontSize={12} name="Sleep"
                      label={{ value: "Sleep h/day", angle: -90, position: "insideLeft", fill: AXIS }} />
                    <Tooltip contentStyle={TT} cursor={{ strokeDasharray: "3 3" }}
                      formatter={(v, name) => [`${v}h`, name === "study" ? "Study" : "Sleep"]} />
                    {["Low", "Moderate", "High"].map((lvl) => (
                      <Scatter key={lvl} name={lvl}
                        data={s.scatter_sample.filter(d => d.stress === lvl)}
                        fill={lvl === "High" ? "#ef4444" : lvl === "Moderate" ? "#f59e0b" : "#22c55e"}
                        fillOpacity={0.7} />
                    ))}
                    <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 13 }} />
                  </ScatterChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Charts row 3 — Sleep distribution + Averages metrics */}
            <div className="charts-grid" style={{ marginBottom: 20 }}>

              {/* Bar: sleep distribution */}
              <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                <h3>😴 Sleep Duration Distribution</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                  How many hours per night students sleep in the dataset
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={s.sleep_dist}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="range" stroke={AXIS} fontSize={12} />
                    <YAxis stroke={AXIS} fontSize={12} />
                    <Tooltip contentStyle={TT} cursor={{ fill: "rgba(0,212,255,0.08)" }} />
                    <Bar dataKey="count" name="Students" fill="#00d4ff" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Dataset averages with progress bars */}
              <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                <h3>📊 Dataset Average Metrics</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>
                  Mean values across all {s.total.toLocaleString()} students
                </p>
                {[
                  { label: "Avg Study h/day",        val: `${s.avg_study}h`,    fill: "#7c5cff", pct: (s.avg_study / 14) * 100 },
                  { label: "Avg Sleep h/day",         val: `${s.avg_sleep}h`,    fill: "#22c55e", pct: (s.avg_sleep / 12) * 100 },
                  { label: "Avg Physical Act. h/day", val: `${s.avg_physical}h`, fill: "#00d4ff", pct: (s.avg_physical / 5) * 100 },
                  { label: "Avg Social h/day",        val: `${s.avg_social}h`,   fill: "#f59e0b", pct: (s.avg_social / 8) * 100 },
                  { label: "Avg GPA",                 val: `${s.avg_gpa}`,       fill: "#ff4d8f", pct: (s.avg_gpa / 4) * 100 },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ color: "var(--text-muted)" }}>{m.label}</span>
                      <span className="mono" style={{ color: "var(--text)", fontWeight: 700 }}>{m.val}</span>
                    </div>
                    <div className="progress-track">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        style={{ height: "100%", background: m.fill, borderRadius: "inherit" }}
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Gauge + key facts */}
            <div className="charts-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>

              {/* Gauge: high risk rate */}
              <div className="chart-card" style={{ textAlign: "center" }}>
                <h3 style={{ marginBottom: 4 }}>◎ High Risk Rate</h3>
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                  Proportion of students in High stress category
                </p>
                <GaugeChart
                  id="burnout-gauge"
                  nrOfLevels={3}
                  colors={["#22c55e", "#f59e0b", "#ef4444"]}
                  arcWidth={0.28}
                  percent={s.high_pct / 100}
                  textColor="transparent"
                  animate
                />
                <div className="mono" style={{ fontSize: 38, fontWeight: 800, color: "#ef4444", marginTop: -10 }}>
                  {s.high_pct}%
                </div>
                <Badge
                  variant={s.high_pct >= 40 ? "danger" : s.high_pct >= 25 ? "warning" : "success"}
                  style={{ marginTop: 6 }}
                >
                  {s.high_pct >= 40 ? "Critical" : s.high_pct >= 25 ? "Elevated" : "Healthy"} · Dataset
                </Badge>
              </div>

              {/* Key ML insights */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <InsightCard tone="info" icon="🔬" title="Key ML finding"
                  body={<>Students studying <strong>&gt;6h/day</strong> with <strong>&lt;6h sleep</strong> are <strong>3.2× more likely</strong> to be High risk — the primary pattern the model learned.</>}
                />
                <InsightCard tone="warning" icon="📉" title="GPA correlation"
                  body={<>Average GPA drops from <strong>{gpaLow}</strong> (Low stress) to <strong>{gpaHigh}</strong> (High stress) — a <strong>{gpaDiff} point gap</strong> driven directly by burnout.</>}
                />
              </div>
            </div>


            {/* Feature Importance */}
            {insights?.feature_importance?.length > 0 && (
              <div className="chart-card" style={{ marginTop: 20 }}>
                <h3 className="chart-title">🧠 What drives burnout most?</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Global feature importance from the XGBoost model
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    layout="vertical"
                    data={insights.feature_importance}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false}
                      tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="label" width={130}
                      tick={{ fill: "var(--text-muted)", fontSize: 12 }} tickLine={false} />
                    <Tooltip contentStyle={TT} formatter={(v) => [`${v}%`, "Importance"]} />
                    <defs>
                      <linearGradient id="importanceGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--accent-1)" />
                        <stop offset="100%" stopColor="#00d4ff" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="importance" radius={[0, 6, 6, 0]}
                      fill="url(#importanceGrad)" maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          </motion.div>
        )}

        {/* ════════════ TAB: MY PREDICTIONS ════════════ */}
        {tab === "history" && (
          <motion.div key="history"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>

            {history.length === 0 ? (
              /* Empty state */
              <div style={{ textAlign: "center", padding: "70px 20px" }}>
                <motion.div
                  animate={{ y: [0,-8,0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  style={{ fontSize: 56, marginBottom: 18 }}>🔮</motion.div>
                <h2 style={{ color: "var(--text)", marginBottom: 8 }}>No predictions yet</h2>
                <p style={{ color: "var(--text-muted)", maxWidth: 340, margin: "0 auto 24px", lineHeight: 1.65 }}>
                  Complete the Predict assessment to get your first burnout score. Every prediction you make is saved here automatically.
                </p>
                <a href="/predict" style={{
                  display: "inline-block", padding: "12px 28px", borderRadius: "var(--r-md)",
                  background: "var(--grad-primary)", color: "#fff", fontWeight: 700,
                  fontSize: 14, textDecoration: "none",
                }}>Take Assessment →</a>
              </div>
            ) : (
              <>
                {/* History stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", marginBottom: 20 }}>
                  <MiniStatCard label="Total Assessments" icon="🔮" value={history.length} color="var(--accent-1)" delay={0}    />
                  <MiniStatCard label="High Risk"          icon="🔥" value={histHigh}        color="#ef4444"         delay={0.07} />
                  <MiniStatCard label="Medium Risk"        icon="⚡" value={histMed}         color="#f59e0b"         delay={0.14} />
                  <MiniStatCard label="Low Risk"           icon="✅" value={histLow}         color="#22c55e"         delay={0.21} />
                  <MiniStatCard label="Day Streak"         icon="🔥" value={streak}          color="#f97316"         delay={0.28} />
                </div>

                {/* Activity heatmap */}
                <HeatmapCalendar history={history} />

                {/* Risk Over Time */}
                {riskTimeline.length >= 2 && (
                  <div className="chart-card" style={{ marginBottom: 20 }}>
                    <h3 className="chart-title">📈 Risk Over Time</h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                      Your burnout risk across all assessments
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={riskTimeline} margin={{ top: 8, right: 16, left: -20, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} />
                        <YAxis
                          domain={[0, 2]} ticks={[0, 1, 2]}
                          tickFormatter={(v) => ["Low", "Med", "High"][v]}
                          tick={{ fill: AXIS, fontSize: 11 }} tickLine={false}
                        />
                        <Tooltip
                          contentStyle={TT}
                          formatter={(v) => [["Low", "Medium", "High"][v], "Risk"]}
                        />
                        <Line
                          type="monotone" dataKey="risk" stroke="var(--accent-1)"
                          strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent-1)", strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Latest prediction banner */}
                {lastPred && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: `${RESULT_COLOR[lastPred.result] || "#7c5cff"}12`,
                      border: `1px solid ${RESULT_COLOR[lastPred.result] || "#7c5cff"}40`,
                      borderLeft: `4px solid ${RESULT_COLOR[lastPred.result] || "#7c5cff"}`,
                      borderRadius: "var(--r-md)", padding: "16px 20px", marginBottom: 20,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 4 }}>
                        Latest Assessment
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                        {RESULT_ICON[lastPred.result]} {lastPred.result} Burnout Risk
                      </div>
                      <div className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Study {lastPred.study}h · Sleep {lastPred.sleep}h · Social {lastPred.social}h · Activity {lastPred.physical}h
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <Badge variant={lastPred.result === "High" ? "danger" : lastPred.result === "Low" ? "success" : "warning"}>
                        {lastPred.result} Risk
                      </Badge>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                        {lastPred.created_at ? lastPred.created_at.slice(0, 16) : "—"}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Charts row */}
                <div className="charts-grid" style={{ marginBottom: 20 }}>

                  {/* Stacked bar: prediction timeline by day */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>📅 Prediction History</h3>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      Your assessments over time, grouped by date
                    </p>
                    {histByDay.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={histByDay}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke={AXIS} fontSize={10} tick={{ fontSize: 10 }} />
                          <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} />
                          <Tooltip contentStyle={TT} />
                          <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
                          <Bar dataKey="High"   stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                          <Bar dataKey="Medium" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                          <Bar dataKey="Low"    stackId="a" fill="#22c55e" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        Not enough data yet — make a few predictions first
                      </div>
                    )}
                  </motion.div>

                  {/* Grouped bar: you vs dataset */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>⚖️ You vs Dataset</h3>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      Your risk profile vs the {s.total.toLocaleString()}-student training dataset
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={compareData}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke={AXIS} fontSize={13} />
                        <YAxis stroke={AXIS} fontSize={12} unit="%" domain={[0,100]} />
                        <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
                        <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
                        <Bar dataKey="dataset" name="Dataset %" fill="#7c5cff" radius={[6,6,0,0]} />
                        <Bar dataKey="yours"   name="Your %"    fill="#00d4ff" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Grouped bar: your daily habits vs dataset averages */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>🧬 Your Habits vs Dataset</h3>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      Your average daily hours vs the dataset population (h/day)
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={habitsCompare}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                        <YAxis stroke={AXIS} fontSize={12} unit="h" domain={[0, "auto"]} />
                        <Tooltip contentStyle={TT} formatter={(v, name) => [`${v}h`, name]} />
                        <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
                        <Bar dataKey="yours"   name="Your avg"    fill="#00d4ff" radius={[6,6,0,0]} />
                        <Bar dataKey="dataset" name="Dataset avg" fill="#7c5cff" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                {/* Recent predictions list */}
                <div className="chart-card">
                  <div className="row-between" style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>🕐 All Predictions</h3>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: "rgba(124,92,255,0.12)", color: "var(--accent-1)",
                    }}>{history.length} total</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 460, overflowY: "auto", paddingRight: 4 }}>
                    {history.map((pred, i) => {
                      const color = RESULT_COLOR[pred.result] || "#7c5cff";
                      return (
                        <motion.div key={pred.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i, 8) * 0.04 }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 14px", borderRadius: "var(--r-md)",
                            background: `${color}0d`,
                            border: `1px solid ${color}30`,
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                              background: `${color}20`, display: "grid", placeItems: "center", fontSize: 18,
                            }}>
                              {RESULT_ICON[pred.result] || "🔮"}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                {pred.result} Burnout Risk
                              </div>
                              <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                                📚 {pred.study}h study · 😴 {pred.sleep}h sleep · 🏃 {pred.physical}h activity · 🤝 {pred.social}h social
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                              {pred.created_at ? pred.created_at.slice(0, 16) : "—"}
                            </div>
                            <div style={{
                              fontSize: 10, fontWeight: 700, marginTop: 4,
                              color: "var(--text-dim)",
                            }}>#{history.length - i}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Insight comparing user to dataset */}
                <div className="charts-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 16 }}>
                  <InsightCard tone={histHigh / (history.length || 1) > 0.5 ? "danger" : "success"}
                    icon={histHigh / (history.length || 1) > 0.5 ? "🔥" : "🌱"}
                    title={histHigh / (history.length || 1) > 0.5 ? "High risk pattern" : "Healthy pattern"}
                    body={histHigh / (history.length || 1) > 0.5
                      ? <>More than half your assessments returned <strong>High risk</strong>. Focus on sleep and reducing study hours — see the Recovery Planner for your personalised steps.</>
                      : <>Most of your assessments show <strong>Low or Medium risk</strong> — you're in better shape than {s.high_pct}% of the training dataset. Keep the habits going.</>
                    }
                  />
                  <InsightCard tone="info" icon="📊" title="Compared to dataset"
                    body={<>The training dataset is <strong>{s.high_pct}% High</strong>, <strong>{s.moderate_pct}% Moderate</strong>, <strong>{s.low_pct}% Low</strong>. Your personal breakdown is <strong>{history.length ? Math.round((histHigh/history.length)*100) : 0}% High</strong> across {history.length} assessment{history.length !== 1 ? "s" : ""}.</>}
                  />
                </div>

              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
