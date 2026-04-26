import pandas as pd
import numpy as np
import os
import sqlite3
import joblib
from datetime import datetime

from sklearn.pipeline         import Pipeline
from sklearn.compose          import ColumnTransformer
from sklearn.preprocessing    import StandardScaler
from sklearn.impute            import SimpleImputer
from sklearn.calibration      import CalibratedClassifierCV
from sklearn.model_selection  import StratifiedKFold, cross_val_score
from sklearn.inspection       import permutation_importance

try:
    from xgboost import XGBClassifier
    _USE_XGB = True
except Exception:
    from sklearn.ensemble import HistGradientBoostingClassifier
    _USE_XGB = False
    print("XGBoost not available — using HistGradientBoostingClassifier")

try:
    import mlflow
    import mlflow.sklearn
    _USE_MLFLOW = True
except ImportError:
    _USE_MLFLOW = False
    print("MLflow not installed — skipping experiment tracking")

current_dir = os.path.dirname(os.path.abspath(__file__))
DB_PATH     = os.path.join(current_dir, '..', 'database', 'ufc.db')
MODEL_DIR   = os.path.join(current_dir, '..', 'models')
MODEL_PATH  = os.path.join(MODEL_DIR, 'ufc_predictor_v4.pkl')

FEATURES = [
    # Betting odds
    'RedOdds', 'BlueOdds', 'OddsRatio',

    # Career striking
    'SigStrLandedDif', 'SigStrPctDif', 'SigStrAbsorbedDif',

    # Career grappling
    'TDLandedDif', 'TDPctDif', 'SubAttDif',

    # Finish ability
    'RedFinishRate', 'BlueFinishRate', 'FinishRateDif',

    # Experience
    'TotalRoundDif', 'TotalTitleBoutDif', 'WinDif', 'LossDif',

    # Streaks
    'WinStreakDif', 'LoseStreakDif', 'LongestWinStreakDif',

    # Physical
    'HeightDif', 'ReachDif', 'AgeDif', 'RedAge', 'BlueAge',

    # Stance + context
    'StanceMatch', 'NumberOfRounds', 'TitleBout', 'WeightClassNum',

    # Rankings
    'RankDif', 'RedRanked', 'BlueRanked',

    # KO/Sub
    'KODif', 'SubDif',

    # NEW: Recency-weighted (last 3 fights)
    'RedRecency_SigStr', 'BlueRecency_SigStr', 'RecencySigStrDif',
    'RedRecency_TD',     'BlueRecency_TD',     'RecencyTDDif',
    'RedRecency_FinishRate', 'BlueRecency_FinishRate', 'RecencyFinishDif',
]


# ── Data loading ──────────────────────────────────────────────────────────────

def load_data():
    conn = sqlite3.connect(DB_PATH)
    df   = pd.read_sql_query("SELECT * FROM fights", conn)
    conn.close()
    print(f"[Pipeline] Loaded {len(df)} fights from DB")
    return df


# ── Feature engineering ───────────────────────────────────────────────────────

WEIGHT_MAP = {
    'Strawweight': 0, 'Flyweight': 1, 'Bantamweight': 2, 'Featherweight': 3,
    'Lightweight': 4, 'Welterweight': 5, 'Middleweight': 6,
    'Light Heavyweight': 7, 'Heavyweight': 8,
    'Catch Weight': 4, 'Openweight': 4
}


def compute_finish_rate(wins_ko, wins_sub, wins_tko, total_wins):
    """Proportion of wins that ended by finish (KO/TKO/Sub)"""
    finish_wins = (wins_ko or 0) + (wins_sub or 0) + (wins_tko or 0)
    return finish_wins / total_wins if total_wins > 0 else 0.0


