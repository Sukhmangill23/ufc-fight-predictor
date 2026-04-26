from apscheduler.schedulers.background import BackgroundScheduler
from app.services.scraper import run_scraper
import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'database', 'ufc.db')


def _needs_refresh():
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        row  = conn.execute("SELECT MAX(scraped_at) FROM upcoming_events").fetchone()
        conn.close()
        if not row or not row[0]:
            return True
        last_scraped = datetime.fromisoformat(row[0])
        age = datetime.now() - last_scraped
        return age > timedelta(hours=24)
    except Exception as e:
        print(f"[Scheduler] _needs_refresh error: {e}")
        return True


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=run_scraper,
        trigger='cron',
        day_of_week='mon',
        hour=6,
        minute=0,
        id='ufc_scraper',
        replace_existing=True
    )
    scheduler.start()
    print("[Scheduler] UFC scraper scheduled — runs every Monday at 6am")

    # In Flask debug mode the process starts twice:
    #   1st pass: WERKZEUG_RUN_MAIN is not set (the parent/watcher process)
    #   2nd pass: WERKZEUG_RUN_MAIN = 'true' (the actual reloader that serves requests)
    # Only run the scrape on the 2nd pass so it happens exactly once
    is_reloader = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'

    if is_reloader and _needs_refresh():
        print("[Scheduler] Data stale or missing — running initial scrape...")
        run_scraper()
    elif is_reloader:
        print("[Scheduler] Upcoming events data is fresh — skipping startup scrape")

    return scheduler
