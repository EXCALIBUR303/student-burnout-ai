import React, { useState, useMemo } from "react";
import axios from "axios";
import "../App.css";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import Badge from "../components/Badge";

const QUESTIONS = [
  { q: "How many hours do you study daily?",         type: "Academic",     icon: "📚", tip: "Too much studying without breaks can increase burnout." },
  { q: "How many hours do you sleep daily?",         type: "Sleep",        icon: "😴", tip: "Less than 6–7 hours noticeably increases fatigue." },
  { q: "How stressed do you feel due to academics?", type: "Academic",     icon: "🎓", tip: "Sustained pressure is a leading burnout driver." },
  { q: "How mentally exhausted do you feel?",        type: "Mental",       icon: "🧠", tip: "Frequent exhaustion is a key early sign." },
  { q: "Daily screen time (hours)?",                 type: "Digital",      icon: "📱", tip: "Excessive screen time hurts focus and sleep." },
  { q: "How anxious do you feel?",                   type: "Mental",       icon: "💭", tip: "Anxiety compounds burnout risk." },
  { q: "How physically active are you?",             type: "Lifestyle",    icon: "🏃", tip: "Regular movement measurably reduces stress." },
  { q: "How socially active are you?",               type: "Social",       icon: "👥", tip: "Isolation increases vulnerability to burnout." },
  { q: "How good is your concentration?",            type: "Productivity", icon: "🎯", tip: "Dropping focus often precedes exhaustion." },
  { q: "How often do you procrastinate?",            type: "Productivity", icon: "⏳", tip: "Procrastination spirals into avoidance stress." },
];

// Map 0-10 slider answers to the 4 API features
const mapToApiFeatures = (answers) => ({
  study_hours_per_day:             parseFloat((answers[0] * 1.2).toFixed(1)),
  sleep_hours_per_day:             parseFloat((4 + answers[1] * 0.8).toFixed(1)),
  physical_activity_hours_per_day: parseFloat((answers[6] * 0.4).toFixed(1)),
  social_hours_per_day:            parseFloat((answers[7] * 0.6).toFixed(1)),
});

const calculateLocalScore = (data) => {
  let s = 0;
  if (data[0] > 7) s += 2;
  if (data[1] < 5) s += 2;
  if (data[2] > 6) s += 2;
  if (data[3] > 6) s += 2;
  if (data[4] > 7) s += 1;
  if (data[5] > 6) s += 2;
  if (data[6] < 3) s += 1;
  if (data[7] < 3) s += 1;
  if (data[8] < 4) s += 2;
  if (data[9] > 6) s += 1;
  return s;
};

const getPersonalisedInsights = (answers, features) => {
  const insights = [];
  const { study_hours_per_day: study, sleep_hours_per_day: sleep,
          physical_activity_hours_per_day: physical, social_hours_per_day: social } = features;

  if (study > 8)
    insights.push({ icon: "📚", title: "Study overload", desc: `~${study}h/day is above the safe zone. Try 45-min blocks with 15-min breaks.` });
  else if (study < 3)
    insights.push({ icon: "📚", title: "Low study time", desc: `~${study}h/day is low. Building a consistent routine reduces last-minute stress.` });

  if (sleep < 6)
    insights.push({ icon: "😴", title: "Sleep deficit", desc: `~${sleep}h of sleep is under the 7–8h minimum. Prioritise sleep above all else.` });
  else if (sleep >= 8)
    insights.push({ icon: "😴", title: "Good sleep", desc: `${sleep}h sleep is great — protect this habit at all costs.` });

  if (answers[5] > 7)
    insights.push({ icon: "💭", title: "High anxiety", desc: "Elevated anxiety detected. Box breathing (4s in / 4s hold / 4s out) helps instantly." });

  if (physical < 0.8)
    insights.push({ icon: "🏃", title: "Very low activity", desc: "Under 30 min of movement per day. Even a 20-min walk cuts cortisol significantly." });

  if (social < 1)
    insights.push({ icon: "👥", title: "Social withdrawal", desc: "Low social time detected. Schedule one low-effort catch-up this week." });

  if (answers[9] > 7)
    insights.push({ icon: "⏳", title: "Procrastination spike", desc: "High procrastination → avoidance stress spiral. Break tasks into 10-min chunks." });

  if (answers[4] > 7)
    insights.push({ icon: "📱", title: "Screen overload", desc: "High screen time disrupts melatonin and sleep quality. Set a screen curfew at 10 pm." });

  // Always have at least 3 insights
  const defaults = [
    { icon: "⏸",  title: "Study breaks", desc: "Take a break every 45 min — even 5 min off-screen resets focus." },
    { icon: "☕", title: "Connect", desc: "Weekly coffee with a friend cuts perceived stress by ~30%." },
    { icon: "🧘", title: "Reflect", desc: "5 min journalling at night helps process the day and reduce rumination." },
  ];
  defaults.forEach((d) => { if (insights.length < 6) insights.push(d); });

  return insights.slice(0, 6);
};

