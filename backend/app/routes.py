from flask import Blueprint, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
import sqlite3
import traceback
from sklearn.metrics import confusion_matrix, accuracy_score
from ml.utils import get_fighter_stats, fill_missing_stats
import random
from ml.utils import get_fighter_stats, fill_missing_stats
from collections import defaultdict

main = Blueprint('main', __name__)

# ---------------------------------------------------------------------------
# CONSTANTS
# ---------------------------------------------------------------------------
WEIGHT_CLASSES = {
    'Strawweight': 0,
    'Flyweight': 1,
    'Bantamweight': 2,
    'Featherweight': 3,
    'Lightweight': 4,
    'Welterweight': 5,
    'Middleweight': 6,
    'Light Heavyweight': 7,
    'Heavyweight': 8,
    'Catch Weight': 4,
    'Openweight': 4
}

FEATURES = [
    'RedOdds', 'BlueOdds', 'OddsRatio', 'WinStreakDif',
    'HeightAdvRed', 'ReachAdvRed', 'SizeAdvRed', 'StanceMatch',
    'RedAge', 'BlueAge', 'NumberOfRounds', 'TitleBout',
    'WeightClassAdvRed', 'ExpAdvRed', 'GrappleAdvRed'
]

MAX_DIVISION_GAP = 2

# ---------------------------------------------------------------------------
# MODEL
# ---------------------------------------------------------------------------
model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'ufc_predictor_v4.pkl')
model = joblib.load(model_path)

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')


# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------
def compute_model_features(red_stats, blue_stats, data):
    """Compute model features from fighter stats and form data"""
    # Get weight class values
    red_wc = red_stats.get('weight_class', 'Lightweight')
    blue_wc = blue_stats.get('weight_class', 'Lightweight')

    # Create features dictionary
    features = {
        'RedOdds': red_stats.get('avg_sig_str', 0) * -1,
        'BlueOdds': blue_stats.get('avg_sig_str', 0),
        'WinStreakDif': red_stats.get('win_streak', 0) - blue_stats.get('win_streak', 0),
        'RedAge': red_stats.get('age', 30),
        'BlueAge': blue_stats.get('age', 30),
        'NumberOfRounds': int(data.get('number_of_rounds', 3)),
        'TitleBout': 1 if data.get('title_bout') == 'true' else 0,
        'HeightAdvRed': red_stats.get('height', 180) - blue_stats.get('height', 180),
        'ReachAdvRed': red_stats.get('reach', 180) - blue_stats.get('reach', 180),
        'StanceMatch': 1 if red_stats.get('stance', 'Orthodox') == blue_stats.get('stance', 'Orthodox') else 0,
        'WeightClassAdvRed': WEIGHT_CLASSES.get(red_wc, 4) - WEIGHT_CLASSES.get(blue_wc, 4),
        'ExpAdvRed': red_stats.get('total_fights', 0) - blue_stats.get('total_fights', 0),
        'GrappleAdvRed': (red_stats.get('avg_sub_att', 0) - blue_stats.get('avg_sub_att', 0)) +
                         (red_stats.get('avg_td_pct', 0) - blue_stats.get('avg_td_pct', 0))
    }

    # Compute derived features
    features['OddsRatio'] = features['RedOdds'] / features['BlueOdds'] if features['BlueOdds'] != 0 else 1
    features['SizeAdvRed'] = (features['HeightAdvRed'] + features['ReachAdvRed']) / 2

    return features


def get_conn():
    """Get database connection"""
    return sqlite3.connect(DB_PATH)


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------
@main.route('/')
def home():
    return "UFC Predictor API"


@main.route('/search_fighters', methods=['GET'])
def search_fighters():
    term = request.args.get('term', '')
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM fighters WHERE name LIKE ? LIMIT 10", (f'%{term}%',))
    fighters = [row[0] for row in cursor.fetchall()]

    conn.close()
    return jsonify(fighters)


