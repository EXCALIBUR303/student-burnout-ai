import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import API_BASE from "../utils/api";
import Badge from "../components/Badge";
import AnimatedNumber from "../components/AnimatedNumber";

// ── helpers ──────────────────────────────────────────────────────────────────
const RISK_NUM  = { Low: 1, Medium: 2, High: 3 };
const RISK_COL  = { 1: "#22c55e", 2: "#f59e0b", 3: "#ef4444" };
const RISK_LABEL= { 1: "Low", 2: "Medium", 3: "High" };

const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return iso; }
};

const fmtDay = (iso) => {
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return iso; }
};

// Compute streak of consecutive days (most recent first)
const getStreak = (rows) => {
  if (!rows.length) return 0;
  const days = [...new Set(rows.map((r) => fmtDay(r.created_at)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    if ((prev - curr) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
};

// Build last-60-days heatmap grid
const buildHeatmap = (rows) => {
  const map = {};
  rows.forEach((r) => {
    const d = fmtDay(r.created_at);
    map[d] = RISK_NUM[r.result] || 1;
  });
  const days = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, risk: map[d] || null });
  }
  return days;
};

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const risk = payload[0]?.value;
  return (
    <div style={{ background: "#1a1035", border: "1px solid #ffffff22",
      borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#999", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: RISK_COL[risk] }}>{RISK_LABEL[risk]} Risk</div>
    </div>
  );
};

// ── component ─────────────────────────────────────────────────────────────────
function Progress() {
  const [history, setHistory]   = useState([]);
  const [insights, setInsights] = useState(null);
  const [cohort,  setCohort]    = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      axios.get(`${API_BASE}/history`, { headers }),
      axios.get(`${API_BASE}/insights`, { headers }),
      axios.get(`${API_BASE}/cohort`,  { headers }),
    ])
      .then(([h, i, c]) => {
        setHistory(h.data || []);
        setInsights(i.data || null);
        setCohort(c.data || null);
      })
      .catch(() => setError("Could not load your history. Try again later."))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() =>
    [...history].reverse().map((r, i) => ({
      name:  fmtDate(r.created_at),
      risk:  RISK_NUM[r.result] || 1,
      index: i + 1,
    })),
  [history]);

  const streak   = useMemo(() => getStreak(history), [history]);
  const heatmap  = useMemo(() => buildHeatmap(history), [history]);
  const latest   = history[0];
  const trend    = insights?.trend;

  const trendVariant = trend?.direction === "improving" ? "success"
    : trend?.direction === "worsening" ? "danger" : "default";
  const trendIcon = trend?.direction === "improving" ? "📈"
    : trend?.direction === "worsening" ? "📉" : "➡️";

  // Percentile from real /cohort endpoint — % of users with worse risk than you
  const cohortPct = cohort?.user_rank_pct ?? null;

  // ── empty state ───────────────────────────────────────────────────────────
  if (!loading && !error && history.length === 0) {
    return (
      <div className="dashboard-container" style={{ maxWidth: 720 }}>
        <h1 className="dashboard-title">📈 Your Progress</h1>
        <motion.div className="chart-card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "60px 32px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
          <h2 style={{ marginBottom: 12 }}>No assessments yet</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>
            Take your first assessment to start tracking your burnout risk over time.
          </p>
          <a href="/predict">
            <button style={{ width: "auto", padding: "13px 32px" }}>
              Take Assessment →
            </button>
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: 820 }}>
      <h1 className="dashboard-title">📈 Your Progress</h1>
      <p className="dashboard-subtitle">
        {history.length} assessment{history.length !== 1 ? "s" : ""} tracked
        {streak > 1 && ` · 🔥 ${streak}-day streak`}
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          Loading your history…
        </div>
      )}

      {error && (
        <div className="chart-card" style={{ color: "var(--danger)", textAlign: "center", padding: 32 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Stat row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              {
                icon: "🎯", label: "Latest risk",
                value: latest ? latest.result : "—",
                color: latest ? RISK_COL[RISK_NUM[latest.result]] : "var(--text)",
                isText: true,
              },
              {
                icon: "🔥", label: "Day streak",
                value: streak, color: streak >= 3 ? "#f59e0b" : "var(--text)",
              },
              {
                icon: "📋", label: "Total checks",
                value: history.length, color: "var(--accent-1)",
              },
              {
                icon: "📊", label: "Trend",
                value: trend ? trend.direction : "not enough data",
                color: trendVariant === "success" ? "#22c55e"
                  : trendVariant === "danger" ? "#ef4444" : "var(--text-muted)",
                isText: true,
              },
            ].map((s, i) => (
              <motion.div key={s.label} className="chart-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                  {s.icon} {s.label}
                </div>
                <div style={{ fontSize: s.isText ? 18 : 28, fontWeight: 800,
                  color: s.color, textTransform: s.isText ? "capitalize" : "none" }}>
                  {s.isText ? s.value : <AnimatedNumber value={s.value} />}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Trend badges ── */}
          {trend && (
            <motion.div className="chart-card"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", marginBottom: 16 }}>
              <Badge variant={trendVariant}>{trendIcon} {trend.direction}</Badge>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {trend.direction === "improving"
                  ? "Your risk level is decreasing — keep going!"
                  : trend.direction === "worsening"
                  ? "Risk is climbing — consider making some changes."
                  : "Your risk has been stable across your last assessments."}
              </span>
              {cohortPct && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                  Lower risk than <strong style={{ color: "var(--accent-1)" }}>{100 - cohortPct}%</strong> of users
                </span>
              )}
            </motion.div>
          )}

          {/* ── Area chart ── */}
          {chartData.length > 1 && (
            <motion.div className="chart-card"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 20, fontSize: 15 }}>Risk over time</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c5cff" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c5cff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} />
                  <YAxis domain={[1, 3]} ticks={[1, 2, 3]}
                    tickFormatter={(v) => RISK_LABEL[v]}
                    tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="risk"
                    stroke="#7c5cff" strokeWidth={2.5}
                    fill="url(#riskGrad)"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return <circle key={`dot-${payload.index}`} cx={cx} cy={cy} r={5}
                        fill={RISK_COL[payload.risk]} stroke="#1a1035" strokeWidth={2} />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {chartData.length === 1 && (
            <div className="chart-card" style={{ marginBottom: 16, padding: 24,
              textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              📊 Take one more assessment to see your trend chart
            </div>
          )}

          {/* ── Heatmap calendar (last 60 days) ── */}
          <motion.div className="chart-card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>60-day activity</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {heatmap.map((d) => (
                <div key={d.date}
                  title={`${d.date}: ${d.risk ? RISK_LABEL[d.risk] + " Risk" : "No assessment"}`}
                  style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: d.risk ? RISK_COL[d.risk] : "var(--surface-strong)",
                    opacity: d.risk ? 1 : 0.35,
                    transition: "transform 0.15s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => e.target.style.transform = "scale(1.4)"}
                  onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11,
              color: "var(--text-muted)", alignItems: "center" }}>
              <span>Less</span>
              {[null, 1, 2, 3].map((r, i) => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: r ? RISK_COL[r] : "var(--surface-strong)",
                  opacity: r ? 1 : 0.35,
                }} />
              ))}
              <span>High risk</span>
            </div>
          </motion.div>

          {/* ── Recent history list ── */}
          <motion.div className="chart-card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Recent assessments</h3>
            {history.slice(0, 10).map((r, i) => (
              <motion.div key={r.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: i < 9 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {fmtDate(r.created_at)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    😴 {r.sleep ?? "—"}h · 📚 {r.study ?? "—"}h
                  </div>
                  <span style={{
                    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: r.result === "High" ? "#ef444422"
                      : r.result === "Low" ? "#22c55e22" : "#f59e0b22",
                    color: r.result === "High" ? "#ef4444"
                      : r.result === "Low" ? "#22c55e" : "#f59e0b",
                  }}>
                    {r.result}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}

export default Progress;
