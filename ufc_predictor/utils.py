import pandas as pd
import os
import numpy as np
import sqlite3

def get_data_path():
    """Get absolute path to data file"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, '..', 'data', 'ufc_fights.csv')


def preprocess_data(df):
    """Clean and transform raw fight data"""
    # 1. Drop high-missing columns (from EDA >20% missing)
    high_missing_drop = [
        'BWFeatherweightRank', 'RWFeatherweightRank', 'BPFPRank', 'BWFlyweightRank',
        'RWFlyweightRank', 'BWStrawweightRank', 'BWBantamweightRank', 'BBantamweightRank',
        'BWelterweightRank', 'BLightHeavyweightRank', 'BLightweightRank', 'BFeatherweightRank',
        'BFlyweightRank', 'BMiddleweightRank', 'RWStrawweightRank', 'BHeavyweightRank',
        'RWBantamweightRank', 'RFeatherweightRank', 'RBantamweightRank', 'RMiddleweightRank',
        'RLightHeavyweightRank', 'RLightweightRank', 'RHeavyweightRank', 'RFlyweightRank',
        'RWelterweightRank', 'RPFPRank', 'BMatchWCRank', 'RMatchWCRank', 'FinishDetails',
        'BKOOdds', 'BSubOdds', 'RSubOdds', 'RKOOdds', 'EmptyArena'
    ]
    df = df.drop(columns=high_missing_drop, errors='ignore')

    # 2. Convert booleans
    df['TitleBout'] = df['TitleBout'].astype(int)

    # Championship round flag
    df['ChampionshipRound'] = df['NumberOfRounds'].apply(lambda x: 1 if x == 5 else 0)

    # 3. Create target
    df['Target'] = df['Winner'].map({'Red': 1, 'Blue': 0})

    # 4. Handle critical missing values
    # Fill physical attributes with median
    for col in ['RedHeightCms', 'BlueHeightCms', 'RedReachCms', 'BlueReachCms']:
        df[col] = df[col].fillna(df[col].median())

    # 5. Create key features
    # Physical advantages
    df['HeightAdvRed'] = df['RedHeightCms'] - df['BlueHeightCms']
    df['ReachAdvRed'] = df['RedReachCms'] - df['BlueReachCms']
    df['SizeAdvRed'] = (df['HeightAdvRed'] + df['ReachAdvRed']) / 2

    # Stance match
    df['StanceMatch'] = (df['RedStance'] == df['BlueStance']).astype(int)

    # Finish potential
    df['RedFinishPotential'] = (df['RedWinsByKO'] / df['RedWins'].replace(0, 1)) + (
                df['RedWinsBySubmission'] / df['RedWins'].replace(0, 1))
    df['BlueFinishPotential'] = (df['BlueWinsByKO'] / df['BlueWins'].replace(0, 1)) + (
                df['BlueWinsBySubmission'] / df['BlueWins'].replace(0, 1))
    df['FinishPotentialRed'] = df['RedFinishPotential'] - df['BlueFinishPotential']

    # Defense advantage (simplified)
    if 'RedAvgSigStrAbs' in df and 'BlueAvgSigStrAbs' in df:
        df['DefenseAdvRed'] = df['RedAvgSigStrAbs'] - df['BlueAvgSigStrAbs']
    else:
        df['DefenseAdvRed'] = 0

    # 6. Drop redundant columns
    redundant_cols = [
        'RedFighter', 'BlueFighter', 'Location', 'Country', 'Date',
        'RedHeightCms', 'BlueHeightCms', 'RedReachCms', 'BlueReachCms',
        'RedStance', 'BlueStance', 'Winner', 'RedExpectedValue', 'BlueExpectedValue',
        'Finish', 'BlueDecOdds', 'RedDecOdds', 'WeightClass'
    ]
    df = df.drop(columns=redundant_cols, errors='ignore')

    # 7. Handle remaining missing values with median
    for col in df.select_dtypes(include=np.number).columns:
        if df[col].isnull().sum() > 0:
            df[col] = df[col].fillna(df[col].median())

    return df


def get_fighter_db_path():
    """Get absolute path to fighter database"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, '..', 'data', 'fighter_db.csv')


def get_fighter_stats(fighter_name):
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM fighters WHERE name LIKE ?", (f'%{fighter_name}%',))
    result = cursor.fetchone()

    if result:
        columns = [col[0] for col in cursor.description]
        stats = dict(zip(columns, result))
        return stats

    return None


def fill_missing_stats(stats):
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get median values from database
    cursor.execute("""
                   SELECT AVG(height)       AS height,
                          AVG(reach)        AS reach,
                          AVG(age)          AS age,
                          AVG(avg_sig_str)  AS avg_sig_str,
                          AVG(avg_td_pct)   AS avg_td_pct,
                          AVG(avg_sub_att)  AS avg_sub_att,
                          AVG(total_fights) AS total_fights
                   FROM fighters
                   """)
    medians = cursor.fetchone()
    median_cols = [col[0] for col in cursor.description]
    median_vals = dict(zip(median_cols, medians))

    # Fill missing values
    defaults = {
        'height': median_vals['height'],
        'reach': median_vals['reach'],
        'stance': 'Orthodox',
        'age': median_vals['age'],
        'win_streak': 0,
        'ko_wins': 0,
        'weight_class': 'Lightweight',
        'avg_sig_str': median_vals['avg_sig_str'],
        'avg_td_pct': median_vals['avg_td_pct'],
        'avg_sub_att': median_vals['avg_sub_att'],
        'total_fights': median_vals['total_fights']
    }

    for key, value in defaults.items():
        if key not in stats or pd.isna(stats.get(key)):
            stats[key] = value

    return stats
