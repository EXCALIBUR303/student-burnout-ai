"""
datasets.py — Unified multi-dataset loader for burnout/stress ML model (v3).

Each loader reads a CSV, maps columns to UNIFIED_COLUMNS, derives target_class
from target_continuous, and returns a DataFrame (or None if the file is missing).
"""

import os
import pandas as pd

UNIFIED_COLUMNS = [
    "study_hours_per_day",
    "sleep_hours_per_day",
    "social_hours_per_day",
    "physical_activity_hours_per_day",
    "gpa_norm",
    "screen_time_hours",
    "extracurricular_hours",
    "target_continuous",
    "target_class",
    "source",
]


def _derive_target_class(series: pd.Series) -> pd.Series:
    """Bin continuous target into 3 classes: <0.33→0, <0.66→1, else→2."""
    return pd.cut(
        series,
        bins=[-0.001, 0.33, 0.66, 1.001],
        labels=[0, 1, 2],
    ).astype(int)


def _finalize(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Add source column, derive target_class, ensure all UNIFIED_COLUMNS exist,
    drop rows without a target, and return df[UNIFIED_COLUMNS]."""
    df = df.copy()
    df["source"] = source

    # Derive target_class from target_continuous
    df = df.dropna(subset=["target_continuous"])
    df["target_class"] = _derive_target_class(df["target_continuous"])

    # Fill any missing unified columns with NaN
    for col in UNIFIED_COLUMNS:
        if col not in df.columns:
            df[col] = float("nan")

    return df[UNIFIED_COLUMNS].reset_index(drop=True)


# ---------------------------------------------------------------------------
# Individual loaders
# ---------------------------------------------------------------------------

def load_lifestyle(path: str = "student_lifestyle_dataset.csv") -> pd.DataFrame | None:
    """2000-row student lifestyle dataset."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    stress_map = {"Low": 0.15, "Moderate": 0.5, "Medium": 0.5, "High": 0.85}

    out = pd.DataFrame()
    out["study_hours_per_day"] = pd.to_numeric(df["Study_Hours_Per_Day"], errors="coerce")
    out["sleep_hours_per_day"] = pd.to_numeric(df["Sleep_Hours_Per_Day"], errors="coerce")
    out["social_hours_per_day"] = pd.to_numeric(df["Social_Hours_Per_Day"], errors="coerce")
    out["physical_activity_hours_per_day"] = pd.to_numeric(
        df["Physical_Activity_Hours_Per_Day"], errors="coerce"
    )
    out["gpa_norm"] = pd.to_numeric(df["GPA"], errors="coerce") / 10.0
    out["extracurricular_hours"] = (
        pd.to_numeric(df["Extracurricular_Hours_Per_Day"], errors="coerce")
        if "Extracurricular_Hours_Per_Day" in df.columns
        else float("nan")
    )
    out["target_continuous"] = df["Stress_Level"].map(stress_map)

    return _finalize(out, "lifestyle")


def load_lifestyle_100k(path: str = "student_lifestyle_100k.csv") -> pd.DataFrame | None:
    """100k-row student lifestyle dataset with numeric Stress_Level (2–10)."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    out = pd.DataFrame()
    out["study_hours_per_day"] = pd.to_numeric(df["Study_Hours"], errors="coerce")
    out["sleep_hours_per_day"] = pd.to_numeric(df["Sleep_Duration"], errors="coerce")
    # Social_Media_Hours used as screen_time proxy
    out["screen_time_hours"] = pd.to_numeric(df["Social_Media_Hours"], errors="coerce")
    # Physical_Activity is in minutes/day → convert to hours
    out["physical_activity_hours_per_day"] = (
        pd.to_numeric(df["Physical_Activity"], errors="coerce") / 60.0
    )
    out["gpa_norm"] = pd.to_numeric(df["CGPA"], errors="coerce") / 10.0
    # Stress_Level 2–10 → normalize to [0, 1]
    stress_num = pd.to_numeric(df["Stress_Level"], errors="coerce")
    out["target_continuous"] = (stress_num - 2) / 8

    return _finalize(out, "lifestyle_100k")


def load_sleep_health(path: str = "Sleep_health_and_lifestyle_dataset.csv") -> pd.DataFrame | None:
    """Sleep health & lifestyle dataset."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    out = pd.DataFrame()
    out["sleep_hours_per_day"] = pd.to_numeric(df["Sleep Duration"], errors="coerce")
    # Physical Activity Level is minutes/week → convert to hours/day
    out["physical_activity_hours_per_day"] = (
        pd.to_numeric(df["Physical Activity Level"], errors="coerce") / (7 * 60)
    )
    # Stress Level 3–8 → normalize: (val - 1) / 7
    stress_num = pd.to_numeric(df["Stress Level"], errors="coerce")
    out["target_continuous"] = (stress_num - 1) / 7

    return _finalize(out, "sleep_health")


def load_stress_level(path: str = "StressLevelDataset.csv") -> pd.DataFrame | None:
    """Student stress level dataset (survey ratings)."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    stress_map = {0: 0.15, 1: 0.5, 2: 0.85}

    out = pd.DataFrame()
    # study_load (0–5 rating) → scale to approximate study hours: * 1.2
    out["study_hours_per_day"] = pd.to_numeric(df["study_load"], errors="coerce") * 1.2
    # sleep_quality (0–5 rating) → invert to sleep hours: 4 + (10 - val*2) * 0.4
    # The spec uses a 0-10 scale formula; we keep the formula as-is for the raw values.
    sleep_q = pd.to_numeric(df["sleep_quality"], errors="coerce")
    out["sleep_hours_per_day"] = 4 + (10 - sleep_q) * 0.4
    # extracurricular_activities → * 1.5
    out["extracurricular_hours"] = (
        pd.to_numeric(df["extracurricular_activities"], errors="coerce") * 1.5
    )
    out["target_continuous"] = pd.to_numeric(df["stress_level"], errors="coerce").map(stress_map)

    return _finalize(out, "stress_level")


def load_social_media(path: str = "Students Social Media Addiction.csv") -> pd.DataFrame | None:
    """Students Social Media Addiction dataset."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    out = pd.DataFrame()
    out["screen_time_hours"] = pd.to_numeric(df["Avg_Daily_Usage_Hours"], errors="coerce")
    out["sleep_hours_per_day"] = pd.to_numeric(df["Sleep_Hours_Per_Night"], errors="coerce")
    # Mental_Health_Score range 4–9, higher = worse → normalize: (val - 4) / 5
    mhs = pd.to_numeric(df["Mental_Health_Score"], errors="coerce")
    out["target_continuous"] = (mhs - 4) / 5

    return _finalize(out, "social_media")


def load_depression(path: str = "student_depression_dataset.csv") -> pd.DataFrame | None:
    """Student depression dataset (27k rows)."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    sleep_map = {
        "'Less than 5 hours'": 4.0,
        "'5-6 hours'": 5.5,
        "'7-8 hours'": 7.5,
        "'More than 8 hours'": 8.5,
    }
    depression_map = {0: 0.2, 1: 0.75}

    out = pd.DataFrame()
    out["study_hours_per_day"] = pd.to_numeric(df["Work/Study Hours"], errors="coerce")
    out["gpa_norm"] = pd.to_numeric(df["CGPA"], errors="coerce") / 10.0
    out["sleep_hours_per_day"] = df["Sleep Duration"].map(sleep_map)
    dep = pd.to_numeric(df["Depression"], errors="coerce")
    out["target_continuous"] = dep.map(depression_map)

    return _finalize(out, "depression")


def load_mental_health2(path: str = "student_mental_health_dataset.csv") -> pd.DataFrame | None:
    """Student mental health dataset (Stress_Levels float 20–96)."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    out = pd.DataFrame()
    out["study_hours_per_day"] = pd.to_numeric(df["Study_Hours"], errors="coerce")
    # Stress_Levels float 20–96 → normalize: val / 100
    stress = pd.to_numeric(df["Stress_Levels"], errors="coerce")
    out["target_continuous"] = stress / 100

    return _finalize(out, "mental_health2")


def load_sleep_patterns(path: str = "student_sleep_patterns.csv") -> pd.DataFrame | None:
    """Student sleep patterns dataset."""
    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    out = pd.DataFrame()
    out["study_hours_per_day"] = pd.to_numeric(df["Study_Hours"], errors="coerce")
    out["sleep_hours_per_day"] = pd.to_numeric(df["Sleep_Duration"], errors="coerce")
    out["screen_time_hours"] = pd.to_numeric(df["Screen_Time"], errors="coerce")
    # Physical_Activity is minutes/day → convert to hours
    out["physical_activity_hours_per_day"] = (
        pd.to_numeric(df["Physical_Activity"], errors="coerce") / 60.0
    )
    # Sleep_Quality 1–10, high = good → invert for burnout proxy: (10 - val) / 9
    sq = pd.to_numeric(df["Sleep_Quality"], errors="coerce")
    out["target_continuous"] = (10 - sq) / 9

    return _finalize(out, "sleep_patterns")


# ---------------------------------------------------------------------------
# Combined loader
# ---------------------------------------------------------------------------

def load_all() -> pd.DataFrame:
    """Load all datasets, concatenate, and return df[UNIFIED_COLUMNS]."""
    loaders = [
        load_lifestyle,
        load_lifestyle_100k,
        load_sleep_health,
        load_stress_level,
        load_social_media,
        load_depression,
        load_mental_health2,
        load_sleep_patterns,
    ]
    frames = [fn() for fn in loaders]
    frames = [f for f in frames if f is not None and len(f) > 0]
    combined = pd.concat(frames, ignore_index=True)
    return combined[UNIFIED_COLUMNS]
