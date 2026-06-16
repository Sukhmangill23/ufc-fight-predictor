import requests
from bs4 import BeautifulSoup
from datetime import datetime
from app.db import get_conn

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}


def scrape_upcoming_events():
    """Scrape upcoming UFC events from ufcstats.com"""
    url = "http://www.ufcstats.com/statistics/events/upcoming"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')

        events = []
        rows = soup.select('tr.b-statistics__table-row')

        for row in rows:
            name_tag = row.select_one('td.b-statistics__table-col a')
            date_tag = row.select_one('span.b-statistics__date')
            location_tag = row.select_one('td.b-statistics__table-col_style_big-top-padding')

            if not name_tag:
                continue

            event_url = name_tag.get('href', '')
            events.append({
                'name': name_tag.text.strip(),
                'date': date_tag.text.strip() if date_tag else '',
                'location': location_tag.text.strip() if location_tag else '',
                'event_url': event_url
            })

        return events
    except Exception as e:
        print(f"Error scraping events: {e}")
        return []


def scrape_event_fights(event_url):
    """Scrape individual fights from a UFC event page"""
    try:
        resp = requests.get(event_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')

        fights = []
        rows = soup.select('tr.b-fight-details__table-row.b-fight-details__table-row__hover')

        for row in rows:
            cols = row.select('td.b-fight-details__table-col')
            if len(cols) < 7:
                continue

            fighter_links = cols[1].select('p.b-fight-details__table-text a')
            if len(fighter_links) < 2:
                continue

            red_fighter = fighter_links[0].text.strip()
            blue_fighter = fighter_links[1].text.strip()

            weight_class_p = cols[6].select_one('p.b-fight-details__table-text')
            weight_class = weight_class_p.text.strip() if weight_class_p else 'Unknown'

            fights.append({
                'red_fighter': red_fighter,
                'blue_fighter': blue_fighter,
                'weight_class': weight_class
            })

        return fights
    except Exception as e:
        print(f"Error scraping event fights: {e}")
        return []


def save_upcoming_events(events):
    """Save scraped events and their fights to DB"""
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM upcoming_events")

    today = datetime.now().date()

    for event in events:
        try:
            event_date = datetime.strptime(event['date'], '%B %d, %Y').date()
            if event_date < today:
                print(f"[Scraper] Skipping past event: {event['name']} ({event['date']})")
                continue
        except ValueError:
            print(f"[Scraper] Could not parse date for {event['name']}: {event['date']}, including anyway")

        fights = scrape_event_fights(event['event_url']) if event['event_url'] else []

        for fight in fights:
            cursor.execute("""
                INSERT INTO upcoming_events 
                    (event_name, event_date, location, red_fighter, blue_fighter, weight_class)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                event['name'],
                event['date'],
                event['location'],
                fight['red_fighter'],
                fight['blue_fighter'],
                fight['weight_class']
            ))

        if not fights:
            cursor.execute("""
                INSERT INTO upcoming_events 
                    (event_name, event_date, location, red_fighter, blue_fighter, weight_class)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (event['name'], event['date'], event['location'], '', '', ''))

    conn.commit()
    cursor.close()
    conn.close()
    print(f"[Scraper] Saved {len(events)} events to DB at {datetime.now()}")


def run_scraper():
    """Main entry point — called by scheduler or manually"""
    print("[Scraper] Starting UFC event scrape...")
    events = scrape_upcoming_events()
    if events:
        save_upcoming_events(events)
        print(f"[Scraper] Done. Found {len(events)} upcoming events.")
    else:
        print("[Scraper] No events found or scrape failed.")
