import os
import joblib
import pandas as pd
import numpy as np
import pickle

# Set Keras backend
os.environ['KERAS_BACKEND'] = 'torch'
import keras

def deep_sensitivity_check():
    model_path = 'Anomaly Detection Model/anomaly_detector_model.keras'
    scaler_path = 'Anomaly Detection Model/data_scaler.pkl'
    features_csv = 'output/ml_features.csv'

    if not os.path.exists(features_csv):
        print("[-] No features CSV found.")
        return

    try:
        model = keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)
        
        # Read the whole file
        df = pd.read_csv(features_csv)
        if len(df) < 10:
            print("[-] Not enough data.")
            return
            
        data = df.iloc[:, :-1].values
        labels = df.iloc[:, -1].values
        
        # Scale and Predict
        scaled = scaler.transform(data)
        reconstructed = model.predict(scaled, verbose=0)
        mse_scores = np.mean(np.power(scaled - reconstructed, 2), axis=1)
        
        df['MSE'] = mse_scores
        
        # Analyze Benign vs Anomaly MSE
        print("\n--- Deep MSE Analysis ---")
        
        # Get statistics for things that SHOULD be benign vs malicious
        # Actually, let's just look at the highest scores in the whole file
        print("\nTop 10 Highest MSE Scores (Potential Attacks):")
        top_10 = df.sort_values('MSE', ascending=False).head(10)
        for idx, row in top_10.iterrows():
            print(f"  MSE: {row['MSE']:.6f} | Label: {row['Label']}")

        print("\nTypical 'Normal' MSE Scores (Bottom 10):")
        bottom_10 = df.sort_values('MSE', ascending=True).head(10)
        for idx, row in bottom_10.iterrows():
            print(f"  MSE: {row['MSE']:.6f} | Label: {row['Label']}")
            
        # Recommend a threshold
        # We want to be above the "False Positive" range but below the "Attack" range.
        if len(df) > 20:
             # Look at the last few flows specifically from the attack
             last_mse = mse_scores[-20:]
             print(f"\nRecent Flow MSE (Last 20):")
             print(f"  Max: {np.max(last_mse):.6f}")
             print(f"  Mean: {np.mean(last_mse):.6f}")

    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    deep_sensitivity_check()
