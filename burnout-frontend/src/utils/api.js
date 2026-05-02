/**
 * api.js — centralized API base-URL helper
 *
 * Dev  : REACT_APP_BACKEND is unset (or set to http://localhost:8000)
 *        → setupProxy.js forwards relative paths to the backend
 *
 * Prod : Set REACT_APP_BACKEND=https://web-production-43ab4.up.railway.app
 *        in your Netlify / hosting environment variables.
 *        → all API calls go directly to Railway (CORS: * is enabled there)
 */
const API_BASE = process.env.REACT_APP_BACKEND || "";

export default API_BASE;
