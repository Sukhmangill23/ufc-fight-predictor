from app.db import get_conn


def get_top_performers():
    """Pull real top performer stats from fighters table"""
    conn = get_conn()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT name, avg_sig_str, avg_td_pct, avg_sub_att, total_fights, ko_wins
            FROM fighters
            WHERE total_fights > 5
            ORDER BY avg_sig_str DESC
            LIMIT 10
        """)
        rows = cursor.fetchall()
        top_fighters = []
        for row in rows:
            name, sig_str, td_pct, sub_att, total, ko = row
            top_fighters.append({
                'name':               name,
                'striking_accuracy':  round(sig_str or 0, 1),
                'takedown_accuracy':  round((td_pct or 0) * 100, 1),
                'stamina':            min(round((total or 0) * 4, 1), 100),
                'knockout_power':     round((ko or 0) / (total or 1) * 100, 1),
                'defense':            round(100 - (sig_str or 50), 1)
            })

        cursor.execute("""
            SELECT name, ko_wins FROM fighters
            WHERE ko_wins IS NOT NULL
            ORDER BY ko_wins DESC LIMIT 5
        """)
        most_knockouts = [{'name': r[0], 'knockouts': r[1]} for r in cursor.fetchall()]

        cursor.execute("""
            SELECT name, win_streak FROM fighters
            WHERE win_streak IS NOT NULL
            ORDER BY win_streak DESC LIMIT 5
        """)
        longest_win_streak = [{'name': r[0], 'streak': r[1]} for r in cursor.fetchall()]

        cursor.execute("""
            SELECT name, avg_sig_str FROM fighters
            WHERE avg_sig_str IS NOT NULL AND total_fights > 5
            ORDER BY avg_sig_str DESC LIMIT 5
        """)
        highest_accuracy = [{'name': r[0], 'accuracy': round(r[1], 1)} for r in cursor.fetchall()]

        return {
            'top_fighters':       top_fighters,
            'most_knockouts':     most_knockouts,
            'longest_win_streak': longest_win_streak,
            'highest_accuracy':   highest_accuracy
        }
    finally:
        cursor.close()
        conn.close()
