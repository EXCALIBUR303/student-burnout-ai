import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: 24, textAlign: "center",
    }}>
      <motion.div
        animate={{ y: [0, -16, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        style={{ fontSize: 96, marginBottom: 24, lineHeight: 1 }}
      >🔮</motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{
          fontSize: 96, fontWeight: 900, lineHeight: 1,
          background: "linear-gradient(135deg, var(--accent-1), #00d4ff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 8,
        }}>404</div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
          Page not found
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 340, lineHeight: 1.65, marginBottom: 32 }}>
          Looks like this page took a burnout break. Let's get you back somewhere useful.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            style={{
              padding: "12px 28px", borderRadius: "var(--r-md)", border: "none",
              background: "var(--grad-primary)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >← Go Home</motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/predict")}
            style={{
              padding: "12px 28px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface)", color: "var(--text)",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >Take Assessment →</motion.button>
        </div>
      </motion.div>

      {/* Floating particles */}
      {["💭","🌱","⚡","🎯","✨"].map((emoji, i) => (
        <motion.div key={i}
          style={{
            position: "fixed", fontSize: 24, opacity: 0.15,
            left: `${10 + i * 20}%`, top: `${20 + (i % 3) * 25}%`,
            pointerEvents: "none",
          }}
          animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4 + i, delay: i * 0.5 }}
        >{emoji}</motion.div>
      ))}
    </div>
  );
}
