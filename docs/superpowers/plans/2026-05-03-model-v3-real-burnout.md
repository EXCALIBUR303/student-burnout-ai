# Burnout Model v3 — From Memorization to Meaningful Prediction

> **For agentic workers:** Execute task-by-task. Each step is bite-sized (2–5 min). Run all commands from `burnout-backend/` unless noted. Commit after every passing step. Use Python 3.11+ and the existing venv.

**Goal:** Replace v2 (which memorizes the rule-based labels in `student_lifestyle_dataset.csv` — the 100% test accuracy is a leakage artifact) with a v3 model that (a) is honestly evaluated on a noisier holdout, (b) fuses multiple real-world datasets, (c) outputs calibrated probabilities, (d) returns per-prediction SHAP explanations, and (e) learns from user feedback over time.

**Architecture:** Keep XGBoost as the base learner but wrap it in `CalibratedClassifierCV` (sigmoid). Train on a multi-dataset fusion (lifestyle + sleep + depression + mental-health + social-media) with feature alignment. Add a `/predict` SHAP block to explanations, a `/feedback` endpoint that stores user-corrected labels in SQLite, and a `retrain.py` script that augments the training set with feedback samples. Diagnose v2 leakage first so we don't repeat it.

**Tech Stack:** Python 3.11, scikit-learn 1.4+, XGBoost 2.x, SHAP 0.45+, FastAPI, SQLite, joblib, pandas.

**Important context for the executor:**
- Working directory: `C:\Users\sidha\Desktop\Claude\New folder\burnout-project\` (use forward slashes in scripts)
- The current model lives at `burnout-backend/stress_model.pkl` with metadata in `burnout-backend/model_meta.json`
- Existing trainer is `burnout-backend/trainer.py` (don't delete — copy/extend)
- Untracked datasets already present in `burnout-backend/`:
  - `student_lifestyle_dataset.csv` (2k rows, has `Stress_Level` — currently the only one used)
  - `student_lifestyle_100k.csv` (100k rows, target column unclear — load_augment returns None today)
  - `student_depression_dataset.csv`
  - `student_mental_health_dataset.csv`
  - `Student Mental health.csv`
  - `Students Social Media Addiction.csv`
  - `student_sleep_patterns.csv`
  - `Sleep_health_and_lifestyle_dataset.csv`
  - `StressLevelDataset.csv`
  - `Stress_Dataset.csv`
- The FastAPI prediction path is `burnout-backend/main.py` (`@app.post("/predict")`, around line 594) — must keep response shape backwards-compatible (frontend uses `prediction`, `risk`, `confidence`, `probabilities`, `top_drivers`)
- Frontend: `burnout-frontend/src/pages/Predict.js` consumes the API
- All commits should be small. Do not commit any CSV files — they're gitignored implicitly today, but double-check `git status` before each commit.

---

## File Structure

**Created:**
- `burnout-backend/diagnostics.py` — leakage / label-quality diagnostic script
- `burnout-backend/datasets.py` — multi-dataset loaders, one function per CSV, all returning a unified schema
- `burnout-backend/trainer_v3.py` — new trainer (does not replace v2 yet; v2 stays as fallback)
- `burnout-backend/feedback.py` — feedback DB schema + helpers
- `burnout-backend/retrain.py` — retrain script that pulls fresh feedback rows + retrains
- `burnout-backend/explain.py` — SHAP explainer wrapper, cached
- `burnout-backend/tests/test_datasets.py`
- `burnout-backend/tests/test_explain.py`
- `burnout-backend/tests/test_feedback.py`

**Modified:**
- `burnout-backend/main.py` — wire SHAP into `/predict` response; add `/feedback` POST and `/feedback/stats` GET
- `burnout-backend/requirements.txt` — add `shap>=0.45`
- `burnout-frontend/src/pages/Predict.js` — add thumbs up/down feedback UI on result card

**New artifacts:**
- `burnout-backend/stress_model_v3.pkl`
- `burnout-backend/model_meta_v3.json`
- `burnout-backend/diagnostics_report.json` (committed — proves v2 leakage)

---

## Task 1: Diagnose v2 Label Leakage

**Why first:** Before building v3, prove v2 is broken. This justifies every later choice and prevents the executor from "fixing" what looks fine on the surface.

**Files:**
- Create: `burnout-backend/diagnostics.py`
- Create: `burnout-backend/diagnostics_report.json`
- Create: `burnout-backend/tests/test_diagnostics.py` (just smoke test that the script runs)

- [ ] **Step 1: Write the failing test**

```python
# burnout-backend/tests/test_diagnostics.py
import json, os, subprocess, sys

