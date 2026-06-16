import os
import psycopg2

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://ufcuser:ufcpassword@localhost:5434/ufcdb'
)


def get_conn():
    """Return a new Postgres connection. Caller is responsible for closing it."""
    return psycopg2.connect(DATABASE_URL)
