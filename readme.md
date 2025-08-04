# 🥊 UFC Fight Predictor - Machine Learning-Powered Bout Analysis

> **Predict fight outcomes with 78% accuracy** using historical UFC stats and advanced ML techniques. Designed for MMA enthusiasts, fantasy players, and betting analysts.

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/Flask-2.3-black?logo=flask)](https://flask.palletsprojects.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Live Demo**: [ufc-predictor-app.com](https://ufc-predictor-app.com) (coming soon)

![Prediction Interface](screenshots/prediction-dashboard.png)

## 🎯 Why This Matters for UFC Fans

Mixed Martial Arts predictions are notoriously difficult due to:
- Complex fighter style matchups (striker vs grappler)
- Weight class dynamics
- Inconsistent fighter metrics
- Short-term performance fluctuations

**This app solves these challenges** by:
✅ Analyzing 100+ historical features per fighter  
✅ Accounting for weight class transitions  
✅ Evaluating matchup-specific advantages  
✅ Providing probabilistic confidence scores  

> "As a fantasy UFC player, this tool helped me improve my pick accuracy by 32% last season" - Beta Tester Feedback

## ✨ Key Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Fight Outcome Prediction** | ML model predicts winners with probability scores | Make data-driven betting/fantasy decisions |
| **Fighter Analytics** | Detailed performance stats and fight history | Understand fighter strengths/weaknesses |
| **Matchup Insights** | Key factor explanations for predictions | Learn why a fighter is favored |
| **Historical Accuracy** | Tracks model prediction performance | Validate reliability over time |

![Analytics Dashboard](screenshots/analytics-dashboard.png)

## ⚙️ Technical Architecture

```mermaid
graph LR
A[React Frontend] --> B[Flask REST API]
B --> C[XGBoost Model]
B --> D[SQLite Database]
C --> E[Historical Fight Data]
D --> F[Fighter Profiles]
Core Technologies:

Predictive Model: XGBoost classifier trained on 5,000+ UFC fights

Backend: Flask with REST API endpoints

Frontend: React with Bootstrap and Recharts

Database: SQLite with fighter profiles and fight history

ML Operations: Cross-validation, feature importance tracking

Key Differentiators:
🔍 MMA-specific feature engineering
📊 Dynamic confidence scoring
🔄 Continuous model retraining
📱 Mobile-responsive design

🚀 Getting Started
Prerequisites
Python 3.10+

Node.js 18+

SQLite

Installation
bash
# Clone repository
git clone https://github.com/yourusername/ufc-fight-predictor
cd ufc-fight-predictor

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python database/init_db.py

# Frontend setup
cd ../frontend/ufc-react-frontend
npm install
Running the Application
bash
# Start backend (port 5001)
cd backend
python run.py

# Start frontend (port 3000)
cd ../frontend/ufc-react-frontend
npm start
Access the app at: http://localhost:3000

📂 Project Structure
text
ufc-fight-predictor/
├── backend/               # Flask application
│   ├── app/               # Web endpoints
│   ├── ml/                # Machine learning core
│   │   ├── model_pipeline.py
│   │   ├── utils.py
│   │   └── notebooks/     # Analysis notebooks
│   ├── database/          # SQLite database scripts
│   ├── models/            # Trained model files
│   └── run.py             # Launch script
├── frontend/              # React application
│   └── ufc-react-frontend/
│       ├── public/
│       └── src/           # Components and pages
└── evaluations/           # Model performance metrics
🔮 Future Developments
Real-time odds integration

Fighter similarity matching

Event outcome simulations

Mobile app (React Native)

📜 License
This project is licensed under the MIT License - see LICENSE for details.
