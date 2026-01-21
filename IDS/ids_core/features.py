"""
Feature extraction logic.
"""
import numpy as np
from .utils import safe_divide

def calc_stats(values):
    if not values:
        return {'max': 0, 'min': 0, 'mean': 0, 'std': 0, 'total': 0}
    arr = np.array(values, dtype=float)
    arr = arr[np.isfinite(arr)]
    if len(arr) == 0:
        return {'max': 0, 'min': 0, 'mean': 0, 'std': 0, 'total': 0}
    return {
        'max': float(np.max(arr)), 'min': float(np.min(arr)),
        'mean': float(np.mean(arr)),
        'std': float(np.std(arr)) if len(arr) > 1 else 0.0,
        'total': float(np.sum(arr))
    }

def extract_features(f):
    """Extract features in EXACT order"""
    try:
        dur = max(f['last_time'] - f['start_time'], 0.000001)
        tot_pkt = f['fwd_packets'] + f['bwd_packets']
        tot_bytes = f['fwd_bytes'] + f['bwd_bytes']
        
        fwd_pkt_stats = calc_stats(f['fwd_packet_lengths'])
        bwd_pkt_stats = calc_stats(f['bwd_packet_lengths'])
        pkt_stats = calc_stats(f['all_packet_lengths'])
        flow_iat_stats = calc_stats(f['flow_iat'])
        fwd_iat_stats = calc_stats(f['fwd_iat'])
        bwd_iat_stats = calc_stats(f['bwd_iat'])
        active_stats = calc_stats(f['active_times'])
        idle_stats = calc_stats(f['idle_times'])
        
        features = {
            "Destination Port": int(f['dst_port']),
            "Flow Duration": dur * 1e6,
            "Total Fwd Packets": int(f['fwd_packets']),
            "Total Backward Packets": int(f['bwd_packets']),
            "Total Length of Fwd Packets": int(f['fwd_bytes']),
            "Total Length of Bwd Packets": int(f['bwd_bytes']),
            "Fwd Packet Length Max": fwd_pkt_stats['max'],
            "Fwd Packet Length Min": fwd_pkt_stats['min'],
            "Fwd Packet Length Mean": fwd_pkt_stats['mean'],
            "Fwd Packet Length Std": fwd_pkt_stats['std'],
            "Bwd Packet Length Max": bwd_pkt_stats['max'],
            "Bwd Packet Length Min": bwd_pkt_stats['min'],
            "Bwd Packet Length Mean": bwd_pkt_stats['mean'],
            "Bwd Packet Length Std": bwd_pkt_stats['std'],
            "Flow Bytes/s": safe_divide(tot_bytes, dur),
            "Flow Packets/s": safe_divide(tot_pkt, dur),
            "Flow IAT Mean": flow_iat_stats['mean'] * 1e6,
            "Flow IAT Std": flow_iat_stats['std'] * 1e6,
            "Flow IAT Max": flow_iat_stats['max'] * 1e6,
            "Flow IAT Min": flow_iat_stats['min'] * 1e6,
            "Fwd IAT Total": fwd_iat_stats['total'] * 1e6,
            "Fwd IAT Mean": fwd_iat_stats['mean'] * 1e6,
            "Fwd IAT Std": fwd_iat_stats['std'] * 1e6,
            "Fwd IAT Max": fwd_iat_stats['max'] * 1e6,
            "Fwd IAT Min": fwd_iat_stats['min'] * 1e6,
            "Bwd IAT Total": bwd_iat_stats['total'] * 1e6,
            "Bwd IAT Mean": bwd_iat_stats['mean'] * 1e6,
            "Bwd IAT Std": bwd_iat_stats['std'] * 1e6,
            "Bwd IAT Max": bwd_iat_stats['max'] * 1e6,
            "Bwd IAT Min": bwd_iat_stats['min'] * 1e6,
            "Fwd PSH Flags": int(f['fwd_psh_flags']),
            "Bwd PSH Flags": int(f['bwd_psh_flags']),
            "Fwd URG Flags": int(f['fwd_urg_flags']),
            "Bwd URG Flags": int(f['bwd_urg_flags']),
            "Fwd Header Length": int(f['fwd_header_bytes']),
            "Bwd Header Length": int(f['bwd_header_bytes']),
            "Fwd Packets/s": safe_divide(f['fwd_packets'], dur),
            "Bwd Packets/s": safe_divide(f['bwd_packets'], dur),
            "Min Packet Length": pkt_stats['min'],
            "Max Packet Length": pkt_stats['max'],
            "Packet Length Mean": pkt_stats['mean'],
            "Packet Length Std": pkt_stats['std'],
            "Packet Length Variance": pkt_stats['std'] ** 2,
            "FIN Flag Count": int(f['fin_count']),
            "SYN Flag Count": int(f['syn_count']),
            "RST Flag Count": int(f['rst_count']),
            "PSH Flag Count": int(f['psh_count']),
            "ACK Flag Count": int(f['ack_count']),
            "URG Flag Count": int(f['urg_count']),
            "CWE Flag Count": int(f['cwe_count']),
            "ECE Flag Count": int(f['ece_count']),
            "Down/Up Ratio": safe_divide(f['bwd_packets'], f['fwd_packets']),
            "Average Packet Size": safe_divide(tot_bytes, tot_pkt),
            "Avg Fwd Segment Size": safe_divide(f['fwd_bytes'], f['fwd_packets']),
            "Avg Bwd Segment Size": safe_divide(f['bwd_bytes'], f['bwd_packets']),
            "Fwd Header Length.1": int(f['fwd_header_bytes']),  # Renamed to avoid duplicate
            "Fwd Avg Bytes/Bulk": 0,
            "Fwd Avg Packets/Bulk": 0,
            "Fwd Avg Bulk Rate": 0,
            "Bwd Avg Bytes/Bulk": 0,
            "Bwd Avg Packets/Bulk": 0,
            "Bwd Avg Bulk Rate": 0,
            "Subflow Fwd Packets": int(f['fwd_packets']),
            "Subflow Fwd Bytes": int(f['fwd_bytes']),
            "Subflow Bwd Packets": int(f['bwd_packets']),
            "Subflow Bwd Bytes": int(f['bwd_bytes']),
            "Init_Win_bytes_forward": int(f['init_win_bytes_fwd']),
            "Init_Win_bytes_backward": int(f['init_win_bytes_bwd']),
            "act_data_pkt_fwd": int(max(0, f['fwd_packets'] - f['syn_count'] - f['fin_count'])),
            "min_seg_size_forward": fwd_pkt_stats['min'] if fwd_pkt_stats['min'] > 0 else 20,
            "Active Mean": active_stats['mean'] * 1e6,
            "Active Std": active_stats['std'] * 1e6,
            "Active Max": active_stats['max'] * 1e6,
            "Active Min": active_stats['min'] * 1e6,
            "Idle Mean": idle_stats['mean'] * 1e6,
            "Idle Std": idle_stats['std'] * 1e6,
            "Idle Max": idle_stats['max'] * 1e6,
            "Idle Min": idle_stats['min'] * 1e6
        }
        return features
    except Exception as e:
        print(f"[!] Feature extraction error: {e}")
        return None
