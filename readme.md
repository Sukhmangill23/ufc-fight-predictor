<h1 align="center">UFC Fight Predictor</h1>

A full-stack web application that predicts UFC fight outcomes and provides detailed fighter analytics.

**Live Demo:** http://34.228.181.192:3000

---

## Overview

The **UFC Fight Predictor** is a full-stack application combining a Flask REST API, PostgreSQL database, and React frontend to deliver fight predictions and fighter analytics for MMA enthusiasts and analysts.

- Predict fight outcomes with confidence percentages
- Search and compare 2,100+ fighters with detailed stat breakdowns
- AI-powered chat agent for natural language fight queries
- Deployed on AWS EC2 with Docker and PostgreSQL

---

## Technology Stack

### Backend
- **Framework:** Flask (Python 3.11)
- **Database:** PostgreSQL 15 (psycopg2)
- **Authentication:** JWT (flask-jwt-extended), bcrypt
- **Server:** Gunicorn
- **API Architecture:** RESTful

### Infrastructure
- **Containerization:** Docker, Docker Compose
- **Deployment:** AWS EC2 (t3.micro)
- **Networking:** AWS Elastic IP, Security Groups

### Frontend
- **Framework:** React.js
- **Charts:** Recharts, Chart.js
- **HTTP Client:** Axios
- **Styling:** Custom CSS

### Machine Learning
- **Model:** XGBoost with isotonic probability calibration
- **Pipeline:** Scikit-learn (StandardScaler, SimpleImputer, ColumnTransformer)
- **Validation:** 10-fold temporal cross-validation
- **Accuracy:** ~75-80% on historical data

---

## Features

### Fight Prediction
- Select two fighters and get a data-driven prediction with confidence percentages
- Prediction insights showing which factors (striking, grappling, streaks, odds) drove the result

### Fighter Analytics
- Full fighter profiles: height, reach, age, stance, weight class
- Win/loss records, KO rate, submission rate, finish rate, win streaks
- Complete fight history with opponents, results, and methods

### Fighter Comparison
- Head-to-head comparison across striking, grappling, experience, and physical attributes
- Interactive charts showing fighter advantages

### AI Chat Agent
- Ask questions like "Who has the best KO rate at lightweight?" in natural language
- Gemini function-calling agent resolves queries against live PostgreSQL data

### User System
- Registration and login with bcrypt and JWT
- Prediction history with accuracy tracking

---

## Installation and Setup

### Prerequisites
- Docker and Docker Compose

### Run with Docker
```bash
git clone https://github.com/Sukhmangill23/ufc-fight-predictor.git
cd ufc-fight-predictor
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

### Initialize the database
```bash
docker exec -it ufc-fight-predictor-backend-1 python3 /app/database/init_db.py
```

### Train the ML model (optional — pre-trained model included)
```bash
docker exec -it ufc-fight-predictor-backend-1 python3 /app/ml/model_pipeline.py
```

---

## API Endpoints

### Authentication
- `POST /register` - Create a new user account
- `POST /login` - Authenticate and receive JWT token

### Fighter Data
- `GET /search_fighters` - Search fighters by name
- `POST /get_fighter_stats` - Retrieve fighter statistics
- `POST /fighter_analytics_details` - Get full fighter profile and fight history

### Predictions
- `POST /predict` - Generate fight prediction
- `POST /prediction_insights` - Get feature-level prediction breakdown
- `GET /prediction_history` - Retrieve prediction history and accuracy stats

### Analytics
- `GET /fighter_analytics` - Aggregate fighter statistics
- `GET /top_performers` - Top fighters by striking, KOs, and win streak
- `GET /upcoming_events` - Upcoming UFC events

### AI Agent
- `POST /chat` - Natural language query to Gemini agent

---

## Project Structure

```
ufc-fight-predictor/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory, CORS, JWT setup
│   │   ├── routes.py            # All API route handlers
│   │   ├── db.py                # PostgreSQL connection (psycopg2)
│   │   ├── agent.py             # Gemini function-calling AI agent
│   │   └── services/
│   │       ├── auth_service.py      # Registration and login logic
│   │       ├── fighter_service.py   # Top performer queries
│   │       ├── fighter_scraper.py   # ufcstats.com scraper
│   │       └── scraper.py           # Upcoming events scraper
│   ├── database/
│   │   └── init_db.py           # PostgreSQL schema initialization
│   ├── ml/
│   │   ├── model_pipeline.py    # XGBoost training pipeline
│   │   └── utils.py             # Feature engineering utilities
│   ├── models/                  # Trained model artifacts (.pkl)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   ├── pages/               # Page-level components
│   │   ├── services/api.js      # Axios API client
│   │   └── context/AuthContext.js  # JWT auth state
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

