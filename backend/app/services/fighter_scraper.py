import requests
from bs4 import BeautifulSoup
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'ufc.db')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}


def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def scrape_fighter_page(letter):
    """Scrape all fighters for a given starting letter from ufcstats.com"""
    url = f"http://www.ufcstats.com/statistics/fighters?char={letter}&page=all"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        rows = soup.select('tr.b-statistics__table-row')
        fighters = []

        for row in rows:
            cols = row.select('td.b-statistics__table-col')
            if len(cols) < 10:
                continue

            first = cols[0].get_text(strip=True)
            last  = cols[1].get_text(strip=True)
            if not first and not last:
                continue

            name = f"{first} {last}".strip()

            height_raw = cols[3].get_text(strip=True)
            reach_raw  = cols[5].get_text(strip=True)
            stance     = cols[6].get_text(strip=True)
            wins_raw   = cols[7].get_text(strip=True)
            losses_raw = cols[8].get_text(strip=True)
            draws_raw  = cols[9].get_text(strip=True)

            wins   = safe_int(wins_raw)
            losses = safe_int(losses_raw)
            draws  = safe_int(draws_raw)

            detail_link = cols[0].select_one('a')
            detail_url  = detail_link['href'] if detail_link else None

            fighters.append({
                'name':         name,
                'height':       parse_height(height_raw),
                'reach':        parse_reach(reach_raw),
                'stance':       stance if stance else 'Orthodox',
                'wins':         wins,
                'losses':       losses,
                'draws':        draws,
                'total_fights': wins + losses + draws,
                'detail_url':   detail_url
            })

        return fighters

    except Exception as e:
        print(f"[FighterScraper] Error on letter {letter}: {e}")
        return []


