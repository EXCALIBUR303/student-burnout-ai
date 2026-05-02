import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";

function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [dropOpen, setDropOpen]     = useState(false);
  const location                    = useLocation();
  const navigate                    = useNavigate();
  const linksRef                    = useRef(null);
  const dropRef                     = useRef(null);
  const [indicator, setIndicator]   = useState({ left: 0, width: 0, opacity: 0 });

  const userEmail = localStorage.getItem("userEmail") || "";
  const initials  = userEmail ? userEmail[0].toUpperCase() : "?";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    setDropOpen(false);
    setMenuOpen(false);
    navigate("/");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive  = (path) => location.pathname === path;
  const closeMenu = () => setMenuOpen(false);

  // Animated underline indicator
  useEffect(() => {
    if (!linksRef.current || menuOpen) return;
    const activeEl = linksRef.current.querySelector("a.active");
    if (activeEl) {
      const parentRect = linksRef.current.getBoundingClientRect();
      const rect       = activeEl.getBoundingClientRect();
      setIndicator({ left: rect.left - parentRect.left, width: rect.width, opacity: 1 });
    } else {
      setIndicator((s) => ({ ...s, opacity: 0 }));
    }
  }, [location.pathname, isLoggedIn, menuOpen]);

  const publicLinks  = [{ to: "/predict", label: "Assessment" }, { to: "/login", label: "Log in" }];
  const privateLinks = [{ to: "/dashboard", label: "Dashboard" }, { to: "/predict", label: "Predict" }, { to: "/flowchart", label: "Recovery" }];
  const links        = isLoggedIn ? privateLinks : publicLinks;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        <span className="navbar-logo" aria-hidden="true">🧠</span>
        <span>Burnout<span className="brand-dim">/AI</span></span>
      </Link>

      <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu" aria-expanded={menuOpen}>
        {menuOpen ? "✕" : "☰"}
      </button>

      <div className={`navbar-links ${menuOpen ? "open" : ""}`} ref={linksRef}>
        <motion.span className="nav-indicator" animate={indicator}
          transition={{ type: "spring", stiffness: 380, damping: 32 }} />

        {links.map((link) => (
          <Link key={link.to} to={link.to}
            className={isActive(link.to) ? "active" : ""} onClick={closeMenu}>
            {link.label}
          </Link>
        ))}

        {!isLoggedIn && (
          <Link to="/register"
            className={`nav-cta ${isActive("/register") ? "active" : ""}`}
            onClick={closeMenu}>
            Get Started
          </Link>
        )}

        {isLoggedIn && (
          <div className="nav-avatar-wrap" ref={dropRef}>
            <button className="nav-avatar" onClick={() => setDropOpen(!dropOpen)}
              aria-label="Account menu" aria-expanded={dropOpen}>
              {initials}
            </button>

            <AnimatePresence>
              {dropOpen && (
                <motion.div className="nav-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="nav-dropdown-email">{userEmail}</div>
                  <div className="nav-dropdown-divider" />
                  <button className="nav-dropdown-item danger" onClick={logout}>
                    🚪 Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <ThemeToggle />
      </div>
    </nav>
  );
}

export default Navbar;