function Predict() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [value, setValue]       = useState(5);
  const [result, setResult]     = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading]   = useState(false);

  const liveScore  = useMemo(() => calculateLocalScore([...answers, value]), [answers, value]);
  const liveStatus = liveScore >= 12
    ? { label: "High",     variant: "danger",  icon: "🔥" }
    : liveScore >= 6
    ? { label: "Moderate", variant: "warning", icon: "⚠" }
    : { label: "Low",      variant: "success", icon: "🌱" };

  const handleNext = async () => {
    const updated = [...answers, value];
    setAnswers(updated);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
      setValue(5);
      return;
    }

    // Last question — call ML backend
    setLoading(true);
    const mapped = mapToApiFeatures(updated);
    setFeatures(mapped);
    localStorage.setItem("burnoutAnswers", JSON.stringify(updated));
    localStorage.setItem("burnoutFeatures", JSON.stringify(mapped));

    try {
      const { data } = await axios.post("/predict", mapped);
      const label = data.prediction === "High" ? "High Burnout"
                  : data.prediction === "Medium" ? "Medium Burnout"
                  : "Low Burnout";

      setMlResult({ label: data.prediction, risk: data.risk });
      setResult(label);
      localStorage.setItem("burnoutResult", label);
      localStorage.setItem("burnoutRisk", String(data.risk));
      toast.success("Assessment complete", `ML result: ${data.prediction} stress`);
    } catch {
      // Fallback to local score if backend is unreachable
      const final = calculateLocalScore(updated);
      const label = final >= 12 ? "High Burnout" : final >= 6 ? "Medium Burnout" : "Low Burnout";
      const risk  = final >= 12 ? 2 : final >= 6 ? 1 : 0;
      setMlResult({ label: label.split(" ")[0], risk });
      setResult(label);
      localStorage.setItem("burnoutResult", label);
      localStorage.setItem("burnoutRisk", String(risk));
      toast.info("Assessment complete (offline)", label);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (current === 0) return;
    const prev = [...answers];
    const last = prev.pop();
    setAnswers(prev);
    setCurrent(current - 1);
    setValue(last ?? 5);
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers([]);
    setResult(null);
    setMlResult(null);
    setFeatures(null);
    setValue(5);
  };

  const getEmoji = () => (value <= 3 ? "😌" : value <= 7 ? "😐" : "😫");

  /* ======================= RESULT VIEW ======================= */
  if (result) {
    const variant = result === "High Burnout" ? "danger"
                  : result === "Medium Burnout" ? "warning" : "success";
    const resultIcon = variant === "danger" ? "🔥" : variant === "warning" ? "⚠️" : "🌱";
    const savedFeatures = features || JSON.parse(localStorage.getItem("burnoutFeatures") || "{}");
    const savedAnswers  = answers.length ? answers : JSON.parse(localStorage.getItem("burnoutAnswers") || "[]");
    const insights = getPersonalisedInsights(savedAnswers, savedFeatures);

    return (
      <div className="dashboard-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: "40px auto" }}
        >
          {/* Result card */}
          <div
            className="chart-card"
            style={{ textAlign: "center", padding: 40, borderLeft: `4px solid var(--${variant})` }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>{resultIcon}</div>
            <Badge variant={variant} style={{ marginBottom: 16 }}>ML prediction</Badge>
            <h1 style={{ fontSize: 40, marginBottom: 8 }}>{result}</h1>
            <p style={{ marginBottom: 4, color: "var(--text-muted)" }}>
              Based on your responses — here's what the model found.
            </p>

            {/* Feature summary */}
            {savedFeatures.study_hours_per_day && (
              <div
                style={{
                  display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
                  margin: "20px 0", fontSize: 13,
                }}
              >
                {[
                  { icon: "📚", label: "Study",    val: `${savedFeatures.study_hours_per_day}h/day` },
                  { icon: "😴", label: "Sleep",    val: `${savedFeatures.sleep_hours_per_day}h/day` },
                  { icon: "🏃", label: "Activity", val: `${savedFeatures.physical_activity_hours_per_day}h/day` },
                  { icon: "👥", label: "Social",   val: `${savedFeatures.social_hours_per_day}h/day` },
                ].map((f) => (
                  <div
                    key={f.label}
                    style={{
                      padding: "8px 14px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-md)",
                      display: "flex", gap: 6, alignItems: "center",
                    }}
                  >
                    <span>{f.icon}</span>
                    <span style={{ color: "var(--text-muted)" }}>{f.label}:</span>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>{f.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personalised insights */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🤖</span> Personalised insights
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {insights.map((r) => (
                <div
                  key={r.title}
                  style={{
                    padding: 14,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{r.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <button onClick={() => navigate("/flowchart")} style={{ width: "auto", padding: "13px 28px" }}>
              View recovery plan →
            </button>
            <button className="btn-ghost" onClick={handleRestart} style={{ width: "auto", padding: "13px 24px" }}>
              Retake test
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ======================= LOADING VIEW ======================= */
  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div
          className="chart-card"
          style={{ textAlign: "center", padding: 48, maxWidth: 400 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h2 style={{ marginBottom: 8 }}>Analysing your responses</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Running the ML model on your pattern...
          </p>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent-1)" }}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ======================= QUESTIONNAIRE VIEW ======================= */
  const q = QUESTIONS[current];

  return (
    <div className="dashboard-container" style={{ maxWidth: 760 }}>
      <h1 className="dashboard-title">AI Burnout Assessment</h1>
      <p className="dashboard-subtitle">Answer honestly — there are no wrong answers.</p>

      {/* Stepper */}
      <div className="stepper" aria-label="Progress">
        {QUESTIONS.map((_, i) => (
          <div key={i} className={`step-pill ${i < current ? "done" : i === current ? "current" : ""}`} />
        ))}
      </div>

      {/* Live score */}
      <motion.div
        className="chart-card"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        layout
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
            Live burnout score
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div className="mono" style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{liveScore}</div>
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>/ 17</span>
          </div>
        </div>
        <Badge variant={liveStatus.variant} icon={liveStatus.icon}>{liveStatus.label}</Badge>
      </motion.div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="chart-card"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="question-meta">
            <span className="question-category"><span>{q.icon}</span>{q.type}</span>
            <span className="question-counter">{String(current + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}</span>
          </div>

          <h2 style={{ fontSize: 22, marginTop: 14, marginBottom: 20 }}>{q.q}</h2>

          <div style={{ display: "flex", gap: 10, padding: 14, borderRadius: "var(--r-md)", background: "var(--info-bg)", border: "1px solid var(--info)", fontSize: 13, marginBottom: 24 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span style={{ color: "var(--text)" }}>{q.tip}</span>
          </div>

          <div style={{ fontSize: 46, textAlign: "center", marginBottom: 12, transition: "transform 0.2s" }}>
            {getEmoji()}
          </div>

          <input
            type="range"
            className="burn-slider"
            min={0} max={10} value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label={q.q}
          />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginTop: 10 }}>
            <span>Low</span><span>Medium</span><span>High</span>
          </div>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Value: </span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>{value}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className="btn-ghost" onClick={handleBack} disabled={current === 0} style={{ width: "auto", padding: "13px 22px" }}>
          ← Back
        </button>
        <button onClick={handleNext} style={{ flex: 1 }}>
          {current === QUESTIONS.length - 1 ? "Run ML analysis ✨" : "Next →"}
        </button>
      </div>
    </div>
  );
}

export default Predict;
