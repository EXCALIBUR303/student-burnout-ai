import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    icon: "🔮",
    title: "AI-powered burnout detection",
    body: "Answer 8 quick questions. Our XGBoost model — trained on 2,000 real student records — gives you an instant, personalised burnout score.",
  },
  {
    icon: "📊",
    title: "Track your progress over time",
    body: "Every assessment is saved. Watch your risk trend, activity heatmap, and habits compared to the student dataset.",
  },
  {
    icon: "🏆",
    title: "Earn XP, unlock badges, build streaks",
    body: "Complete your personalised recovery steps to level up. The more consistent you are, the lower your burnout risk.",
  },
  {
    icon: "🧑‍⚕️",
    title: "Never alone",
    body: "If things get tough, Woxsen's wellness counsellors are one click away — free, confidential, no referral needed.",
  },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => {
    localStorage.setItem("onboardingDone", "true");
    onClose();
    navigate("/predict");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--r-lg)",
          padding: "40px 36px",
          maxWidth: 440, width: "100%",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 999,
              background: i === step ? "var(--accent-1)" : "var(--border-strong)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{ fontSize: 64, marginBottom: 20 }}
            >{current.icon}</motion.div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 14, lineHeight: 1.3 }}>
              {current.title}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 32 }}>
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: "11px 22px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border-strong)",
              background: "none", color: "var(--text-muted)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>← Back</button>
          )}
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={isLast ? finish : () => setStep(s => s + 1)}
            style={{
              flex: 1, padding: "12px 24px", borderRadius: "var(--r-md)",
              border: "none", background: "var(--grad-primary)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 20px rgba(124,92,255,0.35)",
            }}
          >
            {isLast ? "Take my first assessment →" : "Next →"}
          </motion.button>
        </div>

        <button onClick={() => { localStorage.setItem("onboardingDone","true"); onClose(); }}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", color: "var(--text-dim)",
            fontSize: 20, cursor: "pointer", padding: 4,
          }}
        >×</button>
      </motion.div>
    </div>
  );
}
