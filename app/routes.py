from flask import Blueprint, render_template, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
from ufc_predictor.utils import get_fighter_stats, fill_missing_stats

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

# Maximum number of divisions we allow between two fighters. 1 = adjacent divisions,
# 2 = two‑division jump (e.g. LW vs MW) which occasionally happens in UFC history.
MAX_DIVISION_GAP = 2

# ---------------------------------------------------------------------------
# MODEL
# ---------------------------------------------------------------------------
model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'ufc_predictor_v4.pkl')
model = joblib.load(model_path)

# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------
@main.route('/')
def home():
    return render_template('index.html')


@main.route('/search_fighters', methods=['GET'])
def search_fighters():
    term = request.args.get('term', '')
    fighter_db = pd.read_csv(os.path.join(os.path.dirname(__file__), '..', 'data', 'fighter_db.csv'))
    fighters = fighter_db[fighter_db['name'].str.contains(term, case=False)]['name'].tolist()
    return jsonify(fighters[:10])


@main.route('/get_fighter_stats', methods=['POST'])
def get_fighter_stats_route():
    fighter_name = request.form.get('fighter')
    stats = get_fighter_stats(fighter_name)

    if not stats:
        return jsonify({'error': 'Fighter not found'})

    # Normalize property names
    normalized_stats = {
        'name': stats.get('name', fighter_name),
        'height': stats.get('height', stats.get('height_cms', 'N/A')),
        'reach': stats.get('reach', stats.get('reach_cms', 'N/A')),
        'age': stats.get('age', 'N/A'),
        'stance': stats.get('stance', 'N/A'),
        'win_streak': stats.get('win_streak', stats.get('current_win_streak', 0)),
        'ko_wins': stats.get('ko_wins', stats.get('wins_by_ko', 0)),
        # Add any other stats you need here
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

        # ---------------------------------------------------------------
        # Validation checks
        # ---------------------------------------------------------------
        if data['red_fighter'].strip().lower() == data['blue_fighter'].strip().lower():
            return jsonify({'error': 'Please select two different fighters'}), 400

        red_wc = red_stats.get('weight_class', 'Lightweight')
        blue_wc = blue_stats.get('weight_class', 'Lightweight')
        wc_gap = abs(WEIGHT_CLASSES.get(red_wc, 4) - WEIGHT_CLASSES.get(blue_wc, 4))

        # Allow up to MAX_DIVISION_GAP; anything beyond is blocked as unrealistic
        if wc_gap > MAX_DIVISION_GAP:
            msg = (
                f"Unrealistic match‑up: {red_wc} vs {blue_wc}. "
                f"The simulator currently supports opponents within {MAX_DIVISION_GAP} divisions of each other." )
            return jsonify({'error': msg}), 400

        # ---------------------------------------------------------------
        # Feature engineering (mirrors training pipeline)
        # ---------------------------------------------------------------
        input_data = pd.DataFrame([{
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
        }])

        input_data['OddsRatio'] = input_data.apply(
            lambda row: row['RedOdds'] / row['BlueOdds'] if row['BlueOdds'] != 0 else 1,
            axis=1
        )
        input_data['SizeAdvRed'] = (input_data['HeightAdvRed'] + input_data['ReachAdvRed']) / 2

        model_features = [
            'RedOdds', 'BlueOdds', 'OddsRatio', 'WinStreakDif',
            'HeightAdvRed', 'ReachAdvRed', 'SizeAdvRed', 'StanceMatch',
            'RedAge', 'BlueAge', 'NumberOfRounds', 'TitleBout',
            'WeightClassAdvRed', 'ExpAdvRed', 'GrappleAdvRed'
        ]
        model_input = input_data[model_features]

        prediction = model.predict(model_input)[0]
        prediction_proba = model.predict_proba(model_input)[0]

        winner = data['red_fighter'] if prediction == 1 else data['blue_fighter']
        confidence = prediction_proba[1] if prediction == 1 else prediction_proba[0]

        return jsonify({
            'prediction': winner,
            'confidence': f"{confidence * 100:.1f}%",
            'red_prob': f"{prediction_proba[1] * 100:.1f}%",
            'blue_prob': f"{prediction_proba[0] * 100:.1f}%"
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400
