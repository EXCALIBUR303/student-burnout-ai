import React, { useState, useMemo, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import axios from "axios";
import confetti from "canvas-confetti";
import "../App.css";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import Badge from "../components/Badge";
import TiltCard from "../components/TiltCard";
import AnimatedNumber from "../components/AnimatedNumber";
import API_BASE from "../utils/api";
import { jsPDF } from "jspdf";

// 8 questions total: 7 objective hours/values for the model + 1 wellness for chatbot context
const QUESTIONS = [
  {
    key: "study", icon: "📚", type: "Academic",
    q: "On an average day, how many hours do you study?",
    tip: "Include classes, homework, and self-study. Be honest — averaging 9+ hours is a major burnout signal.",
    inputType: "hours", min: 0, max: 14, step: 0.5, default: 5,
    presets: [2, 4, 6, 8, 10],
  },
  {
    key: "sleep", icon: "😴", type: "Sleep",
    q: "How many hours do you sleep on a typical night?",
    tip: "Less than 7 hours nightly is the strongest predictor of burnout in students.",
    inputType: "hours", min: 3, max: 12, step: 0.5, default: 7,
    presets: [4, 5, 6, 7, 8, 9],
  },
  {
    key: "social", icon: "👥", type: "Social",
    q: "How many hours per day do you spend socialising in person?",
    tip: "Real-world social contact is one of the strongest protective factors against burnout.",
    inputType: "hours", min: 0, max: 8, step: 0.5, default: 1.5,
    presets: [0, 1, 2, 3, 4],
  },
  {
    key: "physical", icon: "🏃", type: "Lifestyle",
    q: "How many hours per day do you do physical activity?",
    tip: "Even a 20-minute walk counts. 150 min/week (~22 min/day) is the WHO baseline.",
    inputType: "hours", min: 0, max: 4, step: 0.25, default: 0.75,
    presets: [0, 0.5, 1, 1.5, 2],
  },
  {
    key: "screen", icon: "📱", type: "Digital",
    q: "How many hours per day do you spend on phone/screens (non-study)?",
    tip: "Average uni student: 4–6 hours. Above 6 hours is associated with sleep disruption and rumination.",
    inputType: "hours", min: 0, max: 14, step: 0.5, default: 3.5,
    presets: [1, 3, 5, 7, 10],
  },
  {
    key: "gpa", icon: "🏅", type: "Academic",
    q: "What is your current GPA (out of 10)?",
    tip: "Lower GPA correlates with academic stress, but high GPA from cramming is also a risk pattern.",
    inputType: "gpa", min: 0, max: 10, step: 0.1, default: 7.5,
    presets: [5, 6, 7, 8, 9],
  },
  {
    key: "extra", icon: "🎭", type: "Activities",
    q: "How many hours per day on clubs / extracurricular activities?",
    tip: "Mild engagement (~1 hour) is protective. Over-commitment (3+ hrs) compounds load.",
    inputType: "hours", min: 0, max: 5, step: 0.25, default: 0.5,
    presets: [0, 0.5, 1, 2, 3],
  },
  {
    key: "mood", icon: "💭", type: "Wellness",
    q: "Right now, how would you rate your overall stress?",
    tip: "This helps the chatbot give you contextual support — it's NOT used by the ML model itself.",
    inputType: "mood", min: 0, max: 10, step: 1, default: 5,
    moodLabels: ["😌 Calm", "😊 Light", "😐 OK", "😟 Tense", "😣 Heavy", "😫 Overwhelmed"],
  },
];

const mapToApiFeatures = (answersObj) => ({
  study_hours_per_day:             parseFloat(Number(answersObj.study).toFixed(1)),
  sleep_hours_per_day:             parseFloat(Number(answersObj.sleep).toFixed(1)),
  social_hours_per_day:            parseFloat(Number(answersObj.social).toFixed(1)),
  physical_activity_hours_per_day: parseFloat(Number(answersObj.physical).toFixed(2)),
  screen_time_hours:               parseFloat(Number(answersObj.screen).toFixed(1)),
  gpa_norm:                        parseFloat((Number(answersObj.gpa) / 10).toFixed(2)),
  extracurricular_hours:           parseFloat(Number(answersObj.extra).toFixed(2)),
});

const calculateLocalScore = (a) => {
  let s = 0;
  if (a.study   > 8)    s += 3;
  if (a.study   > 10)   s += 2;
  if (a.sleep   < 6)    s += 4;
  if (a.sleep   < 5)    s += 2;
  if (a.social  < 1)    s += 2;
  if (a.physical< 0.5)  s += 2;
  if (a.screen  > 6)    s += 2;
  if (a.screen  > 10)   s += 2;
  if (a.gpa     < 5)    s += 2;
  if (a.extra   > 3)    s += 1;
  if (a.mood   != null && a.mood > 6) s += 2;
  return s;
};

const getPersonalisedInsights = (a, features) => {
  const insights = [];
  const study = features.study_hours_per_day;
  const sleep = features.sleep_hours_per_day;
  const physical = features.physical_activity_hours_per_day;
  const social = features.social_hours_per_day;
  const screen = features.screen_time_hours;
  const gpa = features.gpa_norm * 10;

  if (study > 8)
    insights.push({ icon: "📚", title: "Study overload", desc: `~${study}h/day is above the safe zone. Try 45-min blocks with 15-min breaks.` });
  else if (study < 3)
    insights.push({ icon: "📚", title: "Low study time", desc: `~${study}h/day is low. Building a consistent routine reduces last-minute stress.` });

  if (sleep < 6)
    insights.push({ icon: "😴", title: "Sleep deficit", desc: `~${sleep}h of sleep is under the 7–8h minimum. Prioritise sleep above all else.` });
  else if (sleep >= 8)
    insights.push({ icon: "😴", title: "Good sleep", desc: `${sleep}h sleep is great — protect this habit at all costs.` });

  if (a && a.mood != null && a.mood > 7)
    insights.push({ icon: "💭", title: "High stress right now", desc: "Elevated stress detected. Box breathing (4s in / 4s hold / 4s out) helps instantly." });

  if (physical < 0.8)
    insights.push({ icon: "🏃", title: "Very low activity", desc: "Under 30 min of movement per day. Even a 20-min walk cuts cortisol significantly." });

  if (social < 1)
    insights.push({ icon: "👥", title: "Social withdrawal", desc: "Low social time detected. Schedule one low-effort catch-up this week." });

  if (screen > 6)
    insights.push({ icon: "📱", title: "Screen overload", desc: "High screen time disrupts melatonin and sleep quality. Set a screen curfew at 10 pm." });

  if (gpa !== undefined && gpa < 5)
    insights.push({ icon: "🏅", title: "GPA pressure", desc: "Lower GPA creates stress spirals. Talk to an academic advisor — small adjustments early make a big difference." });

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
  const [answersObj, setAnswersObj] = useState({});
  const [value, setValue]       = useState(QUESTIONS[0].default);
  const [result, setResult]     = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [mlInsights, setMlInsights] = useState(null);

  const shareCardRef = useRef();

  useEffect(() => {
    setValue(answersObj[QUESTIONS[current]?.key] ?? QUESTIONS[current]?.default ?? 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const liveScore = useMemo(() => {
    const provisional = { ...answersObj, [QUESTIONS[current].key]: value };
    return calculateLocalScore(provisional);
  }, [answersObj, value, current]);
  const liveStatus = liveScore >= 12
    ? { label: "High",     variant: "danger",  icon: "🔥" }
    : liveScore >= 6
    ? { label: "Moderate", variant: "warning", icon: "⚠" }
    : { label: "Low",      variant: "success", icon: "🌱" };

  const handleNext = async () => {
    const key = QUESTIONS[current].key;
    const updated = { ...answersObj, [key]: value };
    setAnswersObj(updated);

    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
      return;
    }

    // Done — call ML backend
    setLoading(true);
    const mapped = mapToApiFeatures(updated);
    setFeatures(mapped);
    localStorage.setItem("burnoutAnswers", JSON.stringify(updated));
    localStorage.setItem("burnoutFeatures", JSON.stringify(mapped));

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await axios.post(`${API_BASE}/predict`, mapped, { headers });
      const label = data.prediction === "High" ? "High Burnout"
                  : data.prediction === "Medium" ? "Medium Burnout"
                  : "Low Burnout";
      localStorage.setItem("lastPrediction", JSON.stringify({
        prediction: data.prediction, risk: data.risk, confidence: data.confidence,
        features: mapped, prediction_id: data.prediction_id ?? null,
      }));
      setMlResult({
        label: data.prediction, risk: data.risk,
        confidence: data.confidence ?? null,
        top_drivers: data.top_drivers ?? [],
      });
      setResult(label);
      if (data.prediction === "Low" || data.risk === 0) {
        setTimeout(() => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 },
            colors: ["#22c55e", "#00d4ff", "#7c5cff", "#f59e0b"] });
        }, 600);
      }
      try {
        const ins = await axios.get(`${API_BASE}/insights`, { headers });
        setMlInsights(ins.data);
      } catch {}
      localStorage.setItem("burnoutResult", label);
      localStorage.setItem("burnoutRisk", String(data.risk));
      toast.success("Assessment complete", `ML result: ${data.prediction} stress`);
    } catch {
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
    setCurrent(current - 1);
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswersObj({});
    setResult(null);
    setMlResult(null);
    setFeatures(null);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; // A4 width mm
    const margin = 20;
    let y = 20;

    // Header bar
    doc.setFillColor(124, 92, 255);
    doc.rect(0, 0, W, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("BurnoutAI — Woxsen University Wellness", margin, 9);
    doc.text(new Date().toLocaleDateString(), W - margin, 9, { align: "right" });

    y = 28;
    // Title
    doc.setTextColor(30, 30, 40);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Burnout Assessment Report", margin, y);
    y += 10;

    // Risk badge box
    const riskColor = mlResult?.prediction === "High" ? [239, 68, 68]
      : mlResult?.prediction === "Low" ? [34, 197, 94] : [245, 158, 11];
    doc.setFillColor(...riskColor);
    doc.roundedRect(margin, y, 60, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`${mlResult?.prediction || "—"} Burnout Risk`, margin + 30, y + 9, { align: "center" });
    y += 22;

    // Confidence
    if (mlResult?.confidence) {
      doc.setTextColor(80, 80, 100);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Model confidence: ${mlResult.confidence}%`, margin, y);
      y += 8;
    }

    // Divider
    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, W - margin, y);
    y += 10;

    // Your inputs
    doc.setTextColor(30, 30, 40);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Your Inputs", margin, y);
    y += 8;

    const inputs = JSON.parse(localStorage.getItem("burnoutFeatures") || "null");
    if (inputs) {
      const rows = [
        ["Study hours/day",    `${inputs.study_hours_per_day} h`],
        ["Sleep hours/day",    `${inputs.sleep_hours_per_day} h`],
        ["Social hours/day",   `${inputs.social_hours_per_day} h`],
        ["Physical activity",  `${inputs.physical_activity_hours_per_day} h`],
      ];
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      rows.forEach(([label, val]) => {
        doc.setTextColor(80, 80, 100);
        doc.text(label, margin, y);
        doc.setTextColor(30, 30, 40);
        doc.setFont("helvetica", "bold");
        doc.text(val, margin + 70, y);
        doc.setFont("helvetica", "normal");
        y += 7;
      });
    }
    y += 4;

    // Top risk drivers
    if (mlResult?.top_drivers?.length) {
      doc.setDrawColor(200, 200, 220);
      doc.line(margin, y, W - margin, y);
      y += 8;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 40);
      doc.text("Top Risk Drivers", margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      mlResult.top_drivers.slice(0, 3).forEach((d, i) => {
        doc.setTextColor(80, 80, 100);
        doc.text(`${i + 1}. ${d.label} — ${d.direction === "risk" ? "Above average (risk)" : "Below average (protective)"}`, margin, y);
        y += 7;
      });
    }
    y += 4;

    // Recovery advice
    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, W - margin, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 40);
    doc.text("Recommended Next Steps", margin, y);
    y += 8;

    const advice = mlResult?.prediction === "High"
      ? ["Prioritise sleep — aim for 7-8 hours tonight", "Reduce study load by 1-2 hours for the next week", "Schedule a session with the Woxsen wellness team", "Try 5 minutes of box breathing daily"]
      : mlResult?.prediction === "Medium"
      ? ["Maintain consistent sleep schedule", "Add a 20-minute walk to your daily routine", "Connect with a friend this week", "Track your mood daily using the app"]
      : ["Keep your current routine — it's working", "Continue your recovery plan steps", "Help a peer who might be struggling", "Schedule your next check-in in 3 days"];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    advice.forEach((tip) => {
      doc.setTextColor(80, 80, 100);
      doc.text(`• ${tip}`, margin, y);
      y += 7;
    });
    y += 4;

    // Counsellor contact (if High)
    if (mlResult?.prediction === "High") {
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, "F");
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Woxsen Wellness Counsellors", margin + 4, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 40, 40);
      doc.text("Dr. Poorva Shinde: calendly.com/wellness-centre-ryu/counselling", margin + 4, y + 14);
      doc.text("Ms. Mohua Das: calendly.com/mohua-das-woxsen/new-meeting", margin + 4, y + 21);
      y += 34;
    }

    // Footer
    doc.setFillColor(245, 245, 250);
    doc.rect(0, 282, W, 15, "F");
    doc.setTextColor(140, 140, 160);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by BurnoutAI · Woxsen University · Free & Confidential", W / 2, 290, { align: "center" });

    doc.save(`burnout-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Trend prediction: estimate days to Low risk
  const trendDaysToLow = (() => {
    const t = mlInsights?.trend;
    if (!t || t.direction === "improving" === false) return null;
    if (t.direction !== "improving") return null;
    const riskNum = { Low: 0, Medium: 1, High: 2 };
    const currentRisk = riskNum[mlResult?.prediction] ?? 1;
    if (currentRisk === 0) return null;
    const slope = Math.abs(t.slope); // improvement per assessment
    if (slope < 0.05) return null;
    const assessmentsNeeded = Math.ceil(currentRisk / slope);
    // assume 1 assessment every 2 days
    return Math.min(assessmentsNeeded * 2, 60);
  })();

  /* ======================= RESULT VIEW ======================= */
  if (result) {
    const variant     = result === "High Burnout" ? "danger" : result === "Medium Burnout" ? "warning" : "success";
    const resultIcon  = variant === "danger" ? "🔥" : variant === "warning" ? "⚠️" : "🌱";
    const riskColor   = variant === "danger" ? "var(--danger)" : variant === "warning" ? "var(--warning)" : "var(--success)";
    const riskPct     = mlResult ? (mlResult.risk === 2 ? 82 : mlResult.risk === 1 ? 48 : 18) : 30;
    const savedFeatures = features || JSON.parse(localStorage.getItem("burnoutFeatures") || "{}");
    const savedAnswers = JSON.parse(localStorage.getItem("burnoutAnswers") || "{}");
    const insights = getPersonalisedInsights(savedAnswers, savedFeatures);

    const sendFeedback = async (accurate) => {
      try {
        const last = JSON.parse(localStorage.getItem("lastPrediction") || "{}");
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
        await axios.post(`${API_BASE}/feedback`, {
          prediction_id: last.prediction_id ?? null,
          accurate: accurate ? 1 : 0,
        }, { headers });
        toast.success(accurate ? "Thanks!" : "Got it", "Feedback helps the model improve");
      } catch {
        toast.info("Couldn't send feedback", "Try again later");
      }
    };

    const handleShare = async () => {
      const text = `I just checked my burnout risk with BurnoutAI 🔥\nResult: ${result}\nTake the free 2-min assessment: ${window.location.origin}`;
      if (navigator.share) {
        try { await navigator.share({ title: "My BurnoutAI Result", text }); } catch {}
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied!", "Result copied to clipboard");
      }
    };

    const shareResult = async () => {
      if (!shareCardRef.current) return;
      try {
        const canvas = await html2canvas(shareCardRef.current, {
          backgroundColor: null,
          scale: 2,
        });
        const url = canvas.toDataURL("image/png");

        if (navigator.share && navigator.canShare) {
          const blob = await (await fetch(url)).blob();
          const file = new File([blob], "burnout-result.png", { type: "image/png" });
          try {
            await navigator.share({
              files: [file],
              title: "My Burnout Assessment",
              text: "Check out my burnout risk score from Burnout/AI",
            });
            return;
          } catch {}
        }
        // Fallback: download the image
        const a = document.createElement("a");
        a.href = url;
        a.download = "burnout-result.png";
        a.click();
      } catch (err) {
        toast.info("Share unavailable", "Could not generate image card");
      }
    };

    return (
      <div className="dashboard-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 720, margin: "40px auto" }}
        >
          {/* ── Result card ── */}
          <TiltCard>
          <div className="chart-card result-card" style={{ textAlign: "center", padding: "40px 32px", borderTop: `4px solid ${riskColor}` }}>
            {/* Glowing icon */}
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              style={{ fontSize: 60, marginBottom: 16, filter: `drop-shadow(0 0 20px ${riskColor}66)` }}>
              {resultIcon}
            </motion.div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <Badge variant={variant}>ML prediction</Badge>
              {mlResult?.confidence && (
                <Badge variant="default" style={{ background: "var(--surface-strong)", color: "var(--text)" }}>
                  {mlResult.confidence}% confident
                </Badge>
              )}
              {mlInsights?.trend && (
                <Badge
                  variant={mlInsights.trend.direction === "improving" ? "success" : mlInsights.trend.direction === "worsening" ? "danger" : "default"}
                  style={mlInsights.trend.direction === "stable" ? { background: "var(--surface-strong)", color: "var(--text-muted)" } : {}}>
                  {mlInsights.trend.direction === "improving" ? "📈 Improving" : mlInsights.trend.direction === "worsening" ? "📉 Worsening" : "➡️ Stable"}
                </Badge>
              )}
            </div>
            {trendDaysToLow && (
              <div style={{
                marginTop: 8, fontSize: 12, color: "var(--text-muted)",
                display: "flex", alignItems: "center", gap: 6,
                justifyContent: "center",
              }}>
                <span>🎯</span>
                <span>At this pace, you could reach <strong style={{ color: "#22c55e" }}>Low risk</strong> in roughly <strong style={{ color: "var(--accent-1)" }}>~{trendDaysToLow} days</strong></span>
              </div>
            )}

            <h1 style={{ fontSize: 38, marginBottom: 8, color: riskColor }}>{result}</h1>
            <p style={{ marginBottom: 24, color: "var(--text-muted)" }}>
              Based on your 10 responses — here's what the model detected.
            </p>

            {/* Risk meter */}
            <div style={{ maxWidth: 360, margin: "0 auto 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)", marginBottom: 8, fontWeight: 600 }}>
                <span>Low risk</span><span>High risk</span>
              </div>
              <div style={{ height: 10, background: "var(--surface-strong)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, var(--success) 0%, var(--warning) 50%, var(--danger) 100%)", opacity: 0.3 }} />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${riskPct}%` }}
                  transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: "100%", background: riskColor, borderRadius: 6, position: "relative" }}>
                  <div style={{ position: "absolute", right: -1, top: -4, width: 18, height: 18, borderRadius: "50%", background: riskColor, border: "3px solid var(--bg-elevated)", boxShadow: `0 0 12px ${riskColor}` }} />
                </motion.div>
              </div>
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                Risk index: <span style={{ fontWeight: 700, color: riskColor }}><AnimatedNumber value={riskPct} />/100</span>
              </div>
            </div>

            {/* Top drivers */}
            {mlResult?.top_drivers?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                style={{ marginTop: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10 }}>
                  Top risk drivers
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mlResult.top_drivers.map((d) => (
                    <div key={d.feature} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      background: d.direction === "risk"
                        ? "color-mix(in srgb, var(--danger) 8%, transparent)"
                        : "color-mix(in srgb, var(--success) 8%, transparent)",
                      border: `1px solid ${d.direction === "risk"
                        ? "color-mix(in srgb, var(--danger) 25%, transparent)"
                        : "color-mix(in srgb, var(--success) 25%, transparent)"}`,
                      borderRadius: "var(--r-md)",
                    }}>
                      <span style={{ fontSize: 20 }}>{d.emoji}</span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{d.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Your value: <strong>{d.value}</strong> · Avg: {d.avg}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: d.direction === "risk" ? "var(--danger)" : "var(--success)" }}>
                        {d.direction === "risk" ? "⚠ Risk" : "✓ OK"}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              style={{ marginTop: 20, padding: "14px 18px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Was this prediction accurate?
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="btn-ghost" onClick={() => sendFeedback(true)}  style={{ width: "auto", padding: "8px 20px", fontSize: 14 }}>👍 Yes</button>
                <button className="btn-ghost" onClick={() => sendFeedback(false)} style={{ width: "auto", padding: "8px 20px", fontSize: 14 }}>👎 Off</button>
              </div>
            </motion.div>

            {/* Feature chips */}
            {savedFeatures.study_hours_per_day && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", fontSize: 13 }}>
                {[
                  { icon: "📚", label: "Study",   val: `${savedFeatures.study_hours_per_day}h` },
                  { icon: "😴", label: "Sleep",   val: `${savedFeatures.sleep_hours_per_day}h` },
                  { icon: "🏃", label: "Activity",val: `${savedFeatures.physical_activity_hours_per_day}h` },
                  { icon: "👥", label: "Social",  val: `${savedFeatures.social_hours_per_day}h` },
                  ...(savedFeatures.screen_time_hours != null ? [{ icon: "📱", label: "Screen", val: `${savedFeatures.screen_time_hours}h` }] : []),
                  ...(savedFeatures.gpa_norm != null ? [{ icon: "🏅", label: "GPA", val: (savedFeatures.gpa_norm * 10).toFixed(1) }] : []),
                ].map((f) => (
                  <motion.div key={f.label}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", display: "flex", gap: 6, alignItems: "center" }}>
                    <span>{f.icon}</span>
                    <span style={{ color: "var(--text-muted)" }}>{f.label}:</span>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>{f.val}/day</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          </TiltCard>

          {/* ── Personalised insights ── */}
          <div className="chart-card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🤖</span> Personalised insights
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              {insights.map((r, i) => (
                <motion.div key={r.title}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.4, duration: 0.35 }}
                  style={{ padding: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{r.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.55 }}>{r.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── CTA buttons ── */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <button onClick={() => navigate("/flowchart")} style={{ width: "auto", padding: "13px 28px" }}>
              View recovery plan →
            </button>
            <button className="btn-ghost" onClick={handleShare} style={{ width: "auto", padding: "13px 22px" }}>
              📤 Share result
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={shareResult}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: "var(--r-md)",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)", color: "var(--text)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                marginTop: 12,
              }}
            >
              🖼️ Share Result Card
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={downloadPDF}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: "var(--r-md)",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)", color: "var(--text)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                marginTop: 12,
              }}
            >
              📄 Download PDF Report
            </motion.button>
            <button className="btn-ghost" onClick={handleRestart} style={{ width: "auto", padding: "13px 22px" }}>
              ↺ Retake
            </button>
          </div>
        </motion.div>

        {/* ── Hidden shareable result card (off-screen, captured by html2canvas) ── */}
        <div
          ref={shareCardRef}
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: 400,
            height: 300,
            background: "linear-gradient(135deg, #1a1035, #0f1a2e)",
            borderRadius: 20,
            padding: "32px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* App logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🧠</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#7c5cff", letterSpacing: "-0.02em" }}>
              Burnout<span style={{ color: "#00d4ff" }}>/AI</span>
            </span>
          </div>

          {/* Risk emoji + level */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>
              {variant === "danger" ? "🔴" : variant === "warning" ? "🟡" : "🟢"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: riskColor, marginBottom: 4, letterSpacing: "-0.02em" }}>
              {mlResult?.label || result?.replace(" Burnout", "") || "—"} Risk
            </div>
            {mlResult?.confidence && (
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                {mlResult.confidence}% confidence
              </div>
            )}
          </div>

          {/* Subtitle + date */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
              Assessed at Woxsen University
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
              {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>
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
  const isMood = q.inputType === "mood";

  return (
    <div className="dashboard-container" style={{ maxWidth: 760 }}>
      <h1 className="dashboard-title">AI Burnout Assessment</h1>
      <p className="dashboard-subtitle">8 quick questions. Be honest — the model gets sharper with real numbers.</p>

      {/* Stepper */}
      <div className="stepper" aria-label="Progress">
        {QUESTIONS.map((_, i) => (
          <div key={i} className={`step-pill ${i < current ? "done" : i === current ? "current" : ""}`} />
        ))}
      </div>

      {/* Live score card */}
      <motion.div className="chart-card"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
            Live burnout score
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div className="mono" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{liveScore}</div>
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>/ 22</span>
          </div>
        </div>
        <Badge variant={liveStatus.variant} icon={liveStatus.icon}>{liveStatus.label}</Badge>
      </motion.div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="chart-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <div className="question-meta">
            <span className="question-category"><span>{q.icon}</span>{q.type}</span>
            <span className="question-counter">{String(current + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}</span>
          </div>

          <h2 style={{ fontSize: 22, marginTop: 14, marginBottom: 20 }}>{q.q}</h2>

          {/* Tip box */}
          <div style={{ display: "flex", gap: 10, padding: 14, borderRadius: "var(--r-md)",
            background: "var(--info-bg)", border: "1px solid var(--info)", fontSize: 13, marginBottom: 24 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span style={{ color: "var(--text)" }}>{q.tip}</span>
          </div>

          {/* Big value display */}
          <motion.div
            key={value}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ textAlign: "center", marginBottom: 20 }}>
            {isMood ? (
              <div style={{ fontSize: 60 }}>
                {q.moodLabels[Math.min(Math.floor(value / 2), q.moodLabels.length - 1)].split(" ")[0]}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 64, fontWeight: 800, color: "var(--accent-1)",
                  lineHeight: 1, fontVariantNumeric: "tabular-nums",
                  background: "var(--grad-primary, linear-gradient(135deg, #7c5cff, #00d4ff))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text" }}>
                  {Number(value).toFixed(q.step < 1 ? (q.step < 0.5 ? 2 : 1) : 0)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                  {q.inputType === "gpa" ? "out of 10" : "hours per day"}
                </div>
              </>
            )}
          </motion.div>

          {/* Slider */}
          <input type="range" className="burn-slider"
            min={q.min} max={q.max} step={q.step} value={value}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            aria-label={q.q}
          />

          {/* Range labels */}
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: "var(--text-dim)", marginTop: 10 }}>
            <span>{q.min}{q.inputType === "gpa" ? "" : "h"}</span>
            <span>{q.max}{q.inputType === "gpa" ? "" : "h"}</span>
          </div>

          {/* Quick presets */}
          {q.presets && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
              {q.presets.map((p) => (
                <motion.button
                  key={p}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setValue(p)}
                  style={{
                    padding: "8px 14px", fontSize: 13, fontWeight: 600,
                    borderRadius: 999, cursor: "pointer", width: "auto",
                    background: Math.abs(value - p) < 0.01 ? "var(--accent-1)" : "var(--surface)",
                    color: Math.abs(value - p) < 0.01 ? "white" : "var(--text)",
                    border: `1px solid ${Math.abs(value - p) < 0.01 ? "var(--accent-1)" : "var(--border)"}`,
                    transition: "all 0.2s",
                  }}
                >
                  {p}{q.inputType === "gpa" ? "" : "h"}
                </motion.button>
              ))}
            </div>
          )}

          {/* Mood label below */}
          {isMood && (
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text-muted)" }}>
              {q.moodLabels[Math.min(Math.floor(value / 2), q.moodLabels.length - 1)]}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className="btn-ghost" onClick={handleBack} disabled={current === 0}
          style={{ width: "auto", padding: "13px 22px" }}>
          ← Back
        </button>
        <motion.button onClick={handleNext}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{ flex: 1 }}>
          {current === QUESTIONS.length - 1 ? "Run AI analysis ✨" : "Next →"}
        </motion.button>
      </div>
    </div>
  );
}

export default Predict;
