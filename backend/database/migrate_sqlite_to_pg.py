"""
One-time data migration: copies rows from the old SQLite ufc.db
into the new Postgres database.

Run this INSIDE the backend container, where both ufc.db and
the app package (for get_conn) are available:

    docker exec -it ufc-fight-predictor-backend-1 python /app/database/migrate_sqlite_to_pg.py

Place this file at backend/database/migrate_sqlite_to_pg.py
(it's mounted into the container via the ./backend/database volume).
"""

import sqlite3
import os
from backend.app.db import get_conn

SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'ufc.db')


def migrate_table(sqlite_cur, pg_cur, table, columns, conflict_col=None):
    placeholders = ','.join(['%s'] * len(columns))
    col_list = ','.join(columns)

    sqlite_cur.execute(f"SELECT {col_list} FROM {table}")
    rows = sqlite_cur.fetchall()

    if not rows:
        print(f"[{table}] No rows found in SQLite, skipping.")
        return

    if conflict_col:
        update_clause = ','.join(f"{c}=EXCLUDED.{c}" for c in columns if c != conflict_col)
        sql = (
            f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
            f"ON CONFLICT ({conflict_col}) DO UPDATE SET {update_clause}"
        )
    else:
        sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"

    inserted = 0
    for row in rows:
        try:
            pg_cur.execute(sql, tuple(row))
            inserted += 1
        except Exception as e:
            print(f"[{table}] Skipped row due to error: {e}")

    print(f"[{table}] Migrated {inserted}/{len(rows)} rows.")


def main():
    if not os.path.exists(SQLITE_PATH):
        print(f"SQLite file not found at {SQLITE_PATH}")
        return

    sconn = sqlite3.connect(SQLITE_PATH)
    scur = sconn.cursor()

    pconn = get_conn()
    pcur = pconn.cursor()

    # 1. fighters
    migrate_table(
        scur, pcur, 'fighters',
        ['name', 'height', 'reach', 'stance', 'age', 'weight_class',
         'win_streak', 'ko_wins', 'avg_sig_str', 'avg_td_pct', 'avg_sub_att',
         'total_fights', 'last_scraped'],
        conflict_col='name'
    )
    pconn.commit()

    # 2. fights
    migrate_table(
        scur, pcur, 'fights',
        ['RedFighter', 'BlueFighter', 'Date', 'Location', 'Country',
         'Winner', 'TitleBout', 'WeightClass', 'NumberOfRounds', 'Finish']
    )
    pconn.commit()

    # 3. predictions (optional, only if table exists in sqlite)
    try:
        scur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='predictions'")
        if scur.fetchone():
            migrate_table(
                scur, pcur, 'predictions',
                ['red_fighter', 'blue_fighter', 'predicted_winner',
                 'actual_winner', 'correct', 'confidence']
            )
            pconn.commit()
    except Exception as e:
        print(f"[predictions] Skipped: {e}")

    # 4. upcoming_events (optional)
    try:
        scur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='upcoming_events'")
        if scur.fetchone():
            migrate_table(
                scur, pcur, 'upcoming_events',
                ['event_name', 'event_date', 'location', 'red_fighter',
                 'blue_fighter', 'weight_class']
            )
            pconn.commit()
    except Exception as e:
        print(f"[upcoming_events] Skipped: {e}")

    scur.close()
    sconn.close()
    pcur.close()
    pconn.close()

    print("Migration complete.")


if __name__ == "__main__":
    main()