def get_ranking(row, corner):
    """
    Pull the fighter's ranking in their weight class.
    Returns numeric rank (1-15) or NaN if unranked.
    """
    wc  = row.get('WeightClass', '')
    pfx = 'R' if corner == 'red' else 'B'

    rank_col_map = {
        'Strawweight':      f'{pfx}WStrawweightRank',
        'Flyweight':        f'{pfx}FlyweightRank' if corner == 'red' else f'{pfx}FlyweightRank',
        'Bantamweight':     f'{pfx}BantamweightRank',
        'Featherweight':    f'{pfx}FeatherweightRank',
        'Lightweight':      f'{pfx}LightweightRank',
        'Welterweight':     f'{pfx}WelterweightRank',
        'Middleweight':     f'{pfx}MiddleweightRank',
        'Light Heavyweight':f'{pfx}LightHeavyweightRank',
        'Heavyweight':      f'{pfx}HeavyweightRank',
    }

    col = rank_col_map.get(wc)
    if col and col in row.index:
        val = row[col]
        if pd.notna(val) and val > 0:
            return float(val)
    return np.nan


def preprocess_data(df):
    df = df.dropna(subset=['Winner']).copy()
    df = df[df['Winner'].isin(['Red', 'Blue'])].copy()
    df['Target'] = (df['Winner'] == 'Red').astype(int)

    # Sort by date for temporal validation
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df = df.sort_values('Date').reset_index(drop=True)

    # ── Odds ─────────────────────────────────────────────────────────────────
    df['RedOdds']  = df['RedOdds'].fillna(df['RedOdds'].median())
    df['BlueOdds'] = df['BlueOdds'].fillna(df['BlueOdds'].median())
    df['OddsRatio'] = df.apply(
        lambda r: r['RedOdds'] / r['BlueOdds'] if r['BlueOdds'] != 0 else 1, axis=1
    )

    # ── Striking ──────────────────────────────────────────────────────────────
    df['SigStrLandedDif']   = df['RedAvgSigStrLanded'].fillna(0)  - df['BlueAvgSigStrLanded'].fillna(0)
    df['SigStrPctDif']      = df['RedAvgSigStrPct'].fillna(0)     - df['BlueAvgSigStrPct'].fillna(0)
    # Absorbed = opponent's landed (lower is better for red → negate)
    df['SigStrAbsorbedDif'] = df['BlueAvgSigStrLanded'].fillna(0) - df['RedAvgSigStrLanded'].fillna(0)

    # ── Grappling ─────────────────────────────────────────────────────────────
    df['TDLandedDif'] = df['RedAvgTDLanded'].fillna(0) - df['BlueAvgTDLanded'].fillna(0)
    df['TDPctDif']    = df['RedAvgTDPct'].fillna(0)    - df['BlueAvgTDPct'].fillna(0)
    df['SubAttDif']   = df['RedAvgSubAtt'].fillna(0)   - df['BlueAvgSubAtt'].fillna(0)

    # ── Finish rate ───────────────────────────────────────────────────────────
    df['RedFinishRate'] = df.apply(lambda r: compute_finish_rate(
        r.get('RedWinsByKO'), r.get('RedWinsBySubmission'),
        r.get('RedWinsByTKODoctorStoppage'), r.get('RedWins', 1)
    ), axis=1)
    df['BlueFinishRate'] = df.apply(lambda r: compute_finish_rate(
        r.get('BlueWinsByKO'), r.get('BlueWinsBySubmission'),
        r.get('BlueWinsByTKODoctorStoppage'), r.get('BlueWins', 1)
    ), axis=1)
    df['FinishRateDif'] = df['RedFinishRate'] - df['BlueFinishRate']

    # ── Experience ────────────────────────────────────────────────────────────
    df['TotalRoundDif']     = df['RedTotalRoundsFought'].fillna(0) - df['BlueTotalRoundsFought'].fillna(0)
    df['TotalTitleBoutDif'] = df['RedTotalTitleBouts'].fillna(0)   - df['BlueTotalTitleBouts'].fillna(0)
    df['WinDif']            = df['RedWins'].fillna(0)              - df['BlueWins'].fillna(0)
    df['LossDif']           = df['RedLosses'].fillna(0)            - df['BlueLosses'].fillna(0)

    # ── Streaks ───────────────────────────────────────────────────────────────
    df['WinStreakDif']        = df['RedCurrentWinStreak'].fillna(0)  - df['BlueCurrentWinStreak'].fillna(0)
    df['LoseStreakDif']       = df['RedCurrentLoseStreak'].fillna(0) - df['BlueCurrentLoseStreak'].fillna(0)
    df['LongestWinStreakDif'] = df['RedLongestWinStreak'].fillna(0)  - df['BlueLongestWinStreak'].fillna(0)

    # ── Physical ──────────────────────────────────────────────────────────────
    df['HeightDif'] = df['RedHeightCms'].fillna(df['RedHeightCms'].median()) - \
                      df['BlueHeightCms'].fillna(df['BlueHeightCms'].median())
    df['ReachDif']  = df['RedReachCms'].fillna(df['RedReachCms'].median()) - \
                      df['BlueReachCms'].fillna(df['BlueReachCms'].median())
    df['AgeDif']    = df['RedAge'].fillna(df['RedAge'].median()) - \
                      df['BlueAge'].fillna(df['BlueAge'].median())
    df['RedAge']    = df['RedAge'].fillna(df['RedAge'].median())
    df['BlueAge']   = df['BlueAge'].fillna(df['BlueAge'].median())

    # ── Stance ────────────────────────────────────────────────────────────────
    df['StanceMatch'] = (df['RedStance'] == df['BlueStance']).astype(int)

    # ── Fight context ─────────────────────────────────────────────────────────
    df['TitleBout']    = df['TitleBout'].fillna(0).astype(int)
    df['WeightClassNum'] = df['WeightClass'].map(WEIGHT_MAP).fillna(4)

    if 'NumberOfRounds' not in df.columns:
        df['NumberOfRounds'] = 3
    df['NumberOfRounds'] = df['NumberOfRounds'].fillna(3).astype(int)

    # ── KO / Sub differential ─────────────────────────────────────────────────
    df['KODif']  = df['RedWinsByKO'].fillna(0)          - df['BlueWinsByKO'].fillna(0)
    df['SubDif'] = df['RedWinsBySubmission'].fillna(0)   - df['BlueWinsBySubmission'].fillna(0)

    # ── Rankings ──────────────────────────────────────────────────────────────
    # Use the match weight class rank columns directly
    df['RedRank']  = df['RMatchWCRank'].fillna(99)
    df['BlueRank'] = df['BMatchWCRank'].fillna(99)
    df['RankDif']  = df['RedRank'] - df['BlueRank']   # negative = Red is ranked higher
    df['RedRanked']  = (df['RMatchWCRank'].notna() & (df['RMatchWCRank'] > 0)).astype(int)
    df['BlueRanked'] = (df['BMatchWCRank'].notna() & (df['BMatchWCRank'] > 0)).astype(int)
    df = compute_recency_features(df)

    # ── Final cleanup ─────────────────────────────────────────────────────────
    result = df[FEATURES + ['Target']].copy()
    result = result.fillna(result.median(numeric_only=True))

    print(f"[Pipeline] Features engineered. Shape: {result.shape}")
    print(f"[Pipeline] Target balance: {result['Target'].mean():.3f} (Red win rate)")
    return result


