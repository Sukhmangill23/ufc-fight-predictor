from app import create_app
from flask_cors import CORS
from database.init_db import init_database

app = create_app()
CORS(app)

# Run DB init on every startup — creates tables if missing, deduplicates fighters
init_database()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
