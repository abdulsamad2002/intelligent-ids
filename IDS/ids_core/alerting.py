"""
Alerting, stats calculation, and file saving logic.
"""
import os
import json
from datetime import datetime
from .utils import protocol_name

def calculate_severity(result):
    """Calculate severity score 0-10 based on attack type and confidence"""
    if not result['is_malicious']:
        return 0.0
    
    confidence = result['confidence']
    attack_type = result['prediction']
    
    # Base severity by attack type
    severity_map = {
        'DDoS': 9.0,
        'DoS': 8.5,
        'Infiltration': 9.5,
        'Botnet': 9.0,
        'Web Attack': 7.0,
        'Brute Force': 7.5,
        'PortScan': 5.0,
        'Port Scan': 5.0,
        'Bot': 6.0,
        'FTP-Patator': 7.0,
        'SSH-Patator': 7.5,
        'Heartbleed': 9.0
    }
    
    base_severity = severity_map.get(attack_type, 6.0)
    
    # Adjust by confidence (high confidence = higher severity)
    final_severity = base_severity * confidence
    
    return round(final_severity, 1)

def get_recommended_action(result):
    """Get recommended action based on severity"""
    severity = calculate_severity(result)
    
    if severity >= 8.0:
        return 'block'
    elif severity >= 6.0:
        return 'monitor'
    elif severity >= 3.0:
        return 'log'
    else:
        return 'ignore'

def create_enhanced_alert(flow, result, features, geo_data):
    """Create streamlined alert object for backend (no bloat)"""
    duration = flow['last_time'] - flow['start_time']
    total_packets = flow['fwd_packets'] + flow['bwd_packets']
    total_bytes = flow['fwd_bytes'] + flow['bwd_bytes']
    
    severity = calculate_severity(result)
    action = get_recommended_action(result)
    
    return {
        # Identifiers
        'flow_id': flow['flow_id'],
        'timestamp': datetime.fromtimestamp(flow['start_time']).isoformat(),
        
        # Classification
        'prediction': result['prediction'],
        'attack_type': result['prediction'],
        'confidence': result['confidence'],
        'is_malicious': result['is_malicious'],
        'severity_score': severity,
        'recommended_action': action,
        
        # Probabilities (top 5 only to reduce size)
        'class_probabilities': dict(sorted(
            result['probabilities'].items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]),
        
        # Source Information
        'src_ip': flow['src_ip'],
        'src_port': flow['src_port'],
        'src_country': geo_data['country_code'],
        'src_country_name': geo_data['country_name'],
        'src_city': geo_data['city'],
        'src_latitude': geo_data['latitude'],
        'src_longitude': geo_data['longitude'],
        
        # Destination Information
        'dst_ip': flow['dst_ip'],
        'dst_port': flow['dst_port'],
        
        # Protocol
        'protocol': protocol_name(flow['protocol']),
        'protocol_number': flow['protocol'],
        
        # Flow Statistics
        'duration': round(duration, 3),
        'total_packets': total_packets,
        'total_bytes': total_bytes,
        'fwd_packets': flow['fwd_packets'],
        'bwd_packets': flow['bwd_packets'],
        'fwd_bytes': flow['fwd_bytes'],
        'bwd_bytes': flow['bwd_bytes'],
        
        # Timing
        'flow_start_time': datetime.fromtimestamp(flow['start_time']).isoformat(),
        'flow_end_time': datetime.fromtimestamp(flow['last_time']).isoformat(),
        
        # Key Performance Indicators (only important ones)
        'flow_bytes_per_sec': round(features.get('Flow Bytes/s', 0), 2),
        'flow_packets_per_sec': round(features.get('Flow Packets/s', 0), 2),
        'flow_iat_mean': round(features.get('Flow IAT Mean', 0), 2),
        
        # TCP Flags (condensed)
        'tcp_flags': {
            'syn': flow['syn_count'],
            'fin': flow['fin_count'],
            'rst': flow['rst_count'],
            'psh': flow['psh_count'],
            'ack': flow['ack_count']
        },
        
        # Metadata
        'processing_time_ms': result.get('processing_time_ms', 0),
        'features_used': features.get('features_used', 0) # Placeholder if needed
    }

