import pandas as pd
import numpy as np
import os
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import HistGradientBoostingClassifier
import joblib

# ---------------------------------------------------------------------------
# OPTIONAL XGBOOST IMPORT (falls back gracefully)
# ---------------------------------------------------------------------------
try:
    from xgboost import XGBClassifier  # noqa: F401
    _USE_XGB = True
except Exception:
    print("⚠️  XGBoost not available – using HistGradientBoostingClassifier instead.")
    _USE_XGB = False

# ---------------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(current_dir, '..', 'data', 'ufc_fights.csv')
MODEL_DIR = os.path.join(current_dir, '..', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ufc_predictor_v4.pkl')

# ---------------------------------------------------------------------------
# FEATURE SET (must mirror app/routes.py → model_features)
# ---------------------------------------------------------------------------
FEATURES = [
    'RedOdds', 'BlueOdds', 'OddsRatio', 'WinStreakDif',
    'HeightAdvRed', 'ReachAdvRed', 'SizeAdvRed', 'StanceMatch',
    'RedAge', 'BlueAge', 'NumberOfRounds', 'TitleBout',
    'WeightClassAdvRed', 'ExpAdvRed', 'GrappleAdvRed'
]

# ---------------------------------------------------------------------------
# DATA UTILITIES
# ---------------------------------------------------------------------------

def load_data() -> pd.DataFrame:
    return pd.read_csv(DATA_PATH)


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """Re‑create exactly the 15 engineered features consumed by the Flask app."""
    df = df.dropna(subset=['Winner']).copy()
    df['Target'] = df['Winner'].map({'Red': 1, 'Blue': 0}).astype(int)

    # Odds (critical)
    df['RedOdds'] = df['RedOdds'].fillna(df['RedOdds'].median())
    df['BlueOdds'] = df['BlueOdds'].fillna(df['BlueOdds'].median())
    df['OddsRatio'] = df.apply(lambda r: r['RedOdds'] / r['BlueOdds'] if r['BlueOdds'] else 1, axis=1)

    # Win‑streak diff (safe fill with 0)
    df['WinStreakDif'] = df['RedCurrentWinStreak'].fillna(0) - df['BlueCurrentWinStreak'].fillna(0)

    # Physical advantages
    df['HeightAdvRed'] = df['RedHeightCms'].fillna(df['RedHeightCms'].median()) - df['BlueHeightCms'].fillna(df['BlueHeightCms'].median())
    df['ReachAdvRed']  = df['RedReachCms'].fillna(df['RedReachCms'].median()) - df['BlueReachCms'].fillna(df['BlueReachCms'].median())
    df['SizeAdvRed']   = (df['HeightAdvRed'] + df['ReachAdvRed']) / 2

    # Stance match
    df['StanceMatch'] = (df['RedStance'] == df['BlueStance']).astype(int)

    # Ages
    df['RedAge']  = df['RedAge'].fillna(df['RedAge'].median())
    df['BlueAge'] = df['BlueAge'].fillna(df['BlueAge'].median())

    # Number of rounds – if Format column missing, default to 3
    if 'Format' in df.columns:
        df['NumberOfRounds'] = df['Format'].str.extract(r'(\d+)').astype(float).squeeze().fillna(3)
    else:
        df['NumberOfRounds'] = 3

    # Title bout already 0/1 in dataset, just ensure int
    df['TitleBout'] = df['TitleBout'].fillna(0).astype(int)

    # Weight‑class advantage (same division so 0) but keep for compatibility
    weight_map = {
        'Strawweight': 0, 'Flyweight': 1, 'Bantamweight': 2, 'Featherweight': 3,
        'Lightweight': 4, 'Welterweight': 5, 'Middleweight': 6, 'Light Heavyweight': 7,
        'Heavyweight': 8, 'Catch Weight': 4, 'Openweight': 4
    }
    df['WeightClassNumeric'] = df['WeightClass'].map(weight_map).fillna(4)
    df['WeightClassAdvRed'] = 0  # all historical fights are within same WC in dataset

    # Experience advantage (rounds fought)
    df['ExpAdvRed'] = df['RedTotalRoundsFought'].fillna(0) - df['BlueTotalRoundsFought'].fillna(0)

    # Grappling advantage
    df['GrappleAdvRed'] = (
        (df['RedAvgSubAtt'] - df['BlueAvgSubAtt']).fillna(0) +
        (df['RedAvgTDPct'] - df['BlueAvgTDPct']).fillna(0)
    )

    # Final selection + median fill to guarantee no NaNs
    final_df = df[FEATURES + ['Target']].copy()
    final_df = final_df.fillna(final_df.median(numeric_only=True))
    return final_df

# ---------------------------------------------------------------------------
# MODEL PIPELINE
# ---------------------------------------------------------------------------

def _calibrate(model):
    try:
        return CalibratedClassifierCV(base_estimator=model, method='isotonic', cv=3)
    except TypeError:  # older scikit‑learn
        return CalibratedClassifierCV(estimator=model, method='isotonic', cv=3)


def build_pipeline() -> Pipeline:
    numeric_pre = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    preprocessor = ColumnTransformer([
        ('num', numeric_pre, FEATURES)
    ])

    if _USE_XGB:
        base = XGBClassifier(
            n_estimators=800,
            learning_rate=0.03,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            objective='binary:logistic',
            eval_metric='logloss',
            n_jobs=-1,
            random_state=42
        )
    else:
        base = HistGradientBoostingClassifier(
            learning_rate=0.03,
            max_iter=800,
            random_state=42,
            early_stopping=False
        )

    return Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', _calibrate(base))
    ])

# ---------------------------------------------------------------------------
# TRAINING ENTRYPOINT
# ---------------------------------------------------------------------------

def train_model(save: bool = True):
    df = preprocess_data(load_data())
    X, y = df.drop(columns=['Target']), df['Target']

    pipe = build_pipeline()
    cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
    scores = cross_val_score(pipe, X, y, cv=cv, scoring='roc_auc', n_jobs=-1)
    print(f"Mean ROC‑AUC (10‑fold): {scores.mean():.4f} ± {scores.std():.4f}")

    pipe.fit(X, y)

    if save:
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(pipe, MODEL_PATH)
        print(f"Model saved → {MODEL_PATH}")

    return pipe

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("🚀  Training UFC predictor (v4)…")
    train_model()
    print("✅  Training complete!")
