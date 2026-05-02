/**
 * setupProxy.js — CRA dev-server proxy
 *
 * Mirrors CRA's built-in proxy behaviour: only forward XHR / fetch API calls
 * (no "text/html" in Accept), never browser-navigation GET requests.
 * This prevents React Router routes (e.g. /predict) from being hijacked.
 *
 * Default target: Railway deployment (no local backend needed).
 * Override for local dev via .env.local:
 *   REACT_APP_BACKEND=http://localhost:8000
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

const TARGET =
  process.env.REACT_APP_BACKEND || "https://web-production-43ab4.up.railway.app";

// Only proxy non-HTML requests (axios / fetch calls).
// Browser navigation sends Accept: text/html — skip those so React Router works.
const isApiCall = (_pathname, req) => {
  const accept = req.headers["accept"] || "";
  return !accept.includes("text/html");
};

const API_ROUTES = ["/predict", "/plan", "/chat", "/data", "/stats", "/history"];

module.exports = function (app) {
  API_ROUTES.forEach((route) => {
    app.use(
      route,
      createProxyMiddleware(isApiCall, {
        target: TARGET,
        changeOrigin: true,
        logLevel: "warn",
        onError: (_err, _req, res) => {
          res.status(503).json({ error: "Backend unavailable" });
        },
      })
    );
  });
};