def create_csv_record(flow, result, features, geo_data):
    """Create CSV record with enhanced columns (no ISP)"""
    duration = flow['last_time'] - flow['start_time']
    total_packets = flow['fwd_packets'] + flow['bwd_packets']
    total_bytes = flow['fwd_bytes'] + flow['bwd_bytes']
    
    return {
        'Timestamp': datetime.fromtimestamp(flow['start_time']).strftime('%Y-%m-%d %H:%M:%S'),
        'Flow_ID': flow['flow_id'],
        'Prediction': result['prediction'],
        'Confidence': f"{result['confidence']:.4f}",
        'Is_Malicious': result['is_malicious'],
        'Severity_Score': calculate_severity(result),
        'Recommended_Action': get_recommended_action(result),
        'Src_IP': flow['src_ip'],
        'Src_Port': flow['src_port'],
        'Src_Country': geo_data['country_code'],
        'Src_Country_Name': geo_data['country_name'],
        'Src_City': geo_data['city'],
        'Src_Latitude': geo_data['latitude'],
        'Src_Longitude': geo_data['longitude'],
        'Dst_IP': flow['dst_ip'],
        'Dst_Port': flow['dst_port'],
        'Protocol': protocol_name(flow['protocol']),
        'Protocol_Number': flow['protocol'],
        'Duration': duration,
        'Total_Packets': total_packets,
        'Total_Bytes': total_bytes,
        'Fwd_Packets': flow['fwd_packets'],
        'Bwd_Packets': flow['bwd_packets'],
        'Flow_Bytes_Per_Sec': features.get('Flow Bytes/s', 0),
        'Flow_Packets_Per_Sec': features.get('Flow Packets/s', 0)
    }

from .backend import send_log_to_backend

def log_message(backend_url, message, level='info'):
    """Print to console and send to backend"""
    print(message)
    if backend_url:
        send_log_to_backend(backend_url, message, level)

def print_alert(alert, backend_sent=False, backend_url=None):
    """Print colored alert to console and send to backend logs"""
    backend_status = "✓ Sent to backend" if backend_sent else "✗ Backend offline (saved to file)"
    
    lines = [
        f"\n{'='*70}",
        f"  ⚠️  MALICIOUS TRAFFIC DETECTED",
        f"{'='*70}",
        f"Attack Type: {alert['attack_type']}",
        f"Confidence: {alert['confidence']:.1%} | Severity: {alert['severity_score']}/10",
        f"Action: {alert['recommended_action'].upper()}",
        f"Source: {alert['src_ip']}:{alert['src_port']} ({alert['src_city']}, {alert['src_country']})",
        f"Destination: {alert['dst_ip']}:{alert['dst_port']}",
        f"Protocol: {alert['protocol']} | Packets: {alert['total_packets']:,} | Bytes: {alert['total_bytes']:,}",
        f"Backend: {backend_status}",
        f"Top Probabilities:"
    ]
    
    sorted_probs = sorted(alert['class_probabilities'].items(), key=lambda x: x[1], reverse=True)[:3]
    for attack, prob in sorted_probs:
        lines.append(f"  - {attack}: {prob:.1%}")
    lines.append(f"{'='*70}\n")
    
    full_message = "\n".join(lines)
    print(full_message)
    
    if backend_url:
        send_log_to_backend(backend_url, full_message, 'warning')

def save_to_json(alerts, json_output_path):
    """Append malicious flows to JSON file"""
    try:
        if os.path.exists(json_output_path):
            with open(json_output_path, 'r') as f:
                try:
                    existing = json.load(f)
                except:
                    existing = []
        else:
            existing = []
        
        existing.extend(alerts)
        
        with open(json_output_path, 'w') as f:
            json.dump(existing, f, indent=2)
            
    except Exception as e:
        print(f"[!] Error saving JSON: {e}")
