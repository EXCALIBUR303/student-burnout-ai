"""
Synthetic burnout dataset generator — research-grounded.

Built on patterns from:
  - Maslach Burnout Inventory (MBI): exhaustion ↔ sleep deficit, cynicism ↔ overload
  - Salmela-Aro et al. (2009) Student Burnout Inventory: study load × poor recovery
  - American College Health Assessment: 6+ hr/day study + <6 hr sleep is the high-risk archetype
  - Kessler Psychological Distress Scale: physical activity is protective at >150 min/week

Generates ~5000 rows of correlated, noisy samples that look like real students.
Saves to synthetic_burnout_5k.csv with the same column names as student_lifestyle_dataset.csv.
"""
import argparse
import numpy as np
import pandas as pd

RNG = np.random.default_rng(seed=42)

def generate(n: int = 5000) -> pd.DataFrame:
    # ── 1. Sample base lifestyle features with realistic distributions ────
    # Study hours: bimodal (cramming students vs. balanced students)
    study = np.where(
        RNG.random(n) < 0.35,
        RNG.normal(8.5, 1.5, n),   # heavy-study cluster
        RNG.normal(4.5, 1.5, n),   # balanced cluster
    ).clip(0, 14)

    # Sleep hours: heavy-study students sleep less (negative correlation)
    sleep_baseline = 8.0 - 0.35 * (study - 5.5)  # each extra study hour costs ~20 min sleep
    sleep = (sleep_baseline + RNG.normal(0, 1.0, n)).clip(3.5, 11)

    # Social hours: anti-correlated with study, log-normal-ish
    social = (RNG.exponential(2.0, n) - 0.15 * (study - 5.5)).clip(0, 8)

    # Physical activity (hrs/day): mostly low, fat tail of athletic students
    physical = np.where(
        RNG.random(n) < 0.18,
        RNG.normal(2.0, 0.8, n),    # athletic
        RNG.exponential(0.6, n),    # most students
    ).clip(0, 5)

    # Screen time: heavy social media users + procrastinators study less
    screen_baseline = 5.0 - 0.25 * study + 0.4 * (8 - sleep)
    screen = (screen_baseline + RNG.normal(0, 1.5, n)).clip(0.5, 14)

    # GPA: positively correlated with moderate study + adequate sleep, U-shaped on extreme study
    study_optimum = 1 - ((study - 6.5) ** 2) / 50  # peaks at ~6.5h
    sleep_bonus = np.where(sleep >= 6.5, 0.2, -0.3)
    gpa_raw = 0.55 + 0.25 * study_optimum + sleep_bonus + RNG.normal(0, 0.12, n)
    gpa = (gpa_raw * 10).clip(2.0, 10.0)

    # Extracurricular: mostly low, some involved students
    extra = np.where(
        RNG.random(n) < 0.25,
        RNG.normal(2.0, 0.8, n),    # involved
        RNG.exponential(0.4, n),
    ).clip(0, 5)

    # ── 2. Compute a latent "burnout score" from research-backed drivers ─
    # Sleep deficit is the single strongest predictor in the literature
    sleep_deficit = np.maximum(0, 7.5 - sleep)
    study_load = np.maximum(0, study - 6.5)  # only counts above 6.5h
    recovery_balance = (sleep + physical + 0.3 * social) / 12.0  # protective
    screen_overload = np.maximum(0, screen - 5.0) / 8.0
    gpa_stress = np.maximum(0, 0.65 - gpa / 10.0)  # low GPA → stress

    burnout_latent = (
        + 1.20 * sleep_deficit / 4.0
        + 0.95 * study_load / 5.0
        + 0.85 * screen_overload
        + 0.60 * gpa_stress
        - 0.70 * recovery_balance
        - 0.25 * np.minimum(extra, 1.5) / 1.5   # mild engagement is protective
        + RNG.normal(0, 0.30, n)                 # noise — real life isn't deterministic
    )

    # ── 3. Bin into 3 classes with realistic prevalence ───────────────────
    # Population stats: ~25% Low, ~50% Moderate, ~25% High (typical student samples)
    low_threshold  = np.percentile(burnout_latent, 25)
    high_threshold = np.percentile(burnout_latent, 75)

    stress_label = np.where(
        burnout_latent <  low_threshold,  "Low",
        np.where(burnout_latent < high_threshold, "Moderate", "High"),
    )

    df = pd.DataFrame({
        "Student_ID":                        np.arange(1, n + 1),
        "Study_Hours_Per_Day":               np.round(study, 2),
        "Sleep_Hours_Per_Day":               np.round(sleep, 2),
        "Social_Hours_Per_Day":              np.round(social, 2),
        "Physical_Activity_Hours_Per_Day":   np.round(physical, 2),
        "Screen_Time_Hours_Per_Day":         np.round(screen, 2),
        "GPA":                               np.round(gpa, 2),
        "Extracurricular_Hours_Per_Day":     np.round(extra, 2),
        "Stress_Level":                      stress_label,
    })
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-n", type=int, default=5000, help="number of synthetic samples")
    parser.add_argument("--out", default="synthetic_burnout_5k.csv")
    args = parser.parse_args()

    df = generate(args.n)
    print(f"Generated {len(df)} synthetic rows")
    print("\nClass distribution:")
    print(df["Stress_Level"].value_counts().to_string())
    print("\nFeature summary:")
    print(df.describe().round(2).to_string())

    df.to_csv(args.out, index=False)
    print(f"\nSaved to {args.out}")


if __name__ == "__main__":
    main()
