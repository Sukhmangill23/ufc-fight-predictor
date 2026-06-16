from flask import Blueprint, request, jsonify
from flask import Blueprint, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
import traceback
from datetime import datetime, timedelta
from app.db import get_conn
from ml.utils import get_fighter_stats, fill_missing_stats
from .services.fighter_service import get_top_performers
from threading import Thread
from .services.auth_service import register_user, authenticate_user
from flask_jwt_extended import jwt_required, get_jwt_identity

main = Blueprint('main', __name__)

WEIGHT_CLASSES = {
    'Strawweight': 0, 'Flyweight': 1, 'Bantamweight': 2, 'Featherweight': 3,
    'Lightweight': 4, 'Welterweight': 5, 'Middleweight': 6,
    'Light Heavyweight': 7, 'Heavyweight': 8,
    'Catch Weight': 4, 'Openweight': 4
}

FEATURES = [
    'RedOdds', 'BlueOdds', 'OddsRatio',
    'SigStrLandedDif', 'SigStrPctDif', 'SigStrAbsorbedDif',
    'TDLandedDif', 'TDPctDif', 'SubAttDif',
    'RedFinishRate', 'BlueFinishRate', 'FinishRateDif',
    'TotalRoundDif', 'TotalTitleBoutDif', 'WinDif', 'LossDif',
    'WinStreakDif', 'LoseStreakDif', 'LongestWinStreakDif',
    'HeightDif', 'ReachDif', 'AgeDif', 'RedAge', 'BlueAge',
    'StanceMatch', 'NumberOfRounds', 'TitleBout', 'WeightClassNum',
    'RankDif', 'RedRanked', 'BlueRanked',
    'KODif', 'SubDif',
    'RedRecency_SigStr', 'BlueRecency_SigStr', 'RecencySigStrDif',
    'RedRecency_TD', 'BlueRecency_TD', 'RecencyTDDif',
    'RedRecency_FinishRate', 'BlueRecency_FinishRate', 'RecencyFinishDif',
]

MAX_DIVISION_GAP = 2
STALE_AFTER = timedelta(days=7)

model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'ufc_predictor_v4.pkl')
model = joblib.load(model_path)

def is_stale(last_scraped_str):
    """Return True if never scraped or scraped more than STALE_AFTER ago."""
    if not last_scraped_str:
        return True
    try:
        last = datetime.fromisoformat(last_scraped_str)
        return datetime.now() - last > STALE_AFTER
    except Exception:
        return True


def _bg_scrape(names):
    """Background thread: scrape stale fighters one at a time, each with its own connection."""
    from app.services.fighter_scraper import scrape_fighter_by_name, upsert_fighter
    for name in names:
        try:
            fresh = scrape_fighter_by_name(name)
            if fresh:
                conn = get_conn()
                cursor = conn.cursor()
                try:
                    upsert_fighter(cursor, fresh)
                    conn.commit()
                finally:
                    conn.close()
        except Exception as e:
            print(f"[BG Scrape] Failed for {name}: {e}")


