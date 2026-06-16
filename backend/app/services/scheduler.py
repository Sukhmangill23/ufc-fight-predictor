from apscheduler.schedulers.background import BackgroundScheduler
from app.services.scraper import run_scraper
from app.db import get_conn
import os
from datetime import datetime, timedelta


def _needs_refresh():
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(scraped_at) FROM upcoming_events")
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row or not row[0]:
            return True

        last_scraped = row[0]
        if isinstance(last_scraped, str):
            last_scraped = datetime.fromisoformat(last_scraped)

        age = datetime.now() - last_scraped.replace(tzinfo=None)
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

    is_reloader = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'

    if is_reloader and _needs_refresh():
        print("[Scheduler] Data stale or missing — running initial scrape...")
        run_scraper()
    elif is_reloader:
        print("[Scheduler] Upcoming events data is fresh — skipping startup scrape")

    return scheduler
