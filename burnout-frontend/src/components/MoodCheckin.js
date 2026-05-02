import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOODS = [
  { emoji: "😩", label: "Exhausted", value: 1 },
  { emoji: "😔", label: "Low",       value: 2 },
  { emoji: "😐", label: "Okay",      value: 3 },
  { emoji: "🙂", label: "Good",      value: 4 },
  { emoji: "😄", label: "Great",     value: 5 },
];

export default function MoodCheckin() {
  const today = new Date().toDateString();
  const storageKey = `moodCheckin_${today}`;
  const [selected, setSelected] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved) : null;
  });
  const [submitted, setSubmitted] = useState(() => !!localStorage.getItem(storageKey));
  const [visible, setVisible] = useState(true);

  const submit = (value) => {
    setSelected(value);
    setSubmitted(true);
    localStorage.setItem(storageKey, String(value));
    // Store in history for heatmap-style mood history
    const history = JSON.parse(localStorage.getItem("moodHistory") || "{}");
    history[new Date().toISOString().slice(0, 10)] = value;
    localStorage.setItem("moodHistory", JSON.stringify(history));
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          borderRadius: "var(--r-lg)",
          background: "linear-gradient(135deg, rgba(124,92,255,0.07), rgba(0,212,255,0.04))",
          border: "1px solid rgba(124,92,255,0.2)",
          padding: "18px 20px",
          marginBottom: 20,
        }}
      >
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "8px 0" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {MOODS.find(m => m.value === selected)?.emoji || "✅"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              Check-in saved!
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Feeling <strong>{MOODS.find(m => m.value === selected)?.label}</strong> today. Come back tomorrow.
            </div>
          </motion.div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-1)", marginBottom: 4 }}>
                  ✦ Daily Check-in
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  How are you feeling today?
                </div>
              </div>
              <button onClick={() => setVisible(false)} style={{
                background: "none", border: "none", color: "var(--text-dim)",
                fontSize: 18, cursor: "pointer", padding: 4,
              }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              {MOODS.map(mood => (
                <motion.button
                  key={mood.value}
                  whileHover={{ scale: 1.12, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => submit(mood.value)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6,
                    padding: "12px 8px", borderRadius: "var(--r-md)",
                    border: `1px solid ${selected === mood.value ? "var(--accent-1)" : "var(--border)"}`,
                    background: selected === mood.value ? "rgba(124,92,255,0.12)" : "var(--surface)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{mood.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{mood.label}</span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
