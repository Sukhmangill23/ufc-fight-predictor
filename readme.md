<img width="1913" height="917" alt="image" src="https://github.com/user-attachments/assets/6681ae66-038d-4cfa-a132-ccdae01cb479" /># UFC Fight Predictor

A machine learning-powered web application that predicts UFC fight outcomes and provides detailed fighter analytics.

<img width="1913" height="917" alt="image" src="https://github.com/user-attachments/assets/3be647a0-45d0-41f6-b385-9f143ae9b3d4" />


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


