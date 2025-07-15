import pandas as pd
import os
import numpy as np


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
    """Get stats for a specific fighter with enhanced matching"""
    try:
        fighter_db = pd.read_csv(get_fighter_db_path())
        # Normalize fighter names
        fighter_db['normalized_name'] = fighter_db['name'].str.lower().str.strip()
        search_name = fighter_name.lower().strip()

        # Try exact match
        exact_match = fighter_db[fighter_db['normalized_name'] == search_name]
        if not exact_match.empty:
            stats = exact_match.iloc[0].to_dict()
            return fill_missing_stats(stats)

        # Try close match
        close_matches = fighter_db[
            fighter_db['normalized_name'].str.contains(search_name) |
            fighter_db['name'].str.contains(fighter_name, case=False)
            ]

        if not close_matches.empty:
            stats = close_matches.iloc[0].to_dict()
            return fill_missing_stats(stats)

        return None
    except Exception as e:
        print(f"Error getting stats for {fighter_name}: {str(e)}")
        return None


def fill_missing_stats(stats):
    """Fill missing fighter stats with median values"""
    # Load the database to get medians
    fighter_db = pd.read_csv(get_fighter_db_path())

    # Add all expected fields with defaults
    defaults = {
        'height': fighter_db['height'].median(),
        'reach': fighter_db['reach'].median(),
        'stance': 'Orthodox',
        'age': fighter_db['age'].median(),
        'win_streak': 0,
        'ko_wins': 0,
        'weight_class': 'Lightweight',
        'avg_sig_str': fighter_db['avg_sig_str'].median(),
        'avg_td_pct': fighter_db['avg_td_pct'].median(),
        'avg_sub_att': fighter_db['avg_sub_att'].median(),
        'total_fights': fighter_db['total_fights'].median()
    }

    # Fill missing values
    for key, value in defaults.items():
        if key not in stats or pd.isna(stats.get(key)):
            stats[key] = value

    # Ensure all required fields exist
    stats.setdefault('name', 'Unknown Fighter')
    return stats