def test_diagnostics_runs_and_writes_report(tmp_path):
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out  = tmp_path / "report.json"
    result = subprocess.run(
        [sys.executable, "diagnostics.py", "--out", str(out)],
        cwd=repo, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    data = json.loads(out.read_text())
    assert "leakage_score" in data
    assert "rule_recovered_accuracy" in data
    assert 0.0 <= data["leakage_score"] <= 1.0
```

- [ ] **Step 2: Run test to confirm it fails**

```
pytest burnout-backend/tests/test_diagnostics.py -v
```
Expected: FAIL (`diagnostics.py` does not exist).

- [ ] **Step 3: Implement `diagnostics.py`**

The script must: (a) train a single decision tree (max_depth=4) on the four core lifestyle features against `Stress_Level`; (b) report its accuracy — if >0.95, the labels are rule-based; (c) print the recovered rules; (d) compute mutual information between each engineered feature and the label; (e) write all of this to `--out`.

```python
# burnout-backend/diagnostics.py
"""
Proves whether v2's 100% test accuracy is real signal or label leakage.

Method: a 4-node decision tree should NOT fit a noisy real-world target with
>95% accuracy. If it does, the labels are a deterministic function of the
features and our XGBoost is just memorizing that function.
"""
import argparse, json
import pandas as pd
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.feature_selection import mutual_info_classif
from sklearn.model_selection import cross_val_score

LABEL_MAP = {"Low": 0, "Moderate": 1, "Medium": 1, "High": 2}

def main(out_path: str):
    df = pd.read_csv("student_lifestyle_dataset.csv")
    df.columns = df.columns.str.strip()
    y = df["Stress_Level"].str.strip().map(LABEL_MAP).dropna().astype(int)
    X = df.loc[y.index, [
        "Study_Hours_Per_Day", "Sleep_Hours_Per_Day",
        "Social_Hours_Per_Day", "Physical_Activity_Hours_Per_Day",
    ]].astype(float)

    # 1. Tiny tree: if >0.95 accuracy, it's rule-based
    tree = DecisionTreeClassifier(max_depth=4, random_state=42)
    cv = cross_val_score(tree, X, y, cv=5, scoring="accuracy")
    rule_acc = float(cv.mean())

    # 2. Mutual info on engineered features (the worst offender)
    X_eng = X.assign(
        study_sleep_ratio=X.Study_Hours_Per_Day / (X.Sleep_Hours_Per_Day + 0.1),
        sleep_deficit=(7.5 - X.Sleep_Hours_Per_Day).clip(lower=0),
    )
    mi = mutual_info_classif(X_eng, y, random_state=42)
    mi_dict = dict(zip(X_eng.columns, [round(float(v), 4) for v in mi]))

    # 3. Print the recovered rules so a human can confirm
    tree.fit(X, y)
    rules = export_text(tree, feature_names=list(X.columns))

    report = {
        "rule_recovered_accuracy": round(rule_acc, 4),
        "leakage_score": round(rule_acc, 4),  # >0.95 = leaky, <0.7 = real signal
        "verdict": "LEAKAGE — labels are rule-based" if rule_acc > 0.95
                  else "Likely real signal" if rule_acc < 0.70
                  else "Mixed",
        "mutual_info_per_feature": mi_dict,
        "recovered_rules": rules,
    }
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps({k: v for k, v in report.items() if k != "recovered_rules"}, indent=2))
    print("\nRecovered tree rules:\n" + rules)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="diagnostics_report.json")
    main(p.parse_args().out)
```

- [ ] **Step 4: Run script + tests**

```
cd burnout-backend && python diagnostics.py --out diagnostics_report.json
pytest tests/test_diagnostics.py -v
```
Expected: pass; `rule_recovered_accuracy` will be >0.95 → confirms leakage.

- [ ] **Step 5: Commit**

```
git add burnout-backend/diagnostics.py burnout-backend/tests/test_diagnostics.py burnout-backend/diagnostics_report.json
git commit -m "diag: prove v2 model accuracy is label leakage, not real signal"
```

---

## Task 2: Multi-Dataset Loader Module

**Why:** The 100k augment dataset isn't usable today (no recognized target column). We have several other CSVs that contain real, noisy stress/burnout signal. Centralize loading so trainer + retrain scripts share the same schema.

**Files:**
- Create: `burnout-backend/datasets.py`
- Create: `burnout-backend/tests/test_datasets.py`

**Unified schema** every loader must return — a DataFrame with these columns (NaN allowed for missing):

```
study_hours_per_day, sleep_hours_per_day, social_hours_per_day,
physical_activity_hours_per_day, gpa_norm, screen_time_hours,
extracurricular_hours, target_continuous (0.0-1.0), target_class (0/1/2),
source (str — dataset name)
```

`target_continuous` is the model's preferred label going forward; `target_class` is derived via thresholds (<0.33 = Low, <0.66 = Medium, else High) for backwards compatibility.

- [ ] **Step 1: Write the failing tests**

```python
# burnout-backend/tests/test_datasets.py
import os, pandas as pd, pytest
from datasets import (
    load_lifestyle, load_sleep_health, load_depression,
    load_mental_health, load_social_media, load_all,
    UNIFIED_COLUMNS,
)

@pytest.fixture(autouse=True)
def chdir_backend():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_lifestyle_returns_unified_schema():
    df = load_lifestyle()
    assert df is None or set(UNIFIED_COLUMNS).issubset(df.columns)
    assert df is None or len(df) > 100