def compute_model_features(red_stats, blue_stats, data):
    red_wc = red_stats.get('weight_class', 'Lightweight')
    blue_wc = blue_stats.get('weight_class', 'Lightweight')

    red_wins = max(red_stats.get('total_fights', 0) * 0.7, 1)
    blue_wins = max(blue_stats.get('total_fights', 0) * 0.7, 1)

    red_ko = red_stats.get('ko_wins', 0) or 0
    blue_ko = blue_stats.get('ko_wins', 0) or 0
    red_sub = round(red_stats.get('avg_sub_att', 0) or 0)
    blue_sub = round(blue_stats.get('avg_sub_att', 0) or 0)

    red_finish_rate = (red_ko + red_sub) / red_wins
    blue_finish_rate = (blue_ko + blue_sub) / blue_wins

    red_sig = red_stats.get('avg_sig_str', 0) or 0
    blue_sig = blue_stats.get('avg_sig_str', 0) or 0
    red_td = red_stats.get('avg_td_pct', 0) or 0
    blue_td = blue_stats.get('avg_td_pct', 0) or 0
    red_exp = red_stats.get('total_fights', 0) or 0
    blue_exp = blue_stats.get('total_fights', 0) or 0

    red_odds = float(data.get('red_odds', -150))
    blue_odds = float(data.get('blue_odds', 130))

    features = {
        'RedOdds': red_odds,
        'BlueOdds': blue_odds,
        'OddsRatio': red_odds / blue_odds if blue_odds != 0 else 1,

        'SigStrLandedDif': red_sig - blue_sig,
        'SigStrPctDif': red_sig - blue_sig,
        'SigStrAbsorbedDif': blue_sig - red_sig,

        'TDLandedDif': red_td - blue_td,
        'TDPctDif': red_td - blue_td,
        'SubAttDif': (red_stats.get('avg_sub_att', 0) or 0) - (blue_stats.get('avg_sub_att', 0) or 0),

        'RedFinishRate': red_finish_rate,
        'BlueFinishRate': blue_finish_rate,
        'FinishRateDif': red_finish_rate - blue_finish_rate,

        'TotalRoundDif': red_exp - blue_exp,
        'TotalTitleBoutDif': 0,
        'WinDif': red_exp - blue_exp,
        'LossDif': 0,

        'WinStreakDif': (red_stats.get('win_streak', 0) or 0) - (blue_stats.get('win_streak', 0) or 0),
        'LoseStreakDif': 0,
        'LongestWinStreakDif': (red_stats.get('win_streak', 0) or 0) - (blue_stats.get('win_streak', 0) or 0),

        'HeightDif': (red_stats.get('height', 180) or 180) - (blue_stats.get('height', 180) or 180),
        'ReachDif': (red_stats.get('reach', 180) or 180) - (blue_stats.get('reach', 180) or 180),
        'AgeDif': (red_stats.get('age', 30) or 30) - (blue_stats.get('age', 30) or 30),
        'RedAge': red_stats.get('age', 30) or 30,
        'BlueAge': blue_stats.get('age', 30) or 30,

        'StanceMatch': 1 if red_stats.get('stance', 'Orthodox') == blue_stats.get('stance', 'Orthodox') else 0,

        'NumberOfRounds': int(data.get('number_of_rounds', 3)),
        'TitleBout': 1 if data.get('title_bout') == 'true' else 0,
        'WeightClassNum': WEIGHT_CLASSES.get(red_wc, 4),

        'RankDif': 0,
        'RedRanked': 0,
        'BlueRanked': 0,

        'KODif': red_ko - blue_ko,
        'SubDif': red_sub - blue_sub,

        'RedRecency_SigStr': red_sig,
        'BlueRecency_SigStr': blue_sig,
        'RecencySigStrDif': red_sig - blue_sig,
        'RedRecency_TD': red_td,
        'BlueRecency_TD': blue_td,
        'RecencyTDDif': red_td - blue_td,
        'RedRecency_FinishRate': red_finish_rate,
        'BlueRecency_FinishRate': blue_finish_rate,
        'RecencyFinishDif': red_finish_rate - blue_finish_rate,
    }

    return features


# ── auth ──────────────────────────────────────────────────────────────────────

@main.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing username or password'}), 400
    return register_user(data['username'], data['password'])


@main.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing username or password'}), 400
    return authenticate_user(data['username'], data['password'])


# ── routes ────────────────────────────────────────────────────────────────────

@main.route('/')
def home():
    return "UFC Predictor API"


@main.route('/search_fighters', methods=['GET'])
def search_fighters():
    term = request.args.get('term', '')
    if len(term) < 3:
        return jsonify([])

    conn = get_conn()
    cursor = conn.cursor()
    # GROUP BY name so duplicates in the DB never return multiple rows for same fighter
    cursor.execute(
        "SELECT name, MAX(last_scraped) FROM fighters WHERE name ILIKE %s GROUP BY name LIMIT 10",
        (f'%{term}%',)
    )
    rows = cursor.fetchall()
    conn.close()

    fighters = [row[0] for row in rows]

    if not fighters:
        try:
            from app.services.fighter_scraper import scrape_fighter_by_name, upsert_fighter
            fresh = scrape_fighter_by_name(term)
            if fresh:
                c = get_conn()
                cur = c.cursor()
                try:
                    upsert_fighter(cur, fresh)
                    c.commit()
                    fighters = [fresh['name']]
                finally:
                    c.close()
        except Exception as e:
            print(f"[Search] Scrape error: {e}")

    # Background-refresh any stale fighters found in search results
    stale = [row[0] for row in rows if is_stale(row[1])]
    if stale:
        Thread(target=_bg_scrape, args=(stale,), daemon=True).start()

    return jsonify(fighters)


