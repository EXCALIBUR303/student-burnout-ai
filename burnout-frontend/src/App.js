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
import Background from "./components/Background";
import ChatBot from "./components/ChatBot";
import Toaster from "./components/Toaster";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Predict from "./pages/Predict";
import Flowchart from "./pages/Flowchart";
import Landing from "./pages/Landing";
import ForgotPassword from "./pages/ForgotPassword";

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
          <Background />
          <Toaster />

          <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
            <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            <AppRoutes isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            {isLoggedIn && <ChatBot />}
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;