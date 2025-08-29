A machine learning-powered web application that predicts UFC fight outcomes and provides detailed fighter analytics.

<img width="1919" height="918" alt="1" src="https://github.com/user-attachments/assets/5b990001-9b3a-4ea4-94ed-46376808d012" />
<img width="1917" height="911" alt="1a" src="https://github.com/user-attachments/assets/70ac0a64-e65e-4863-8f63-f9996746ea4c" />
<img width="351" height="407" alt="1b" src="https://github.com/user-attachments/assets/208e9c9f-814d-42a2-8752-21a7d0cc089d" />
<img width="1913" height="911" alt="2" src="https://github.com/user-attachments/assets/a04e7df5-4e3d-477f-af44-d014a90a5ef4" />
<img width="795" height="822" alt="3" src="https://github.com/user-attachments/assets/9cd74de6-ad67-4421-ac56-ada68aebd9a3" />
<img width="744" height="895" alt="4" src="https://github.com/user-attachments/assets/c9dd47c3-08ae-49f8-8984-5d1189e08b8b" />
<img width="1919" height="918" alt="5" src="https://github.com/user-attachments/assets/0a326f4a-661a-49f6-8dff-f38ee3ef834e" />
<img width="1913" height="917" alt="6" src="https://github.com/user-attachments/assets/333bcbdf-5730-4860-9d04-b30da8293d2d" />
<img width="1918" height="914" alt="7" src="https://github.com/user-attachments/assets/9cd5864b-9944-4806-8d44-38095ae12721" />
<img width="1113" height="717" alt="8" src="https://github.com/user-attachments/assets/2d520828-8af0-469a-a662-56272d49ad15" />
<img width="951" height="417" alt="9" src="https://github.com/user-attachments/assets/1f467d8d-cea4-4752-b3d3-6652fa3a5155" />
<img width="1918" height="911" alt="10" src="https://github.com/user-attachments/assets/4f305403-21c6-49f3-ae58-a8f8a6d2f74b" />
<img width="792" height="431" alt="11" src="https://github.com/user-attachments/assets/3889049c-2cd0-47e9-b452-e3a79e929c1d" />
<img width="766" height="585" alt="12" src="https://github.com/user-attachments/assets/b222b413-5805-4977-98df-2c5a3792cd66" />


---

## Overview

The **UFC Fight Predictor** is a full-stack application leveraging historical UFC data and machine learning to:

- Analyze fighter matchups
- Predict fight outcomes
- Provide comprehensive fighter statistics  

The system combines a **Flask backend** with a **React frontend** to deliver an intuitive experience for MMA enthusiasts and analysts.

---

## Features

### Fight Prediction
- **Intelligent Matchup Analysis:** Input two fighters to get a detailed prediction of the likely winner.
- **Confidence Scoring:** View probability percentages for each fighter's chance of winning.
- **Prediction Insights:** Understand the key factors influencing each prediction with detailed breakdowns.

### Fighter Comparison
- **Head-to-Head Analysis:** Compare fighters across multiple attributes including striking, grappling, and experience.
- **Visual Comparison Tools:** Interactive charts and graphs showing fighter advantages.
- **Statistical Breakdown:** Detailed side-by-side comparison of fighter metrics.

### Fighter Analytics
- **Comprehensive Fighter Profiles:** View detailed statistics including height, reach, age, and fighting style.
- **Performance Metrics:** Analyze win/loss records, finishing rates, and fight history.
- **Historical Data:** Access complete fight history with opponents, results, and methods.

### User System
- **Secure Authentication:** User registration and login system with JWT tokens.
- **Prediction History:** Track previous predictions and outcomes.
- **Personalized Experience:** Save and revisit fighter analyses.

---

## Technology Stack

### Backend
- **Framework:** Flask (Python)
- **Machine Learning:** Scikit-learn, XGBoost
- **Database:** SQLite with SQLAlchemy
- **Authentication:** JWT (JSON Web Tokens)
- **API Architecture:** RESTful API design

### Frontend
- **Framework:** React.js
- **Charts & Visualization:** Chart.js, Recharts
- **Styling:** Custom CSS with Bootstrap influences
- **State Management:** React Context API

### Machine Learning
- **Model:** Gradient Boosting Classifier (XGBoost/HistGradientBoosting)
- **Features:** 15 engineered features including striking stats, grappling metrics, physical attributes, and experience factors
- **Training Data:** Historical UFC fight data with comprehensive fighter statistics

---

## Installation and Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- SQLite

### Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python database/init_db.py      # Initialize the database
python ml/model_pipeline.py     # Train the model
python run.py                   # Start the server
```
### Frontend Setup
``` bash
cd frontend
npm install
npm start                       # Start the development server
```
## Usage

1. Open your browser at [http://localhost:3000](http://localhost:3000)
2. Create an account or log in

### Predict Fights
- Select two fighters from the searchable database
- Configure fight details (number of rounds, title bout status)
- View prediction results and confidence percentages

### Compare Fighters
- Analyze strengths and weaknesses between fighters using the comparison tool

### Explore Analytics
- Dive deep into individual fighter statistics and historical performance

---

## API Endpoints

### Authentication
- `POST /register` - Create a new user account
- `POST /login` - Authenticate and receive JWT token

### Fighter Data
- `GET /search_fighters` - Search for fighters by name
- `POST /get_fighter_stats` - Retrieve detailed fighter statistics
- `POST /fighter_analytics_details` - Get comprehensive fighter analytics

### Predictions
- `POST /predict` - Generate fight prediction between two fighters
- `POST /prediction_insights` - Get detailed explanation of prediction factors
- `GET /prediction_history` - Retrieve user's prediction history

### Analytics
- `GET /fighter_analytics` - Get general fighter statistics and metrics
- `GET /top_performers` - Retrieve top performing fighters data

---

## Project Structure

```
ufc-fight-predictor/
├── backend/
│ ├── app/
│ │ ├── routes.py # Main API routes
│ │ ├── services/ # Business logic services
│ │ └── init.py # Flask app initialization
│ ├── database/
│ │ └── init_db.py # Database initialization
│ ├── ml/
│ │ ├── model_pipeline.py # ML model training pipeline
│ │ └── utils.py # Data processing utilities
│ └── models/ # Trained ML models
└── frontend/
└── src/
├── components/ # React components
├── pages/ # Page components
├── services/ # API service functions
└── context/ # React context providers

```

---

## Model Details

The prediction model uses **gradient boosting** trained on historical UFC data. Key features:

- **Striking statistics:** significant strikes per minute
- **Grappling metrics:** takedown accuracy, submission attempts
- **Physical attributes:** height, reach, age
- **Experience factors:** total fights, win streaks
- **Contextual factors:** number of rounds, title fight status

**Accuracy:** ~75-80% on historical data

---


## License

This project is for **educational and demonstration purposes**. UFC and related trademarks are property of their respective owners.

---