def scrape_fighter_detail(detail_url):
    """Pull per-fight stats from a fighter's detail page."""
    if not detail_url:
        return {}
    try:
        resp = requests.get(detail_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')
        stats = {}

        boxes = soup.select('li.b-list__box-list-item')
        for box in boxes:
            label = box.select_one('i.b-list__box-item-title')
            if not label:
                continue
            key   = label.get_text(strip=True).lower().replace(':', '').strip()
            value = box.get_text(strip=True).replace(label.get_text(strip=True), '').strip()

            if 'slpm' in key:
                stats['avg_sig_str'] = safe_float(value)
            elif 'str. acc' in key:
                stats['str_acc'] = safe_float(value.replace('%', ''))
            elif 'td avg' in key:
                stats['avg_td_pct'] = safe_float(value)
            elif 'sub. avg' in key:
                stats['avg_sub_att'] = safe_float(value)
            elif 'dob' in key:
                stats['dob'] = value
            elif 'weight' in key:
                stats['weight_class'] = map_weight_class(value)
            elif 'height' in key and 'avg_sig_str' not in stats:
                stats['height'] = parse_height(value)
            elif 'reach' in key:
                stats['reach'] = parse_reach(value)
            elif 'stance' in key:
                stats['stance'] = value

        if 'dob' in stats:
            stats['age'] = compute_age(stats['dob'])
            del stats['dob']

        fight_rows = soup.select(
            'tr.b-fight-details__table-row.b-fight-details__table-row__hover'
        )
        win_streak = 0
        ko_wins = 0
        streak_broken = False

        for row in fight_rows:
            cols = row.select('td.b-fight-details__table-col')
            if len(cols) < 8:
                continue

            # col 0 = result, col 7 = method (confirmed from debug output)
            result_ps = cols[0].select('p')
            method_ps = cols[7].select('p')

            result_text = result_ps[0].get_text(
                strip=True).lower() if result_ps else ''
            method_text = method_ps[0].get_text(
                strip=True).upper() if method_ps else ''

            if result_text == 'win':
                if 'KO' in method_text or 'TKO' in method_text:
                    ko_wins += 1
                if not streak_broken:
                    win_streak += 1
            elif result_text in ('loss', 'nc', 'draw'):
                streak_broken = True

        stats['ko_wins'] = ko_wins
        stats['win_streak'] = win_streak
        return stats

    except Exception as e:
        print(f"[FighterScraper] Detail error {detail_url}: {e}")
        return {}


def scrape_fighter_by_name(name):
    """Search ufcstats.com for a specific fighter by name."""
    name_parts = name.strip().split()
    last_name  = name_parts[-1] if name_parts else name
    search_url = f"http://www.ufcstats.com/statistics/fighters/search?query={last_name}"
    try:
        resp = requests.get(search_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        rows = soup.select('tr.b-statistics__table-row')

        for row in rows:
            cols = row.select('td.b-statistics__table-col')
            if len(cols) < 10:
                continue

            first = cols[0].get_text(strip=True)
            last  = cols[1].get_text(strip=True)
            if not first and not last:
                continue

            scraped_name  = f"{first} {last}".strip()
            search_words  = [w.lower() for w in name.split() if w]
            if not all(w in scraped_name.lower() for w in search_words):
                continue

            detail_link = cols[0].select_one('a')
            detail_url  = detail_link['href'] if detail_link else None

            wins   = safe_int(cols[7].get_text(strip=True)) if len(cols) > 7 else 0
            losses = safe_int(cols[8].get_text(strip=True)) if len(cols) > 8 else 0
            draws  = safe_int(cols[9].get_text(strip=True)) if len(cols) > 9 else 0

            fighter = {
                'name':         scraped_name,
                'height':       parse_height(cols[3].get_text(strip=True)) if len(cols) > 3 else None,
                'reach':        parse_reach(cols[5].get_text(strip=True))  if len(cols) > 5 else None,
                'stance':       cols[6].get_text(strip=True)               if len(cols) > 6 else 'Orthodox',
                'wins':         wins,
                'losses':       losses,
                'draws':        draws,
                'total_fights': wins + losses + draws,
            }

            if detail_url:
                detail_stats = scrape_fighter_detail(detail_url)
                fighter.update(detail_stats)
                fighter['detail_url'] = detail_url

            return fighter

        return None

    except Exception as e:
        print(f"[FighterScraper] Search error for '{name}': {e}")
        return None


def upsert_fighter(cursor, fighter):
    """Insert or update a fighter row — reuses the caller's cursor/connection."""
    cursor.execute("""
        INSERT OR REPLACE INTO fighters
            (name, height, reach, stance, age, weight_class,
             win_streak, ko_wins, avg_sig_str, avg_td_pct, avg_sub_att,
             total_fights, last_scraped)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        fighter.get('name'),
        fighter.get('height'),
        fighter.get('reach'),
        fighter.get('stance', 'Orthodox'),
        fighter.get('age'),
        fighter.get('weight_class'),
        fighter.get('win_streak', 0),
        fighter.get('ko_wins', 0),
        fighter.get('avg_sig_str', 0.0),
        fighter.get('avg_td_pct', 0.0),
        fighter.get('avg_sub_att', 0.0),
        fighter.get('total_fights', 0),
        datetime.now().isoformat()
    ))

def upsert_fighter_fights(cursor, fighter_name, detail_url):
    if not detail_url:
        return
    try:
        resp = requests.get(detail_url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, 'html.parser')

        # Delete ALL existing fights for this fighter first — full refresh
        cursor.execute(
            "DELETE FROM fights WHERE RedFighter=? OR BlueFighter=?",
            (fighter_name, fighter_name)
        )

        # ufcstats detail page structure:
        # - Non-hover <tr> rows = event header rows (contain date, event name, location)
        # - Hover <tr> rows     = individual fight stat rows
        # We need to walk ALL rows in order and track the last seen date

        all_rows = soup.select('tr.b-fight-details__table-row')
        current_date       = ''
        current_event      = ''
        current_weight     = ''
        inserted = 0

        for row in all_rows:
            is_fight = 'b-fight-details__table-row__hover' in row.get('class', [])

            if not is_fight:
                # This is an event header row — extract date and weight class
                # These rows have <td> cells with the event info
                cells = row.select('td')
                for cell in cells:
                    text = cell.get_text(strip=True)
                    # Try to parse as date: "Jun 28, 2025"
                    try:
                        from datetime import datetime
                        parsed = datetime.strptime(text, '%b %d, %Y')
                        current_date = parsed.strftime('%Y-%m-%d')
                    except ValueError:
                        pass
                    # Weight class detection
                    wc = map_weight_class(text)
                    if wc != 'Lightweight' or 'weight' in text.lower():
                        current_weight = wc
                continue

            # Fight row — extract stats
            cols = row.select('td.b-fight-details__table-col')
            if len(cols) < 8:
                continue

            def col_texts(idx):
                if idx >= len(cols):
                    return []
                return [p.get_text(strip=True) for p in cols[idx].select('p')]

            result_texts = col_texts(0)
            result_text  = result_texts[0].lower() if result_texts else ''

            # Opponent — col 1 has TWO <p> tags: [fighter_name, opponent_name]
            fighter_ps = col_texts(1)
            if len(fighter_ps) < 2:
                continue
            # First p is always the page owner (Topuria), second is opponent
            red_fighter  = fighter_ps[0]
            blue_fighter = fighter_ps[1]

            if not red_fighter or not blue_fighter:
                continue

            if result_text == 'win':
                winner = 'Red'
            elif result_text == 'loss':
                winner = 'Blue'
            else:
                winner = 'Draw'

            method     = col_texts(7)[0] if col_texts(7) else ''
            rounds_raw = col_texts(8)[0] if col_texts(8) else '3'
            rounds     = safe_int(rounds_raw) or 3

            # Weight class — try to get from the event name in col 6
            event_text = col_texts(6)[0] if col_texts(6) else ''
            wc_raw = col_texts(6)[0] if col_texts(6) else ''
            weight_class = map_weight_class(wc_raw) if wc_raw else 'Unknown'

            print(f"[FightHistory] Inserting: {red_fighter} vs {blue_fighter} | {current_date} | {method} | {weight_class} | R{rounds}")

            cursor.execute("""
                INSERT INTO fights
                    (RedFighter, BlueFighter, Date, Winner, WeightClass, NumberOfRounds, Finish)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (red_fighter, blue_fighter, current_date, winner, weight_class, rounds, method))
            inserted += 1

        print(f"[FightHistory] Done. Inserted {inserted} fights for {fighter_name}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[FightHistory] Error for {fighter_name}: {e}")

def run_fighter_scraper(letters=None, detail=True):
    """
    Main entry — scrape fighters A-Z (or subset).
    Each letter gets its own short-lived connection so locks don't pile up.
    """
    if letters is None:
        import string
        letters = list(string.ascii_lowercase)

    total = 0

    for letter in letters:
        print(f"[FighterScraper] Scraping letter: {letter.upper()}")
        fighters = scrape_fighter_page(letter)

        # One connection per letter — open, write, close immediately
        conn   = get_conn()
        cursor = conn.cursor()
        try:
            for f in fighters:
                if detail and f.get('detail_url'):
                    detail_stats = scrape_fighter_detail(f['detail_url'])
                    f.update(detail_stats)
                upsert_fighter(cursor, f)
                total += 1
            conn.commit()
        except Exception as e:
            print(f"[FighterScraper] Write error on letter {letter}: {e}")
            conn.rollback()
        finally:
            conn.close()   # always release the lock

    print(f"[FighterScraper] Done. Upserted {total} fighters.")
    return total


# ── helpers ──────────────────────────────────────────────────────────────────

def parse_height(raw):
    try:
        raw = raw.replace('"', '').strip()
        if "'" in raw:
            parts  = raw.split("'")
            feet   = int(parts[0].strip())
            inches = int(parts[1].strip()) if parts[1].strip() else 0
            return round((feet * 30.48) + (inches * 2.54), 1)
        return float(raw)
    except Exception:
        return None


def parse_reach(raw):
    try:
        raw = raw.replace('"', '').strip()
        return round(float(raw) * 2.54, 1)
    except Exception:
        return None


def safe_int(val):
    try:
        return int(val)
    except Exception:
        return 0


def safe_float(val):
    try:
        return float(str(val).replace('%', '').strip())
    except Exception:
        return 0.0


def compute_age(dob_str):
    try:
        dob   = datetime.strptime(dob_str.strip(), '%b %d, %Y')
        today = datetime.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None


WEIGHT_MAP = {
    'straw':       'Strawweight',
    'fly':         'Flyweight',
    'bantam':      'Bantamweight',
    'feather':     'Featherweight',
    'light':       'Lightweight',
    'welter':      'Welterweight',
    'middle':      'Middleweight',
    'light heavy': 'Light Heavyweight',
    'heavy':       'Heavyweight',
}


def map_weight_class(raw):
    if not raw:
        return 'Lightweight'
    raw_lower = raw.lower()
    for key, val in WEIGHT_MAP.items():
        if key in raw_lower:
            return val
    return 'Lightweight'
