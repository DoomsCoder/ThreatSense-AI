"""
ThreatSense AI - ML Engine
Generates synthetic user login logs, injects security anomalies,
applies Isolation Forest for anomaly scoring, and uses SHAP for explainability.
Outputs: ../shared/threat_data.json
"""

import json
import random
import os
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from faker import Faker
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
import shap
import warnings

warnings.filterwarnings("ignore")

fake = Faker()

# Use time-based seed so every run produces different data
_seed = int(datetime.now().timestamp() * 1000) % (2**32)
random.seed(_seed)
np.random.seed(_seed)

IST = timezone(timedelta(hours=5, minutes=30))

# ---------------------------------------------------------------------------
# 1. Configuration
# ---------------------------------------------------------------------------
# Dynamic 24-Hour Logs
TOTAL_LOGS = random.randint(4000, 6000)
# Randomize total anomalies between 10% and 18% of TOTAL_LOGS
ANOMALY_COUNT = int(TOTAL_LOGS * random.uniform(0.10, 0.18))
ANOMALY_RATIO = ANOMALY_COUNT / TOTAL_LOGS
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "shared", "threat_data.json")

LOCATIONS = [
    ("New York", "US"), ("London", "UK"), ("Frankfurt", "DE"),
    ("Singapore", "SG"), ("Tokyo", "JP"), ("Sydney", "AU"),
    ("Mumbai", "IN"), ("Toronto", "CA"), ("Dubai", "AE"),
    ("São Paulo", "BR"),
]

DEVICE_POOL = [f"DEV-{fake.md5()[:8].upper()}" for _ in range(80)]
ADMIN_USERS = [f"admin_{i:03d}" for i in range(1, 21)]
REGULAR_USERS = [f"user_{i:04d}" for i in range(1, 201)]
ALL_USERS = ADMIN_USERS + REGULAR_USERS

# Pre-assign each user a "known device" and "home location"
USER_KNOWN_DEVICE = {u: random.choice(DEVICE_POOL[:60]) for u in ALL_USERS}
USER_HOME_LOCATION = {u: random.choice(LOCATIONS[:6]) for u in ALL_USERS}

# ---------------------------------------------------------------------------
# 2. Generate Normal Logs
# ---------------------------------------------------------------------------
# Randomize start time exactly 24 hours ago
base_time = datetime.now(IST) - timedelta(hours=24)
base_time = base_time.replace(minute=0, second=0, microsecond=0)

def make_normal_log(log_id: int, timestamp: datetime) -> dict:
    user = random.choice(ALL_USERS)
    loc = USER_HOME_LOCATION[user]
    # Add small variance: occasional slightly elevated failed attempts for normal users
    failed = random.choices(
        [0, 1, 2, 3],
        weights=[0.70, 0.18, 0.08, 0.04]
    )[0]
    return {
        "id": log_id,
        "timestamp": timestamp.isoformat(),
        "user_id": user,
        "ip_address": fake.ipv4_public(),
        "location_city": loc[0],
        "location_country": loc[1],
        "device_id": USER_KNOWN_DEVICE[user],
        "failed_attempts": failed,
        "session_duration_sec": random.randint(60, 9000),
        "privilege_level": "admin" if user in ADMIN_USERS else "standard",
        "anomaly_type": "None",
        "_injected": False,
    }

logs = []
current_time = base_time
avg_step_sec = (24 * 3600) // TOTAL_LOGS

