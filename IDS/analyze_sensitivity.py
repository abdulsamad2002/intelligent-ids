import os
import joblib
import pandas as pd
import numpy as np
import pickle

# Set Keras backend
os.environ['KERAS_BACKEND'] = 'torch'
import keras

def analyze_false_positives():
    model_path = 'Anomaly Detection Model/anomaly_detector_model.keras'
    scaler_path = 'Anomaly Detection Model/data_scaler.pkl'
    threshold_path = 'Anomaly Detection Model/anomaly_threshold.pkl'
    features_csv = 'output/ml_features.csv'

    if not os.path.exists(features_csv):
        print("[-] No features CSV found to analyze.")
        return

    try:
        model = keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)
        with open(threshold_path, 'rb') as f:
            current_threshold = pickle.load(f)
        
        # Read last 10 flows
        df = pd.read_csv(features_csv)
        if len(df) < 5:
            print("[-] Not enough data in CSV yet.")
            return
            
        # The last column is 'Label', remove it for calculation
        data = df.iloc[-10:, :-1].values
        
        # Scale and Predict
        scaled = scaler.transform(data)
        reconstructed = model.predict(scaled, verbose=0)
        mse_scores = np.mean(np.power(scaled - reconstructed, 2), axis=1)
        
        print(f"\n--- Sensitivity Analysis ---")
        print(f"Current Threshold: {current_threshold:.8f}")
        print(f"Last 10 Flow MSE Scores:")
        for i, mse in enumerate(mse_scores):
            status = "ANOMALY" if mse > current_threshold else "BENIGN"
            print(f"  Flow {i+1}: {mse:.8f} -> {status}")
            
        suggested = np.max(mse_scores) * 1.2
        print(f"\n[TIP] If all these were actually normal traffic, you should increase threshold to: {suggested:.8f}")

    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    analyze_false_positives()