def test_sleep_health_returns_unified_schema():
    df = load_sleep_health()
    assert df is None or set(UNIFIED_COLUMNS).issubset(df.columns)

def test_depression_returns_unified_schema():
    df = load_depression()
    assert df is None or set(UNIFIED_COLUMNS).issubset(df.columns)

def test_load_all_concats_with_source_col():
    df = load_all()
    assert "source" in df.columns
    assert df["source"].nunique() >= 1
    assert "target_continuous" in df.columns
    assert df["target_continuous"].between(0, 1).all()
```

- [ ] **Step 2: Run tests to confirm failure**

```
cd burnout-backend && pytest tests/test_datasets.py -v
```
Expected: FAIL (`datasets.py` does not exist).

- [ ] **Step 3: Implement `datasets.py`**

```python
# burnout-backend/datasets.py
"""
Unified loaders for every CSV in burnout-backend/. Each loader returns a
DataFrame with the UNIFIED_COLUMNS schema or None if the file is missing.

target_continuous in [0, 1] is the canonical label. target_class is derived.
"""
import pandas as pd
import numpy as np
from pathlib import Path

UNIFIED_COLUMNS = [
    "study_hours_per_day", "sleep_hours_per_day", "social_hours_per_day",
    "physical_activity_hours_per_day", "gpa_norm", "screen_time_hours",
    "extracurricular_hours", "target_continuous", "target_class", "source",
]
LABEL_MAP = {"low": 0, "moderate": 1, "medium": 1, "high": 2}

def _to_class(c):
    if c < 0.33: return 0
    if c < 0.66: return 1
    return 2

def _safe_csv(name: str) -> pd.DataFrame | None:
    p = Path(name)
    if not p.exists():
        return None
    df = pd.read_csv(p)
    df.columns = df.columns.str.strip()
    return df

def _empty_unified() -> pd.DataFrame:
    return pd.DataFrame(columns=UNIFIED_COLUMNS)

def load_lifestyle() -> pd.DataFrame | None:
    df = _safe_csv("student_lifestyle_dataset.csv")
    if df is None: return None
    out = pd.DataFrame({
        "study_hours_per_day":             pd.to_numeric(df["Study_Hours_Per_Day"], errors="coerce"),
        "sleep_hours_per_day":             pd.to_numeric(df["Sleep_Hours_Per_Day"], errors="coerce"),
        "social_hours_per_day":            pd.to_numeric(df["Social_Hours_Per_Day"], errors="coerce"),
        "physical_activity_hours_per_day": pd.to_numeric(df["Physical_Activity_Hours_Per_Day"], errors="coerce"),
        "gpa_norm":                        pd.to_numeric(df["GPA"], errors="coerce") / 10.0,
        "screen_time_hours":               np.nan,
        "extracurricular_hours":           pd.to_numeric(df.get("Extracurricular_Hours_Per_Day"), errors="coerce"),
    })
    cls = df["Stress_Level"].str.strip().str.lower().map(LABEL_MAP)
    out["target_continuous"] = cls.map({0: 0.15, 1: 0.5, 2: 0.85})
    out["target_class"] = cls
    out["source"] = "lifestyle"
    return out.dropna(subset=["target_class"])

def load_sleep_health() -> pd.DataFrame | None:
    df = _safe_csv("Sleep_health_and_lifestyle_dataset.csv")
    if df is None: return None
    # Stress Level here is 1-10; normalise
    if "Stress Level" not in df.columns:
        return None
    cont = pd.to_numeric(df["Stress Level"], errors="coerce") / 10.0
    out = pd.DataFrame({
        "study_hours_per_day":             np.nan,
        "sleep_hours_per_day":             pd.to_numeric(df.get("Sleep Duration"), errors="coerce"),
        "social_hours_per_day":            np.nan,
        "physical_activity_hours_per_day": pd.to_numeric(df.get("Physical Activity Level"), errors="coerce") / 60.0,
        "gpa_norm":                        np.nan,
        "screen_time_hours":               np.nan,
        "extracurricular_hours":           np.nan,
        "target_continuous":               cont,
    })
    out["target_class"] = out["target_continuous"].apply(_to_class)
    out["source"] = "sleep_health"
    return out.dropna(subset=["target_continuous"])

