import sqlite3
import os


def init_database():
    db_path = os.path.join(os.path.dirname(__file__), 'ufc.db')
    conn = sqlite3.connect(db_path, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    conn.execute('''CREATE TABLE IF NOT EXISTS fighters
                    (
                        name         TEXT PRIMARY KEY,
                        height       REAL,
                        reach        REAL,
                        stance       TEXT,
                        age          INTEGER,
                        weight_class TEXT,
                        win_streak   INTEGER,
                        ko_wins      INTEGER,
                        avg_sig_str  REAL,
                        avg_td_pct   REAL,
                        avg_sub_att  REAL,
                        total_fights INTEGER,
                        last_scraped TEXT
                    )''')

    conn.execute('''CREATE TABLE IF NOT EXISTS fights
                    (
                        id             INTEGER PRIMARY KEY AUTOINCREMENT,
                        RedFighter     TEXT,
                        BlueFighter    TEXT,
                        Date           TEXT,
                        Location       TEXT,
                        Country        TEXT,
                        Winner         TEXT,
                        TitleBout      INTEGER,
                        WeightClass    TEXT,
                        NumberOfRounds INTEGER,
                        Finish         TEXT,
                        FOREIGN KEY (RedFighter)  REFERENCES fighters(name),
                        FOREIGN KEY (BlueFighter) REFERENCES fighters(name)
                    )''')

    conn.execute('''CREATE TABLE IF NOT EXISTS predictions
                    (
                        id               INTEGER PRIMARY KEY AUTOINCREMENT,
                        red_fighter      TEXT NOT NULL,
                        blue_fighter     TEXT NOT NULL,
                        predicted_winner TEXT NOT NULL,
                        actual_winner    TEXT,
                        correct          INTEGER,
                        confidence       REAL,
                        timestamp        DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

    conn.execute('''CREATE TABLE IF NOT EXISTS users
                    (
                        id         INTEGER PRIMARY KEY AUTOINCREMENT,
                        username   TEXT UNIQUE NOT NULL,
                        password   TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

    conn.execute('''CREATE TABLE IF NOT EXISTS upcoming_events
                    (
                        id           INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_name   TEXT,
                        event_date   TEXT,
                        location     TEXT,
                        red_fighter  TEXT,
                        blue_fighter TEXT,
                        weight_class TEXT,
                        scraped_at   DATETIME DEFAULT CURRENT_TIMESTAMP
                    )''')

    conn.execute("CREATE INDEX IF NOT EXISTS idx_fighters_name  ON fighters (name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_fights_date    ON fights (Date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_predictions_ts ON predictions (timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_upcoming_date  ON upcoming_events (event_date)")

    # Deduplicate on every startup
    conn.execute('''
        DELETE FROM fighters
        WHERE rowid NOT IN (
            SELECT MAX(rowid) FROM fighters GROUP BY name
        )
    ''')

    conn.commit()
    conn.close()
    print("[DB] Schema initialised.")


if __name__ == "__main__":
    init_database()
    print("Database initialised. Run /refresh_fighters to populate fighter data.")
