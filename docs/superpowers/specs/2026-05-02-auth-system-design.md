# Real Authentication System — Design Spec
**Date:** 2026-05-02  
**Project:** Student Burnout AI

---

## Overview
Replace the current fake demo-token auth with a real JWT-based registration and login system. Users can register instantly (no email verification), log in, and have their predictions saved to their personal account.

---

## Backend Changes (FastAPI + SQLite)

### New `users` table
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| email | TEXT UNIQUE | Lowercase, trimmed |
| password_hash | TEXT | bcrypt hash |
| created_at | TIMESTAMP | Default now |

### `predictions` table update
- Add nullable `user_id` column (FK to users.id)
- Anonymous predictions → `user_id = NULL`
- Logged-in predictions → `user_id = <id>`

### New endpoints
| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | /register | No | Hash password, create user, return `{ message }` |
| POST | /login | No | Verify password, return `{ token, email }` (JWT, 7-day expiry) |
| GET | /me | Yes (Bearer) | Validate token, return `{ email, id }` |

### Updated endpoints
| Method | Path | Change |
|---|---|---|
| POST | /predict | Optional token — if valid, save prediction with user_id |
| GET | /history | Optional token — if valid, return only that user's rows; else return all |

### New packages
- `bcrypt` — password hashing
- `pyjwt` — JWT signing and verification

### JWT
- Algorithm: HS256
- Payload: `{ sub: user_id, email, exp }`
- Expiry: 7 days
- Secret: `JWT_SECRET` environment variable (fallback to hardcoded dev secret)

---

## Frontend Changes

### Login.js
- POST to `${API_BASE}/login` with `{ email, password }`
- On success: store JWT in `localStorage("token")`, store email in `localStorage("userEmail")`
- On failure: show toast error with server message

### Register.js
- POST to `${API_BASE}/register` with `{ email, password }`
- On success: toast + redirect to `/login`
- On failure: show toast error (e.g. "Email already registered")

### App.js
- On mount: if token exists in localStorage, call `GET /me` with Bearer token
- If `/me` returns 401 → clear localStorage, set `isLoggedIn = false`
- If `/me` succeeds → set `isLoggedIn = true`, store email

### Predict.js
- If token exists in localStorage, add `Authorization: Bearer <token>` header to `POST /predict`
- Anonymous users: no header → prediction saved without user_id

### Dashboard.js
- `GET /history`: add `Authorization: Bearer <token>` header if token exists
- Personal tab shows only user's own predictions (filtered server-side)

### Navbar.js
- When logged in: show initials avatar (first letter of email)
- Click avatar → dropdown with email display + "Logout" button
- Logout: clear localStorage, set `isLoggedIn = false`, navigate to `/`

---

## User Flows

### Anonymous user
1. Visits app → takes assessment → sees result
2. Prediction saved with `user_id = NULL`
3. Dashboard dataset tab works (shows aggregate stats)
4. Dashboard "My Predictions" tab → prompts to log in

### Registered user
1. Registers → redirected to login
2. Logs in → JWT stored in localStorage
3. Takes assessment → prediction saved to their account
4. Dashboard "My Predictions" tab → shows personal history

---

## Security Notes
- Passwords never stored in plain text (bcrypt, cost factor 12)
- JWT secret via environment variable on Railway
- Token validated server-side on every protected request
- No email verification (instant activation)
