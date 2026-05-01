/**
 * setupProxy.js — CRA dev-server proxy
 *
 * Default target: Railway deployment (always-on, no local backend needed).
 * Override for local dev by setting REACT_APP_BACKEND in .env.local:
 *   REACT_APP_BACKEND=http://localhost:8000
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

const TARGET =
  process.env.REACT_APP_BACKEND || "https://web-production-43ab4.up.railway.app";

const API_ROUTES = ["/predict", "/plan", "/chat", "/data", "/stats", "/history"];

module.exports = function (app) {
  API_ROUTES.forEach((route) => {
    app.use(
      route,
      createProxyMiddleware({
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
