import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomQuote } from "../utils/quotes";

/**
 * A beautiful rotating quote card.
 * Props:
 *   level - "High" | "Medium" | "Low" | "general"
 *   style - optional extra styles for the wrapper
 */
export default function QuoteCard({ level = "general", style = {} }) {
  const [quote, setQuote] = useState(() => getRandomQuote(level));
  const [key, setKey] = useState(0);

  const refresh = () => {
    setQuote(getRandomQuote(level));
    setKey(k => k + 1);
  };

  return (
    <div style={{
      borderRadius: "var(--r-lg)",
      background: "linear-gradient(135deg, rgba(124,92,255,0.08), rgba(0,212,255,0.05))",
      border: "1px solid rgba(124,92,255,0.2)",
      borderLeft: "4px solid var(--accent-1)",
      padding: "20px 24px",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>
      {/* Decorative quote mark */}
      <div style={{
        position: "absolute", top: 10, right: 16,
        fontSize: 72, color: "rgba(124,92,255,0.08)",
        fontFamily: "Georgia, serif", lineHeight: 1,
        userSelect: "none", pointerEvents: "none",
      }}>"</div>

      <AnimatePresence mode="wait">
        <motion.div key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-1)", marginBottom: 10 }}>
            💬 Daily Inspiration
          </div>
          <p style={{
            fontSize: 15, fontStyle: "italic", color: "var(--text)",
            lineHeight: 1.7, margin: "0 0 12px", fontWeight: 500,
          }}>
            "{quote.text}"
          </p>
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>
            — {quote.author}
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={refresh}
        style={{
          marginTop: 14, background: "none", border: "1px solid rgba(124,92,255,0.3)",
          borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700,
          color: "var(--accent-1)", cursor: "pointer", display: "flex",
          alignItems: "center", gap: 6,
        }}
      >
        ↻ New quote
      </button>
    </div>
  );
}
