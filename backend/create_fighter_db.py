import pandas as pd
import os
import numpy as np
from ml.utils import get_data_path
import sqlite3


def create_fighter_database():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'ufc.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    df = pd.read_csv(get_data_path())

    fighters = {}

    weight_classes = {
        'Strawweight': 0, 'Flyweight': 1, 'Bantamweight': 2, 'Featherweight': 3,
        'Lightweight': 4, 'Welterweight': 5, 'Middleweight': 6, 'Light Heavyweight': 7,
        'Heavyweight': 8, 'Catch Weight': 4, 'Openweight': 4
    }

    for _, row in df.iterrows():
        if row['RedFighter'] not in fighters:
            total_wins = row['RedWins']
            ko_ratio = row['RedWinsByKO'] / total_wins if total_wins > 0 else 0
            sub_ratio = row['RedWinsBySubmission'] / total_wins if total_wins > 0 else 0

            fighters[row['RedFighter']] = {
                'height': row['RedHeightCms'],
                'reach': row['RedReachCms'],
                'stance': row['RedStance'],
                'age': row['RedAge'],
                'weight_class': row['WeightClass'],
                'weight_class_numeric': weight_classes.get(row['WeightClass'], 4),
                'avg_sig_str': row['RedAvgSigStrLanded'],
                'avg_td_pct': row['RedAvgTDPct'],
                'avg_sub_att': row['RedAvgSubAtt'],
                'ko_ratio': ko_ratio,
                'sub_ratio': sub_ratio,
                'defense': row.get('RedAvgSigStrAbs', 2.5),
                'total_fights': row['RedTotalRoundsFought'],
                'win_streak': row['RedCurrentWinStreak']
            }

        if row['BlueFighter'] not in fighters:
            total_wins = row['BlueWins']
            ko_ratio = row['BlueWinsByKO'] / total_wins if total_wins > 0 else 0
            sub_ratio = row['BlueWinsBySubmission'] / total_wins if total_wins > 0 else 0

            fighters[row['BlueFighter']] = {
                'height': row['BlueHeightCms'],
                'reach': row['BlueReachCms'],
                'stance': row['BlueStance'],
                'age': row['BlueAge'],
                'weight_class': row['WeightClass'],
                'weight_class_numeric': weight_classes.get(row['WeightClass'], 4),
                'avg_sig_str': row['BlueAvgSigStrLanded'],
                'avg_td_pct': row['BlueAvgTDPct'],
                'avg_sub_att': row['BlueAvgSubAtt'],
                'ko_ratio': ko_ratio,
                'sub_ratio': sub_ratio,
                'defense': row.get('BlueAvgSigStrAbs', 2.5),
                'total_fights': row['BlueTotalRoundsFought'],
                'win_streak': row['BlueCurrentWinStreak']
            }

    fighter_df = pd.DataFrame.from_dict(fighters, orient='index')
    fighter_df.index.name = 'name'
    fighter_df.reset_index(inplace=True)

    fighter_df.to_sql('fighters', conn, if_exists='replace', index=False)

    print(f"Fighter database created with {len(fighter_df)} fighters in SQLite")


if __name__ == "__main__":
    create_fighter_database()
