import os
import sys
import pickle
import joblib
import numpy as np

# Set Keras backend to torch
os.environ['KERAS_BACKEND'] = 'torch'
import keras

def verify_model():
    model_path = 'Anomaly Detection Model/anomaly_detector_model.keras'
    scaler_path = 'Anomaly Detection Model/data_scaler.pkl'
    threshold_path = 'Anomaly Detection Model/anomaly_threshold.pkl'

    print(f"--- Model Verification ---")
    
    try:
        model = keras.models.load_model(model_path)
        print(f"[+] Model loaded successfully.")
        print(f"    - Input Shape: {model.input_shape}")
        
        # Check expected features
        expected_features = 77
        model_features = model.input_shape[1]
        
        if model_features == expected_features:
            print(f"    - [OK] Feature count matches expected: {expected_features}")
        else:
            print(f"    - [WARNING] Feature mismatch! Model expects {model_features}, but IDS provides {expected_features}")

    except Exception as e:
        print(f"[-] Error loading model: {e}")

    try:
        scaler = joblib.load(scaler_path)
        print(f"[+] Scaler loaded successfully.")
        if hasattr(scaler, 'n_features_in_'):
            print(f"    - Scaler Input Features: {scaler.n_features_in_}")
        elif hasattr(scaler, 'mean_'):
             print(f"    - Scaler Input Features: {len(scaler.mean_)}")
    except Exception as e:
        print(f"[-] Error loading scaler: {e}")

    try:
        with open(threshold_path, 'rb') as f:
            threshold = pickle.load(f)
        print(f"[+] Threshold loaded successfully: {threshold}")
    except Exception as e:
        print(f"[-] Error loading threshold: {e}")

if __name__ == "__main__":
    verify_model()