# ── Model building ────────────────────────────────────────────────────────────

def build_pipeline():
    numeric_pre = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler',  StandardScaler())
    ])
    preprocessor = ColumnTransformer([
        ('num', numeric_pre, FEATURES)
    ])

    if _USE_XGB:
        base = XGBClassifier(
            n_estimators=1000,
            learning_rate=0.02,
            max_depth=5,
            subsample=0.8,
            colsample_bytree=0.7,
            min_child_weight=3,
            gamma=0.1,
            reg_alpha=0.1,
            reg_lambda=1.0,
            objective='binary:logistic',
            eval_metric='auc',
            n_jobs=-1,
            random_state=42
        )
    else:
        from sklearn.ensemble import HistGradientBoostingClassifier
        base = HistGradientBoostingClassifier(
            learning_rate=0.02,
            max_iter=1000,
            max_depth=5,
            random_state=42
        )

    try:
        clf = CalibratedClassifierCV(estimator=base, method='isotonic', cv=3)
    except TypeError:
        clf = CalibratedClassifierCV(base_estimator=base, method='isotonic', cv=3)

    return Pipeline([
        ('preprocessor', preprocessor),
        ('classifier',   clf)
    ])


# ── Training ──────────────────────────────────────────────────────────────────

def train_model(save=True):
    df   = preprocess_data(load_data())
    X, y = df.drop(columns=['Target']), df['Target']

    pipe = build_pipeline()

    # Temporal cross-validation — respect time ordering
    cv     = StratifiedKFold(n_splits=10, shuffle=False)
    scores = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)

    mean_auc = scores.mean()
    std_auc  = scores.std()
    print(f"[Pipeline] ROC-AUC (10-fold temporal): {mean_auc:.4f} ± {std_auc:.4f}")

    # Accuracy estimate
    acc_scores = cross_val_score(pipe, X, y, cv=cv, scoring='accuracy', n_jobs=-1)
    mean_acc   = acc_scores.mean()
    print(f"[Pipeline] Accuracy (10-fold temporal): {mean_acc:.4f}")

    # Train final model on all data
    pipe.fit(X, y)

    if _USE_MLFLOW:
        _log_to_mlflow(pipe, X, y, mean_auc, std_auc, mean_acc)

    if save:
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(pipe, MODEL_PATH)
        print(f"[Pipeline] Model saved → {MODEL_PATH}")

        # Feature importance via permutation (works with any model)
        print("[Pipeline] Computing feature importance (this takes ~1 min)...")
        result = permutation_importance(pipe, X, y, n_repeats=10, random_state=42, n_jobs=-1)
        importance = {
            FEATURES[i]: float(result.importances_mean[i])
            for i in np.argsort(result.importances_mean)[::-1]
        }
        imp_path = os.path.join(MODEL_DIR, 'feature_importance.pkl')
        joblib.dump(importance, imp_path)
        print(f"[Pipeline] Feature importance saved → {imp_path}")

        # Save training metadata
        meta = {
            'trained_at':   datetime.now().isoformat(),
            'n_samples':    len(X),
            'n_features':   len(FEATURES),
            'features':     FEATURES,
            'roc_auc_mean': round(mean_auc, 4),
            'roc_auc_std':  round(std_auc, 4),
            'accuracy':     round(mean_acc, 4),
            'model_type':   'XGBoost' if _USE_XGB else 'HistGradientBoosting',
        }
        joblib.dump(meta, os.path.join(MODEL_DIR, 'model_meta.pkl'))
        print(f"[Pipeline] Metadata: AUC={mean_auc:.4f}, Acc={mean_acc:.4f}")

    return pipe


