# Real Authentication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fake demo-token auth with real JWT-based register/login, link predictions to user accounts, and add an avatar dropdown to the Navbar.

**Architecture:** FastAPI backend gains `/register`, `/login`, `/me` endpoints using bcrypt + PyJWT. The `predictions` table gets a nullable `user_id` column. All frontend pages send the JWT Bearer token when available; the server uses it to scope history and save predictions per-user.

**Tech Stack:** Python `bcrypt`, `PyJWT`, FastAPI, SQLite, React, framer-motion, axios

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `burnout-backend/main.py` | Modify | Add users table, auth endpoints, update predict/history |
| `burnout-backend/requirements.txt` | Modify | Add bcrypt, PyJWT |
| `burnout-frontend/src/pages/Login.js` | Modify | Call real `/login` API |
| `burnout-frontend/src/pages/Register.js` | Modify | Call real `/register` API |
| `burnout-frontend/src/App.js` | Modify | Validate token via `/me` on mount |
| `burnout-frontend/src/pages/Predict.js` | Modify | Send Bearer token with prediction |
| `burnout-frontend/src/pages/Dashboard.js` | Modify | Send Bearer token for personal history |
| `burnout-frontend/src/components/Navbar.js` | Modify | Avatar + dropdown replacing logout button |
| `burnout-frontend/src/components/Navbar.css` | Modify | Styles for avatar + dropdown |

---

## Task 1: Backend — add bcrypt + PyJWT dependencies

**Files:**
- Modify: `burnout-backend/requirements.txt`

- [ ] **Step 1: Update requirements.txt**

Replace the contents of `burnout-backend/requirements.txt` with:

```
fastapi==0.128.8
uvicorn==0.39.0
joblib==1.5.3
pandas==2.3.3
numpy==2.0.2
xgboost==2.1.4
pydantic==2.12.5
scikit-learn
bcrypt==4.2.1
PyJWT==2.10.1
```

- [ ] **Step 2: Verify install locally (optional but recommended)**

```bash
cd burnout-backend
pip install bcrypt==4.2.1 PyJWT==2.10.1
python -c "import bcrypt, jwt; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add burnout-backend/requirements.txt
git commit -m "feat(auth): add bcrypt and PyJWT dependencies"
```

---

## Task 2: Backend — users table + auth helpers

**Files:**
- Modify: `burnout-backend/main.py` (top section, after existing DB setup)

- [ ] **Step 1: Add imports and JWT config after the existing imports block**

Find the line `import sqlite3` in `main.py` and add below it:

```python
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7
```

- [ ] **Step 2: Add users table creation after the existing predictions table creation**

Find the `conn.commit()` line that follows the predictions `CREATE TABLE` and add after it:

```python
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        email      TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
conn.commit()
print("[OK] Users table ready")
```

- [ ] **Step 3: Add user_id column to predictions table (migration)**

Directly after the users table commit, add:

```python
# Migrate predictions table: add user_id column if missing
try:
    cursor.execute("ALTER TABLE predictions ADD COLUMN user_id INTEGER REFERENCES users(id)")
    conn.commit()
    print("[OK] Added user_id column to predictions")
except Exception:
    pass  # Column already exists
```

- [ ] **Step 4: Add auth helper functions**

After the `offline_chat` function, add:

```python
# ── Auth helpers ──────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Returns payload dict or None if invalid/expired."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_user_from_request(request) -> dict | None:
    """Extract and validate Bearer token from request headers."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return decode_token(auth[7:])
```

- [ ] **Step 5: Add FastAPI Request import**

At the top of the file, update the fastapi import line:

```python
from fastapi import FastAPI, Request
```

- [ ] **Step 6: Commit**

```bash
git add burnout-backend/main.py
git commit -m "feat(auth): add users table, JWT helpers, bcrypt helpers"
```

---

## Task 3: Backend — /register, /login, /me endpoints

**Files:**
- Modify: `burnout-backend/main.py` (routes section)

- [ ] **Step 1: Add /register endpoint**

After the `GET /` home route, add:

