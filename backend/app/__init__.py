from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os


def create_app():
    app = Flask(__name__)

    # JWT config
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    if not app.config['JWT_SECRET_KEY']:
        raise RuntimeError("JWT_SECRET_KEY environment variable is not set")
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000",
                        os.environ.get('FRONTEND_URL', '')],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    from .routes import main
    app.register_blueprint(main)

    @app.after_request
    def add_cors_headers(response):
        origin = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        return response

    jwt = JWTManager(app)
    return app