@main.route('/refresh_fighters', methods=['POST'])
def refresh_fighters():
    try:
        from .services.fighter_scraper import run_fighter_scraper
        body = request.get_json(silent=True) or {}
        letters = body.get('letters', None)
        detail = body.get('detail', True)
        total = run_fighter_scraper(letters=letters, detail=detail)
        return jsonify({'status': 'ok', 'fighters_updated': total})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@main.route('/get_fighter_stats', methods=['POST'])
def get_fighter_stats_route():
    fighter_name = request.form.get('fighter')

    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT last_scraped FROM fighters WHERE name = %s LIMIT 1",
        (fighter_name,)
    )
    row = cursor.fetchone()
    conn.close()

    last_scraped = row[0] if row else None

    if is_stale(last_scraped):
        try:
            from app.services.fighter_scraper import scrape_fighter_by_name, upsert_fighter, upsert_fighter_fights
            fresh = scrape_fighter_by_name(fighter_name)
            if fresh:
                c = get_conn()
                cur = c.cursor()
                try:
                    upsert_fighter(cur, fresh)
                    detail_url = fresh.get('detail_url')
                    if detail_url:
                        cur.execute(
                            "DELETE FROM fights WHERE RedFighter=%s OR BlueFighter=%s",
                            (fresh['name'], fresh['name'])
                        )
                        upsert_fighter_fights(cur, fresh['name'], detail_url,
                                              fallback_weight_class=fresh.get('weight_class'))
                    c.commit()
                finally:
                    c.close()
        except Exception as e:
            print(f"[Route] Force-scrape failed: {e}")

    stats = get_fighter_stats(fighter_name)
    if not stats:
        return jsonify({'error': 'Fighter not found'})

    return jsonify({
        'name': stats.get('name', fighter_name),
        'height': stats.get('height', 0),
        'reach': stats.get('reach', 0),
        'age': stats.get('age', 30),
        'stance': stats.get('stance', 'Orthodox'),
        'win_streak': stats.get('win_streak', 0),
        'ko_wins': stats.get('ko_wins', 0),
        'weight_class': stats.get('weight_class', 'Lightweight'),
        'avg_sig_str': stats.get('avg_sig_str', 0),
        'avg_td_pct': stats.get('avg_td_pct', 0),
        'avg_sub_att': stats.get('avg_sub_att', 0),
        'total_fights': stats.get('total_fights', 0)
    })


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

        if data['red_fighter'].strip().lower() == data['blue_fighter'].strip().lower():
            return jsonify({'error': 'Please select two different fighters'}), 400

        red_wc = red_stats.get('weight_class', 'Lightweight')
        blue_wc = blue_stats.get('weight_class', 'Lightweight')
        wc_gap = abs(WEIGHT_CLASSES.get(red_wc, 4) - WEIGHT_CLASSES.get(blue_wc, 4))

        if wc_gap > MAX_DIVISION_GAP:
            return jsonify({'error': (
                f"Unrealistic matchup: {red_wc} vs {blue_wc}. "
                f"Supports opponents within {MAX_DIVISION_GAP} divisions of each other."
            )}), 400

        features = compute_model_features(red_stats, blue_stats, data)
        model_input = pd.DataFrame([features])[FEATURES]
        prediction = model.predict(model_input)[0]
        prediction_proba = model.predict_proba(model_input)[0]

        winner = data['red_fighter'] if prediction == 1 else data['blue_fighter']
        confidence = prediction_proba[1] if prediction == 1 else prediction_proba[0]

        try:
            conn = get_conn()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'predictions'"
            )
            cols = [r[0] for r in cursor.fetchall()]
            if 'confidence' not in cols:
                cursor.execute("ALTER TABLE predictions ADD COLUMN confidence REAL")
            cursor.execute(
                "INSERT INTO predictions (red_fighter, blue_fighter, predicted_winner, confidence) VALUES (%s,%s,%s,%s)",
                (data['red_fighter'], data['blue_fighter'], winner, round(float(confidence), 4))
            )
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Failed to save prediction: {e}")

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

        importance_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'feature_importance.pkl')
        feature_importance = joblib.load(importance_path)

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
            insights.append({
                'attribute': name,
                'red_value': red_val,
                'blue_value': blue_val,
                'difference': red_val - blue_val,
                'influence': feature_importance.get(feature_key, 0)
            })

        insights.sort(key=lambda x: abs(x['influence']), reverse=True)
        return jsonify({'insights': insights[:5]})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main.route('/fighter_analytics', methods=['GET'])
