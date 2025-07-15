# main.py
from ufc_predictor.model_pipeline import train_model
from model_retrain import temporal_cross_validation

if __name__ == "__main__":
    print("Training UFC prediction model...")

    print("\n=== Running Temporal Validation ===")
    temporal_cross_validation()

    print("\n=== Training Final Model ===")
    train_model()

    print("Training complete!")
