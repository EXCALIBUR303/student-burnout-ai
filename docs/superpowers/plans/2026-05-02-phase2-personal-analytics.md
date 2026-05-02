# Phase 2: Personal Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a streak counter, 12-week activity heatmap, and personal habits comparison chart to the Dashboard's My Predictions tab.

**Architecture:** Backend adds `compute_streak(user_id)` and exposes it via the existing `/insights` endpoint. Frontend-only changes handle the heatmap calendar (computed from history dates) and habits comparison (user's mean inputs vs dataset averages already in `dsStats`). All three features degrade gracefully when the user is not logged in or has no history.

**Tech Stack:** FastAPI (Python), React, recharts (BarChart already imported), framer-motion (already imported), CSS custom properties for theming.

---

### Task 1: Backend – streak counter

**Files:**
- Modify: `burnout-backend/main.py` — add `compute_streak()` after `compute_trend()`, update `/insights` response

- [ ] **Step 1: Add `compute_streak` function**

In `burnout-backend/main.py`, find this block (around line 177–178):

```python
def compute_trend(user_id: int) -> dict | None:
    ...
    return {
        "direction": direction,
        "slope":     round(slope, 3),
        "values":    [{"index": i + 1, "risk": v} for i, v in enumerate(values[-10:])],
        "count":     n,
    }
```

Insert the following function **immediately after** it (before the `# ── Auth helpers` comment):

```python
def compute_streak(user_id: int) -> int:
    """Return the number of consecutive calendar days (ending today) that the
    user has made at least one prediction.  Days are compared in UTC."""
    cursor.execute(
        "SELECT DATE(created_at) AS day FROM predictions "
        "WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY day DESC",
        (user_id,),
    )
    rows = cursor.fetchall()
    if not rows:
        return 0
    today = datetime.now(timezone.utc).date()
    streak = 0
    for i, row in enumerate(rows):
        day = datetime.strptime(row[0], "%Y-%m-%d").date()
        if day == today - timedelta(days=i):
            streak += 1
        else:
            break
    return streak
```

- [ ] **Step 2: Update `/insights` to include streak**

Find the `/insights` route:

```python
@app.get("/insights")
def insights(request: Request):
    result: dict = {"feature_importance": get_cached_feature_importance(), "trend": None}
    user = get_user_from_request(request)
    if user:
        result["trend"] = compute_trend(user["sub"])
    return result
```

Replace it with:

```python
@app.get("/insights")
def insights(request: Request):
    result: dict = {
        "feature_importance": get_cached_feature_importance(),
        "trend":   None,
        "streak":  0,
    }
    user = get_user_from_request(request)
    if user:
        result["trend"]  = compute_trend(user["sub"])
        result["streak"] = compute_streak(user["sub"])
    return result
```

- [ ] **Step 3: Verify the endpoint manually**

Start the backend (or it's already running on Railway). Hit the endpoint with a valid token:

```bash
curl -s http://localhost:8000/insights \
  -H "Authorization: Bearer <your-token>" | python -m json.tool
```

Expected shape:
```json
{
  "feature_importance": [...],
  "trend": { "direction": "stable", ... },
  "streak": 1
}
```

Without a token, `streak` must be `0` and `trend` must be `null`.

- [ ] **Step 4: Commit**

```bash
git add burnout-backend/main.py
git commit -m "feat(backend): add streak counter to /insights endpoint"
```

---

### Task 2: Frontend – streak card in stats row

**Files:**
- Modify: `burnout-frontend/src/pages/Dashboard.js`

The stats row for My Predictions currently has 4 cards with `gridTemplateColumns: "repeat(4, 1fr)"`. We add a 5th Streak card and switch to `repeat(auto-fit, minmax(148px, 1fr))` so it wraps gracefully on narrow screens.

- [ ] **Step 1: Derive streak from insights state**

Find this block (around line 282–294):

```javascript
  // ── Derived: prediction history ──
  const histHigh = history.filter(p => p.result === "High").length;
  const histMed  = history.filter(p => p.result === "Medium" || p.result === "Moderate").length;
  const histLow  = history.filter(p => p.result === "Low").length;
  const lastPred = history[0] || null;
```

Add the streak derivation **immediately after** that block:

```javascript
  const streak = insights?.streak ?? 0;
```

- [ ] **Step 2: Update the stats grid to 5 cards**

Find the history stats grid (around line 695–700):

```jsx
                {/* History stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
                  <MiniStatCard label="Total Assessments" icon="🔮" value={history.length} color="var(--accent-1)" delay={0}    />
                  <MiniStatCard label="High Risk"          icon="🔥" value={histHigh}        color="#ef4444"         delay={0.07} />
                  <MiniStatCard label="Medium Risk"        icon="⚡" value={histMed}         color="#f59e0b"         delay={0.14} />
                  <MiniStatCard label="Low Risk"           icon="✅" value={histLow}         color="#22c55e"         delay={0.21} />
                </div>
```

Replace it with:

```jsx
                {/* History stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", marginBottom: 20 }}>
                  <MiniStatCard label="Total Assessments" icon="🔮" value={history.length} color="var(--accent-1)" delay={0}    />
                  <MiniStatCard label="High Risk"          icon="🔥" value={histHigh}        color="#ef4444"         delay={0.07} />
                  <MiniStatCard label="Medium Risk"        icon="⚡" value={histMed}         color="#f59e0b"         delay={0.14} />
                  <MiniStatCard label="Low Risk"           icon="✅" value={histLow}         color="#22c55e"         delay={0.21} />
                  <MiniStatCard label="Day Streak"         icon="🔥" value={streak}          color="#f97316"         delay={0.28} />
                </div>
```

- [ ] **Step 3: Verify streak card renders**

Open the Dashboard → My Predictions tab. The 5th card "Day Streak 🔥" should appear. When logged in it shows the real value from `/insights`; when anonymous it shows 0.

- [ ] **Step 4: Commit**

```bash
git add burnout-frontend/src/pages/Dashboard.js
git commit -m "feat(dashboard): add day streak card to My Predictions stats row"
```

---

### Task 3: Frontend – 12-week activity heatmap

**Files:**
- Modify: `burnout-frontend/src/pages/Dashboard.js` — add `HeatmapCalendar` helper component + render it

- [ ] **Step 1: Add `HeatmapCalendar` helper component**

In `Dashboard.js`, find the last existing helper component before the `export default function Dashboard()` line. The last one is `getLocalHistory()` (around line 181–194). Insert the following **after** `getLocalHistory` and **before** the `// ─── Main Dashboard` comment:

```jsx
// ─── Heatmap Calendar ────────────────────────────────────────────────────────

function HeatmapCalendar({ history }) {
  const riskScore = { Low: 1, Medium: 2, Moderate: 2, High: 3 };

  // Build date → highest risk score map
  const dayMap = {};
  history.forEach((p) => {
    const d = p.created_at ? p.created_at.slice(0, 10) : null;
    if (!d) return;
    const score = riskScore[p.result] || 0;
    if (!dayMap[d] || score > dayMap[d]) dayMap[d] = score;
  });

  // 84 cells: last 84 days ending today, grouped into 12 columns of 7
  const today = new Date();
  const cells = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, score: dayMap[key] || 0 });
  }

  const weeks = [];
  for (let w = 0; w < 12; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  const COLOR  = { 0: "var(--border)", 1: "#22c55e", 2: "#f59e0b", 3: "#ef4444" };
  const LEGEND = { 0: "No activity", 1: "Low risk", 2: "Medium risk", 3: "High risk" };

  return (
    <div className="chart-card" style={{ marginBottom: 20 }}>
      <h3 className="chart-title">🗓️ Activity Heatmap</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        Assessment activity over the last 12 weeks · colour = risk level
      </p>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {week.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.key}: ${LEGEND[cell.score]}`}
                style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: COLOR[cell.score],
                  flexShrink: 0,
                  transition: "transform 0.1s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, color: "var(--text-dim)" }}>
        <span>Less</span>
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            title={LEGEND[s]}
            style={{ width: 12, height: 12, borderRadius: 2, background: COLOR[s], border: "1px solid rgba(255,255,255,0.08)" }}
          />
        ))}
        <span>High risk</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render `HeatmapCalendar` in the My Predictions tab**

