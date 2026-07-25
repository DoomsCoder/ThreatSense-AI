<div align="center">

# 🛡️ ThreatSense AI

### Enterprise Threat Intelligence & Behavioral Analytics

*Detects insider threats, credential attacks, and account hijacking in real time — powered by Isolation Forest ML and SHAP explainability.*

---

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Java](https://img.shields.io/badge/Java-17%2F21-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=flat-square&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

</div>

---

## The Idea

Modern organizations have hundreds of users logging in from different cities, devices, and time zones. Hidden inside those normal access logs are attackers — using stolen passwords, impossible location jumps, or fake devices. Traditional rule-based systems miss the subtle ones.

ThreatSense AI trains a machine learning model on your access log patterns and surfaces the **statistical outliers** — the logins that don't fit. Every flagged event comes with a plain-English explanation of *why* the AI thinks it's suspicious, so your security team can act fast without guessing.

---

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│  ML Engine (Python)                                              │
│  • Generates ~5,000 synthetic access logs with realistic users,  │
│    devices, and locations                                        │
│  • Injects 5 attack patterns (Brute Force, Impossible Travel,    │
│    Device Spoofing, Lateral Movement, Credential Misuse)         │
│  • Performs advanced feature engineering for behavioral anomalies│
│  • Trains an Isolation Forest and calculates real F1 metrics     │
│  • Computes SHAP values so every prediction is explainable       │
│  • Outputs → shared/threat_data.json                            │
└───────────────────────┬──────────────────────────────────────────┘
                        │  JSON file
┌───────────────────────▼──────────────────────────────────────────┐
│  Backend API (Spring Boot)                                       │
│  • Reads threat_data.json into memory                            │
│  • Exposes REST endpoints: /api/stats, /api/threats, etc.        │
│  • POST /api/regenerate → runs the Python ML engine on demand    │
└───────────────────────┬──────────────────────────────────────────┘
                        │  HTTP / REST
┌───────────────────────▼──────────────────────────────────────────┐
│  Dashboard (React + Vite)                                        │
│  • Live system status badge with threat score                    │
│  • Real-time Model Performance metrics (Precision, Recall, F1)   │
│  • Animated metric cards (total logs, anomalies, avg risk)       │
│  • Dual-mode risk timeline (ComposedChart with interactive Scatter)│
│  • Filterable threat table with Cold Start ❄️ & Drift ⚠️ badges │
│  • AI Explainability modal — SHAP bar chart + plain-English tips  │
│  • CSV export of flagged threats                                 │
│  • One-click REFRESH regenerates fresh ML data end-to-end        │
└──────────────────────────────────────────────────────────────────┘
```

---

## The Five Threat Types

| Threat | What It Simulates |
|---|---|
| 🔐 **Brute Force** | Repeated failed login attempts on an account — credential stuffing or password spray attack |
| 🌍 **Impossible Travel** | A user logs in from New York, then Singapore 2 hours later — physically impossible |
| 📱 **Device Spoofing** | Login from an unrecognized device — possible account takeover with cloned credentials |
| 🛠️ **Lateral Movement** | User suddenly gains admin privileges from a new location with unusually short sessions |
| 🔑 **Credential Misuse** | Stealthy, successful logins at highly unusual hours (e.g. 1am - 4am) from a known device |

---

## Prerequisites

Make sure these are installed before you start:

| Tool | Version | Check |
|---|---|---|
| Python | 3.9 – 3.14 | `python --version` |
| Java (JDK) | 17 or 21 | `java -version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

> **Note for Windows:** Maven is bundled via `mvnw.cmd` — you do **not** need to install Maven separately.

---

## Getting Started

### 1 — Install Python dependencies *(first time only)*

```bash
cd ml-engine
pip install -r requirements.txt --only-binary=:all:
```

> The `--only-binary` flag avoids source compilation issues on Windows.

---

### 2 — Generate the threat data

```bash
cd ml-engine
python generate_and_train.py
```

Or just double-click **`run_ml.bat`** in the project root.

This takes about **30–60 seconds** (SHAP computation). When done you'll see:

[ThreatSense] [OK] Done!
  Total logs     : 4706
  Anomalies      : 966 (20.5%)
  Brute Force      : 165
  Impossible Travel: 369
  Device Spoofing  : 100
  Lateral Movement : 192
  Credential Misuse: 140
  Cold Start Logs   : 269
  Concept Drift Logs: 294
  Avg Risk Score : 26.5
  High Risk (>=70): 302

The output is saved to `shared/threat_data.json`. Every run produces **different numbers** because the seed is time-based.

---

### 3 — Start the backend

Open a **new terminal** and run:

```bash
cd backend
.\mvnw.cmd spring-boot:run       # Windows
# ./mvnw spring-boot:run         # Linux / Mac
```

Wait until you see:
```
Started ThreatSenseApplication in X.X seconds
```

Backend is now live at **`http://localhost:8080`**

---

### 4 — Start the frontend

Open another **new terminal** and run:

```bash
cd frontend
npm install        # first time only
npm run dev
```

Open your browser at **`http://localhost:5173`** 🎉

---

## Startup Order

> Always follow this order. The frontend can't show data if the backend isn't running, and the backend needs the JSON file to exist.

```
1. python generate_and_train.py   ← creates the JSON
2. mvnw spring-boot:run           ← reads the JSON, serves the API
3. npm run dev                    ← shows the dashboard
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | Summary metrics — total logs, anomaly count, avg risk score, system threat score |
| `GET` | `/api/threats` | All flagged anomalies, sorted by risk score descending |
| `GET` | `/api/threats/{id}` | Single log entry with full SHAP feature contributions |
| `GET` | `/api/threats/all` | All ~5,000 logs (normal + anomalous), used for charting |
| `POST` | `/api/reload` | Force-reload `threat_data.json` from disk without restarting |
| `POST` | `/api/regenerate` | Run the Python ML engine from inside the backend, then reload *(used by the Refresh button)* |

---

## Dashboard Features

**Header**
- System threat status — `NORMAL / ELEVATED / HIGH / CRITICAL` based on top-50 average risk score
- Live timestamp updates
- **REFRESH** — runs the full ML pipeline and reloads the dashboard (30–60s, shows spinner)
- **EXPORT CSV** — downloads the current filtered threat list as a `.csv` file

**Metric Cards & KPI**
- Real-time Model Performance (Precision, Recall, F1 Score)
- Total Events Analyzed
- Anomalies Detected (with high-risk count)
- Avg Risk Score (All Events)
- Threat Breakdown bar chart for all 5 threat types

**Risk Timeline**
- Line chart of risk scores over time
- Anomaly dots color-coded by threat type overlayed precisely via Scatter plot
- Hover tracking with interactive glowing dots and cursor guides
- Toggle between Timeline and Distribution (histogram) views

**Flagged Threats Table**
- Search by user, IP, or location
- Filter by threat type
- **Context Badges**: Displays ❄️ (Cold Start: < 15 logs) and ⚠️ (Concept Drift) to assist analyst confidence
- Sort by any column
- Paginated (15 rows per page)
- Click any row to open the AI Explainability modal

**AI Explainability Modal**
- Circular risk gauge
- SHAP horizontal bar chart — red bars = features pushing risk up, blue = pulling it down
- Plain-English tooltip for each feature ("This user had 12 failed attempts — strongly increased risk")
- One-click copy of log details

---

## Project Structure

```
ThreatSense AI/
├── ml-engine/
│   ├── generate_and_train.py     # ML pipeline — data gen, IF training, SHAP, JSON output
│   └── requirements.txt
│
├── backend/
│   └── src/main/java/com/honeywell/threatsense/
│       ├── ThreatSenseApplication.java
│       ├── controller/ThreatController.java   # REST endpoints
│       ├── service/ThreatService.java         # data loading, stats, ML runner
│       └── model/ThreatLog.java              # JSON → Java mapping
│
├── frontend/
│   └── src/
│       ├── App.jsx                    # data fetching, state, layout
│       └── components/
│           ├── Header.jsx             # branding, system status, refresh/export buttons
│           ├── MetricCards.jsx        # animated stat cards
│           ├── ThreatChart.jsx        # Recharts timeline + distribution
│           ├── ThreatTable.jsx        # sortable/filterable threat table
│           └── ExplainModal.jsx       # SHAP explainability modal
│
├── shared/
│   └── threat_data.json              # ML output, read by the backend
│
├── run_ml.bat                        # Windows shortcut to run the ML engine
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **ML** | Python 3, scikit-learn (Isolation Forest), SHAP, Faker, pandas, numpy |
| **Backend** | Java 17, Spring Boot 3.2, Spring Web, Lombok, Jackson |
| **Frontend** | React 18, Vite 5, Tailwind CSS v3, Recharts, Axios, Lucide icons |
| **Storage** | Flat JSON file — no database required |

---

## Troubleshooting

**`python generate_and_train.py` fails with a build error**
```bash
pip install -r requirements.txt --only-binary=:all:
```
Some packages like `pandas` require C compilation on Windows — the `--only-binary` flag forces pre-built wheels.

**Backend says `threat_data.json not found`**
Run the ML engine first (Step 2). The file must exist before the backend starts.

**`mvnw.cmd` is not recognized**
Make sure you're running from inside the `backend/` directory.

**Frontend shows "Cannot connect to backend"**
Confirm Spring Boot is running on port 8080. Check the backend terminal for errors.

**Refresh button spins for a long time**
That's normal — it's running the full ML pipeline (SHAP computation takes ~40s). The button will show `REGENERATING...` while it works.

---

<div align="center">
<sub>Built with Python · Spring Boot · React · Isolation Forest · SHAP</sub>
</div>
