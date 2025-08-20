import sqlite3
import os
import pandas as pd


def init_database():
    db_path = os.path.join(os.path.dirname(__file__), 'ufc.db')
    conn = sqlite3.connect(db_path)

    # Create fighters table
    conn.execute('''CREATE TABLE IF NOT EXISTS fighters
                    (
                        name
                        TEXT
                        PRIMARY
                        KEY,
                        height
                        REAL,
                        reach
                        REAL,
                        stance
                        TEXT,
                        age
                        INTEGER,
                        weight_class
                        TEXT,
                        win_streak
                        INTEGER,
                        ko_wins
                        INTEGER,
                        avg_sig_str
                        REAL,
                        avg_td_pct
                        REAL,
                        avg_sub_att
                        REAL,
                        total_fights
                        INTEGER
                    )''')

    # Create fights table
    conn.execute('''CREATE TABLE IF NOT EXISTS fights
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        RedFighter
        TEXT,
        BlueFighter
        TEXT,
        Date
        TEXT,
        Location
        TEXT,
        Country
        TEXT,
        Winner
        TEXT,
        TitleBout
        INTEGER,
        WeightClass
        TEXT,
        NumberOfRounds
        INTEGER,
        FOREIGN
        KEY
                    (
        RedFighter
                    ) REFERENCES fighters
                    (
                        name
                    ),
        FOREIGN KEY
                    (
                        BlueFighter
                    ) REFERENCES fighters
                    (
                        name
                    )
        )''')

    # Create predictions table
    conn.execute('''CREATE TABLE IF NOT EXISTS predictions
                    (
                        id
                        INTEGER
                        PRIMARY
                        KEY
                        AUTOINCREMENT,
                        red_fighter
                        TEXT
                        NOT
                        NULL,
                        blue_fighter
                        TEXT
                        NOT
                        NULL,
                        predicted_winner
                        TEXT
                        NOT
                        NULL,
                        actual_winner
                        TEXT,
                        correct
                        INTEGER,
                        timestamp
                        DATETIME
                        DEFAULT
                        CURRENT_TIMESTAMP
                    )''')


    # Create indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_fighters_name ON fighters (name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_fights_date ON fights (Date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions (timestamp)")

    conn.execute('''CREATE TABLE IF NOT EXISTS users
                    (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

    conn.commit()
    conn.close()


def import_csv_data():
    db_path = os.path.join(os.path.dirname(__file__), 'ufc.db')
    conn = sqlite3.connect(db_path)

    # Import fighter data
    fighter_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'fighter_db.csv')
    if os.path.exists(fighter_path):
        df = pd.read_csv(fighter_path)
        df.to_sql('fighters', conn, if_exists='replace', index=False)

    # Import fight data
    fights_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ufc_fights.csv')
    if os.path.exists(fights_path):
        df = pd.read_csv(fights_path)
        df.to_sql('fights', conn, if_exists='replace', index=False)

    conn.close()


if __name__ == "__main__":
    init_database()
    import_csv_data()
    print("Database initialized and data imported successfully!")