In the My Predictions tab, find the "Risk Over Time" chart block (around line 702–730):

```jsx
                {/* Risk Over Time */}
                {riskTimeline.length >= 2 && (
                  <div className="chart-card" style={{ marginBottom: 20 }}>
```

Insert the `HeatmapCalendar` call **immediately before** the Risk Over Time block:

```jsx
                {/* Activity heatmap */}
                <HeatmapCalendar history={history} />

                {/* Risk Over Time */}
                {riskTimeline.length >= 2 && (
```

- [ ] **Step 3: Verify heatmap renders**

Open Dashboard → My Predictions. The heatmap grid (12 × 7 squares) should appear above the Risk Over Time chart. Hovering a square shows a tooltip with the date and risk level. Days with no assessment are grey; Low = green, Medium = amber, High = red.

- [ ] **Step 4: Commit**

```bash
git add burnout-frontend/src/pages/Dashboard.js
git commit -m "feat(dashboard): add 12-week activity heatmap to My Predictions tab"
```

---

### Task 4: Frontend – personal habits vs dataset comparison

**Files:**
- Modify: `burnout-frontend/src/pages/Dashboard.js` — derive `habitsCompare` data, add chart card in the My Predictions tab

This chart shows 4 grouped bars (Study, Sleep, Social, Activity) with "Your avg" vs "Dataset avg". The dataset averages already exist in `dsStats` (`avg_study`, `avg_sleep`, `avg_social`, `avg_physical`). The user averages are computed from `history`.

- [ ] **Step 1: Derive user-average habits**

In `Dashboard.js`, find where `streak` is derived (the line you added in Task 2 Step 1):

```javascript
  const streak = insights?.streak ?? 0;
```

Add the following **immediately after** that line:

