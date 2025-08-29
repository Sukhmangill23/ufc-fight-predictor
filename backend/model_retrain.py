from ml.model_pipeline import load_data, preprocess_data, build_pipeline
from sklearn.model_selection import TimeSeriesSplit
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score


def temporal_cross_validation():
    df = load_data()
    df = preprocess_data(df)

    if 'Date' in df:
        df['Date'] = pd.to_datetime(df['Date'])
        df = df.sort_values('Date')
    else:
        print("Warning: Date column not found. Using default order.")

    X = df.drop(columns=['Target'])
    y = df['Target']

    tscv = TimeSeriesSplit(n_splits=5)
    accuracies = []

    for train_index, test_index in tscv.split(X):
        X_train, X_test = X.iloc[train_index], X.iloc[test_index]
        y_train, y_test = y.iloc[train_index], y.iloc[test_index]

        pipeline = build_pipeline()
        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        accuracies.append(accuracy)
        print(f"Fold accuracy: {accuracy:.4f}")

    mean_acc = np.mean(accuracies)
    std_acc = np.std(accuracies)
    print(f"\nTemporal CV Accuracy: {mean_acc:.4f} ± {std_acc:.4f}")


if __name__ == "__main__":
    temporal_cross_validation()
