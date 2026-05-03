import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { key: "home",     label: "Home",     icon: "🏠", path: "/" },
  { key: "predict",  label: "Predict",  icon: "🔮", path: "/predict" },
  { key: "recovery", label: "Recovery", icon: "🌱", path: "/flowchart" },
  { key: "dashboard",label: "Dashboard",icon: "📊", path: "/dashboard" },
  { key: "chat",     label: "Chat",     icon: "💬", path: null },
];

export default function BottomNav({ onChatOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setVisible(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!visible) return null;

  const activeKey = (() => {
    const p = location.pathname;
    if (p === "/") return "home";
    if (p.startsWith("/predict")) return "predict";
    if (p.startsWith("/flowchart")) return "recovery";
    if (p.startsWith("/dashboard")) return "dashboard";
    return null;
  })();

  const handleTab = (tab) => {
    if (tab.path === null) {
      // Chat tab — trigger callback
      onChatOpen && onChatOpen();
    } else {
      navigate(tab.path);
    }
  };

  return (
    <>
      <nav style={styles.nav}>
        {TABS.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTab(tab)}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
              }}
              aria-label={tab.label}
            >
              <span style={{ ...styles.icon, ...(isActive ? styles.iconActive : {}) }}>
                {tab.icon}
              </span>
              <span style={{ ...styles.label, ...(isActive ? styles.labelActive : {}) }}>
                {tab.label}
              </span>
              {isActive && <span style={styles.activeDot} />}
            </button>
          );
        })}
      </nav>
      {/* Spacer so page content isn't hidden behind the nav */}
      <div style={styles.spacer} />
    </>
  );
}

const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "stretch",
    background: "var(--bg-elevated)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid var(--border)",
    paddingBottom: "env(safe-area-inset-bottom, 8px)",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
  },
  tab: {
    flex: 1,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 4px 6px",
    gap: 3,
    position: "relative",
    borderRadius: 0,
    boxShadow: "none",
    transition: "background 0.2s",
    width: "auto",
    minWidth: 0,
    color: "var(--text-muted)",
  },
  tabActive: {
    color: "var(--accent-1)",
    background: "rgba(124,92,255,0.08)",
  },
  icon: {
    fontSize: 20,
    lineHeight: 1,
    transition: "transform 0.18s ease",
    display: "block",
  },
  iconActive: {
    transform: "translateY(-2px) scale(1.12)",
    filter: "drop-shadow(0 0 6px rgba(124,92,255,0.6))",
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.03em",
    lineHeight: 1,
    color: "var(--text-dim)",
    transition: "color 0.18s",
    whiteSpace: "nowrap",
  },
  labelActive: {
    background: "var(--grad-primary)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  },
  activeDot: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: 32,
    height: 2,
    borderRadius: "0 0 3px 3px",
    background: "var(--grad-primary)",
    boxShadow: "0 0 8px rgba(124,92,255,0.7)",
  },
  spacer: {
    height: 64,
  },
};