```javascript
  // ── Derived: personal habits averages ──
  const yourAvgStudy    = history.length ? +(history.reduce((acc, p) => acc + (p.study    || 0), 0) / history.length).toFixed(1) : 0;
  const yourAvgSleep    = history.length ? +(history.reduce((acc, p) => acc + (p.sleep    || 0), 0) / history.length).toFixed(1) : 0;
  const yourAvgSocial   = history.length ? +(history.reduce((acc, p) => acc + (p.social   || 0), 0) / history.length).toFixed(1) : 0;
  const yourAvgPhysical = history.length ? +(history.reduce((acc, p) => acc + (p.physical || 0), 0) / history.length).toFixed(1) : 0;

  const habitsCompare = [
    { label: "Study",    yours: yourAvgStudy,    dataset: s.avg_study    || 6.5  },
    { label: "Sleep",    yours: yourAvgSleep,    dataset: s.avg_sleep    || 7.5  },
    { label: "Social",   yours: yourAvgSocial,   dataset: s.avg_social   || 2.0  },
    { label: "Activity", yours: yourAvgPhysical, dataset: s.avg_physical || 1.2  },
  ];
```

- [ ] **Step 2: Add the habits comparison chart to the charts row**

In the My Predictions tab, find the "Charts row" section (around line 764–811):

```jsx
                {/* Charts row */}
                <div className="charts-grid" style={{ marginBottom: 20 }}>

                  {/* Stacked bar: prediction timeline by day */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>📅 Prediction History</h3>
```

Replace the entire `{/* Charts row */}` block (lines 764–811, containing the two chart cards) with the following three-card version:

```jsx
                {/* Charts row */}
                <div className="charts-grid" style={{ marginBottom: 20 }}>

                  {/* Stacked bar: prediction timeline by day */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>📅 Prediction History</h3>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      Your assessments over time, grouped by date
                    </p>
                    {histByDay.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={histByDay}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                          <XAxis dataKey="date" stroke={AXIS} fontSize={10} tick={{ fontSize: 10 }} />
                          <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} />
                          <Tooltip contentStyle={TT} />
                          <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
                          <Bar dataKey="High"   stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                          <Bar dataKey="Medium" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                          <Bar dataKey="Low"    stackId="a" fill="#22c55e" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        Not enough data yet — make a few predictions first
                      </div>
                    )}
                  </motion.div>

                  {/* Grouped bar: you vs dataset risk profile */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>⚖️ You vs Dataset</h3>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      Your risk profile vs the {s.total.toLocaleString()}-student training dataset
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={compareData}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke={AXIS} fontSize={13} />
                        <YAxis stroke={AXIS} fontSize={12} unit="%" domain={[0,100]} />
                        <Tooltip contentStyle={TT} formatter={v => `${v}%`} />
                        <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
                        <Bar dataKey="dataset" name="Dataset %" fill="#7c5cff" radius={[6,6,0,0]} />
                        <Bar dataKey="yours"   name="Your %"    fill="#00d4ff" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Grouped bar: your daily habits vs dataset averages */}
                  <motion.div className="chart-card" whileHover={{ scale: 1.005 }}>
                    <h3>🧬 Your Habits vs Dataset</h3>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
                      Your average daily hours vs the dataset population (h/day)
                    </p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={habitsCompare}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                        <YAxis stroke={AXIS} fontSize={12} unit="h" domain={[0, "auto"]} />
                        <Tooltip contentStyle={TT} formatter={(v, name) => [`${v}h`, name]} />
                        <Legend wrapperStyle={{ color: "var(--text-muted)", fontSize: 12 }} />
                        <Bar dataKey="yours"   name="Your avg"     fill="#00d4ff" radius={[6,6,0,0]} />
                        <Bar dataKey="dataset" name="Dataset avg"  fill="#7c5cff" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                </div>
```

- [ ] **Step 3: Verify the habits chart renders**

Open Dashboard → My Predictions. You should now see three chart cards: "Prediction History", "You vs Dataset", and "Your Habits vs Dataset". The third chart has cyan bars (your averages) vs purple bars (dataset averages) for Study, Sleep, Social, Activity.

- [ ] **Step 4: Commit**

```bash
git add burnout-frontend/src/pages/Dashboard.js
git commit -m "feat(dashboard): add personal habits vs dataset comparison chart"
```

---

### Task 5: Push to Railway / deploy

**Files:** No file changes — just git push.

- [ ] **Step 1: Verify all three features work together**

Run locally:
```bash
# Terminal 1 (backend)
cd burnout-backend && python main.py

# Terminal 2 (frontend)  
cd burnout-frontend && npm start
```

Log in with a test account that has ≥ 1 prediction. Confirm:
1. Stats row shows 5 cards — the 5th reads "Day Streak 🔥 1" (or your actual count)
2. Heatmap appears above "Risk Over Time" — today's cell is coloured; older days are grey
3. "Your Habits vs Dataset" chart appears in the charts row as a 3rd chart card
4. Hovering heatmap cells shows a tooltip with date + risk level

- [ ] **Step 2: Push to remote**

```bash
git push origin main
```

Railway auto-deploys on push. Wait ~2 minutes and verify the live URL.

- [ ] **Step 3: Smoke-test on Railway**

Open the Railway URL → Dashboard → My Predictions. All three Phase 2 features should render on the live deployment.
