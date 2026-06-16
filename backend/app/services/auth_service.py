import logging
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from app.db import get_conn

bcrypt = Bcrypt()
logger = logging.getLogger(__name__)


def register_user(username, password):
    try:
        conn = get_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return {"error": "Username already exists"}, 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        cursor.execute(
            "INSERT INTO users (username, password) VALUES (%s, %s) RETURNING id",
            (username, hashed_password)
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        access_token = create_access_token(identity=user_id)

        return {
            "message": "User created and logged in successfully",
            "access_token": access_token
        }, 201

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": f"Server error: {str(e)}"}, 500


def authenticate_user(username, password):
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, password FROM users WHERE username = %s", (username,)
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return {"error": "Invalid credentials"}, 401

        user_id, hashed_password = user

        if bcrypt.check_password_hash(hashed_password, password):
            access_token = create_access_token(identity=user_id)
            return {"access_token": access_token}, 200

        return {"error": "Invalid credentials"}, 401

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": f"Server error: {str(e)}"}, 500
