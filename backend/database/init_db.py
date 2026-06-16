from app.db import get_conn


def init_database():
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute('''CREATE TABLE IF NOT EXISTS fighters
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

    cursor.execute('''CREATE TABLE IF NOT EXISTS fights
                    (
                        id             SERIAL PRIMARY KEY,
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

    cursor.execute('''CREATE TABLE IF NOT EXISTS predictions
                    (
                        id               SERIAL PRIMARY KEY,
                        red_fighter      TEXT NOT NULL,
                        blue_fighter     TEXT NOT NULL,
                        predicted_winner TEXT NOT NULL,
                        actual_winner    TEXT,
                        correct          INTEGER,
                        confidence       REAL,
                        timestamp        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS users
                    (
                        id         SERIAL PRIMARY KEY,
                        username   TEXT UNIQUE NOT NULL,
                        password   TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS upcoming_events
                    (
                        id           SERIAL PRIMARY KEY,
                        event_name   TEXT,
                        event_date   TEXT,
                        location     TEXT,
                        red_fighter  TEXT,
                        blue_fighter TEXT,
                        weight_class TEXT,
                        scraped_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )''')

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fighters_name  ON fighters (name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_fights_date    ON fights (Date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_ts ON predictions (timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_upcoming_date  ON upcoming_events (event_date)")

    conn.commit()
    cursor.close()
    conn.close()
    print("[DB] Schema initialised.")


if __name__ == "__main__":
    init_database()
    print("Database initialised. Run /refresh_fighters to populate fighter data.")
