from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import requests
import psycopg2
import os
from dotenv import load_dotenv

# ✅ LOAD ENV VARIABLES
load_dotenv()

app = FastAPI()

# ===== CORS (React connection) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== LOAD MODEL =====
model = joblib.load("burnout_model.pkl")

# ===== LABEL MAPPING =====
labels = {0: "Low", 1: "Medium", 2: "High"}

# ===== RDS CONNECTION (SAFE VERSION) =====
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=5432
)

cursor = conn.cursor()

# ===== HUGGING FACE CHATBOT (SAFE) =====
API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-base"

headers = {
    "Authorization": f"Bearer {os.getenv('HUGGINGFACE_API_KEY')}"
}

# ===== HOME =====
@app.get("/")
def home():
    return {"message": "Burnout AI API running 🚀"}


# ===== PREDICTION =====
@app.post("/predict")
def predict(data: dict):
    try:
        study = float(data["study_hours_per_day"])
        sleep = float(data["sleep_hours_per_day"])
        social = float(data["social_hours_per_day"])
        physical = float(data["physical_activity_hours_per_day"])

        df = pd.DataFrame([{
            "study_hours_per_day": study,
            "sleep_hours_per_day": sleep,
            "social_hours_per_day": social,
            "physical_activity_hours_per_day": physical
        }])

        prediction = model.predict(df)[0]
        result_label = labels.get(int(prediction), "Unknown")

        # SAVE TO DATABASE
        cursor.execute(
            "INSERT INTO predictions (study, sleep, social, physical, result) VALUES (%s,%s,%s,%s,%s)",
            (study, sleep, social, physical, result_label)
        )
        conn.commit()

        return {
            "prediction": result_label,
            "risk": int(prediction)
        }

    except Exception as e:
        return {"error": str(e)}


# ===== PLAN GENERATION =====
@app.post("/plan")
def generate_plan(data: dict):

    risk = data["risk"]

    if risk == 2:
        plan = {
            "level": "High Burnout Risk",
            "steps": [
                "Reduce study sessions to 2-hour blocks",
                "Sleep at least 7–8 hours",
                "Take breaks every 25 minutes",
                "Exercise daily",
                "Talk with a mentor or counselor"
            ]
        }

        flowchart = [
            "High Stress",
            "Poor Sleep",
            "Burnout Risk",
            "Reduce Study Load",
            "Improve Sleep",
            "Recovery"
        ]

    elif risk == 1:
        plan = {
            "level": "Moderate Burnout Risk",
            "steps": [
                "Balance study and rest",
                "Sleep 6–8 hours",
                "Take regular breaks",
                "Light physical activity"
            ]
        }

        flowchart = [
            "Moderate Stress",
            "Irregular Sleep",
            "Risk Detected",
            "Adjust Routine",
            "Recovery"
        ]

    else:
        plan = {
            "level": "Low Burnout Risk",
            "steps": [
                "Maintain current study schedule",
                "Keep sleeping 7–8 hours",
                "Take short breaks",
                "Exercise weekly"
            ]
        }

        flowchart = [
            "Healthy Study",
            "Balanced Sleep",
            "Low Burnout Risk",
            "Maintain Routine"
        ]

    return {
        "plan": plan,
        "flowchart": flowchart
    }


# ===== CHATBOT =====
@app.post("/chat")
def chat(data: dict):

    message = data["message"]

    payload = {
        "inputs": f"Answer this like a mental health assistant: {message}",
        "options": {"wait_for_model": True}
    }

    response = requests.post(API_URL, headers=headers, json=payload)
    result = response.json()

    try:
        if isinstance(result, list):
            reply = result[0]["generated_text"]
        else:
            reply = "Model loading... try again in a few seconds."
    except:
        reply = "AI service temporarily unavailable."

    return {"reply": reply}