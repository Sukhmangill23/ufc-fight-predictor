# main.py
from ufc_predictor.model_pipeline import train_model
from model_retrain import temporal_cross_validation
from database import init_db

if __name__ == "__main__":
    init_db.init_database()  # Initialize database
    init_db.import_csv_data()
    print("Training UFC prediction model...")

    print("\n=== Running Temporal Validation ===")
    temporal_cross_validation()

    print("\n=== Training Final Model ===")
    train_model()

    print("Training complete!")
