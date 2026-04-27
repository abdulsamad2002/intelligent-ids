import os
os.environ["KERAS_BACKEND"] = "torch"

import joblib
import numpy as np
import pickle

# Try to load Keras if possible, but focus on Scaler
try:
    import keras
    HAS_KERAS = True
except ImportError:
    HAS_KERAS = False

scaler_path = r'c:\Caraxes\Github Repositories\intelligent-ids\IDS\Anomaly Detection Model\data_scaler.pkl'
model_path = r'c:\Caraxes\Github Repositories\intelligent-ids\IDS\Anomaly Detection Model\anomaly_detector_model.keras'

print(f"--- Inspection Results ---")

# 1. Inspect Scaler (Most important for feature names)
if os.path.exists(scaler_path):
    try:
        scaler = joblib.load(scaler_path)
        print(f"Scaler Type: {type(scaler)}")
        
        # Check for feature names (Scikit-Learn 1.0+)
        if hasattr(scaler, 'feature_names_in_'):
            print(f"\n[!] SUCCESS: Features found in scaler ({len(scaler.feature_names_in_)}):")
            for i, name in enumerate(scaler.feature_names_in_):
                print(f"{i+1}. {name}")
        else:
            print("\n[-] No feature names found in scaler metadata.")
            
        # Check expected n_features_in_
        if hasattr(scaler, 'n_features_in_'):
            print(f"\nNumber of features expected by scaler: {scaler.n_features_in_}")
            
    except Exception as e:
        print(f"Error loading scaler: {e}")

# 2. Inspect Model Input Shape
if HAS_KERAS and os.path.exists(model_path):
    try:
        # We might need to handle the model loading without compiled metrics if torch is picky
        model = keras.models.load_model(model_path, compile=False)
        print(f"\nModel Input Shape: {model.input_shape}")
    except Exception as e:
        print(f"\nError loading model: {e}")

print(f"\n--- End of Inspection ---")
