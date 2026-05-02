import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";

function Navbar({ isLoggedIn, setIsLoggedIn }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const linksRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  const isActive = (path) => location.pathname === path;
  const closeMenu = () => setMenuOpen(false);

  // Animated underline indicator — positions itself under the active link
  useEffect(() => {
    if (!linksRef.current || menuOpen) return;
    const activeEl = linksRef.current.querySelector("a.active");
    if (activeEl) {
      const parentRect = linksRef.current.getBoundingClientRect();
      const rect = activeEl.getBoundingClientRect();
      setIndicator({
        left: rect.left - parentRect.left,
        width: rect.width,
        opacity: 1,
      });
    } else {
      setIndicator((s) => ({ ...s, opacity: 0 }));
    }
  }, [location.pathname, isLoggedIn, menuOpen]);

  const publicLinks = [
    { to: "/predict", label: "Assessment" },
    { to: "/login", label: "Log in" },
  ];

  const privateLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/predict", label: "Predict" },
    { to: "/flowchart", label: "Recovery" },
  ];

  const links = isLoggedIn ? privateLinks : publicLinks;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        <span className="navbar-logo" aria-hidden="true">🧠</span>
        <span>Burnout<span className="brand-dim">/AI</span></span>
      </Link>

      <button
        className="navbar-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <div className={`navbar-links ${menuOpen ? "open" : ""}`} ref={linksRef}>
        {/* Animated underline (desktop only via CSS) */}
        <motion.span
          className="nav-indicator"
          animate={indicator}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />

        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={isActive(link.to) ? "active" : ""}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}

        {!isLoggedIn && (
          <Link
            to="/register"
            className={`nav-cta ${isActive("/register") ? "active" : ""}`}
            onClick={closeMenu}
          >
            Get Started
          </Link>
        )}

        {isLoggedIn && (
          <button
            className="nav-logout"
            onClick={() => { closeMenu(); logout(); }}
          >
            Log out
          </button>
        )}

        <ThemeToggle />
      </div>
    </nav>
  );
}

export default Navbar;