---

## Model Details

The prediction model uses **XGBoost with isotonic probability calibration** trained on historical UFC fight data.

**Feature categories (40+ total):**
- Betting odds and odds ratio
- Career striking differentials (sig strikes landed, accuracy, absorbed)
- Career grappling differentials (takedowns, submission attempts)
- Recency-weighted stats from last 3 fights (weighted 0.5 / 0.3 / 0.2)
- Finish rates (KO/TKO/submission percentage of wins)
- Experience metrics (total fights, title bouts, rounds fought)
- Streak features (current win/loss streak, longest win streak)
- Physical differentials (height, reach, age)
- Fight context (rounds, title bout, weight class)
- Rankings differential

**Validation:** 10-fold temporal cross-validation (time-ordered, no future data leakage)

**Accuracy:** ~75-80% on historical holdout data

---

<img width="1917" height="911" alt="1a" src="https://github.com/user-attachments/assets/70ac0a64-e65e-4863-8f63-f9996746ea4c" />
<p align="center">
<img width="318" height="405" alt="1b" src="https://github.com/user-attachments/assets/3fbc5546-4f31-4834-b7be-a1f4b7853996" />
</p>
<img width="1919" height="918" alt="1" src="https://github.com/user-attachments/assets/2b9c73e6-2b68-43bd-b1f7-b44134311c3d" />
<img width="1913" height="911" alt="2" src="https://github.com/user-attachments/assets/a04e7df5-4e3d-477f-af44-d014a90a5ef4" />
<p align="center">
<img width="795" height="822" alt="3" src="https://github.com/user-attachments/assets/9cd74de6-ad67-4421-ac56-ada68aebd9a3" />
<img width="744" height="725" alt="4" src="https://github.com/user-attachments/assets/1f543f6a-c282-4afc-8c5e-5fe88905c650" />
</p>
<img width="1919" height="918" alt="1 - Copy" src="https://github.com/user-attachments/assets/6c881924-90c7-46aa-b407-aab937f59682" />
<img width="1913" height="917" alt="6" src="https://github.com/user-attachments/assets/333bcbdf-5730-4860-9d04-b30da8293d2d" />
<img width="1918" height="914" alt="7" src="https://github.com/user-attachments/assets/9cd5864b-9944-4806-8d44-38095ae12721" />
<img width="1113" height="717" alt="8" src="https://github.com/user-attachments/assets/2d520828-8af0-469a-a662-56272d49ad15" />
<p align="center">
<img width="951" height="417" alt="9" src="https://github.com/user-attachments/assets/1f467d8d-cea4-4752-b3d3-6652fa3a5155" />
<img width="1918" height="911" alt="10" src="https://github.com/user-attachments/assets/4f305403-21c6-49f3-ae58-a8f8a6d2f74b" />
</p>
<p align="center">
<img width="792" height="431" alt="11" src="https://github.com/user-attachments/assets/3889049c-2cd0-47e9-b452-e3a79e929c1d" />
<img width="766" height="585" alt="12" src="https://github.com/user-attachments/assets/b222b413-5805-4977-98df-2c5a3792cd66" />
</p>
