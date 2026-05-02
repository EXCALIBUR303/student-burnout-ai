import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import API_BASE from "../utils/api";
import "../App.css";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import Badge from "../components/Badge";
import { useToast } from "../context/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: "first_step",   name: "First Step",       icon: "👣", desc: "Complete 1 step",    req: (c) => c.completedCount >= 1 },
  { id: "halfway",      name: "Halfway There",    icon: "🚶", desc: "Complete 50%",       req: (c) => c.progress >= 50 },
  { id: "recovered",    name: "Fully Recovered",  icon: "🏆", desc: "Complete all steps", req: (c) => c.progress >= 100 },
  { id: "streak_3",     name: "3-Day Streak",     icon: "🔥", desc: "3 days in a row",    req: (c) => c.streak >= 3 },
  { id: "streak_7",     name: "Week Warrior",     icon: "⚡", desc: "7-day streak",       req: (c) => c.streak >= 7 },
  { id: "low_champion", name: "Low Stress Champ", icon: "🌱", desc: "Low burnout result", req: (c) => c.result === "Low Burnout" },
];

const XP_PER_STEP = 100;
const XP_PER_STREAK_DAY = 25;

const FALLBACK_STEPS = {
  "High Burnout":   ["Fix Sleep Urgently", "Reduce Workload", "Daily Meditation", "Talk to Someone", "Track Mood"],
  "Medium Burnout": ["Improve Sleep", "Manage Tasks", "Exercise Routine", "Social Break", "Track Mood"],
  "Low Burnout":    ["Maintain Sleep", "Stay Active", "Keep Exercising", "Socialize Weekly", "Track Mood"],
};

// Per-step how-to tips
const STEP_TIPS = {
  // High burnout
  "Fix Sleep Urgently":     ["Set a hard bedtime alarm 30 min before you want to be asleep.", "Put your phone in another room — blue light blocks melatonin.", "Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Do 4 cycles."],
  "Reduce Workload":        ["Write every pending task on paper and cross out 30% of them.", "Say no to one new commitment this week.", "Block 2-hour 'no-task' windows in your daily schedule."],
  "Daily Meditation":       ["Start with just 5 minutes — use Headspace or YouTube 'body scan meditation'.", "Same time each day trains your nervous system faster.", "Even slow, conscious breathing for 5 min counts — no app needed."],
  "Talk to Someone":        ["Text one person you trust: 'Hey, can we catch up soon?'", "Your university likely has free counselling — worth one session.", "You don't need to explain everything — just connection helps."],
  "Track Mood":             ["Each night rate your mood 1-10 and write one sentence about it.", "Patterns emerge in 7 days — look for what correlates with low scores.", "Use a notes app or sticky note on your desk."],
  // Medium burnout
  "Improve Sleep":          ["Shift bedtime 15 min earlier every 3 days — gradual beats sudden.", "Avoid caffeine after 2 pm — it has a 5-hour half-life.", "Keep room temperature around 18°C for optimal sleep depth."],
  "Manage Tasks":           ["Use time-blocking: assign each task a specific 45-min window.", "Prioritise with the Eisenhower matrix — urgent vs important.", "Review tomorrow's tasks each evening so mornings start focused."],
  "Exercise Routine":       ["Even a 20-min walk counts — no gym needed to start.", "Exercise in the morning to avoid it being bumped by evening tasks.", "Pair exercise with something enjoyable (podcast, music) so you look forward to it."],
  "Social Break":           ["Schedule one social activity this week — even a 30-min coffee.", "Turn study sessions social by working alongside a friend.", "Small regular interactions beat occasional large social events."],
  // Low burnout / maintenance
  "Maintain Sleep":         ["Track sleep consistency — same wake time is more important than duration.", "A 20-min nap before 3 pm can supplement without disrupting night sleep.", "Keep your weekend sleep schedule within 1 hour of your weekday schedule."],
  "Stay Active":            ["Walk or cycle to class when possible — combines transport and exercise.", "Aim for 7,000+ steps daily as a base target.", "Stretching for 10 min after study sessions reduces tension."],
  "Keep Exercising":        ["Vary your exercise to prevent boredom — mix cardio and strength.", "Track workouts to see progress — motivation follows evidence of improvement.", "Rest days are part of the programme — they're not skipped days."],
  "Socialize Weekly":       ["Block one recurring social slot each week so it's non-negotiable.", "Quality beats quantity — one meaningful conversation > a crowded event.", "Being around people without a specific agenda recharges you."],
  // Recovery Complete placeholder handled by completion state
};

