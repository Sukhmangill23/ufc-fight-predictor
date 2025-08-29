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

    df['TitleBout'] = df['TitleBout'].astype(int)

    df['ChampionshipRound'] = df['NumberOfRounds'].apply(lambda x: 1 if x == 5 else 0)

    df['Target'] = df['Winner'].map({'Red': 1, 'Blue': 0})

    for col in ['RedHeightCms', 'BlueHeightCms', 'RedReachCms', 'BlueReachCms']:
        df[col] = df[col].fillna(df[col].median())

    df['HeightAdvRed'] = df['RedHeightCms'] - df['BlueHeightCms']
    df['ReachAdvRed'] = df['RedReachCms'] - df['BlueReachCms']
    df['SizeAdvRed'] = (df['HeightAdvRed'] + df['ReachAdvRed']) / 2

    df['StanceMatch'] = (df['RedStance'] == df['BlueStance']).astype(int)

    df['RedFinishPotential'] = (df['RedWinsByKO'] / df['RedWins'].replace(0, 1)) + (
                df['RedWinsBySubmission'] / df['RedWins'].replace(0, 1))
    df['BlueFinishPotential'] = (df['BlueWinsByKO'] / df['BlueWins'].replace(0, 1)) + (
                df['BlueWinsBySubmission'] / df['BlueWins'].replace(0, 1))
    df['FinishPotentialRed'] = df['RedFinishPotential'] - df['BlueFinishPotential']

    if 'RedAvgSigStrAbs' in df and 'BlueAvgSigStrAbs' in df:
        df['DefenseAdvRed'] = df['RedAvgSigStrAbs'] - df['BlueAvgSigStrAbs']
    else:
        df['DefenseAdvRed'] = 0

    redundant_cols = [
        'RedFighter', 'BlueFighter', 'Location', 'Country', 'Date',
        'RedHeightCms', 'BlueHeightCms', 'RedReachCms', 'BlueReachCms',
        'RedStance', 'BlueStance', 'Winner', 'RedExpectedValue', 'BlueExpectedValue',
        'Finish', 'BlueDecOdds', 'RedDecOdds', 'WeightClass'
    ]
    df = df.drop(columns=redundant_cols, errors='ignore')

    for col in df.select_dtypes(include=np.number).columns:
        if df[col].isnull().sum() > 0:
            df[col] = df[col].fillna(df[col].median())

    return df


def get_fighter_stats(fighter_name):
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM fighters WHERE name LIKE ?", (f'%{fighter_name}%',))
        result = cursor.fetchone()

        if result:
            columns = [col[0] for col in cursor.description]
            stats = dict(zip(columns, result))
            return stats
        else:
            return None
    except Exception as e:
        print(f"Error fetching fighter stats: {str(e)}")
        return None
    finally:
        conn.close()


def fill_missing_stats(stats):
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                COALESCE(AVG(height), 180) AS height,
                COALESCE(AVG(reach), 180) AS reach,
                COALESCE(AVG(age), 30) AS age,
                COALESCE(AVG(avg_sig_str), 100) AS avg_sig_str,
                COALESCE(AVG(avg_td_pct), 30) AS avg_td_pct,
                COALESCE(AVG(avg_sub_att), 1.5) AS avg_sub_att,
                COALESCE(AVG(total_fights), 10) AS total_fights
            FROM fighters
        """)
        medians = cursor.fetchone()
        median_cols = [col[0] for col in cursor.description]
        median_vals = dict(zip(median_cols, medians))

        defaults = {
            'height': 180,
            'reach': 180,
            'stance': 'Orthodox',
            'age': 30,
            'win_streak': 0,
            'ko_wins': 0,
            'weight_class': 'Lightweight',
            'avg_sig_str': 100,
            'avg_td_pct': 30,
            'avg_sub_att': 1.5,
            'total_fights': 10
        }

        for key in defaults:
            if key in median_vals and median_vals[key] is not None:
                defaults[key] = median_vals[key]

        for key, value in defaults.items():
            if key not in stats or pd.isna(stats.get(key)):
                stats[key] = value

        return stats
    except Exception as e:
        print(f"Error filling missing stats: {str(e)}")
        return stats
    finally:
        conn.close()
