import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "./components/Navbar";
import OnboardingModal from "./components/OnboardingModal";
import AuroraBackground from "./components/AuroraBackground";
import MagneticCursor from "./components/MagneticCursor";
import ChatBot from "./components/ChatBot";
import Toaster from "./components/Toaster";
import BottomNav from "./components/BottomNav";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Predict from "./pages/Predict";
import Flowchart from "./pages/Flowchart";
import Landing from "./pages/Landing";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

import "./App.css";
import API_BASE from "./utils/api";

// Reusable fade+slide wrapper
const Page = ({ children, variant = "fade" }) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideLeft: {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 30 },
    },
    slideRight: {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -30 },
    },
    slideUp: {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -24 },
    },
  };
  return (
    <motion.div {...variants[variant]} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
};

// Routes are separated so we can use useLocation() for AnimatePresence keying
function AppRoutes({ isLoggedIn, setIsLoggedIn }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"        element={<Page variant="fade"><Landing /></Page>} />
        <Route path="/login"   element={<Page variant="slideLeft"><Login setIsLoggedIn={setIsLoggedIn} /></Page>} />
        <Route path="/register" element={<Page variant="slideRight"><Register /></Page>} />
        <Route path="/forgot"  element={<Page variant="slideUp"><ForgotPassword /></Page>} />
        <Route path="/predict" element={<Page variant="slideUp"><Predict /></Page>} />

        <Route
          path="/dashboard"
          element={
            isLoggedIn
              ? <Page variant="fade"><Dashboard /></Page>
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/flowchart"
          element={
            isLoggedIn
              ? <Page variant="fade"><Flowchart /></Page>
              : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("onboardingDone") && !localStorage.getItem("token");
  });
  const [chatOpen, setChatOpen] = useState(false);

  // Build userContext from stored prediction data
  const buildUserContext = () => {
    try {
      const raw = localStorage.getItem("lastPrediction");
      if (raw) {
        const p = JSON.parse(raw);
        const f = p.features || p;  // new format has nested features; old has flat
        const risk  = p.prediction || p.result || "";
        const study  = f.study_hours_per_day  ?? p.study ?? null;
        const sleep  = f.sleep_hours_per_day  ?? p.sleep ?? null;
        const screen = f.screen_time_hours    ?? null;
        const gpa    = f.gpa_norm != null ? (f.gpa_norm * 10).toFixed(1) : null;
        let ctx = risk ? `${risk} burnout risk.` : "";
        if (study  !== null) ctx += ` Studies ${study}h/day.`;
        if (sleep  !== null) ctx += ` Sleeps ${sleep}h/day.`;
        if (screen !== null) ctx += ` Screen time ${screen}h/day.`;
        if (gpa    !== null) ctx += ` GPA ${gpa}/10.`;
        if (p.confidence) ctx += ` (${p.confidence}% confidence)`;
        return ctx.trim();
      }
      // Fallback: burnoutResult in localStorage
      const burnoutResult = localStorage.getItem("burnoutResult");
      if (burnoutResult) return `${burnoutResult} risk.`;
    } catch {}
    return "";
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Validate token is still good server-side
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.ok) {
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("userEmail");
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        // Network offline — trust the token for now
        setIsLoggedIn(true);
      });
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AuroraBackground />
          <MagneticCursor />
          <Toaster />

          <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
            <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            <AppRoutes isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            {isLoggedIn && (
              <ChatBot
                userContext={buildUserContext()}
                forceOpen={chatOpen || undefined}
                onClose={() => setChatOpen(false)}
              />
            )}
            <BottomNav onChatOpen={() => setChatOpen(true)} />
          </div>
          {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;