for i in range(1, TOTAL_LOGS + 1):
    current_time += timedelta(seconds=random.randint(max(1, avg_step_sec // 2), int(avg_step_sec * 1.5)))
    logs.append(make_normal_log(i, current_time))

# ---------------------------------------------------------------------------
# 3. Inject Anomalies
# ---------------------------------------------------------------------------
anomaly_indices = random.sample(range(len(logs)), ANOMALY_COUNT)

THREAT_TYPES = [
    "Brute Force", "Impossible Travel", "Device Spoofing", 
    "Lateral Movement", "Credential Misuse"
]

# Give them random weights so the distribution changes every run
weights = [random.uniform(0.1, 1.0) for _ in THREAT_TYPES]
total_weight = sum(weights)
probs = [w / total_weight for w in weights]

# Distribute ANOMALY_COUNT into these buckets based on probs
counts = [int(ANOMALY_COUNT * p) for p in probs]
# Adjust rounding error
counts[0] += ANOMALY_COUNT - sum(counts)

idx_start = 0
buckets = {}
for i, threat in enumerate(THREAT_TYPES):
    buckets[threat] = anomaly_indices[idx_start:idx_start+counts[i]]
    idx_start += counts[i]

for threat, indices in buckets.items():
    for i in indices:
        if threat == "Brute Force":
            logs[i]["failed_attempts"] = random.randint(6, 20)
            logs[i]["session_duration_sec"] = random.randint(5, 60)
        elif threat == "Impossible Travel":
            user = logs[i]["user_id"]
            home = USER_HOME_LOCATION[user]
            foreign = random.choice([l for l in LOCATIONS if l[1] != home[1]])
            logs[i]["location_city"] = foreign[0]
            logs[i]["location_country"] = foreign[1]
            logs[i]["timestamp"] = (
                datetime.fromisoformat(logs[max(0, i - 1)]["timestamp"])
                + timedelta(minutes=random.randint(1, 8))
            ).isoformat()
        elif threat == "Device Spoofing":
            user = random.choice(ADMIN_USERS)
            logs[i]["user_id"] = user
            logs[i]["privilege_level"] = "admin"
            unknown_devices = [d for d in DEVICE_POOL[60:] if d != USER_KNOWN_DEVICE[user]]
            logs[i]["device_id"] = random.choice(unknown_devices)
        elif threat == "Lateral Movement":
            user = random.choice(ADMIN_USERS)
            logs[i]["user_id"] = user
            logs[i]["privilege_level"] = "admin"
            home = USER_HOME_LOCATION[user]
            foreign = random.choice([l for l in LOCATIONS if l[1] != home[1]])
            logs[i]["location_city"] = foreign[0]
            logs[i]["location_country"] = foreign[1]
            logs[i]["failed_attempts"] = random.randint(0, 1)
            # ADD: Very short sessions = rapid pivoting behavior
            logs[i]["session_duration_sec"] = random.randint(10, 45)
        elif threat == "Credential Misuse":
            user = random.choice(ALL_USERS)
            logs[i]["user_id"] = user
            logs[i]["failed_attempts"] = 0
            logs[i]["device_id"] = USER_KNOWN_DEVICE[user]
            # unusual hour (1am-4am)
            new_ts = datetime.fromisoformat(logs[i]["timestamp"])
            new_ts = new_ts.replace(hour=random.randint(1, 4))
            logs[i]["timestamp"] = new_ts.isoformat()
            # ADD: Very short session — credential theft is in and out
            logs[i]["session_duration_sec"] = random.randint(5, 30)
            # ADD: Slightly elevated but not extreme failures
            logs[i]["failed_attempts"] = random.randint(1, 2)
            
        logs[i]["anomaly_type"] = threat
        logs[i]["_injected"] = True

# Cold Start Flagging
user_event_counts = {}
for log in logs:
    user_event_counts[log["user_id"]] = user_event_counts.get(log["user_id"], 0) + 1

for log in logs:
    log["cold_start"] = user_event_counts[log["user_id"]] < 15

# Concept Drift Simulation
midpoint = len(logs) // 2
for i, log in enumerate(logs):
    if i < midpoint:
        log["behavioral_window"] = "baseline"
        log["concept_drift_flag"] = False
    else:
        log["behavioral_window"] = "shifted"
        if not log["_injected"] and random.random() < 0.15:
            log["failed_attempts"] = min(5, log["failed_attempts"] + 2)
            log["concept_drift_flag"] = True
        else:
            log["concept_drift_flag"] = False

# ---------------------------------------------------------------------------
# 4. Build DataFrame & Feature Engineering
# ---------------------------------------------------------------------------
df = pd.DataFrame(logs)
df["ts_unix"] = pd.to_datetime(df["timestamp"]).astype("int64") // 10**9
df["hour_of_day"] = pd.to_datetime(df["timestamp"]).dt.hour

# Feature Engineering for Isolation Forest
# Instead of arbitrary integer encodings, we use meaningful behavioral flags
df["is_new_location"] = (df["location_country"] != df["user_id"].map(lambda u: USER_HOME_LOCATION[u][1])).astype(int)
df["is_new_device"]   = (df["device_id"] != df["user_id"].map(USER_KNOWN_DEVICE)).astype(int)
df["is_admin"]        = (df["privilege_level"] == "admin").astype(int)

FEATURES = [
    "failed_attempts",
    "session_duration_sec",
    "hour_of_day",
    "is_new_location",
    "is_new_device",
    "is_admin",
]

X = df[FEATURES].values

# ---------------------------------------------------------------------------
# 5. Train Isolation Forest
# ---------------------------------------------------------------------------
print("[ThreatSense] Training Isolation Forest...")
iso = IsolationForest(
    n_estimators=200,
    contamination=min(0.5, ANOMALY_RATIO * 1.15),
    random_state=42,
    n_jobs=-1,
)
iso.fit(X)

raw_scores = iso.decision_function(X)
predictions = iso.predict(X)

# Scale raw scores to 0-100 risk score (higher = riskier)
score_min, score_max = raw_scores.min(), raw_scores.max()
risk_scores = 100 * (1 - (raw_scores - score_min) / (score_max - score_min))
risk_scores = np.clip(risk_scores, 0, 99).round(1)

df["risk_score"]   = risk_scores
df["is_anomaly"]   = predictions == -1

# ---------------------------------------------------------------------------
# 5.5 Train Attack Classifier (Supervised on Injected Anomalies)
# ---------------------------------------------------------------------------
print("[ThreatSense] Training Attack Classifier (RandomForest)...")

df_anomalies = df[df["_injected"] == True].copy()

if len(df_anomalies) > 0:
    # Show class distribution — demonstrates awareness of imbalance
    from collections import Counter
    dist = Counter(df_anomalies["anomaly_type"].values)
    print("\n[ThreatSense] Attack type distribution (training data):")
    for attack_type, count in sorted(dist.items(), key=lambda x: -x[1]):
        pct = round(count / len(df_anomalies) * 100, 1)
        print(f"  {attack_type:<20}: {count:>4} samples ({pct}%)")
    print(f"  Applying class_weight='balanced' to correct imbalance\n")

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42
    )
    rf.fit(df_anomalies[FEATURES].values, df_anomalies["anomaly_type"].values)

    df["predicted_anomaly_type"] = "None"
    detected_mask = df["is_anomaly"] == True
    if detected_mask.sum() > 0:
        predicted_types = rf.predict(df[detected_mask][FEATURES].values)
        df.loc[detected_mask, "predicted_anomaly_type"] = predicted_types
else:
    df["predicted_anomaly_type"] = "None"

# ---------------------------------------------------------------------------
# 6. SHAP Explainability
# ---------------------------------------------------------------------------
print("[ThreatSense] Computing SHAP values (this may take a moment)...")
explainer   = shap.TreeExplainer(iso)
shap_values = explainer.shap_values(X)

FEATURE_LABELS = {
    "failed_attempts":      "Failed Login Attempts",
    "session_duration_sec": "Session Duration (sec)",
    "hour_of_day":          "Hour of Day",
    "is_new_location":      "Unusual Location",
    "is_new_device":        "Unknown Device",
    "is_admin":             "Admin Privilege",
}

def build_explanation(shap_row: np.ndarray) -> dict:
    feature_impacts = {
        FEATURE_LABELS[FEATURES[j]]: round(float(shap_row[j]), 4)
        for j in range(len(FEATURES))
    }
    top3 = dict(
        sorted(feature_impacts.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
    )
    return top3

df["explanation"] = [build_explanation(shap_values[i]) for i in range(len(df))]

# ---------------------------------------------------------------------------
# 7. Finalise & Export
# ---------------------------------------------------------------------------
output_records = []
for _, row in df.iterrows():
    output_records.append({
        "id":               int(row["id"]),
        "timestamp":        row["timestamp"],
        "user_id":          row["user_id"],
        "ip_address":       row["ip_address"],
        "location_city":    row["location_city"],
        "location_country": row["location_country"],
        "device_id":        row["device_id"],
        "failed_attempts":  int(row["failed_attempts"]),
        "session_duration_sec": int(row["session_duration_sec"]),
        "privilege_level":  row["privilege_level"],
        "hour_of_day":      int(row["hour_of_day"]),
        "risk_score":       float(row["risk_score"]),
        "is_anomaly":       bool(row["is_anomaly"]),
        "anomaly_type":     row["predicted_anomaly_type"],
        "explanation":      row["explanation"],
        "cold_start":       bool(row["cold_start"]),
        "concept_drift_flag": bool(row["concept_drift_flag"]),
        "behavioral_window": str(row["behavioral_window"]),
        "triage_status":    "unreviewed",
    })

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# ---------------------------------------------------------------------------
# 5.6 Model Performance Evaluation (Ground Truth vs Predictions)
# ---------------------------------------------------------------------------
# NOTE: _injected is used internally for ground truth evaluation only.
# It is excluded from output JSON to reflect realistic deployment.
y_true = df["_injected"].astype(int)  # 1 = real threat, 0 = normal
y_pred = df["is_anomaly"].astype(int) # 1 = detected, 0 = not detected

report = classification_report(
    y_true,
    y_pred,
    target_names=["Normal", "Threat"],
    output_dict=True
)

print("[ThreatSense] Model Performance vs Ground Truth:")
print(classification_report(y_true, y_pred, target_names=["Normal", "Threat"]))

perf = report.get("Threat", {})
model_performance = {
    "precision": round(perf.get("precision", 0), 2),
    "recall":    round(perf.get("recall", 0), 2),
    "f1_score":  round(perf.get("f1-score", 0), 2)
}

final_output = {
    "model_performance": model_performance,
    "records": output_records
}

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(final_output, f, indent=2, ensure_ascii=False)

# Summary
total      = len(output_records)
anomalies  = sum(1 for r in output_records if r["is_anomaly"])
avg_risk   = round(sum(r["risk_score"] for r in output_records) / total, 1)
high_risk  = sum(1 for r in output_records if r["risk_score"] >= 70)

print(f"\n[ThreatSense] [OK] Done!")
print(f"  Total logs     : {total}")
print(f"  Anomalies      : {anomalies} ({round(anomalies/total*100, 1)}%)")

for threat in THREAT_TYPES:
    count = sum(1 for r in output_records if r["anomaly_type"] == threat)
    print(f"  {threat.ljust(17)}: {count}")

print(f"  Cold Start Logs   : {sum(1 for r in output_records if r['cold_start'])}")
print(f"  Concept Drift Logs: {sum(1 for r in output_records if r['concept_drift_flag'])}")
print(f"  Avg Risk Score : {avg_risk}")
print(f"  High Risk (>=70): {high_risk}")

print(f"  Output         : {os.path.abspath(OUTPUT_PATH)}")