```python
@app.post("/register")
def register(data: dict):
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return {"error": "Email and password are required"}, 400
    if len(password) < 6:
        return {"error": "Password must be at least 6 characters"}, 400

    try:
        hashed = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email, hashed),
        )
        conn.commit()
        return {"message": "Account created successfully"}
    except Exception:
        return {"error": "Email already registered"}
```

- [ ] **Step 2: Add /login endpoint**

Directly after `/register`:

```python
@app.post("/login")
def login(data: dict):
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    cursor.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()

    if not row or not verify_password(password, row[1]):
        return {"error": "Invalid email or password"}

    token = create_token(user_id=row[0], email=email)
    return {"token": token, "email": email}
```

- [ ] **Step 3: Add /me endpoint**

Directly after `/login`:

```python
@app.get("/me")
def me(request: Request):
    user = get_user_from_request(request)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"id": user["sub"], "email": user["email"]}
```

- [ ] **Step 4: Verify manually**

Start the backend locally and test:
```bash
cd burnout-backend
uvicorn main:app --reload

# In another terminal:
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# Expected: {"message":"Account created successfully"}

curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# Expected: {"token":"eyJ...","email":"test@test.com"}
```

- [ ] **Step 5: Commit**

```bash
git add burnout-backend/main.py
git commit -m "feat(auth): add /register, /login, /me endpoints"
```

---

## Task 4: Backend — link predictions to users

**Files:**
- Modify: `burnout-backend/main.py` (`/predict` and `/history` routes)

- [ ] **Step 1: Update /predict to accept optional user_id**

Find the `@app.post("/predict")` route. Replace the `cursor.execute` insert line:

```python
# OLD:
cursor.execute(
    "INSERT INTO predictions (study, sleep, social, physical, result) VALUES (?,?,?,?,?)",
    (study, sleep, social, physical, result_label),
)

# NEW — replace with:
user = get_user_from_request(request)
user_id = user["sub"] if user else None
cursor.execute(
    "INSERT INTO predictions (study, sleep, social, physical, result, user_id) VALUES (?,?,?,?,?,?)",
    (study, sleep, social, physical, result_label, user_id),
)
```

Also update the function signature to accept `request: Request`:

```python
# OLD:
@app.post("/predict")
def predict(data: dict):

# NEW:
@app.post("/predict")
def predict(data: dict, request: Request):
```

- [ ] **Step 2: Update /history to filter by user when token present**

Find the `@app.get("/history")` route. Replace its entire body with:

```python
@app.get("/history")
def get_prediction_history(request: Request):
    try:
        user = get_user_from_request(request)
        if user:
            cursor.execute(
                "SELECT id, study, sleep, social, physical, result, created_at "
                "FROM predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200",
                (user["sub"],),
            )
        else:
            cursor.execute(
                "SELECT id, study, sleep, social, physical, result, created_at "
                "FROM predictions ORDER BY created_at DESC LIMIT 200"
            )
        rows = cursor.fetchall()
        return [
            {"id": r[0], "study": r[1], "sleep": r[2], "social": r[3],
             "physical": r[4], "result": r[5], "created_at": r[6]}
            for r in rows
        ]
    except Exception as e:
        return {"error": str(e)}
```

- [ ] **Step 3: Commit**

```bash
git add burnout-backend/main.py
git commit -m "feat(auth): link predictions to users, scope /history by token"
```

---

## Task 5: Backend — deploy to Railway

**Files:** none (Railway auto-deploys on push)

- [ ] **Step 1: Push all backend changes**

```bash
git push origin main
```

- [ ] **Step 2: Add JWT_SECRET env var on Railway**

Go to Railway dashboard → your backend service → Variables → Add:
- Key: `JWT_SECRET`
- Value: any long random string e.g. `burnout-ai-super-secret-jwt-2026`

- [ ] **Step 3: Verify Railway redeploy succeeds**

Watch Railway logs — confirm `[OK] Users table ready` appears.

Test the live endpoint:
```bash
curl -X POST https://web-production-43ab4.up.railway.app/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@demo.com","password":"123456"}'
# Expected: {"message":"Account created successfully"}
```