def _log_to_mlflow(pipe, X, y, mean_auc, std_auc, mean_acc):
    try:
        mlflow.set_experiment("ufc_fight_predictor")
        with mlflow.start_run():
            mlflow.log_param("model_type",    "XGBoost" if _USE_XGB else "HistGB")
            mlflow.log_param("n_features",    len(FEATURES))
            mlflow.log_param("n_samples",     len(X))
            mlflow.log_param("features",      str(FEATURES))
            mlflow.log_metric("roc_auc_mean", mean_auc)
            mlflow.log_metric("roc_auc_std",  std_auc)
            mlflow.log_metric("accuracy",     mean_acc)
            mlflow.sklearn.log_model(pipe, "model")
            print(f"[MLflow] Run logged. AUC={mean_auc:.4f}, Acc={mean_acc:.4f}")
    except Exception as e:
        print(f"[MLflow] Logging failed (non-fatal): {e}")

# ── Optuna hyperparameter tuning ──────────────────────────────────────────────

def tune_hyperparameters(n_trials=50):
    """
    Run Optuna to find best XGBoost hyperparameters.
    n_trials=50 takes ~15-20 min. Use 20 for a quick run.
    """
    try:
        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)
    except ImportError:
        print("[Optuna] Not installed. Run: pip install optuna")
        return None

    df   = preprocess_data(load_data())
    X, y = df.drop(columns=['Target']), df['Target']
    cv   = StratifiedKFold(n_splits=5, shuffle=False)

    def objective(trial):
        params = {
            'n_estimators':      trial.suggest_int('n_estimators', 300, 1500),
            'learning_rate':     trial.suggest_float('learning_rate', 0.005, 0.1, log=True),
            'max_depth':         trial.suggest_int('max_depth', 3, 8),
            'subsample':         trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree':  trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'min_child_weight':  trial.suggest_int('min_child_weight', 1, 10),
            'gamma':             trial.suggest_float('gamma', 0.0, 1.0),
            'reg_alpha':         trial.suggest_float('reg_alpha', 0.0, 2.0),
            'reg_lambda':        trial.suggest_float('reg_lambda', 0.5, 3.0),
        }

        if not _USE_XGB:
            print("[Optuna] XGBoost not available — skipping tuning")
            return 0.0

        base = XGBClassifier(
            **params,
            objective='binary:logistic',
            eval_metric='auc',
            n_jobs=-1,
            random_state=42
        )

        numeric_pre  = Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler',  StandardScaler())
        ])
        preprocessor = ColumnTransformer([('num', numeric_pre, FEATURES)])
        pipe         = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier',   base)          # no calibration during tuning (faster)
        ])

        scores = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)
        return scores.mean()

    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    best = study.best_params
    print(f"\n[Optuna] Best AUC: {study.best_value:.4f}")
    print(f"[Optuna] Best params: {best}")

    # Save best params
    joblib.dump(best, os.path.join(MODEL_DIR, 'best_params.pkl'))
    print(f"[Optuna] Saved best params → models/best_params.pkl")

    return best


