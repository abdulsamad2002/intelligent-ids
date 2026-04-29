import pandas as pd
import numpy as np
import joblib
import pickle
import os
import sys

# Ensure we can import from ids_core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set Keras backend to torch
os.environ['KERAS_BACKEND'] = 'torch'
import keras
from keras import layers, models

def train_on_local_data():
    data_path = 'output/modern_benign.csv'
    if not os.path.exists(data_path):
        print(f"[-] No dataset found at {data_path}. Capture more data first using capture_dataset.py!")
        return

    print(f"\n{'='*60}")
    print(f" 🧠 RETRAINING ANOMALY DETECTOR ON LOCAL TRAFFIC")
    print(f"{'='*60}")
    
    print(f"[*] Loading local dataset: {data_path}")
    df = pd.read_csv(data_path)
    
    # 1. Clean Data
    from ids_core.config import FEATURE_COLUMNS_ORDERED
    
    # Ensure all required columns exist
    missing = [c for c in FEATURE_COLUMNS_ORDERED if c not in df.columns]
    if missing:
        print(f"[-] Error: Dataset missing columns: {missing}")
        return

    X = df[FEATURE_COLUMNS_ORDERED]
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

    # 2. Scale Data
    print("[*] Normalizing features...")
    scaler = joblib.load('Anomaly Detection Model/data_scaler.pkl') # Use existing scaler type
    X_scaled = scaler.fit_transform(X)
    
    # 3. Build Autoencoder Architecture (Matching original)
    input_dim = X_scaled.shape[1]
    model = models.Sequential([
        layers.Dense(64, activation='relu', input_shape=(input_dim,)),
        layers.Dense(32, activation='relu'),
        layers.Dense(16, activation='relu'), # Bottleneck layer
        layers.Dense(32, activation='relu'),
        layers.Dense(64, activation='relu'),
        layers.Dense(input_dim, activation='sigmoid')
    ])
    
    model.compile(optimizer='adam', loss='mse')
    
    # 4. Train
    epochs = 50
    print(f"[*] Training for {epochs} epochs on {len(X_scaled)} flows...")
    model.fit(X_scaled, X_scaled, epochs=epochs, batch_size=32, validation_split=0.1, verbose=1)
    
    # 5. Calculate New Threshold (99.5th percentile of reconstruction error)
    print("[*] Calibrating anomaly threshold...")
    reconstructions = model.predict(X_scaled, verbose=0)
    mse = np.mean(np.power(X_scaled - reconstructions, 2), axis=1)
    new_threshold = np.percentile(mse, 99.5) 
    
    # 6. Save Everything
    print(f"[*] Saving results...")
    
    # Backup old models first
    if not os.path.exists('Anomaly Detection Model/Old Models'):
        os.makedirs('Anomaly Detection Model/Old Models')
    
    # Simple backup
    timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M')
    os.rename('Anomaly Detection Model/anomaly_detector_model.keras', f'Anomaly Detection Model/Old Models/model_{timestamp}.keras')
    
    model.save('Anomaly Detection Model/anomaly_detector_model.keras')
    joblib.dump(scaler, 'Anomaly Detection Model/data_scaler.pkl')
    with open('Anomaly Detection Model/anomaly_threshold.pkl', 'wb') as f:
        pickle.dump(new_threshold, f)
        
    print(f"\n[SUCCESS] Model retrained and deployed locally!")
    print(f"    - New Threshold: {new_threshold:.8f}")
    print(f"    - Dataset used: {len(X_scaled)} samples")
    print(f"\n[!] Please restart your IDS (ids.py) to use the new model.\n")

if __name__ == "__main__":
    train_on_local_data()