---

## Task 6: Frontend — Login.js calls real API

**Files:**
- Modify: `burnout-frontend/src/pages/Login.js`

- [ ] **Step 1: Replace the fake handleLogin with a real API call**

Replace the entire `handleLogin` function:

```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  if (!email || !password) {
    toast.error("Missing info", "Please enter both email and password");
    return;
  }
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error("Login failed", data.error);
      return;
    }
    localStorage.setItem("token", data.token);
    localStorage.setItem("userEmail", data.email);
    setIsLoggedIn(true);
    toast.success("Welcome back 👋", "Logged in successfully");
    navigate("/dashboard");
  } catch {
    toast.error("Connection error", "Could not reach the server");
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 2: Add API_BASE import at the top of Login.js**

```javascript
import API_BASE from "../utils/api";
```

- [ ] **Step 3: Commit**

```bash
git add burnout-frontend/src/pages/Login.js
git commit -m "feat(auth): Login.js calls real /login API"
```

---

## Task 7: Frontend — Register.js calls real API

**Files:**
- Modify: `burnout-frontend/src/pages/Register.js`

- [ ] **Step 1: The Register.js already calls `/register` with a try/catch fallback — update it to use API_BASE and remove the demo fallback**

Replace the `handleRegister` function's try/catch body:

```javascript
const handleRegister = async (e) => {
  e.preventDefault();
  if (!email || !password) {
    toast.error("Missing info", "Please fill in all fields");
    return;
  }
  if (password.length < 6) {
    toast.error("Password too short", "Must be at least 6 characters");
    return;
  }
  if (password !== confirmPassword) {
    toast.error("Passwords don't match", "Re-enter and try again");
    return;
  }
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (data.error) {
      toast.error("Registration failed", data.error);
      return;
    }
    toast.success("Account created ✨", "Redirecting to login...");
    setTimeout(() => navigate("/login"), 1100);
  } catch {
    toast.error("Connection error", "Could not reach the server");
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 2: Add API_BASE import at the top of Register.js (it already imports from ../utils/api via REACT_APP_BACKEND — replace that with the import)**

```javascript
import API_BASE from "../utils/api";
```

Remove the old line:
```javascript
const apiUrl = process.env.REACT_APP_BACKEND || "";
```
(This is now handled by the imported `API_BASE`.)

- [ ] **Step 3: Commit**

```bash
git add burnout-frontend/src/pages/Register.js
git commit -m "feat(auth): Register.js calls real /register API, remove demo fallback"
```

---

## Task 8: Frontend — App.js validates token on mount

**Files:**
- Modify: `burnout-frontend/src/App.js`

- [ ] **Step 1: Add API_BASE import**

At the top of App.js add:
```javascript
import API_BASE from "./utils/api";
```

- [ ] **Step 2: Replace the token check useEffect**

Find:
```javascript
useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) setIsLoggedIn(true);
}, []);
```

Replace with:
```javascript
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
```

- [ ] **Step 3: Commit**

```bash
git add burnout-frontend/src/App.js
git commit -m "feat(auth): validate JWT via /me on app mount"
```

---

## Task 9: Frontend — Predict.js sends Bearer token

**Files:**
- Modify: `burnout-frontend/src/pages/Predict.js`

- [ ] **Step 1: Update the axios.post call to include Authorization header when token exists**

Find:
```javascript
const { data } = await axios.post(`${API_BASE}/predict`, mapped);
```

Replace with:
```javascript
const token = localStorage.getItem("token");
const headers = token ? { Authorization: `Bearer ${token}` } : {};
const { data } = await axios.post(`${API_BASE}/predict`, mapped, { headers });
```

- [ ] **Step 2: Commit**

```bash
git add burnout-frontend/src/pages/Predict.js
git commit -m "feat(auth): send Bearer token with predictions when logged in"
```

---

## Task 10: Frontend — Dashboard.js sends Bearer token for history

**Files:**
- Modify: `burnout-frontend/src/pages/Dashboard.js`

- [ ] **Step 1: Find the /history axios call**

Find:
```javascript
const res = await axios.get(`${API_BASE}/history`, { timeout: 5000 });
```

Replace with:
```javascript
const token = localStorage.getItem("token");
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
const res = await axios.get(`${API_BASE}/history`, {
  timeout: 5000,
  headers: authHeaders,
});
```

- [ ] **Step 2: Commit**

```bash
git add burnout-frontend/src/pages/Dashboard.js
git commit -m "feat(auth): send Bearer token for personal prediction history"
```

---

## Task 11: Frontend — Navbar avatar dropdown

**Files:**
- Modify: `burnout-frontend/src/components/Navbar.js`
- Modify: `burnout-frontend/src/components/Navbar.css`

- [ ] **Step 1: Update Navbar.js — add avatar state and replace the logout button**

Replace the entire contents of `Navbar.js` with:

```javascript
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
```

- [ ] **Step 2: Add avatar + dropdown CSS to Navbar.css**

Append to the end of `Navbar.css`:

```css
/* ── Avatar + dropdown ─────────────────────────────────────── */
.nav-avatar-wrap {
  position: relative;
  margin-left: 8px;
}

.nav-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--grad-primary);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-display);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px var(--border-accent);
  transition: box-shadow 0.2s, transform 0.15s;
  padding: 0;
  width: 36px;
}

.nav-avatar::before { display: none; }

.nav-avatar:hover:not(:disabled) {
  box-shadow: 0 0 0 3px var(--accent-1), var(--glow-violet);
  transform: scale(1.07);
}

.nav-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 210px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 200;
}

.nav-dropdown-email {
  padding: 14px 16px 10px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
  word-break: break-all;
}

.nav-dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 0 12px;
}

.nav-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  border-radius: 0;
}

.nav-dropdown-item::before { display: none; }

.nav-dropdown-item:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
  transform: none;
  box-shadow: none;
}

.nav-dropdown-item.danger:hover:not(:disabled) {
  background: var(--danger-bg);
  color: var(--danger);
}

/* Mobile: avatar becomes full-width row */
@media (max-width: 768px) {
  .nav-avatar-wrap { width: 100%; margin-left: 0; }

  .nav-avatar {
    width: 100%;
    border-radius: var(--r-sm);
    height: 44px;
    justify-content: flex-start;
    padding: 0 14px;
    gap: 10px;
    font-size: 15px;
  }

  .nav-dropdown {
    position: static;
    box-shadow: none;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    margin-top: 6px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add burnout-frontend/src/components/Navbar.js burnout-frontend/src/components/Navbar.css
git commit -m "feat(auth): avatar dropdown replacing logout button in Navbar"
```

---

## Task 12: Push everything + redeploy

- [ ] **Step 1: Push all commits to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Add JWT_SECRET to Railway**

Railway dashboard → backend service → Variables:
- `JWT_SECRET` = `burnout-ai-jwt-secret-2026` (or any long random string)

- [ ] **Step 3: Netlify auto-redeploys from GitHub push — wait for green deploy**

- [ ] **Step 4: Smoke test the live site**

1. Go to your Netlify URL
2. Click "Get Started" → register with a real email + password
3. Log in → confirm avatar appears in Navbar with your initial
4. Click avatar → see dropdown with email + Log out
5. Take the assessment → go to Dashboard → "My Predictions" tab → your prediction appears
6. Log out → take assessment again → go to Dashboard → "My Predictions" tab shows "log in" prompt
7. Log back in → your history is still there

---

## Summary of commits produced

1. `feat(auth): add bcrypt and PyJWT dependencies`
2. `feat(auth): add users table, JWT helpers, bcrypt helpers`
3. `feat(auth): add /register, /login, /me endpoints`
4. `feat(auth): link predictions to users, scope /history by token`
5. `feat(auth): Login.js calls real /login API`
6. `feat(auth): Register.js calls real /register API, remove demo fallback`
7. `feat(auth): validate JWT via /me on app mount`
8. `feat(auth): send Bearer token with predictions when logged in`
9. `feat(auth): send Bearer token for personal prediction history`
10. `feat(auth): avatar dropdown replacing logout button in Navbar`