def fighter_analytics():
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
                       SELECT AVG(height),
                              AVG(reach),
                              AVG(age),
                              AVG(total_fights)
                       FROM fighters
                       """)
        result = cursor.fetchone()
        cursor.execute("""
                       SELECT weight_class, COUNT(*) as count
                       FROM fighters
                       WHERE weight_class IS NOT NULL
                       GROUP BY weight_class
                       ORDER BY count DESC
                       """)
        wcd = {row[0]: row[1] for row in cursor.fetchall()}
        conn.close()
        return jsonify({
            'avg_height': round(float(result[0] or 180.0), 1),
            'avg_reach': round(float(result[1] or 180.0), 1),
            'avg_age': round(float(result[2] or 30.0), 1),
            'avg_fights': round(float(result[3] or 10.0), 1),
            'weight_class_distribution': wcd
        })
    except Exception as e:
        conn.close()
        return jsonify({'avg_height': 180.0, 'avg_reach': 180.0,
                        'avg_age': 30.0, 'avg_fights': 10.0,
                        'weight_class_distribution': {}}), 500


@main.route('/prediction_history', methods=['GET'])
def prediction_history():
    try:
        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute("""
                       SELECT COUNT(*), AVG(CASE WHEN correct = 1 THEN 1.0 ELSE 0.0 END)
                       FROM predictions
                       WHERE actual_winner IS NOT NULL
                       """)
        metrics = cursor.fetchone()

        cursor.execute("""
                       SELECT AVG(CASE WHEN correct = 1 THEN 1.0 ELSE 0.0 END)
                       FROM (SELECT correct
                             FROM predictions
                             WHERE actual_winner IS NOT NULL
                             ORDER BY timestamp DESC LIMIT 30)
                       """)
        recent_accuracy = cursor.fetchone()[0]

        cursor.execute("""
                       SELECT red_fighter,
                              blue_fighter,
                              predicted_winner,
                              actual_winner,
                              correct,
                              confidence
                       FROM predictions
                       WHERE actual_winner IS NOT NULL
                       ORDER BY timestamp DESC LIMIT 10
                       """)
        cols = [c[0] for c in cursor.description]
        recent_predictions = [dict(zip(cols, row)) for row in cursor.fetchall()]

        cursor.execute("""
                       SELECT to_char(timestamp, 'YYYY-MM'),
                              AVG(CASE WHEN correct = 1 THEN 1.0 ELSE 0.0 END) * 100
                       FROM predictions
                       WHERE actual_winner IS NOT NULL
                       GROUP BY to_char(timestamp, 'YYYY-MM')
                       ORDER BY to_char(timestamp, 'YYYY-MM') DESC LIMIT 12
                       """)
        accuracy_history = [row[1] for row in cursor.fetchall()] or []

        cursor.execute("""
                       SELECT SUM(CASE WHEN Finish LIKE '%KO%' OR Finish LIKE '%TKO%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN Finish LIKE '%SUB%' THEN 1 ELSE 0 END),
                              SUM(CASE WHEN Finish LIKE '%DEC%' OR Finish IS NULL THEN 1 ELSE 0 END)
                       FROM fights
                       """)
        od = cursor.fetchone()
        outcome_distribution = {
            'knockouts': od[0] or 0,
            'submissions': od[1] or 0,
            'decisions': od[2] or 0
        }

        cursor.execute("""
                       SELECT SUM(CASE WHEN confidence >= 0.70 THEN 1 ELSE 0 END),
                              SUM(CASE WHEN confidence >= 0.55 AND confidence < 0.70 THEN 1 ELSE 0 END),
                              SUM(CASE WHEN confidence < 0.55 THEN 1 ELSE 0 END)
                       FROM predictions
                       """)
        cd = cursor.fetchone()
        confidence_distribution = {
            'high': cd[0] or 0,
            'medium': cd[1] or 0,
            'low': cd[2] or 0
        }

        cursor.execute("""
                       SELECT f.WeightClass,
                              AVG(CASE WHEN p.correct = 1 THEN 1.0 ELSE 0.0 END) * 100
                       FROM predictions p
                                JOIN fights f ON (f.RedFighter = p.red_fighter AND f.BlueFighter = p.blue_fighter)
                       WHERE p.actual_winner IS NOT NULL
                         AND f.WeightClass IS NOT NULL
                       GROUP BY f.WeightClass
                       ORDER BY 2 DESC
                       """)
        accuracy_by_weight_class = {row[0]: round(row[1], 1) for row in cursor.fetchall()}

        try:
            importance_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'feature_importance.pkl')
            feature_importance = joblib.load(importance_path)
            label_map = {
                'RedOdds': 'Striking Accuracy',
                'WinStreakDif': 'Win Streak',
                'GrappleAdvRed': 'Takedown Defense',
                'WeightClassAdvRed': 'Weight Advantage',
                'ExpAdvRed': 'Experience',
                'HeightAdvRed': 'Height Advantage',
                'ReachAdvRed': 'Reach Advantage',
            }
            success_factors = sorted(
                [{'factor': label_map[k], 'impact': round(abs(v) * 100, 1)}
                 for k, v in feature_importance.items() if k in label_map],
                key=lambda x: x['impact'], reverse=True
            )[:5]
        except Exception:
            success_factors = []

        conn.close()

        return jsonify({
            'total_predictions': metrics[0] if metrics else 0,
            'accuracy': metrics[1] if metrics and metrics[1] else 0,
            'recent_accuracy': recent_accuracy or 0,
            'recent_predictions': recent_predictions,
            'accuracy_history': accuracy_history,
            'outcome_distribution': outcome_distribution,
            'confidence_distribution': confidence_distribution,
            'accuracy_by_weight_class': accuracy_by_weight_class,
            'success_factors': success_factors
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@main.route('/top_performers', methods=['GET'])
def top_performers():
    try:
        return jsonify(get_top_performers())
    except Exception as e:
        traceback.print_exc()
        return jsonify({'top_fighters': [], 'most_knockouts': [],
                        'longest_win_streak': [], 'highest_accuracy': []}), 500


@main.route('/fighter_analytics_details', methods=['POST'])
def fighter_analytics_details():
    try:
        fighter_name = request.form.get('fighter')

        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fighters WHERE name LIKE %s", (f'%{fighter_name}%',))
        result = cursor.fetchone()

        if not result:
            conn.close()
            return jsonify({'error': 'Fighter not found'}), 404

        columns = [col[0] for col in cursor.description]
        stats = dict(zip(columns, result))
        exact_name = stats['name']
        conn.close()

        # Re-scrape if data is stale
        if is_stale(stats.get('last_scraped')):
            try:
                from app.services.fighter_scraper import scrape_fighter_by_name, upsert_fighter, upsert_fighter_fights
                print(f"[Analytics] Scraping live data for: {exact_name}")
                fresh = scrape_fighter_by_name(exact_name)
                if fresh:
                    c = get_conn()
                    cur = c.cursor()
                    try:
                        upsert_fighter(cur, fresh)
                        detail_url = fresh.get('detail_url')
                        if detail_url:
                            cur.execute("""
                                        DELETE
                                        FROM fights
                                        WHERE (RedFighter = %s OR BlueFighter = %s)
                                          AND Date NOT LIKE '____-__-__%%'
                                        """, (exact_name, exact_name))
                            print(f"[Analytics] Cleared malformed fight rows for {exact_name}")
                            upsert_fighter_fights(cur, exact_name, detail_url,
                                                  fallback_weight_class=fresh.get('weight_class'))
                        c.commit()

                        cur.execute("SELECT * FROM fighters WHERE name = %s", (exact_name,))
                        fresh_row = cur.fetchone()
                        fresh_cols = [col[0] for col in cur.description]
                    finally:
                        c.close()

                    if fresh_row:
                        stats = dict(zip(fresh_cols, fresh_row))
                        print(f"[Analytics] Updated stats from live scrape: {exact_name}")
                else:
                    print(f"[Analytics] Scrape returned nothing for: {exact_name}")
            except Exception as e:
                print(f"[Analytics] Scrape failed: {e}")
        else:
            print(f"[Analytics] Using cached data, last scraped: {stats.get('last_scraped')}")

        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute("""
                       SELECT COUNT(*)                                         AS total,
                              SUM(CASE
                                      WHEN (Winner = 'Red' AND RedFighter = %s)
                                          OR (Winner = 'Blue' AND BlueFighter = %s) THEN 1
                                      ELSE 0 END)                              AS wins,
                              SUM(CASE
                                      WHEN (Winner = 'Red' AND BlueFighter = %s)
                                          OR (Winner = 'Blue' AND RedFighter = %s) THEN 1
                                      ELSE 0 END)                              AS losses,
                              SUM(CASE WHEN Winner = 'Draw' THEN 1 ELSE 0 END) AS draws,
                              SUM(CASE
                                      WHEN ((Winner = 'Red' AND RedFighter = %s)
                                          OR (Winner = 'Blue' AND BlueFighter = %s))
                                          AND (Finish LIKE '%%KO%%' OR Finish LIKE '%%TKO%%')
                                          THEN 1
                                      ELSE 0 END)                              AS ko_wins,
                              SUM(CASE
                                      WHEN ((Winner = 'Red' AND RedFighter = %s)
                                          OR (Winner = 'Blue' AND BlueFighter = %s))
                                          AND Finish LIKE '%%SUB%%'
                                          THEN 1
                                      ELSE 0 END)                              AS sub_wins
                       FROM fights
                       WHERE RedFighter = %s
                          OR BlueFighter = %s
                       """, (
                           exact_name, exact_name,
                           exact_name, exact_name,
                           exact_name, exact_name,
                           exact_name, exact_name,
                           exact_name, exact_name
                       ))

        row = cursor.fetchone()
        total = row[0] or 0
        wins = row[1] or 0
        losses = row[2] or 0
        draws = row[3] or 0
        ko_wins = row[4] or 0
        sub_wins = row[5] or 0
        dec_wins = max(0, wins - ko_wins - sub_wins)

        performance = {
            'total_fights': total,
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'ko_wins': ko_wins,
            'sub_wins': sub_wins,
            'decision_wins': dec_wins,
            'win_rate': round((wins / total) * 100, 1) if total > 0 else 0,
            'ko_rate': round((ko_wins / wins) * 100, 1) if wins > 0 else 0,
            'sub_rate': round((sub_wins / wins) * 100, 1) if wins > 0 else 0,
        }

        cursor.execute("""
                       SELECT f.Date,
                              CASE WHEN f.RedFighter = %s THEN f.BlueFighter ELSE f.RedFighter END,
                              CASE
                                  WHEN f.Winner = 'Red' AND f.RedFighter = %s THEN 'Win'
                                  WHEN f.Winner = 'Blue' AND f.BlueFighter = %s THEN 'Win'
                                  WHEN f.Winner = 'Draw' THEN 'Draw'
                                  ELSE 'Loss'
                                  END,
                              f.Finish,
                              f.WeightClass,
                              f.NumberOfRounds
                       FROM fights f
                       WHERE f.RedFighter = %s
                          OR f.BlueFighter = %s
                       ORDER BY f.Date ASC
                       """, (exact_name, exact_name, exact_name, exact_name, exact_name))

        fighter_weight_class = stats.get('weight_class', 'Unknown')

        fight_history = [
            {'date': r[0], 'opponent': r[1], 'result': r[2],
             'method': r[3] or 'Decision',
             'weight_class': r[4] or 'Unknown',
             'rounds': r[5]}
            for r in cursor.fetchall()
        ]
        conn.close()

        return jsonify({
            'basic_stats': stats,
            'performance_metrics': performance,
            'fight_history': fight_history
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@main.route('/upcoming_events', methods=['GET'])
def upcoming_events():
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
                       SELECT event_name, event_date, location, red_fighter, blue_fighter, weight_class
                       FROM upcoming_events
                       WHERE red_fighter != ''
                       ORDER BY event_date ASC
                       """)
        cols = ['event_name', 'event_date', 'location', 'red_fighter', 'blue_fighter', 'weight_class']
        events = [dict(zip(cols, row)) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'events': events})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
