import os
import sqlite3
import logging
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token

bcrypt = Bcrypt()
logger = logging.getLogger(__name__)


def get_db_path():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, 'database', 'ufc.db')
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    if not os.path.exists(db_path):
        open(db_path, 'a').close()
    os.chmod(db_path, 0o666)
    return db_path


def register_user(username, password):
    try:
        db_path = get_db_path()
        with sqlite3.connect(db_path, timeout=30) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return {"error": "Username already exists"}, 400

            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            cursor.execute(
                "INSERT INTO users (username, password) VALUES (?, ?)",
                (username, hashed_password)
            )
            conn.commit()

            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            user_id = cursor.fetchone()[0]
            access_token = create_access_token(identity=user_id)

            return {
                "message": "User created and logged in successfully",
                "access_token": access_token
            }, 201

    except sqlite3.Error as e:
        logger.error(f"SQLite error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}, 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": f"Server error: {str(e)}"}, 500


def authenticate_user(username, password):
    try:
        db_path = get_db_path()
        with sqlite3.connect(db_path, timeout=30) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, password FROM users WHERE username = ?", (username,)
            )
            user = cursor.fetchone()

            if not user:
                return {"error": "Invalid credentials"}, 401

            user_id, hashed_password = user

            if bcrypt.check_password_hash(hashed_password, password):
                access_token = create_access_token(identity=user_id)
                return {"access_token": access_token}, 200

            return {"error": "Invalid credentials"}, 401

    except sqlite3.Error as e:
        logger.error(f"SQLite error: {str(e)}")
        return {"error": f"Database error: {str(e)}"}, 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": f"Server error: {str(e)}"}, 500