const DAILY_TIPS = [
  { icon: "💡", tip: "Your brain needs downtime to consolidate memories. A 10-min walk between study blocks is a study technique, not a break from studying." },
  { icon: "🧠", tip: "Working memory holds only 4–7 items at once. Write tasks down immediately — it frees up cognitive bandwidth for actual thinking." },
  { icon: "💤", tip: "One extra hour of sleep improves reaction time, mood, and exam performance more than one extra hour of revision." },
  { icon: "🌿", tip: "Five minutes of natural light in the morning resets your cortisol cycle and improves alertness for the entire day." },
  { icon: "🍎", tip: "A blood sugar crash feels like anxiety and lack of focus. Eating every 4 hours is a cognitive performance strategy." },
  { icon: "📱", tip: "Every phone notification interrupts focus for 23 minutes on average. One focused hour beats three distracted ones." },
  { icon: "🏃", tip: "20 minutes of moderate exercise immediately improves attention, working memory, and processing speed for 2-3 hours after." },
  { icon: "🤝", tip: "Explaining a concept to someone else is the single most effective way to identify what you don't actually understand yet." },
];

// ─── ML Insight ───────────────────────────────────────────────────────────────

function buildMLInsight(result, features, answers) {
  if (!features) return `Your plan is tailored to your **${result}** level. Complete each step to build better habits and earn XP.`;

  const { study_hours_per_day: study, sleep_hours_per_day: sleep,
          physical_activity_hours_per_day: physical, social_hours_per_day: social } = features;

  const parts = [];
  if (result === "High Burnout") {
    parts.push(`You're studying **~${study}h/day** with only **~${sleep}h of sleep** — that's the core burnout pattern driving your result.`);
    if (physical < 1) parts.push("Physical activity is very low. Even a 20-min daily walk measurably reduces cortisol within 3 days.");
    if (social < 1)   parts.push("Social isolation is amplifying stress. Schedule one low-effort social touchpoint this week.");
  } else if (result === "Medium Burnout") {
    parts.push(`Study load of **~${study}h** and sleep of **~${sleep}h** are slightly off balance.`);
    parts.push("Small, consistent improvements to sleep and activity will move you to Low risk within 2–3 weeks.");
  } else {
    parts.push(`Your habits look healthy — **${study}h study** with **${sleep}h sleep** is well-balanced.`);
    parts.push("Use this plan to maintain and build resilience before exam season.");
  }
  if (answers && answers[5] > 7) parts.push("High anxiety detected — add a 5-min breathing exercise after study sessions.");
  if (answers && answers[4] > 7) parts.push("High screen time — a 10 pm screen curfew will protect your sleep quality.");

  return parts.join(" ");
}

// Render **bold** segments in text
const renderBold = (text) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
};

// ─── Component ────────────────────────────────────────────────────────────────