@main.route('/get_fighter_stats', methods=['POST'])
def get_fighter_stats_route():
    fighter_name = request.form.get('fighter')
    stats = get_fighter_stats(fighter_name)

    if not stats:
        return jsonify({'error': 'Fighter not found'})

    # Normalize property names
    normalized_stats = {
        'name': stats.get('name', fighter_name),
        'height': stats.get('height', stats.get('height_cms', 0)),
        'reach': stats.get('reach', stats.get('reach_cms', 0)),
        'age': stats.get('age', 30),
        'stance': stats.get('stance', 'Orthodox'),
        'win_streak': stats.get('win_streak', stats.get('current_win_streak', 0)),
        'ko_wins': stats.get('ko_wins', stats.get('wins_by_ko', 0)),
        'weight_class': stats.get('weight_class', 'Lightweight'),
        'avg_sig_str': stats.get('avg_sig_str', 0),
        'avg_td_pct': stats.get('avg_td_pct', 0),
        'avg_sub_att': stats.get('avg_sub_att', 0),
        'total_fights': stats.get('total_fights', 0)
    }

    return jsonify(normalized_stats)


@main.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.form
        red_stats_raw = get_fighter_stats(data['red_fighter'])
        blue_stats_raw = get_fighter_stats(data['blue_fighter'])

        if not red_stats_raw or not blue_stats_raw:
            return jsonify({'error': 'Fighter not found in database'}), 400

        red_stats = fill_missing_stats(red_stats_raw)
        blue_stats = fill_missing_stats(blue_stats_raw)

        # Validation checks
        if data['red_fighter'].strip().lower() == data['blue_fighter'].strip().lower():
            return jsonify({'error': 'Please select two different fighters'}), 400

        red_wc = red_stats.get('weight_class', 'Lightweight')
        blue_wc = blue_stats.get('weight_class', 'Lightweight')
        wc_gap = abs(WEIGHT_CLASSES.get(red_wc, 4) - WEIGHT_CLASSES.get(blue_wc, 4))

        if wc_gap > MAX_DIVISION_GAP:
            msg = (
                f"Unrealistic match‑up: {red_wc} vs {blue_wc}. "
                f"The simulator currently supports opponents within {MAX_DIVISION_GAP} divisions of each other.")
            return jsonify({'error': msg}), 400

        # Feature engineering
        features = compute_model_features(red_stats, blue_stats, data)
        input_data = pd.DataFrame([features])
        model_input = input_data[FEATURES]

        # Make prediction
        prediction = model.predict(model_input)[0]
        prediction_proba = model.predict_proba(model_input)[0]

        winner = data['red_fighter'] if prediction == 1 else data['blue_fighter']
        confidence = prediction_proba[1] if prediction == 1 else prediction_proba[0]

        # Store prediction in database
        try:
            conn = get_conn()
            cursor = conn.cursor()
            cursor.execute("""
                           INSERT INTO predictions
                               (red_fighter, blue_fighter, predicted_winner)
                           VALUES (?, ?, ?)
                           """, (data['red_fighter'], data['blue_fighter'], winner))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to save prediction: {str(e)}")

        return jsonify({
            'prediction': winner,
            'confidence': f"{confidence * 100:.1f}%",
            'red_prob': f"{prediction_proba[1] * 100:.1f}%",
            'blue_prob': f"{prediction_proba[0] * 100:.1f}%"
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400



@main.route('/prediction_insights', methods=['POST'])
def prediction_insights():
    try:
        data = request.form
        red_stats = get_fighter_stats(data['red_fighter'])
        blue_stats = get_fighter_stats(data['blue_fighter'])

        if not red_stats or not blue_stats:
            return jsonify({'error': 'Fighter not found'}), 400

        # Load feature importance
        importance_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'feature_importance.pkl')
        feature_importance = joblib.load(importance_path)

        # Define attributes to compare
        attributes = {
            'Height': ('height', 'HeightAdvRed'),
            'Reach': ('reach', 'ReachAdvRed'),
            'Age': ('age', 'RedAge'),
            'Win Streak': ('win_streak', 'WinStreakDif'),
            'Striking': ('avg_sig_str', 'RedOdds'),
            'Takedown': ('avg_td_pct', 'GrappleAdvRed'),
            'Experience': ('total_fights', 'ExpAdvRed')
        }

        insights = []
        for name, (attr, feature_key) in attributes.items():
            red_val = red_stats.get(attr, 0)
            blue_val = blue_stats.get(attr, 0)
            diff = red_val - blue_val

            insights.append({
                'attribute': name,
                'red_value': red_val,
                'blue_value': blue_val,
                'difference': diff,
                'influence': feature_importance.get(feature_key, 0)
            })

        # Sort by influence
        insights.sort(key=lambda x: abs(x['influence']), reverse=True)

        return jsonify({'insights': insights[:5]})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main.route('/fighter_analytics', methods=['GET'])
def fighter_analytics():
    try:
        conn = get_conn()
        cursor = conn.cursor()

        # Get aggregated fighter stats
        cursor.execute("""
                       SELECT ROUND(AVG(height), 1)       AS avg_height,
                              ROUND(AVG(reach), 1)        AS avg_reach,
                              ROUND(AVG(age), 1)          AS avg_age,
                              ROUND(AVG(total_fights), 1) AS avg_fights
                       FROM fighters
                       """)
        result = cursor.fetchone()

        # Get weight class distribution
        cursor.execute("""
                       SELECT weight_class, COUNT(*) as count
                       FROM fighters
                       WHERE weight_class IS NOT NULL
                       GROUP BY weight_class
                       ORDER BY count DESC
                       """)
        weight_class_rows = cursor.fetchall()
        weight_class_distribution = {row[0]: row[1] for row in weight_class_rows}

        conn.close()

        return jsonify({
            'avg_height': result[0] if result[0] is not None else 180.0,
            'avg_reach': result[1] if result[1] is not None else 180.0,
            'avg_age': result[2] if result[2] is not None else 30.0,
            'avg_fights': result[3] if result[3] is not None else 10.0,
            'weight_class_distribution': weight_class_distribution
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'avg_height': 180.0,
            'avg_reach': 180.0,
            'avg_age': 30.0,
            'avg_fights': 10.0,
            'weight_class_distribution': {}
        })


@main.route('/prediction_history', methods=['GET'])
def prediction_history():
    try:
        conn = get_conn()

        # Get prediction metrics
        cursor = conn.cursor()
        cursor.execute("""
                       SELECT COUNT(*)                                         as total_predictions,
                              AVG(CASE WHEN correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy
                       FROM predictions
                       WHERE actual_winner IS NOT NULL
                       """)
        metrics = cursor.fetchone()

        # Calculate recent accuracy (last 30 predictions)
        cursor.execute("""
                       SELECT AVG(CASE WHEN correct = 1 THEN 1.0 ELSE 0.0 END)
                       FROM (SELECT correct
                             FROM predictions
                             WHERE actual_winner IS NOT NULL
                             ORDER BY timestamp DESC
                                 LIMIT 30)
                       """)
        recent_accuracy = cursor.fetchone()[0]

        # Get recent predictions
        cursor.execute("""
                       SELECT red_fighter,
                              blue_fighter,
                              predicted_winner,
                              actual_winner,
                              correct,
                              confidence
                       FROM predictions
                       WHERE actual_winner IS NOT NULL
                       ORDER BY timestamp DESC
                           LIMIT 10
                       """)
        recent_predictions = []
        columns = [col[0] for col in cursor.description]
        for row in cursor.fetchall():
            recent_predictions.append(dict(zip(columns, row)))

        # Generate accuracy history (simulated)
        accuracy_history = [random.uniform(70, 90) for _ in range(12)]

        # Generate outcome distribution
        outcome_distribution = {
            'knockouts': random.randint(30, 50),
            'submissions': random.randint(20, 40),
            'decisions': random.randint(20, 40)
        }

        # Generate confidence distribution
        confidence_distribution = {
            'high': random.randint(60, 80),
            'medium': random.randint(15, 30),
            'low': random.randint(5, 15)
        }

        # Generate accuracy by weight class
        weight_classes = ['Lightweight', 'Welterweight', 'Middleweight', 'Heavyweight', 'Featherweight']
        accuracy_by_weight_class = {wc: random.randint(65, 90) for wc in weight_classes}

        # Generate success factors
        success_factors = [
            {'factor': 'Striking Accuracy', 'impact': random.randint(70, 90)},
            {'factor': 'Takedown Defense', 'impact': random.randint(60, 85)},
            {'factor': 'Win Streak', 'impact': random.randint(55, 80)},
            {'factor': 'Weight Advantage', 'impact': random.randint(40, 70)},
            {'factor': 'Age Difference', 'impact': random.randint(30, 60)}
        ]

        conn.close()

        return jsonify({
            'total_predictions': metrics[0] if metrics else 0,
            'accuracy': metrics[1] if metrics and metrics[1] else 0.75,
            'recent_accuracy': recent_accuracy if recent_accuracy else 0.80,
            'recent_predictions': recent_predictions,
            'accuracy_history': accuracy_history,
            'outcome_distribution': outcome_distribution,
            'confidence_distribution': confidence_distribution,
            'accuracy_by_weight_class': accuracy_by_weight_class,
            'success_factors': success_factors
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'total_predictions': 0,
            'accuracy': 0.75,
            'recent_accuracy': 0.80,
            'recent_predictions': [],
            'accuracy_history': [random.uniform(70, 90) for _ in range(12)],
            'outcome_distribution': {
                'knockouts': random.randint(30, 50),
                'submissions': random.randint(20, 40),
                'decisions': random.randint(20, 40)
            },
            'confidence_distribution': {
                'high': random.randint(60, 80),
                'medium': random.randint(15, 30),
                'low': random.randint(5, 15)
            },
            'accuracy_by_weight_class': {
                'Lightweight': random.randint(65, 90),
                'Welterweight': random.randint(65, 90),
                'Middleweight': random.randint(65, 90),
                'Heavyweight': random.randint(65, 90),
                'Featherweight': random.randint(65, 90)
            },
            'success_factors': [
                {'factor': 'Striking Accuracy', 'impact': random.randint(70, 90)},
                {'factor': 'Takedown Defense', 'impact': random.randint(60, 85)},
                {'factor': 'Win Streak', 'impact': random.randint(55, 80)},
                {'factor': 'Weight Advantage', 'impact': random.randint(40, 70)},
                {'factor': 'Age Difference', 'impact': random.randint(30, 60)}
            ]
        })


@main.route('/top_performers', methods=['GET'])
def top_performers():
    try:
        # Generate top performers data
        fighters = [
            "Khabib Nurmagomedov", "Jon Jones", "Anderson Silva",
            "Georges St-Pierre", "Amanda Nunes", "Israel Adesanya",
            "Kamaru Usman", "Valentina Shevchenko", "Conor McGregor",
            "Henry Cejudo"
        ]

        # Generate random stats for each fighter
        top_fighters = []
        for fighter in fighters:
            top_fighters.append({
                'name': fighter,
                'striking_accuracy': random.randint(75, 95),
                'takedown_accuracy': random.randint(60, 90),
                'stamina': random.randint(80, 95),
                'knockout_power': random.randint(70, 95),
                'defense': random.randint(80, 95)
            })

        # Generate top performers by category
        most_knockouts = []
        for i in range(5):
            most_knockouts.append({
                'name': random.choice(fighters),
                'knockouts': random.randint(10, 20)
            })

        longest_win_streak = []
        for i in range(5):
            longest_win_streak.append({
                'name': random.choice(fighters),
                'streak': random.randint(8, 15)
            })

        highest_accuracy = []
        for i in range(5):
            highest_accuracy.append({
                'name': random.choice(fighters),
                'accuracy': random.randint(85, 95)
            })

        return jsonify({
            'top_fighters': top_fighters,
            'most_knockouts': most_knockouts,
            'longest_win_streak': longest_win_streak,
            'highest_accuracy': highest_accuracy
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        # Return sample data on error
        return jsonify({
            'top_fighters': [
                {'name': 'Khabib Nurmagomedov', 'striking_accuracy': 85, 'takedown_accuracy': 90, 'stamina': 95,
                 'knockout_power': 75, 'defense': 95},
                {'name': 'Jon Jones', 'striking_accuracy': 88, 'takedown_accuracy': 85, 'stamina': 90,
                 'knockout_power': 90, 'defense': 92},
                {'name': 'Amanda Nunes', 'striking_accuracy': 90, 'takedown_accuracy': 80, 'stamina': 85,
                 'knockout_power': 95, 'defense': 88}
            ],
            'most_knockouts': [
                {'name': 'Derrick Lewis', 'knockouts': 16},
                {'name': 'Anderson Silva', 'knockouts': 15},
                {'name': 'Vitor Belfort', 'knockouts': 14}
            ],
            'longest_win_streak': [
                {'name': 'Anderson Silva', 'streak': 16},
                {'name': 'Jon Jones', 'streak': 14},
                {'name': 'Demetrious Johnson', 'streak': 13}
            ],
            'highest_accuracy': [
                {'name': 'Max Holloway', 'accuracy': 92},
                {'name': 'Israel Adesanya', 'accuracy': 90},
                {'name': 'Valentina Shevchenko', 'accuracy': 89}
            ]
        })

@main.route('/fighter_analytics_details', methods=['POST'])
def fighter_analytics_details():
    try:
        fighter_name = request.form.get('fighter')
        conn = get_conn()
        cursor = conn.cursor()

        # Get basic fighter stats
        cursor.execute("SELECT * FROM fighters WHERE name LIKE ?", (f'%{fighter_name}%',))
        result = cursor.fetchone()

        if not result:
            return jsonify({'error': 'Fighter not found'}), 404

        columns = [col[0] for col in cursor.description]
        stats = dict(zip(columns, result))
        exact_name = stats['name']  # Get the exact name from database

        # CORRECTED: Get fight history with proper result calculation
        cursor.execute("""
            SELECT 
                f.Date, 
                CASE 
                    WHEN f.RedFighter = ? THEN f.BlueFighter 
                    ELSE f.RedFighter 
                END AS opponent,
                CASE 
                    WHEN f.Winner = 'Red' AND f.RedFighter = ? THEN 'Win'
                    WHEN f.Winner = 'Blue' AND f.BlueFighter = ? THEN 'Win'
                    WHEN f.Winner = 'Draw' THEN 'Draw'
                    ELSE 'Loss'
                END AS result,
                f.Finish,
                f.WeightClass,
                f.NumberOfRounds
            FROM fights f
            WHERE f.RedFighter = ?OR f.BlueFighter = ?
            ORDER BY f.Date DESC
            LIMIT 10
        """, (exact_name, exact_name, exact_name, exact_name, exact_name))

        fight_history = []
        for row in cursor.fetchall():
            fight_history.append({
                'date': row[0],
                'opponent': row[1],
                'result': row[2],
                'method': row[3] or 'Decision',
                'weight_class': row[4],
                'rounds': row[5]
            })

        # CORRECTED: Performance metrics calculation
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_fights,
                SUM(CASE 
                    WHEN (f.Winner = 'Red' AND f.RedFighter = ?) 
                      OR (f.Winner = 'Blue' AND f.BlueFighter = ?) 
                    THEN 1 ELSE 0 END) AS wins,
                SUM(CASE 
                    WHEN ((f.Winner = 'Red' AND f.RedFighter = ?) 
                      OR (f.Winner = 'Blue' AND f.BlueFighter = ?))
                    AND (f.Finish LIKE '%KO%' OR f.Finish LIKE '%TKO%')
                    THEN 1 ELSE 0 END) AS ko_wins,
                SUM(CASE 
                    WHEN ((f.Winner = 'Red' AND f.RedFighter = ?) 
                      OR (f.Winner = 'Blue' AND f.BlueFighter = ?))
                    AND (f.Finish LIKE '%SUB%')
                    THEN 1 ELSE 0 END) AS sub_wins,
                SUM(CASE WHEN f.Winner = 'Draw' THEN 1 ELSE 0 END) AS draws
            FROM fights f
            WHERE f.RedFighter = ? OR f.BlueFighter = ?
        """, (exact_name, exact_name, exact_name, exact_name, exact_name, exact_name, exact_name, exact_name))

        metrics = cursor.fetchone()
        wins = metrics[1] if metrics[1] else 0
        total_fights = metrics[0] if metrics[0] else 0
        draws = metrics[4] if metrics[4] else 0
        losses = total_fights - wins - draws

        performance = {
            'total_fights': total_fights,
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'ko_wins': metrics[2] if metrics[2] else 0,
            'sub_wins': metrics[3] if metrics[3] else 0,
            'decision_wins': wins - (metrics[2] or 0) - (metrics[3] or 0),
            'win_rate': (wins / total_fights) * 100 if total_fights > 0 else 0,
            'ko_rate': (metrics[2] / wins) * 100 if wins > 0 else 0,
            'sub_rate': (metrics[3] / wins) * 100 if wins > 0 else 0
        }

        conn.close()

        return jsonify({
            'basic_stats': stats,
            'performance_metrics': performance,
            'fight_history': fight_history
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