def train_with_best_params(save=True):
    """Load tuned params and retrain final model."""
    params_path = os.path.join(MODEL_DIR, 'best_params.pkl')

    if not os.path.exists(params_path):
        print("[Pipeline] No tuned params found — run tune_hyperparameters() first")
        return train_model(save=save)

    best_params = joblib.load(params_path)
    print(f"[Pipeline] Using tuned params: {best_params}")

    df   = preprocess_data(load_data())
    X, y = df.drop(columns=['Target']), df['Target']

    numeric_pre  = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler',  StandardScaler())
    ])
    preprocessor = ColumnTransformer([('num', numeric_pre, FEATURES)])

    base = XGBClassifier(
        **best_params,
        objective='binary:logistic',
        eval_metric='auc',
        n_jobs=-1,
        random_state=42
    )

    try:
        clf = CalibratedClassifierCV(estimator=base, method='isotonic', cv=3)
    except TypeError:
        clf = CalibratedClassifierCV(base_estimator=base, method='isotonic', cv=3)

    pipe = Pipeline([('preprocessor', preprocessor), ('classifier', clf)])

    cv     = StratifiedKFold(n_splits=10, shuffle=False)
    scores = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)
    acc    = cross_val_score(pipe, X, y, cv=cv, scoring='accuracy', n_jobs=-1)

    print(f"[Pipeline] Tuned ROC-AUC: {scores.mean():.4f} ± {scores.std():.4f}")
    print(f"[Pipeline] Tuned Accuracy: {acc.mean():.4f}")

    pipe.fit(X, y)

    if _USE_MLFLOW:
        _log_to_mlflow(pipe, X, y, scores.mean(), scores.std(), acc.mean())

    if save:
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(pipe, MODEL_PATH)
        print(f"[Pipeline] Tuned model saved → {MODEL_PATH}")

        result = permutation_importance(
            pipe, X, y, n_repeats=10, random_state=42, n_jobs=-1
        )
        importance = {
            FEATURES[i]: float(result.importances_mean[i])
            for i in np.argsort(result.importances_mean)[::-1]
        }
        joblib.dump(importance, os.path.join(MODEL_DIR, 'feature_importance.pkl'))

        meta = {
            'trained_at':   datetime.now().isoformat(),
            'n_samples':    len(X),
            'n_features':   len(FEATURES),
            'features':     FEATURES,
            'roc_auc_mean': round(scores.mean(), 4),
            'roc_auc_std':  round(scores.std(), 4),
            'accuracy':     round(acc.mean(), 4),
            'model_type':   'XGBoost-Tuned',
            'best_params':  best_params,
        }
        joblib.dump(meta, os.path.join(MODEL_DIR, 'model_meta.pkl'))

    return pipe