function Flowchart() {
  const { toast } = useToast();

  const [nodes, setNodes]         = useState([]);
  const [edges, setEdges]         = useState([]);
  const [completed, setCompleted] = useState([]);
  const [streak, setStreak]       = useState(0);
  const [unlocked, setUnlocked]   = useState([]);
  const [planSteps, setPlanSteps] = useState([]);
  const [planLevel, setPlanLevel] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [expandedStep, setExpandedStep] = useState(null);   // which step has tips open
  const [dailyTip] = useState(() => DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length]);
  const [showMediumPopup, setShowMediumPopup] = useState(() => {
    const result = localStorage.getItem("burnoutResult") || "";
    return result === "Medium Burnout" && !sessionStorage.getItem("mediumPopupDismissed");
  });

  const result   = localStorage.getItem("burnoutResult")  || "Low Burnout";
  const risk     = parseInt(localStorage.getItem("burnoutRisk") || "0");
  const features = JSON.parse(localStorage.getItem("burnoutFeatures") || "null");
  const answers  = JSON.parse(localStorage.getItem("burnoutAnswers")  || "null");

  const progress    = nodes.length === 0 ? 0 : Math.round((completed.length / nodes.length) * 100);
  const xp          = completed.length * XP_PER_STEP + streak * XP_PER_STREAK_DAY;
  const level       = Math.floor(xp / 500) + 1;
  const xpIntoLevel = xp % 500;
  const xpToNext    = 500 - xpIntoLevel;

  // Next uncompleted step for "Today's Focus" card
  const nextStepIndex = planSteps.findIndex((_, i) => !completed.includes((i + 2).toString()));
  const nextStep      = nextStepIndex !== -1 ? planSteps[nextStepIndex] : null;
  const nextNodeId    = nextStepIndex !== -1 ? (nextStepIndex + 2).toString() : null;

  const styleFor = useCallback((id, completedList) => {
    const isDone = completedList.includes(id);
    return {
      background: isDone ? "linear-gradient(135deg, #22c55e, #10b981)" : "linear-gradient(135deg, #7c5cff, #00d4ff)",
      color: "#fff",
      padding: "12px 18px",
      borderRadius: 12,
      border: isDone ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.15)",
      fontWeight: 600,
      fontSize: 13,
      boxShadow: isDone ? "0 4px 12px rgba(34,197,94,0.4)" : "0 4px 12px rgba(124,92,255,0.3)",
      cursor: "pointer",
    };
  }, []);

  const buildFlow = useCallback((steps, savedCompleted) => {
    const baseNodes = steps.map((step, i) => ({
      id: (i + 1).toString(),
      data: { label: step },
      position: { x: 250, y: i * 110 },
      style: styleFor((i + 1).toString(), savedCompleted),
    }));
    setNodes(baseNodes);
    setEdges(
      baseNodes.slice(0, -1).map((n, i) => ({
        id: `e${i}`,
        source: n.id,
        target: baseNodes[i + 1].id,
        animated: true,
        style: { stroke: "rgba(124,92,255,0.6)", strokeWidth: 2 },
      }))
    );
  }, [styleFor]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("completedSteps")) || [];
    setCompleted(saved);

    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("lastActiveDate");
    let currentStreak = parseInt(localStorage.getItem("streak")) || 0;
    if (lastDate !== today) {
      currentStreak += 1;
      localStorage.setItem("streak", currentStreak);
      localStorage.setItem("lastActiveDate", today);
    }
    setStreak(currentStreak);

    axios.post(`${API_BASE}/plan`, { risk })
      .then(({ data }) => {
        const steps = data.plan?.steps || [];
        const lv    = data.plan?.level || result;
        setPlanSteps(steps);
        setPlanLevel(lv);
        const fullSteps = ["🚀 Start", ...steps, "✅ Recovery Complete"];
        buildFlow(fullSteps, saved);
      })
      .catch(() => {
        const fallback = FALLBACK_STEPS[result] || FALLBACK_STEPS["Low Burnout"];
        setPlanSteps(fallback);
        setPlanLevel(result);
        const fullSteps = ["🚀 Start", ...fallback, "✅ Recovery Complete"];
        buildFlow(fullSteps, saved);
      })
      .finally(() => setLoadingPlan(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNodeClick = (_, node) => {
    if (completed.includes(node.id)) return;
    const updated = [...completed, node.id];
    setCompleted(updated);
    localStorage.setItem("completedSteps", JSON.stringify(updated));
    setNodes((prev) => prev.map((n) => ({ ...n, style: styleFor(n.id, updated) })));
    toast.success(`+${XP_PER_STEP} XP earned`, node.data.label);
  };

  const markStep = (nodeId, stepLabel) => {
    if (completed.includes(nodeId)) return;
    const updated = [...completed, nodeId];
    setCompleted(updated);
    localStorage.setItem("completedSteps", JSON.stringify(updated));
    setNodes((prev) => prev.map((n) => ({ ...n, style: styleFor(n.id, updated) })));
    toast.success(`+${XP_PER_STEP} XP earned`, stepLabel);
  };

  useEffect(() => {
    const ctx = { completedCount: completed.length, progress, streak, result };
    const earned    = ACHIEVEMENTS.filter((a) => a.req(ctx)).map((a) => a.id);
    const announced = JSON.parse(localStorage.getItem("announcedBadges") || "[]");
    const fresh     = earned.filter((id) => !announced.includes(id));
    fresh.forEach((id) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      toast.success(`${ach.icon} Badge unlocked`, ach.name);
    });
    if (fresh.length > 0)
      localStorage.setItem("announcedBadges", JSON.stringify([...announced, ...fresh]));
    if (earned.length !== unlocked.length) setUnlocked(earned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, progress, streak]);

  const handleReset = () => {
    setCompleted([]);
    localStorage.removeItem("completedSteps");
    localStorage.removeItem("announcedBadges");
    setNodes((prev) => prev.map((n) => ({ ...n, style: styleFor(n.id, []) })));
    toast.info("Progress reset", "Starting fresh");
  };

  const variant   = result === "High Burnout" ? "danger" : result === "Medium Burnout" ? "warning" : "success";
  const mlInsight = buildMLInsight(result, features, answers);

  // Accent colours per burnout level
  const accentColor = result === "High Burnout" ? "#ef4444"
    : result === "Medium Burnout" ? "#f59e0b" : "#22c55e";
  const accentBg = result === "High Burnout" ? "rgba(239,68,68,0.08)"
    : result === "Medium Burnout" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";

  return (
    <><div className="dashboard-container">

      {/* ── Header ── */}
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="dashboard-title">Recovery Planner</h1>
          <p className="dashboard-subtitle">Complete steps to earn XP, build streaks, and unlock badges.</p>
        </div>
        <Badge variant={variant}>{result}</Badge>
      </div>

      {/* ── Counsellor Banner (High Burnout — recommended) ── */}
      {result === "High Burnout" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: "var(--r-lg)",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderLeft: "4px solid #ef4444",
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "rgba(239,68,68,0.15)", border: "2px solid #ef4444",
              display: "grid", placeItems: "center", fontSize: 22,
            }}>🧑‍⚕️</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 4 }}>
                ✦ Recommended for You
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                Speaking with a counsellor can help right now
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                Based on your High burnout result, we recommend a free confidential session with one of Woxsen's wellness counsellors. No referral needed — book directly.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {/* Dr. Poorva Shinde */}
            <a
              href="https://calendly.com/wellness-centre-ryu/counselling"
              target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(239,68,68,0.2)" }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--bg-elevated)", borderRadius: "var(--r-md)",
                  border: "1px solid rgba(239,68,68,0.25)", padding: "14px 16px",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#ef4444,#f97316)",
                  display: "grid", placeItems: "center", fontSize: 18, color: "#fff",
                }}>👩‍⚕️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Dr. Poorva Shinde</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Director — Wellness</div>
                </div>
                <div style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: "rgba(239,68,68,0.12)", color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)", flexShrink: 0,
                }}>
                  Book →
                </div>
              </motion.div>
            </a>

            {/* Ms. Mohua Das */}
            <a
              href="https://calendly.com/mohua-das-woxsen/new-meeting"
              target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(239,68,68,0.2)" }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--bg-elevated)", borderRadius: "var(--r-md)",
                  border: "1px solid rgba(239,68,68,0.25)", padding: "14px 16px",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#7c5cff,#ef4444)",
                  display: "grid", placeItems: "center", fontSize: 18, color: "#fff",
                }}>👩‍💼</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>Ms. Mohua Das</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Wellness Program Officer</div>
                </div>
                <div style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: "rgba(239,68,68,0.12)", color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)", flexShrink: 0,
                }}>
                  Book →
                </div>
              </motion.div>
            </a>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>📧</span>
            <span>Queries: <strong style={{ color: "var(--text-muted)" }}>wellness.centre@woxsen.edu.in</strong></span>
            <span style={{ marginLeft: 12 }}>📞</span>
            <span><strong style={{ color: "var(--text-muted)" }}>9049980927</strong></span>
          </div>
        </motion.div>
      )}

      {/* ── Today's Focus card ── */}
      {!loadingPlan && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: "var(--r-lg)",
            background: progress >= 100 ? "rgba(34,197,94,0.1)" : accentBg,
            border: `1px solid ${progress >= 100 ? "#22c55e" : accentColor}40`,
            borderLeft: `4px solid ${progress >= 100 ? "#22c55e" : accentColor}`,
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          {/* Top row: icon + label + step counter */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: progress < 100 && nextStep ? 14 : 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: progress >= 100 ? "rgba(34,197,94,0.2)" : "rgba(124,92,255,0.15)",
              border: `2px solid ${progress >= 100 ? "#22c55e" : "var(--accent-1)"}`,
              display: "grid", placeItems: "center", fontSize: 22,
            }}>
              {progress >= 100 ? "🏆" : "🎯"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 4 }}>
                Today's Focus
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
                {progress >= 100 ? "All steps complete — excellent work! 🎉" : (nextStep || "All steps done!")}
              </div>
            </div>
            {progress < 100 && nextStep && (
              <div style={{
                fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, flexShrink: 0,
                background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}40`,
              }}>
                {nextStepIndex + 1} / {planSteps.length}
              </div>
            )}
          </div>

          {/* Bottom row: XP info + Mark done button */}
          {progress < 100 && nextStep && nextNodeId && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 58 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                +{XP_PER_STEP} XP on completion
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => markStep(nextNodeId, nextStep)}
                style={{
                  padding: "9px 20px", borderRadius: "var(--r-md)", border: "none",
                  background: "var(--grad-primary)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(124,92,255,0.35)",
                }}
              >
                Mark done ✓
              </motion.button>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        {[
          { label: "Level",    icon: "⭐", value: level },
          { label: "Total XP", icon: "✨", value: xp },
          { label: "Streak",   icon: "🔥", value: `${streak}d` },
          { label: "Progress", icon: "📈", value: `${progress}%` },
        ].map((s) => (
          <motion.div key={s.label} className="stat-card" whileHover={{ y: -4 }}>
            <div className="stat-head">
              <span className="stat-label">{s.label}</span>
              <span className="stat-icon">{s.icon}</span>
            </div>
            <div className="stat-value mono">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* ── XP bar ── */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <div>
            <h3 style={{ marginBottom: 2 }}>Level {level}</h3>
            <p style={{ fontSize: 13, color: "var(--text-dim)" }}>{xpToNext} XP to level {level + 1}</p>
          </div>
          <span className="mono" style={{ color: "var(--text-muted)", fontSize: 13 }}>{xpIntoLevel} / 500</span>
        </div>
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(xpIntoLevel / 500) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Daily Tip ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="chart-card"
        style={{
          background: "var(--surface)", borderLeft: "4px solid var(--accent-1)",
          padding: "14px 18px", marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{dailyTip.icon}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent-1)", marginBottom: 5 }}>
            Daily Tip
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.65, margin: 0 }}>{dailyTip.tip}</p>
        </div>
      </motion.div>

      {/* ── Recovery Steps with expandable tips ── */}
      {planSteps.length > 0 && (
        <div className="chart-card" style={{ marginBottom: 20 }}>
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ marginBottom: 3 }}>{planLevel || result} — Your Recovery Steps</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Tap a step to expand how-to tips. Click the circle to mark complete.</p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
              background: accentBg, color: accentColor, border: `1px solid ${accentColor}40`,
            }}>
              {completed.filter((id) => {
                const idx = parseInt(id) - 2;
                return idx >= 0 && idx < planSteps.length;
              }).length} / {planSteps.length} done
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {planSteps.map((step, i) => {
              const nodeId   = (i + 2).toString();
              const done     = completed.includes(nodeId);
              const isOpen   = expandedStep === i;
              const tips     = STEP_TIPS[step] || ["Work through this step at your own pace.", "Consistency over intensity — small daily actions compound.", "If you're unsure how to start, try just 5 minutes today."];
              const isNext   = nextStepIndex === i;

              return (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    borderRadius: "var(--r-md)",
                    background: done ? "rgba(34,197,94,0.06)" : isNext ? accentBg : "var(--surface)",
                    border: `1px solid ${done ? "#22c55e40" : isNext ? `${accentColor}40` : "var(--border)"}`,
                    overflow: "hidden",
                  }}
                >
                  {/* Step row */}
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "13px 16px", cursor: "pointer",
                    }}
                    onClick={() => setExpandedStep(isOpen ? null : i)}
                  >
                    {/* Completion circle */}
                    <div
                      onClick={(e) => { e.stopPropagation(); markStep(nodeId, step); }}
                      style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: done ? "linear-gradient(135deg,#22c55e,#10b981)" : "var(--bg)",
                        border: done ? "none" : `2px solid ${isNext ? accentColor : "var(--border-strong)"}`,
                        display: "grid", placeItems: "center",
                        fontSize: done ? 14 : 12, fontWeight: 700,
                        color: done ? "#fff" : isNext ? accentColor : "var(--text-muted)",
                        cursor: done ? "default" : "pointer",
                        transition: "all 0.2s",
                      }}
                      title={done ? "Completed" : "Mark as done"}
                    >
                      {done ? "✓" : i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: done ? "var(--text-muted)" : "var(--text)",
                        textDecoration: done ? "line-through" : "none",
                        marginBottom: 2,
                      }}>
                        {step}
                      </div>
                      {isNext && !done && (
                        <div style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>
                          ← Your next focus
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {!done && (
                        <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>
                          +{XP_PER_STEP} XP
                        </span>
                      )}
                      {done && <span style={{ fontSize: 16 }}>✅</span>}
                      <span style={{
                        fontSize: 16, color: "var(--text-dim)",
                        transform: isOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}>
                        ›
                      </span>
                    </div>
                  </div>

                  {/* Expandable tips */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{
                          padding: "0 16px 14px 60px",
                          borderTop: "1px solid var(--border)",
                          paddingTop: 12,
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.07em", color: "var(--accent-1)", marginBottom: 10,
                          }}>
                            How to do this
                          </div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                            {tips.map((tip, ti) => (
                              <li key={ti} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <span style={{
                                  width: 18, height: 18, borderRadius: "50%", background: "var(--accent-1)", flexShrink: 0,
                                  color: "#fff", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center", marginTop: 2,
                                }}>{ti + 1}</span>
                                <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Flow graph ── */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 18px 0", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 4px" }}>Recovery Flow</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px" }}>
            Click nodes to mark them complete. Green = done.
          </p>
        </div>
        <div style={{ height: 500 }}>
          {loadingPlan ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-muted)", gap: 10 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <span style={{ fontSize: 14 }}>Loading your personalised flow...</span>
            </div>
          ) : (
            <ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={handleNodeClick} proOptions={{ hideAttribution: true }}>
              <Background color="var(--border)" gap={20} />
              <Controls />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* ── Recovery progress bar ── */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Overall Progress</h3>
          <button className="btn-ghost" onClick={handleReset} style={{ width: "auto", padding: "6px 14px", fontSize: 12 }}>
            Reset
          </button>
        </div>
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <span className="mono" style={{ color: "var(--text)", fontWeight: 700 }}>{completed.length} / {nodes.length}</span>{" "}
            <span style={{ color: "var(--text-muted)" }}>steps completed</span>
          </p>
          {progress > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
              background: progress >= 100 ? "rgba(34,197,94,0.15)" : "rgba(124,92,255,0.12)",
              color: progress >= 100 ? "#22c55e" : "var(--accent-1)",
            }}>
              {progress >= 100 ? "Complete 🎉" : `${progress}%`}
            </span>
          )}
        </div>
      </div>

      {/* ── Achievements ── */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>🏅 Achievements</h3>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlocked.includes(a.id);
            return (
              <motion.div
                key={a.id}
                className={`ach-tile ${isUnlocked ? "unlocked" : "locked"}`}
                whileHover={isUnlocked ? { y: -3, scale: 1.03 } : {}}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span className="ach-icon">{a.icon}</span>
                <div className="ach-name">{a.name}</div>
                <div className="ach-desc">{a.desc}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── ML Insight ── */}
      <div
        className="chart-card"
        style={{
          background: "var(--info-bg)",
          border: "1px solid var(--info)",
          borderLeft: "4px solid var(--info)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "var(--bg-elevated)", display: "grid", placeItems: "center",
            fontSize: 20, border: "1px solid var(--info)",
          }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, color: "var(--info)" }}>ML Insight</h3>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Based on your assessment results</div>
          </div>
        </div>

        <p style={{ color: "var(--text)", lineHeight: 1.75, marginBottom: features ? 14 : 0, fontSize: 14 }}>
          {renderBold(mlInsight)}
        </p>

        {features && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", color: "var(--text-dim)", marginBottom: 8,
            }}>
              Your metrics
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Study",    val: `${features.study_hours_per_day}h/day`,                     warn: features.study_hours_per_day > 8,                           icon: "📚" },
                { label: "Sleep",    val: `${features.sleep_hours_per_day}h/day`,                     warn: features.sleep_hours_per_day < 6,                           icon: "😴" },
                { label: "Activity", val: `${features.physical_activity_hours_per_day}h/day`,         warn: features.physical_activity_hours_per_day < 0.5,             icon: "🏃" },
                { label: "Social",   val: `${features.social_hours_per_day}h/day`,                    warn: features.social_hours_per_day < 1,                          icon: "🤝" },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: f.warn ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                    color: f.warn ? "#ef4444" : "#22c55e",
                    border: `1px solid ${f.warn ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}: {f.val}</span>
                  <span style={{ fontSize: 10 }}>{f.warn ? "⚠️" : "✓"}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-dim)" }}>
              🔴 Red = needs attention · 🟢 Green = healthy range
            </div>
          </>
        )}
      </div>

    </div>

      {/* ── Medium Burnout mini-popup (bottom-right, dismissible) ── */}

      <AnimatePresence>
        {showMediumPopup && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{
              position: "fixed", bottom: 28, right: 24, zIndex: 1000,
              width: 320, borderRadius: "var(--r-lg)",
              background: "var(--bg-elevated)",
              border: "1px solid rgba(245,158,11,0.4)",
              borderLeft: "4px solid #f59e0b",
              boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
              padding: "16px 18px",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                sessionStorage.setItem("mediumPopupDismissed", "true");
                setShowMediumPopup(false);
              }}
              style={{
                position: "absolute", top: 10, right: 12,
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-dim)", fontSize: 18, lineHeight: 1,
                padding: 4,
              }}
              aria-label="Dismiss"
            >×</button>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: "rgba(245,158,11,0.15)", border: "2px solid #f59e0b",
                display: "grid", placeItems: "center", fontSize: 18,
              }}>💬</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#f59e0b", marginBottom: 4 }}>
                  Just a thought
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4, lineHeight: 1.4 }}>
                  Feeling stressed? A quick chat helps.
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Woxsen's wellness team offers free sessions — even for medium stress, talking early makes a difference.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="https://calendly.com/wellness-centre-ryu/counselling" target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none" }}>
                <motion.div whileHover={{ x: 3 }} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 14px", borderRadius: "var(--r-md)",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                  cursor: "pointer",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Dr. Poorva Shinde</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Director — Wellness</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>Book →</span>
                </motion.div>
              </a>

              <a href="https://calendly.com/mohua-das-woxsen/new-meeting" target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: "none" }}>
                <motion.div whileHover={{ x: 3 }} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 14px", borderRadius: "var(--r-md)",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                  cursor: "pointer",
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Ms. Mohua Das</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Wellness Program Officer</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>Book →</span>
                </motion.div>
              </a>
            </div>

            <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-dim)", textAlign: "center" }}>
              Free · Confidential · No referral needed
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}

export default Flowchart;