def load_depression() -> pd.DataFrame | None:
    df = _safe_csv("student_depression_dataset.csv")
    if df is None: return None
    # Try common target columns
    target_col = next((c for c in df.columns if "depression" in c.lower() or "stress" in c.lower()), None)
    if target_col is None: return None
    raw = df[target_col]
    if raw.dtype == object:
        cont = raw.astype(str).str.strip().str.lower().map(LABEL_MAP)
        cont = cont.map({0: 0.15, 1: 0.5, 2: 0.85})
    else:
        cont = pd.to_numeric(raw, errors="coerce")
        if cont.max() > 1.5:
            cont = cont / cont.max()
    out = pd.DataFrame({
        "study_hours_per_day":             pd.to_numeric(df.get("Study Hours") or df.get("Work/Study Hours"), errors="coerce"),
        "sleep_hours_per_day":             pd.to_numeric(df.get("Sleep Duration"), errors="coerce"),
        "social_hours_per_day":            np.nan,
        "physical_activity_hours_per_day": np.nan,
        "gpa_norm":                        pd.to_numeric(df.get("CGPA"), errors="coerce") / 10.0,
        "screen_time_hours":               np.nan,
        "extracurricular_hours":           np.nan,
        "target_continuous":               cont,
    })
    out["target_class"] = out["target_continuous"].apply(lambda c: _to_class(c) if pd.notna(c) else np.nan)
    out["source"] = "depression"
    return out.dropna(subset=["target_continuous"])

def load_mental_health() -> pd.DataFrame | None:
    # Try both filenames present in repo
    for fname in ["student_mental_health_dataset.csv", "Student Mental health.csv"]:
        df = _safe_csv(fname)
        if df is not None:
            break
    else:
        return None
    target_col = next((c for c in df.columns if "stress" in c.lower() or "depress" in c.lower() or "anxiety" in c.lower()), None)
    if target_col is None: return None
    raw = df[target_col]
    if raw.dtype == object:
        cont = raw.astype(str).str.strip().str.lower().map({"yes": 0.7, "no": 0.2, **LABEL_MAP_FRAC()})
    else:
        cont = pd.to_numeric(raw, errors="coerce")
        if cont.max() and cont.max() > 1.5:
            cont = cont / cont.max()
    out = pd.DataFrame({
        "study_hours_per_day":             np.nan,
        "sleep_hours_per_day":             np.nan,
        "social_hours_per_day":            np.nan,
        "physical_activity_hours_per_day": np.nan,
        "gpa_norm":                        pd.to_numeric(df.get("CGPA") or df.get("GPA"), errors="coerce") / 10.0,
        "screen_time_hours":               np.nan,
        "extracurricular_hours":           np.nan,
        "target_continuous":               cont,
    })
    out["target_class"] = out["target_continuous"].apply(lambda c: _to_class(c) if pd.notna(c) else np.nan)
    out["source"] = "mental_health"
    return out.dropna(subset=["target_continuous"])

def LABEL_MAP_FRAC():
    return {"low": 0.15, "moderate": 0.5, "medium": 0.5, "high": 0.85}

def load_social_media() -> pd.DataFrame | None:
    df = _safe_csv("Students Social Media Addiction.csv")
    if df is None: return None
    target_col = next((c for c in df.columns if "addict" in c.lower() or "stress" in c.lower() or "mental" in c.lower()), None)
    if target_col is None: return None
    raw = pd.to_numeric(df[target_col], errors="coerce")
    cont = raw / raw.max() if raw.max() > 1.5 else raw
    screen = pd.to_numeric(df.get("Avg_Daily_Usage_Hours") or df.get("Daily_Usage_Hours"), errors="coerce")
    out = pd.DataFrame({
        "study_hours_per_day":             np.nan,
        "sleep_hours_per_day":             pd.to_numeric(df.get("Sleep_Hours_Per_Night"), errors="coerce"),
        "social_hours_per_day":            np.nan,
        "physical_activity_hours_per_day": np.nan,
        "gpa_norm":                        np.nan,
        "screen_time_hours":               screen,
        "extracurricular_hours":           np.nan,
        "target_continuous":               cont,
    })
    out["target_class"] = out["target_continuous"].apply(lambda c: _to_class(c) if pd.notna(c) else np.nan)
    out["source"] = "social_media"
    return out.dropna(subset=["target_continuous"])

def load_all() -> pd.DataFrame:
    parts = [f() for f in (load_lifestyle, load_sleep_health, load_depression, load_mental_health, load_social_media)]
    parts = [p for p in parts if p is not None and len(p) > 0]
    if not parts:
        return _empty_unified()
    df = pd.concat(parts, ignore_index=True)
    return df[UNIFIED_COLUMNS]
```

- [ ] **Step 4: Run tests**

```
cd burnout-backend && pytest tests/test_datasets.py -v
```
Expected: PASS (some loaders may return None — that's allowed).

- [ ] **Step 5: Commit**

```
git add burnout-backend/datasets.py burnout-backend/tests/test_datasets.py
git commit -m "feat(model): unified multi-dataset loader for v3 training"
```

---

## Task 3: Trainer v3 — Calibrated, Honestly Evaluated

**Files:**
- Create: `burnout-backend/trainer_v3.py`
- Create: `burnout-backend/stress_model_v3.pkl` (output)
- Create: `burnout-backend/model_meta_v3.json` (output)

**Key changes vs v2:**
1. Train on `load_all()` from `datasets.py`, not just lifestyle
2. Median-impute missing base features per-source (not globally — preserves source distributions)
3. Add a `source` one-hot in features so the model can learn source-specific noise
4. Wrap final model in `CalibratedClassifierCV(method="isotonic", cv=5)` so probabilities are calibrated
5. Hold out the entire `lifestyle` source as the **honesty set** — train on the others, evaluate on lifestyle. If calibrated accuracy is in the 55–75% range we have real signal. If it's 95%+ we still have leakage somewhere.
6. Save with `joblib` to `stress_model_v3.pkl`

- [ ] **Step 1: Write the failing test**

```python
# burnout-backend/tests/test_trainer_v3.py
import os, json, joblib

