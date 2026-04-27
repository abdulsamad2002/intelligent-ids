import pickle
import os

threshold_path = 'Anomaly Detection Model/anomaly_threshold.pkl'
new_threshold = 0.3

with open(threshold_path, 'wb') as f:
    pickle.dump(new_threshold, f)

print(f"Successfully updated threshold to {new_threshold}")