# ── Recency-weighted features ─────────────────────────────────────────────────

def compute_recency_features(df):
    """
    For each fight row, compute the fighter's stats from their last 3 fights
    before that date. Weights: most recent=0.5, second=0.3, third=0.2.
    Returns df with new recency columns added.
    """
    print("[Pipeline] Computing recency-weighted features...")

    df = df.sort_values('Date').reset_index(drop=True)

    # We'll compute these recency features for each fighter
    recency_cols = [
        'RedRecency_SigStr', 'RedRecency_TD', 'RedRecency_FinishRate',
        'BlueRecency_SigStr', 'BlueRecency_TD', 'BlueRecency_FinishRate',
        'RecencySigStrDif', 'RecencyTDDif', 'RecencyFinishDif'
    ]
    for col in recency_cols:
        df[col] = np.nan

    WEIGHTS = [0.5, 0.3, 0.2]  # most recent → oldest

    # Build a per-fighter fight history as we walk forward in time
    # Key: fighter_name → list of (date, sig_str, td_pct, finish) tuples
    fighter_history = {}

    def get_recency_stats(name, before_date):
        """Get weighted avg stats from last 3 fights before this date."""
        if name not in fighter_history:
            return None, None, None

        past = [f for f in fighter_history[name] if f['date'] < before_date]
        past = sorted(past, key=lambda x: x['date'], reverse=True)[:3]

        if not past:
            return None, None, None

        w = WEIGHTS[:len(past)]
        w = [x / sum(w) for x in w]  # renormalize if fewer than 3 fights

        sig_str     = sum(p['sig_str']     * w[i] for i, p in enumerate(past))
        td_pct      = sum(p['td_pct']      * w[i] for i, p in enumerate(past))
        finish_rate = sum(p['finish_rate'] * w[i] for i, p in enumerate(past))

        return sig_str, td_pct, finish_rate

    def update_history(name, date, sig_str, td_pct, won, method):
        if name not in fighter_history:
            fighter_history[name] = []
        finish = 1 if (won and ('KO' in str(method) or 'TKO' in str(method) or 'SUB' in str(method))) else 0
        fighter_history[name].append({
            'date':        date,
            'sig_str':     sig_str or 0,
            'td_pct':      td_pct  or 0,
            'finish_rate': finish
        })

    for idx, row in df.iterrows():
        date      = row['Date']
        red_name  = row.get('RedFighter',  '')
        blue_name = row.get('BlueFighter', '')
        winner    = row.get('Winner', '')
        method    = row.get('Finish', '')

        # Get recency stats BEFORE updating with this fight
        r_sig, r_td, r_fin = get_recency_stats(red_name,  date)
        b_sig, b_td, b_fin = get_recency_stats(blue_name, date)

        df.at[idx, 'RedRecency_SigStr']    = r_sig
        df.at[idx, 'RedRecency_TD']        = r_td
        df.at[idx, 'RedRecency_FinishRate']= r_fin
        df.at[idx, 'BlueRecency_SigStr']   = b_sig
        df.at[idx, 'BlueRecency_TD']       = b_td
        df.at[idx, 'BlueRecency_FinishRate']= b_fin

        # Now update history with this fight's result
        update_history(
            red_name, date,
            row.get('RedAvgSigStrLanded'), row.get('RedAvgTDPct'),
            winner == 'Red', method
        )
        update_history(
            blue_name, date,
            row.get('BlueAvgSigStrLanded'), row.get('BlueAvgTDPct'),
            winner == 'Blue', method
        )

    # Compute differentials
    df['RecencySigStrDif']  = df['RedRecency_SigStr']    - df['BlueRecency_SigStr']
    df['RecencyTDDif']      = df['RedRecency_TD']        - df['BlueRecency_TD']
    df['RecencyFinishDif']  = df['RedRecency_FinishRate']- df['BlueRecency_FinishRate']

    # Fill NaN (first few fights of each fighter's career) with 0
    for col in recency_cols:
        df[col] = df[col].fillna(0)

    print("[Pipeline] Recency features computed.")
    return df

