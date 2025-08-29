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
import sqlite3
import pandas as pd
import joblib
import os
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.inspection import permutation_importance

try:
    from xgboost import XGBClassifier  # noqa: F401
    _USE_XGB = True
except Exception:
    print("⚠️  XGBoost not available – using HistGradientBoostingClassifier instead.")
    _USE_XGB = False

current_dir = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(current_dir, '..', 'data', 'ufc_fights.csv')
MODEL_DIR = os.path.join(current_dir, '..', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ufc_predictor_v4.pkl')


FEATURES = [
    'RedOdds', 'BlueOdds', 'OddsRatio', 'WinStreakDif',
    'HeightAdvRed', 'ReachAdvRed', 'SizeAdvRed', 'StanceMatch',
    'RedAge', 'BlueAge', 'NumberOfRounds', 'TitleBout',
    'WeightClassAdvRed', 'ExpAdvRed', 'GrappleAdvRed'
]

def load_data() -> pd.DataFrame:
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')
    conn = sqlite3.connect(db_path)
    query = "SELECT * FROM fights"
    return pd.read_sql_query(query, conn)


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """Re‑create exactly the 15 engineered features consumed by the Flask app."""
    df = df.dropna(subset=['Winner']).copy()
    df['Target'] = df['Winner'].map({'Red': 1, 'Blue': 0}).astype(int)

    df['RedOdds'] = df['RedOdds'].fillna(df['RedOdds'].median())
    df['BlueOdds'] = df['BlueOdds'].fillna(df['BlueOdds'].median())
    df['OddsRatio'] = df.apply(lambda r: r['RedOdds'] / r['BlueOdds'] if r['BlueOdds'] else 1, axis=1)

    df['WinStreakDif'] = df['RedCurrentWinStreak'].fillna(0) - df['BlueCurrentWinStreak'].fillna(0)

    df['HeightAdvRed'] = df['RedHeightCms'].fillna(df['RedHeightCms'].median()) - df['BlueHeightCms'].fillna(df['BlueHeightCms'].median())
    df['ReachAdvRed']  = df['RedReachCms'].fillna(df['RedReachCms'].median()) - df['BlueReachCms'].fillna(df['BlueReachCms'].median())
    df['SizeAdvRed']   = (df['HeightAdvRed'] + df['ReachAdvRed']) / 2

    df['StanceMatch'] = (df['RedStance'] == df['BlueStance']).astype(int)

    df['RedAge']  = df['RedAge'].fillna(df['RedAge'].median())
    df['BlueAge'] = df['BlueAge'].fillna(df['BlueAge'].median())

    if 'Format' in df.columns:
        df['NumberOfRounds'] = df['Format'].str.extract(r'(\d+)').astype(float).squeeze().fillna(3)
    else:
        df['NumberOfRounds'] = 3

    df['TitleBout'] = df['TitleBout'].fillna(0).astype(int)

    weight_map = {
        'Strawweight': 0, 'Flyweight': 1, 'Bantamweight': 2, 'Featherweight': 3,
        'Lightweight': 4, 'Welterweight': 5, 'Middleweight': 6, 'Light Heavyweight': 7,
        'Heavyweight': 8, 'Catch Weight': 4, 'Openweight': 4
    }
    df['WeightClassNumeric'] = df['WeightClass'].map(weight_map).fillna(4)
    df['WeightClassAdvRed'] = 0

    df['ExpAdvRed'] = df['RedTotalRoundsFought'].fillna(0) - df['BlueTotalRoundsFought'].fillna(0)

    df['GrappleAdvRed'] = (
        (df['RedAvgSubAtt'] - df['BlueAvgSubAtt']).fillna(0) +
        (df['RedAvgTDPct'] - df['BlueAvgTDPct']).fillna(0)
    )
    final_df = df[FEATURES + ['Target']].copy()
    final_df = final_df.fillna(final_df.median(numeric_only=True))
    return final_df

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

class ModelWrapper(BaseEstimator, ClassifierMixin):
    def __init__(self, model):
        self.model = model

    def predict_proba(self, X):
        return self.model.predict_proba(X)



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

        try:
            if hasattr(pipe.named_steps['classifier'], 'feature_importances_'):
                importances = pipe.named_steps['classifier'].feature_importances_
            elif hasattr(pipe.named_steps['classifier'], 'coef_'):
                importances = pipe.named_steps['classifier'].coef_[0]
            else:
                importances = np.ones(len(FEATURES)) / len(FEATURES)

            feature_importance = dict(zip(FEATURES, importances))

            importance_path = os.path.join(MODEL_DIR, 'feature_importance.pkl')
            joblib.dump(feature_importance, importance_path)
            print(f"Feature importance saved → {importance_path}")

        except Exception as e:
            print(f"Error saving feature importance: {str(e)}")

    return pipe

# CLI

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

        feature_names = FEATURES

        result = permutation_importance(
            pipe, X, y, n_repeats=10, random_state=42, n_jobs=-1
        )

        sorted_idx = result.importances_mean.argsort()[::-1]
        feature_importance = {
            feature_names[i]: result.importances_mean[i]
            for i in sorted_idx
        }

        importance_path = os.path.join(MODEL_DIR, 'feature_importance.pkl')
        joblib.dump(feature_importance, importance_path)
        print(f"Feature importance saved → {importance_path}")

    return pipe



if __name__ == "__main__":
    print("training UFC predictor (v4)…")
    train_model()
    print("training complete")
