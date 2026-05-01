import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        width: 40,
        height: 40,
        padding: 0,
        borderRadius: 10,
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        color: "var(--text)",
        fontSize: 17,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.span
        key={theme}
        initial={{ y: -20, opacity: 0, rotate: -90 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: "grid", placeItems: "center" }}
      >
        {isDark ? "☾" : "☀"}
      </motion.span>
    </button>
  );
}