def generate_shap_analysis():
    try:
        import shap
    except ImportError:
        print("[SHAP] Not installed. Run: pip install shap")
        return

    print("[SHAP] Loading model and data...")
    pipe = joblib.load(MODEL_PATH)
    df   = preprocess_data(load_data())
    X, y = df.drop(columns=['Target']), df['Target']

    preprocessor  = pipe.named_steps['preprocessor']
    X_transformed = preprocessor.transform(X)

    calibrated = pipe.named_steps['classifier']
    if hasattr(calibrated, 'calibrated_classifiers_'):
        base_model = calibrated.calibrated_classifiers_[0].estimator
    else:
        base_model = calibrated

    print("[SHAP] Computing SHAP values (this takes 2-3 min)...")
    # Workaround for SHAP/XGBoost version mismatch with base_score format
    try:
        explainer   = shap.TreeExplainer(base_model)
        shap_values = explainer.shap_values(X_transformed)
    except ValueError:
        # Fallback: use KernelExplainer which works with any model
        print("[SHAP] TreeExplainer failed — using Explainer fallback...")
        explainer   = shap.Explainer(base_model, X_transformed[:100])
        shap_output = explainer(X_transformed)
        shap_values = shap_output.values
    mean_shap = np.abs(shap_values).mean(axis=0)
    shap_importance = {
        FEATURES[i]: float(mean_shap[i])
        for i in np.argsort(mean_shap)[::-1]
    }

    print("\n[SHAP] Top 10 most important features:")
    for i, (feat, val) in enumerate(list(shap_importance.items())[:10]):
        print(f"  {i+1:2d}. {feat:<30} {val:.4f}")

    shap_data = {
        'importance':  shap_importance,
        'values':      shap_values[:500].tolist(),
        'features':    FEATURES,
        'computed_at': datetime.now().isoformat()
    }
    shap_path = os.path.join(MODEL_DIR, 'shap_values.pkl')
    joblib.dump(shap_data, shap_path)
    print(f"[SHAP] Saved → {shap_path}")
    return shap_importance


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'train'

    if cmd == 'tune':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        print(f"Running Optuna tuning with {n} trials...")
        tune_hyperparameters(n_trials=n)

    elif cmd == 'train_tuned':
        print("Training with best tuned params...")
        train_with_best_params()

    elif cmd == 'shap':
        print("Generating SHAP analysis...")
        generate_shap_analysis()

    else:
        print("Training UFC predictor v5...")
        train_model()
        print("Done.")
