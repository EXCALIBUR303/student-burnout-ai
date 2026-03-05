import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Predict from "./pages/Predict";
import { motion, AnimatePresence } from "framer-motion";
import Background from "./components/Background";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setIsLoggedIn(true);
  }, []);

  return (
    <Router>
      <Background />
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <AnimatePresence mode="wait">
  <Routes>
    <Route
      path="/"
      element={
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.4 }}
        >
          <Login setIsLoggedIn={setIsLoggedIn} />
        </motion.div>
      }
    />

    <Route
      path="/dashboard"
      element={
        isLoggedIn ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Dashboard />
          </motion.div>
        ) : (
          <Navigate to="/" />
        )
      }
    />

    <Route
      path="/predict"
      element={
        isLoggedIn ? <Predict /> : <Navigate to="/" />
      }
    />
  </Routes>
</AnimatePresence>
    </Router>
  );
}

export default App;