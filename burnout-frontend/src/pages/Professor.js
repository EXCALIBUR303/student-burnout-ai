import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import API_BASE from "../utils/api";
import AnimatedNumber from "../components/AnimatedNumber";

// ── constants ─────────────────────────────────────────────────────────────────
const RISK_COLORS = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444" };
const BAR_COLORS  = ["#7c5cff", "#00d4ff", "#22c55e", "#f59e0b", "#ef4444", "#f472b6"];

const TT_STYLE = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
  fontSize: 12,
  padding: "8px 12px",
};

// ── tiny sub-components ───────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, delay = 0 }) => (
  <motion.div
    className="chart-card"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{ padding: "18px 20px" }}
  >
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: color || "var(--text)" }}>
      <AnimatedNumber value={typeof value === "number" ? value : 0} />
      {typeof value === "string" && value}
    </div>
  </motion.div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 4,
    color: "var(--text)", letterSpacing: "-0.01em" }}>
    {children}
  </h2>
);

// ── main component ────────────────────────────────────────────────────────────
export default function Professor() {
  const [cohort, setCohort]   = useState(null);
  const [stats,  setStats]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const token   = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      axios.get(`${API_BASE}/cohort`, { headers }).catch(() => ({ data: null })),
      axios.get(`${API_BASE}/stats`,  { headers }).catch(() => ({ data: null })),
    ])
      .then(([c, s]) => {
        if (!c.data && !s.data) {
          setError("Could not load dashboard data. Backend may be cold — try refreshing in 10s.");
        } else {
          setCohort(c.data);
          setStats(s.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── derived data ────────────────────────────────────────────────────────────
  const pieData = cohort ? [
    { name: "Low",    value: cohort.low_count    || 0 },
    { name: "Medium", value: cohort.medium_count || 0 },
    { name: "High",   value: cohort.high_count   || 0 },
  ] : [];

  const trainingPie = stats ? [
    { name: "Low",    value: stats.low      || 0 },
    { name: "Medium", value: stats.moderate || 0 },
    { name: "High",   value: stats.high     || 0 },
  ] : [];

  // ── loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-container" style={{ maxWidth: 900, textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <p style={{ color: "var(--text-muted)", marginTop: 16 }}>Loading dashboard data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container" style={{ maxWidth: 900 }}>
        <h1 className="dashboard-title">🎓 Professor Dashboard</h1>
        <div className="chart-card" style={{ color: "var(--danger)", textAlign: "center", padding: 40 }}>
          {error}
          <br />
          <button style={{ marginTop: 20, width: "auto", padding: "10px 28px" }}
            onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ maxWidth: 920 }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="dashboard-title">🎓 Professor Dashboard</h1>
        <p className="dashboard-subtitle" style={{ marginBottom: 24 }}>
          Anonymous aggregate view — no individual student data is stored or shown
        </p>
      </motion.div>

      {/* ── SECTION 1: Live App Stats ── */}
      <SectionTitle>📡 Live App Data ({cohort?.total ?? 0} predictions recorded)</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon="🟢" label="Low risk"    value={cohort?.low_count    ?? 0} color="#22c55e" delay={0.05} />
        <StatCard icon="🟡" label="Medium risk" value={cohort?.medium_count ?? 0} color="#f59e0b" delay={0.10} />
        <StatCard icon="🔴" label="High risk"   value={cohort?.high_count   ?? 0} color="#ef4444" delay={0.15} />
        <StatCard icon="📋" label="Total checks" value={cohort?.total ?? 0} color="var(--accent-1)" delay={0.20} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Live pie */}
        <motion.div className="chart-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <SectionTitle>App Users — Risk Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={12}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pct breakdown */}
        <motion.div className="chart-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionTitle>Risk % Breakdown</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            {[
              { label: "Low",    pct: cohort?.low_pct    ?? 0, color: "#22c55e" },
              { label: "Medium", pct: cohort?.medium_pct ?? 0, color: "#f59e0b" },
              { label: "High",   pct: cohort?.high_pct   ?? 0, color: "#ef4444" },
            ].map((r) => (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: r.color }}>{r.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{r.pct}%</span>
                </div>
                <div style={{ background: "var(--surface-strong)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                    style={{ height: "100%", background: r.color, borderRadius: 999 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--surface-strong)",
            borderRadius: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text)" }}>Interpretation guide</strong><br />
            🔴 High risk students may benefit from counselling referral.<br />
            🟡 Medium risk students would benefit from sleep/study habit workshops.<br />
            🟢 Low risk students can serve as peer mentors.
          </div>
        </motion.div>
      </div>

      {/* ── SECTION 2: Training Dataset Benchmarks ── */}
      {stats && (
        <>
          <SectionTitle>📚 Cohort Benchmarks (Training Dataset — {stats.total?.toLocaleString()} students)</SectionTitle>

          {/* Averages row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { icon: "📚", label: "Avg study",    value: `${stats.avg_study}h`, color: "#7c5cff" },
              { icon: "😴", label: "Avg sleep",    value: `${stats.avg_sleep}h`, color: "#00d4ff" },
              { icon: "🏃", label: "Avg physical", value: `${stats.avg_physical}h`, color: "#22c55e" },
              { icon: "👥", label: "Avg social",   value: `${stats.avg_social}h`,   color: "#f59e0b" },
              { icon: "🏅", label: "Avg GPA",      value: stats.avg_gpa, color: "#f472b6" },
            ].map((s, i) => (
              <motion.div key={s.label} className="chart-card"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.35 }}
                style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 6 }}>
                  {s.icon} {s.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
                  {typeof s.value === "number"
                    ? <AnimatedNumber value={s.value} decimals={2} />
                    : s.value}
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {/* Study distribution */}
            {stats.study_dist?.length > 0 && (
              <motion.div className="chart-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <SectionTitle>Daily Study Hours Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.study_dist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.study_dist.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Sleep distribution */}
            {stats.sleep_dist?.length > 0 && (
              <motion.div className="chart-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                <SectionTitle>Daily Sleep Hours Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.sleep_dist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.sleep_dist.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {/* Training dataset risk pie */}
            <motion.div className="chart-card"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <SectionTitle>Training Dataset — Risk Split</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={trainingPie} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={11}>
                    {trainingPie.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TT_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* GPA by stress */}
            {stats.gpa_by_stress?.length > 0 && (
              <motion.div className="chart-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                <SectionTitle>GPA by Stress Level</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.gpa_by_stress} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="level" tick={{ fontSize: 12, fill: "#666" }} tickLine={false} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="avg_gpa" name="Avg GPA" radius={[4, 4, 0, 0]}>
                      {stats.gpa_by_stress.map((entry) => (
                        <Cell key={entry.level} fill={RISK_COLORS[entry.level] || "#7c5cff"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* ── SECTION 3: Privacy notice ── */}
      <motion.div className="chart-card"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
        style={{ padding: "16px 20px", background: "rgba(124,92,255,0.06)",
          border: "1px solid rgba(124,92,255,0.2)", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--accent-1)" }}>🔒 Privacy guarantee</strong> — this dashboard shows
          only anonymous aggregate data. Individual student predictions are not visible to any professor
          or admin. No names, emails, or personal identifiers are stored alongside assessment results.
          All data is used solely to improve student wellbeing outcomes at Woxsen University.
        </div>
      </motion.div>
    </div>
  );
}
