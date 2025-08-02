from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    # Allow all origins for development
    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    # Register blueprints
    from .routes import main
    app.register_blueprint(main)

    return app
