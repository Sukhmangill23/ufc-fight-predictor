import os
import sqlite3
import logging
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token

bcrypt = Bcrypt()
logger = logging.getLogger(__name__)


def get_db_path():
    # Go up 3 levels from services directory to reach project root
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, 'database', 'ufc.db')

    # Ensure the database directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    # Create the file if it doesn't exist
    if not os.path.exists(db_path):
        open(db_path, 'a').close()

    # Set permissions to be readable and writable
    os.chmod(db_path, 0o666)

    logger.debug(f"Database path: {db_path}")
    logger.debug(f"Path exists: {os.path.exists(db_path)}")
    logger.debug(f"Permissions: {oct(os.stat(db_path).st_mode)[-3:]}")

    return db_path


def register_user(username, password):
    try:
        db_path = get_db_path()

        # Check if we can access the database
        if not os.access(db_path, os.R_OK | os.W_OK):
            logger.error(f"Insufficient permissions for database file: {db_path}")
            return {"error": "Database file access denied"}, 500

        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()

            # Create users table if it doesn't exist
            cursor.execute('''
                           CREATE TABLE IF NOT EXISTS users
                           (
                               id
                               INTEGER
                               PRIMARY
                               KEY
                               AUTOINCREMENT,
                               username
                               TEXT
                               UNIQUE
                               NOT
                               NULL,
                               password
                               TEXT
                               NOT
                               NULL,
                               created_at
                               DATETIME
                               DEFAULT
                               CURRENT_TIMESTAMP
                           )
                           ''')

            # Check if username exists
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return {"error": "Username already exists"}, 400

            # Hash password
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

            # Insert new user
            cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                           (username, hashed_password))
            conn.commit()

            # NEW: Automatically log in the user after registration
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

        # Check if we can access the database
        if not os.access(db_path, os.R_OK):
            logger.error(f"Insufficient read permissions for database file: {db_path}")
            return {"error": "Database file access denied"}, 500

        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, password FROM users WHERE username = ?", (username,))
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