def test_v3_artifacts_exist_and_load():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    assert os.path.exists("stress_model_v3.pkl")
    assert os.path.exists("model_meta_v3.json")
    model = joblib.load("stress_model_v3.pkl")
    assert hasattr(model, "predict_proba")
    meta = json.load(open("model_meta_v3.json"))
    assert meta["version"] == "3.0"
    assert "honesty_holdout_accuracy" in meta
    assert "features" in meta and len(meta["features"]) >= 14
```

- [ ] **Step 2: Run test to confirm failure**

```
cd burnout-backend && pytest tests/test_trainer_v3.py -v
```
Expected: FAIL (artifacts missing).

- [ ] **Step 3: Implement `trainer_v3.py`**

```python
# burnout-backend/trainer_v3.py
"""
v3 trainer: multi-dataset, calibrated, honestly held out.
"""
import json, joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, accuracy_score, log_loss
from sklearn.utils.class_weight import compute_sample_weight

from datasets import load_all
from trainer import ALL_FEATURES, add_features, clip_features, BASE_FEATURES

VERSION = "3.0"

def impute_per_source(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in BASE_FEATURES:
        if col not in df.columns: continue
        df[col] = df.groupby("source")[col].transform(lambda s: s.fillna(s.median()))
        # Fall back to global median if a whole source is missing the column
        df[col] = df[col].fillna(df[col].median())
        # Final fallback
        df[col] = df[col].fillna(0)
    return df

def main():
    print("Loading multi-dataset corpus...")
    df = load_all()
    print(f"  Combined: {len(df):,} rows from {df['source'].nunique()} sources")
    print(df.groupby("source").size().to_string())

    # Honesty split: lifestyle is held out, others train
    df = impute_per_source(df)
    train = df[df["source"] != "lifestyle"].copy()
    test  = df[df["source"] == "lifestyle"].copy()
    if len(train) < 100:
        print("Not enough non-lifestyle data — using random split instead")
        from sklearn.model_selection import train_test_split
        train, test = train_test_split(df, test_size=0.2, stratify=df["target_class"], random_state=42)

    for split in (train, test):
        for col, (lo, hi) in {
            "study_hours_per_day": (0, 18), "sleep_hours_per_day": (2, 14),
            "social_hours_per_day": (0, 12), "physical_activity_hours_per_day": (0, 8),
            "gpa_norm": (0, 1), "screen_time_hours": (0, 16), "extracurricular_hours": (0, 8),
        }.items():
            split[col] = split[col].clip(lo, hi)
    train = add_features(train); test = add_features(test)

    X_tr, y_tr = train[ALL_FEATURES], train["target_class"].astype(int)
    X_te, y_te = test[ALL_FEATURES],  test["target_class"].astype(int)

    base = XGBClassifier(
        n_estimators=400, max_depth=4, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, min_child_weight=6,
        reg_alpha=0.2, reg_lambda=2.0,
        objective="multi:softprob", num_class=3,
        eval_metric="mlogloss", random_state=42, n_jobs=-1, verbosity=0,
    )
    print("\nTraining base XGBoost...")
    base.fit(X_tr, y_tr, sample_weight=compute_sample_weight("balanced", y_tr))

    print("Wrapping in CalibratedClassifierCV (isotonic, 5-fold)...")
    model = CalibratedClassifierCV(base, method="isotonic", cv=5)
    model.fit(X_tr, y_tr)

    print("\n=== HONESTY HOLDOUT (lifestyle dataset) ===")
    y_pred = model.predict(X_te)
    proba  = model.predict_proba(X_te)
    acc    = accuracy_score(y_te, y_pred)
    ll     = log_loss(y_te, proba, labels=[0, 1, 2])
    print(f"Holdout accuracy: {acc:.4f}")
    print(f"Holdout log-loss: {ll:.4f}")
    print(classification_report(y_te, y_pred, target_names=["Low","Medium","High"]))

    if acc > 0.95:
        print("\n!! Holdout accuracy >0.95 — leakage still present, investigate before deploying.")
    elif acc < 0.45:
        print("\n!! Holdout accuracy <0.45 — model is no better than majority class, do not deploy.")
    else:
        print("\nOK: Holdout accuracy in plausible 0.45-0.95 range — real signal.")

    joblib.dump(model, "stress_model_v3.pkl")
    with open("model_meta_v3.json", "w") as f:
        json.dump({
            "version": VERSION,
            "features": ALL_FEATURES,
            "honesty_holdout_accuracy": round(float(acc), 4),
            "honesty_holdout_logloss":  round(float(ll), 4),
            "n_train": int(len(X_tr)),
            "n_test":  int(len(X_te)),
            "sources_trained": sorted(train["source"].unique().tolist()),
            "calibration": "isotonic, cv=5",
        }, f, indent=2)
    print("\nSaved stress_model_v3.pkl + model_meta_v3.json")

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run trainer + test**

```
cd burnout-backend && python trainer_v3.py
pytest tests/test_trainer_v3.py -v
```
Expected: trainer prints honesty holdout stats; test passes.

- [ ] **Step 5: Commit**

```
git add burnout-backend/trainer_v3.py burnout-backend/tests/test_trainer_v3.py burnout-backend/stress_model_v3.pkl burnout-backend/model_meta_v3.json
git commit -m "feat(model): v3 trainer — multi-source, calibrated, honestly held out"
```

---

## Task 4: SHAP Explainer Module

**Files:**
- Create: `burnout-backend/explain.py`
- Create: `burnout-backend/tests/test_explain.py`
- Modify: `burnout-backend/requirements.txt`

- [ ] **Step 1: Add SHAP to requirements**

Append to `burnout-backend/requirements.txt`:
```
shap>=0.45.0
```

- [ ] **Step 2: Install**

```
pip install shap>=0.45.0
```

- [ ] **Step 3: Write the failing test**

```python
# burnout-backend/tests/test_explain.py
import os, joblib, numpy as np

def test_explain_returns_per_class_contributions():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from explain import explain_prediction
    sample = {
        "study_hours_per_day": 9.0, "sleep_hours_per_day": 5.0,
        "social_hours_per_day": 1.0, "physical_activity_hours_per_day": 0.5,
        "gpa_norm": 0.6, "screen_time_hours": 6.0, "extracurricular_hours": 0.5,
    }
    out = explain_prediction(sample)
    assert "contributions" in out
    assert isinstance(out["contributions"], list)
    assert len(out["contributions"]) >= 5  # top-N features
    for c in out["contributions"]:
        assert "feature" in c and "shap" in c and "direction" in c
        assert c["direction"] in ("toward_high_risk", "toward_low_risk")
```

- [ ] **Step 4: Implement `explain.py`**

```python
# burnout-backend/explain.py
"""
SHAP explanations for v3 model. Cached TreeExplainer keyed on the calibrated
model's first base estimator (CalibratedClassifierCV wraps but we need the
raw tree to extract SHAP values).
"""
import joblib, numpy as np, pandas as pd
from functools import lru_cache

from trainer import ALL_FEATURES, add_features, clip_features, CLIP

@lru_cache(maxsize=1)
def _load():
    import shap
    model = joblib.load("stress_model_v3.pkl")
    # CalibratedClassifierCV.calibrated_classifiers_[0].estimator is the XGBoost
    base = model.calibrated_classifiers_[0].estimator
    explainer = shap.TreeExplainer(base)
    return model, base, explainer

def _build_row(sample: dict) -> pd.DataFrame:
    df = pd.DataFrame([{k: float(sample.get(k, 0.0)) for k in [
        "study_hours_per_day","sleep_hours_per_day","social_hours_per_day",
        "physical_activity_hours_per_day","gpa_norm","screen_time_hours",
        "extracurricular_hours",
    ]}])
    df = clip_features(df)
    df = add_features(df)
    return df[ALL_FEATURES]

def explain_prediction(sample: dict, top_n: int = 5) -> dict:
    model, base, explainer = _load()
    X = _build_row(sample)
    shap_vals = explainer.shap_values(X)
    # For multiclass XGBoost shap_values is a list per class; take class 2 (High)
    if isinstance(shap_vals, list):
        sv = shap_vals[2][0]  # contributions toward "High" class
    else:
        # newer SHAP returns ndarray (n_samples, n_features, n_classes)
        sv = shap_vals[0, :, 2]
    contribs = sorted(
        [
            {
                "feature":   feat,
                "shap":      round(float(s), 4),
                "value":     round(float(X.iloc[0][feat]), 3),
                "direction": "toward_high_risk" if s > 0 else "toward_low_risk",
            }
            for feat, s in zip(ALL_FEATURES, sv)
        ],
        key=lambda c: abs(c["shap"]),
        reverse=True,
    )[:top_n]
    proba = model.predict_proba(X)[0]
    return {
        "prediction":    int(model.predict(X)[0]),
        "probabilities": {"low": round(float(proba[0]), 4),
                          "medium": round(float(proba[1]), 4),
                          "high": round(float(proba[2]), 4)},
        "contributions": contribs,
    }
```

- [ ] **Step 5: Run test**

```
cd burnout-backend && pytest tests/test_explain.py -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add burnout-backend/explain.py burnout-backend/tests/test_explain.py burnout-backend/requirements.txt
git commit -m "feat(model): SHAP per-prediction explainer for v3"
```

---

## Task 5: Feedback Endpoint + Storage

**Files:**
- Create: `burnout-backend/feedback.py`
- Create: `burnout-backend/tests/test_feedback.py`
- Modify: `burnout-backend/main.py` (add `POST /feedback` and `GET /feedback/stats`)

**Schema (added to existing `burnout.db`):**
```sql
CREATE TABLE IF NOT EXISTS feedback (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER REFERENCES predictions(id),
    user_id      INTEGER REFERENCES users(id),
    accurate     INTEGER NOT NULL,        -- 1 = thumbs up, 0 = thumbs down
    actual_label TEXT,                     -- optional user-corrected label
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 1: Write the failing test**

```python
# burnout-backend/tests/test_feedback.py
import os, sqlite3, pytest
from feedback import init_schema, record_feedback, get_stats

@pytest.fixture
def db(tmp_path):
    p = tmp_path / "test.db"
    conn = sqlite3.connect(str(p))
    init_schema(conn)
    return conn

def test_record_and_stats(db):
    record_feedback(db, prediction_id=None, user_id=1, accurate=1, actual_label=None, notes="spot on")
    record_feedback(db, prediction_id=None, user_id=2, accurate=0, actual_label="High", notes="too low")
    s = get_stats(db)
    assert s["total"] == 2
    assert s["accurate"] == 1
    assert s["accuracy_pct"] == 50.0
```

- [ ] **Step 2: Run test to confirm failure**

```
cd burnout-backend && pytest tests/test_feedback.py -v
```
Expected: FAIL.

- [ ] **Step 3: Implement `feedback.py`**

```python
# burnout-backend/feedback.py
import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER,
    user_id INTEGER,
    accurate INTEGER NOT NULL,
    actual_label TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def init_schema(conn: sqlite3.Connection):
    conn.execute(SCHEMA); conn.commit()

def record_feedback(conn, prediction_id, user_id, accurate: int,
                    actual_label: str | None = None, notes: str | None = None):
    conn.execute(
        "INSERT INTO feedback (prediction_id, user_id, accurate, actual_label, notes) "
        "VALUES (?, ?, ?, ?, ?)",
        (prediction_id, user_id, int(bool(accurate)), actual_label, notes),
    )
    conn.commit()

def get_stats(conn) -> dict:
    cur = conn.execute("SELECT COUNT(*), SUM(accurate) FROM feedback")
    total, accurate = cur.fetchone()
    total = total or 0
    accurate = accurate or 0
    return {
        "total":        int(total),
        "accurate":     int(accurate),
        "accuracy_pct": round(accurate / total * 100, 1) if total else 0.0,
    }
```

- [ ] **Step 4: Run test**

```
cd burnout-backend && pytest tests/test_feedback.py -v
```
Expected: PASS.

- [ ] **Step 5: Wire into `main.py`**

Near the existing `cursor.execute("CREATE TABLE IF NOT EXISTS predictions ...")` block, add:

```python
from feedback import init_schema as _init_feedback, record_feedback, get_stats as _feedback_stats
_init_feedback(conn)
print("[OK] Feedback table ready")
```

Then append two new endpoints (after the `/chat` route):

```python
@app.post("/feedback")
def submit_feedback(data: dict, request: Request):
    user = get_user_from_request(request)
    record_feedback(
        conn,
        prediction_id=data.get("prediction_id"),
        user_id=user["sub"] if user else None,
        accurate=int(data.get("accurate", 1)),
        actual_label=data.get("actual_label"),
        notes=data.get("notes"),
    )
    return {"ok": True}

@app.get("/feedback/stats")
def feedback_stats():
    return _feedback_stats(conn)
```

- [ ] **Step 6: Manual smoke test**

Start the server, then:
```
curl -X POST http://localhost:8000/feedback -H "Content-Type: application/json" -d "{\"accurate\": 1, \"notes\": \"test\"}"
curl http://localhost:8000/feedback/stats
```
Expected: `{"ok": true}` then stats with `total: 1`.

- [ ] **Step 7: Commit**

```
git add burnout-backend/feedback.py burnout-backend/tests/test_feedback.py burnout-backend/main.py
git commit -m "feat(model): /feedback endpoint + thumbs accuracy stats"
```

---

## Task 6: Wire SHAP into `/predict` and Frontend Feedback UI

**Files:**
- Modify: `burnout-backend/main.py` (`/predict` endpoint)
- Modify: `burnout-frontend/src/pages/Predict.js`

- [ ] **Step 1: Add SHAP to `/predict` response**

In `main.py`'s `/predict` handler, after computing `top_drivers`, add (guarded so failure doesn't break predict):

```python
# Per-prediction SHAP explanation (best-effort)
shap_explanation = None
try:
    from explain import explain_prediction
    shap_explanation = explain_prediction({
        "study_hours_per_day": study, "sleep_hours_per_day": sleep,
        "social_hours_per_day": social, "physical_activity_hours_per_day": physical,
        "gpa_norm": gpa_norm, "screen_time_hours": screen,
        "extracurricular_hours": extra,
    })
except Exception as e:
    print(f"[shap] skipped: {e}")
```

Then include `"explanation": shap_explanation` in the returned dict, and capture `prediction_id` by switching the INSERT to `cursor.execute(...)` followed by `pred_id = cursor.lastrowid` and returning `"prediction_id": pred_id`.

Note: SHAP currently loads `stress_model_v3.pkl`. Until v3 is the active model (Task 7), wrap the import inside the try so old v2 deployments don't crash.

- [ ] **Step 2: Manually test the response shape**

```
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d "{\"study_hours_per_day\": 9, \"sleep_hours_per_day\": 5, \"social_hours_per_day\": 1, \"physical_activity_hours_per_day\": 0.5, \"gpa_norm\": 0.6, \"screen_time_hours\": 6}"
```
Expected: response includes `prediction_id` (integer) and `explanation` (object with `contributions`).

- [ ] **Step 3: Add feedback UI to `Predict.js`**

In the result view, just below the `Top drivers` block, add:

```jsx
{/* Feedback */}
<div style={{ marginTop: 24, padding: 14, background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--border)", textAlign: "center" }}>
  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Did this prediction feel accurate?</div>
  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
    <button className="btn-ghost" onClick={() => sendFeedback(true)}  style={{ width: "auto", padding: "8px 18px" }}>👍 Yes</button>
    <button className="btn-ghost" onClick={() => sendFeedback(false)} style={{ width: "auto", padding: "8px 18px" }}>👎 Off</button>
  </div>
</div>
```

Add the handler near the other helpers in `Predict.js`:

```javascript
const sendFeedback = async (accurate) => {
  try {
    const last = JSON.parse(localStorage.getItem("lastPrediction") || "{}");
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await axios.post(`${API_BASE}/feedback`, {
      prediction_id: last.prediction_id ?? null,
      accurate: accurate ? 1 : 0,
    }, { headers });
    toast.success(accurate ? "Thanks!" : "Got it", "Feedback helps the model improve");
  } catch {
    toast.info("Couldn't send feedback", "Try again later");
  }
};
```

Also extend the `lastPrediction` save to include `prediction_id: data.prediction_id`.

- [ ] **Step 4: Manual smoke test in browser**

Run a prediction, click 👍 — confirm toast appears and `/feedback/stats` reflects the new row.

- [ ] **Step 5: Commit**

```
git add burnout-backend/main.py burnout-frontend/src/pages/Predict.js
git commit -m "feat: SHAP in /predict response + thumbs feedback UI"
```

---

## Task 7: Promote v3 to Production

**Files:**
- Modify: `burnout-backend/main.py` (model load path)

- [ ] **Step 1: Read holdout accuracy**

Open `burnout-backend/model_meta_v3.json`. Note `honesty_holdout_accuracy`. **Only proceed if it's between 0.50 and 0.92.** If it's outside that range, stop and report findings — don't deploy a worse model than v2.

- [ ] **Step 2: Switch model load**

In `main.py`, change:
```python
model = joblib.load("stress_model.pkl")
```
to:
```python
import os
_v3 = "stress_model_v3.pkl"
_v2 = "stress_model.pkl"
model = joblib.load(_v3 if os.path.exists(_v3) else _v2)
print(f"[model] loaded {_v3 if os.path.exists(_v3) else _v2}")
```

`feature_importances_` is not available on `CalibratedClassifierCV`. In `get_cached_feature_importance()`, replace `model.feature_importances_` with:

```python
imps = []
if hasattr(model, "feature_importances_"):
    imps = model.feature_importances_
elif hasattr(model, "calibrated_classifiers_"):
    # average across cv folds
    folds = [c.estimator.feature_importances_ for c in model.calibrated_classifiers_]
    imps = np.mean(folds, axis=0)
```

(Add `import numpy as np` at top of `main.py` if not already imported.)

Apply the same replacement to the `top_drivers` block in `/predict`.

- [ ] **Step 3: Smoke test**

Restart server, hit `/predict` with the same curl from Task 6 Step 2. Confirm response shape unchanged and `confidence` looks reasonable (45-95%, not always 99.x%).

- [ ] **Step 4: Commit & deploy**

```
git add burnout-backend/main.py
git commit -m "feat(model): promote v3 to production (calibrated, multi-source)"
git push origin main
```

Railway auto-deploys. Watch logs for `[model] loaded stress_model_v3.pkl`. If anything breaks, revert with `git revert HEAD` and push — server falls back to v2.

---

## Self-Review Checklist (run after writing the plan)

- [x] Every task has exact file paths
- [x] All code blocks are complete (no "...")
- [x] Type names consistent across tasks (`load_all`, `ALL_FEATURES`, `explain_prediction`)
- [x] Backwards compatibility preserved (v3 falls back to v2 if pkl missing; SHAP wrapped in try/except)
- [x] Honesty gate (Task 7 Step 1) prevents shipping a worse model
- [x] Feedback table is additive, doesn't migrate existing schema destructively
- [x] No frontend breaking changes (only adds UI; existing response fields preserved)
