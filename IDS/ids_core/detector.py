"""
Main IDS Detector Module.
"""
import pickle
import json
import time
import signal
import sys
from datetime import datetime
import threading
import os
import ipaddress
import warnings
import pandas as pd
import numpy as np
import geoip2.database
from scapy.all import sniff, IP, TCP, UDP, ICMP

from .config import FEATURE_COLUMNS_ORDERED, ENHANCED_CSV_COLUMNS
from .utils import safe_divide, get_flow_key
from .geo import get_geolocation
from .features import extract_features
from .alerting import create_enhanced_alert, create_csv_record, print_alert, save_to_json, log_message
from .backend import check_backend_health, send_to_backend, send_batch_to_backend

warnings.filterwarnings('ignore')

class RealtimeIDS:
    def __init__(self, anomaly_model_path=None, anomaly_scaler_path=None, anomaly_threshold_path=None,
                 geoip_db_path='GeoLite2-City.mmdb',
                 backend_url='http://localhost:3000',
                 enable_backend=True,
                 json_output='malicious_flows.json', 
                 csv_output='all_flows.csv',
                 features_output='ml_features.csv',
                 save_interval=10, flow_timeout=120, confidence_threshold=0.7):
        
        
        self.flows = {}
        self.backend_url = backend_url
        self.enable_backend = enable_backend
        self.json_output = json_output
        self.csv_output = csv_output
        self.features_output = features_output
        self.save_interval = save_interval
        self.flow_timeout = flow_timeout
        self.confidence_threshold = confidence_threshold
        self.last_save_time = time.time()
        self.packets_processed = 0
        self.lock = threading.Lock()
        
        # Statistics
        self.stats = {
            'total_packets': 0, 'tcp_packets': 0, 'udp_packets': 0, 'icmp_packets': 0,
            'total_flows': 0, 'benign_flows': 0, 'malicious_flows': 0,
            'attack_types': {}, 'errors': 0,
            'backend_posts': 0, 'backend_failures': 0
        }
        
        # Batch Processing
        self.benign_buffer = []
        self.buffer_lock = threading.Lock()
        self.batch_size = 50
        
        
        # Load Anomaly Detector components
        self.anomaly_detector_loaded = False
        
        if all([anomaly_model_path, anomaly_scaler_path, anomaly_threshold_path]):
            # Check if files exist
            if not all([os.path.exists(p) for p in [anomaly_model_path, anomaly_scaler_path, anomaly_threshold_path]]):
                print(f"\n[!] Warning: Some anomaly detector files not found. Skipping.")
                # for p in [anomaly_model_path, anomaly_scaler_path, anomaly_threshold_path]:
                #     print(f"    - {p}: {'Found' if os.path.exists(p) else 'Not Found'}")
            else:
                print(f"\n[*] Loading Anomaly Detector components...")
                try:
                    import keras
                    import joblib
                    
                    # Load Keras model
                    self.anomaly_model = keras.models.load_model(anomaly_model_path)
                    print(f"    [+] Anomaly model loaded: {anomaly_model_path}")
                    
                    # Load Scaler
                    self.anomaly_scaler = joblib.load(anomaly_scaler_path)
                    print(f"    [+] Anomaly scaler loaded: {anomaly_scaler_path}")
                    
                    # Load Threshold
                    with open(anomaly_threshold_path, 'rb') as f:
                        print(f"    [DEBUG] Opening threshold file: {os.path.abspath(anomaly_threshold_path)}")
                        self.anomaly_threshold = pickle.load(f)
                    print(f"    [+] Anomaly threshold loaded: {self.anomaly_threshold}")
                    
                    self.anomaly_detector_loaded = True
                except Exception as e:
                    print(f"    [-] Error loading anomaly detector: {e}")
                    print(f"    [!] Continuing without anomaly detection")
        
        # Load GeoIP database
        print(f"\n[*] Loading GeoIP database...")
        try:
            if not os.path.exists(geoip_db_path):
                print(f"    [-] GeoIP database not found: {geoip_db_path}")
                print(f"    [!] Running without geolocation (all locations will show 'Unknown')")
                self.geoip_loaded = False
                self.geo_reader = None
            else:
                self.geo_reader = geoip2.database.Reader(geoip_db_path)
                print(f"    [+] GeoIP database loaded: {geoip_db_path}")
                self.geoip_loaded = True
        except Exception as e:
            print(f"    [-] Error loading GeoIP database: {e}")
            self.geoip_loaded = False
            self.geo_reader = None
        
        self.init_outputs()
        
        log_message(self.backend_url, f"\n[*] Configuration:")
        log_message(self.backend_url, f"    - Flow timeout: {flow_timeout}s")
        log_message(self.backend_url, f"    - Save interval: {save_interval}s")
        log_message(self.backend_url, f"    - Confidence threshold: {confidence_threshold}")
        log_message(self.backend_url, f"    - Backend URL: {backend_url}")
        log_message(self.backend_url, f"    - Backend enabled: {enable_backend}")
        log_message(self.backend_url, f"{'='*70}\n")
        
        self.saver_thread = threading.Thread(target=self.auto_saver, daemon=True)
        self.saver_thread.start()
        
        # Check backend health if enabled
        if self.enable_backend:
            # We update enable_backend based on health check to avoid spamming dead backend
            is_healthy = check_backend_health(self.backend_url)
            if not is_healthy:
                 # Note: in original code it just set stats, here we keep attempting?
                 # original code said "Will save to files only (backend may be offline)"
                 # but didn't set self.enable_backend = False explicitly in __init__, 
                 # just printed warnings. We'll keep it enabled but it will fail gracefully.
                 pass

    def init_outputs(self):
        """Initialize output files"""
        with open(self.json_output, 'w') as f:
            json.dump([], f)
        
        # Enhanced CSV with geolocation
        pd.DataFrame(columns=ENHANCED_CSV_COLUMNS).to_csv(self.csv_output, index=False)
        
        # ML Features CSV - 81 features + Label
        ml_cols = FEATURE_COLUMNS_ORDERED + ['Label']
        pd.DataFrame(columns=ml_cols).to_csv(self.features_output, index=False)
        
        log_message(self.backend_url, f"[+] Output files initialized")
        log_message(self.backend_url, f"    - {self.json_output}")
        log_message(self.backend_url, f"    - {self.csv_output}")
        log_message(self.backend_url, f"    - {self.features_output}\n")

    def auto_saver(self):
        while True:
            time.sleep(self.save_interval)
            self.process_flows()

    def process_packet(self, packet):
        try:
            with self.lock:
                self.packets_processed += 1
                self.stats['total_packets'] += 1
                
                if self.packets_processed % 100 == 0:
                    self._print_periodic_stats()
                
                if IP not in packet:
                    return
                
                ip = packet[IP]
                ts = time.time()
                hdr_len = ip.ihl * 4
                src_port = dst_port = 0
                flags = {}
                
                if TCP in packet:
                    tcp = packet[TCP]
                    src_port, dst_port = tcp.sport, tcp.dport
                    # Removed adding TCP header length to match capture_dataset.py
                    flags = {
                        'FIN': int(tcp.flags.F), 'SYN': int(tcp.flags.S),
                        'RST': int(tcp.flags.R), 'PSH': int(tcp.flags.P),
                        'ACK': int(tcp.flags.A), 'URG': int(tcp.flags.U),
                        'ECE': int(tcp.flags.E), 'CWR': int(tcp.flags.C)
                    }
                    self.stats['tcp_packets'] += 1
                    
                elif UDP in packet:
                    udp = packet[UDP]
                    src_port, dst_port = udp.sport, udp.dport
                    # Removed adding UDP header length to match capture_dataset.py
                    self.stats['udp_packets'] += 1
                    
                elif ICMP in packet:
                    self.stats['icmp_packets'] += 1
                
                key = get_flow_key(ip.src, ip.dst, src_port, dst_port, ip.proto)
                
                if key not in self.flows:
                    self.flows[key] = self._init_flow(key, ip, src_port, dst_port, ts)
                
                self._update_flow(self.flows[key], ip, src_port, hdr_len, 
                                len(packet), ts, flags)
                
        except Exception as e:
            self.stats['errors'] += 1
            if self.stats['errors'] < 10:
                print(f"[!] Packet error: {e}")

    def _print_periodic_stats(self):
        malicious_rate = 0
        if self.stats['total_flows'] > 0:
            malicious_rate = (self.stats['malicious_flows'] / self.stats['total_flows']) * 100
        
        backend_status = ""
        if self.enable_backend:
            total_attempts = self.stats['backend_posts'] + self.stats['backend_failures']
            if total_attempts > 0:
                success_rate = (self.stats['backend_posts'] / total_attempts) * 100
                backend_status = f" | Backend: {success_rate:.0f}% success"
            else:
                backend_status = " | Backend: No sends yet"
        
        log_message(self.backend_url, 
              f"[*] Packets: {self.packets_processed:,} | "
              f"Flows: {len(self.flows)} | "
              f"Malicious: {self.stats['malicious_flows']} ({malicious_rate:.1f}%)"
              f"{backend_status}")

    def _init_flow(self, key, ip, src_port, dst_port, ts):
        src_ip = ip.src
        dst_ip = ip.dst
        s_port = src_port
        d_port = dst_port

        # Swapping logic: If the source is a local/private IP, we check if it's an outgoing packet.
        # We want the "External" or "Other" IP to be the 'Source' (Attacker) on the map.
        try:
            src_is_private = ipaddress.ip_address(src_ip).is_private
            dst_is_private = ipaddress.ip_address(dst_ip).is_private
            
            # If Source is private and Destination is public, DEFINITELY swap.
            # If BOTH are private, we still swap if the source is the one we usually consider "us".
            if src_is_private and (not dst_is_private or src_ip.startswith('192.168.')):
                # Only swap if the destination isn't also the same IP (loopback etc)
                if src_ip != dst_ip:
                    src_ip, dst_ip = dst_ip, src_ip
                    s_port, d_port = d_port, s_port
        except Exception:
            pass

        return {
            'flow_id': key, 'src_ip': src_ip, 'dst_ip': dst_ip,
            'src_port': s_port, 'dst_port': d_port, 'protocol': ip.proto,
            'start_time': ts, 'last_time': ts, 'fwd_packets': 0, 'bwd_packets': 0,
            'fwd_bytes': 0, 'bwd_bytes': 0, 'fwd_header_bytes': 0, 'bwd_header_bytes': 0,
            'fwd_packet_lengths': [], 'bwd_packet_lengths': [], 'all_packet_lengths': [],
            'fwd_iat': [], 'bwd_iat': [], 'flow_iat': [],
            'last_packet_time': ts, 'last_fwd_packet_time': None, 'last_bwd_packet_time': None,
            'fwd_psh_flags': 0, 'bwd_psh_flags': 0, 'fwd_urg_flags': 0, 'bwd_urg_flags': 0,
            'fin_count': 0, 'syn_count': 0, 'rst_count': 0, 'psh_count': 0,
            'ack_count': 0, 'urg_count': 0, 'cwe_count': 0, 'ece_count': 0,
            'init_win_bytes_fwd': 0, 'init_win_bytes_bwd': 0,
            'active_times': [], 'idle_times': [], 'last_activity_time': ts, 'is_active': True,
            'fwd_bulk_bytes': [], 'bwd_bulk_bytes': [], 'fwd_bulk_packets': [],
            'bwd_bulk_packets': [], 'fwd_bulk_duration': [], 'bwd_bulk_duration': []
        }

    def _update_flow(self, flow, ip, src_port, hdr_len, pkt_len, ts, flags):
        is_fwd = (ip.src == flow['src_ip'] and src_port == flow['src_port'])
        
        if flow['fwd_packets'] + flow['bwd_packets'] > 0:
            flow['flow_iat'].append(ts - flow['last_packet_time'])
        
        if is_fwd:
            if flow['last_fwd_packet_time']:
                flow['fwd_iat'].append(ts - flow['last_fwd_packet_time'])
            flow['last_fwd_packet_time'] = ts
            flow['fwd_packets'] += 1
            flow['fwd_bytes'] += pkt_len
            flow['fwd_header_bytes'] += hdr_len
            flow['fwd_packet_lengths'].append(pkt_len)
            
            # CAPTURE INITIAL WINDOW BYTES
            if TCP in ip: # In scapy, TCP is inside the IP layer usually
                flow['init_win_bytes_fwd'] = ip[TCP].window
            elif hasattr(ip, 'window'): # Fallback for different packet structures
                flow['init_win_bytes_fwd'] = ip.window
        else:
            if flow['last_bwd_packet_time']:
                flow['bwd_iat'].append(ts - flow['last_bwd_packet_time'])
            flow['last_bwd_packet_time'] = ts
            flow['bwd_packets'] += 1
            flow['bwd_bytes'] += pkt_len
            flow['bwd_header_bytes'] += hdr_len
            flow['bwd_packet_lengths'].append(pkt_len)

            # CAPTURE INITIAL WINDOW BYTES
            if TCP in ip:
                flow['init_win_bytes_bwd'] = ip[TCP].window
            elif hasattr(ip, 'window'):
                flow['init_win_bytes_bwd'] = ip.window
        
        flow['all_packet_lengths'].append(pkt_len)
        flow['last_packet_time'] = ts
        flow['last_time'] = ts
        
        if flags:
            for flag, val in flags.items():
                if val:
                    if flag == 'FIN': flow['fin_count'] += 1
                    elif flag == 'SYN': flow['syn_count'] += 1
                    elif flag == 'RST': flow['rst_count'] += 1
                    elif flag == 'PSH':
                        flow['psh_count'] += 1
                        flow['fwd_psh_flags' if is_fwd else 'bwd_psh_flags'] += 1
                    elif flag == 'ACK': flow['ack_count'] += 1
                    elif flag == 'URG':
                        flow['urg_count'] += 1
                        flow['fwd_urg_flags' if is_fwd else 'bwd_urg_flags'] += 1
                    elif flag == 'CWR': flow['cwe_count'] += 1
                    elif flag == 'ECE': flow['ece_count'] += 1


    def detect_anomaly(self, features):
        """
        Detect unknown attacks using the anomaly detection model (Autoencoder).
        """
        if not self.anomaly_detector_loaded:
            return None
            
        try:
            start_time = time.time()
            
            # Prepare features for anomaly detector
            # Ensure features are in the same order as FEATURE_COLUMNS_ORDERED
            feat_list = [features.get(col, 0) for col in FEATURE_COLUMNS_ORDERED]
            df = pd.DataFrame([feat_list], columns=FEATURE_COLUMNS_ORDERED)
            
            # Replace inf/-inf and NaN
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.fillna(0, inplace=True)
            
            # Scale features
            scaled_features = self.anomaly_scaler.transform(df)
            
            # Predict (Reconstruct)
            reconstruction = self.anomaly_model.predict(scaled_features, verbose=0)
            
            mse = np.mean(np.power(scaled_features - reconstruction, 2), axis=1)[0]
            
            is_anomaly = mse > self.anomaly_threshold
            processing_time = (time.time() - start_time) * 1000
            
            return {
                'is_anomaly': bool(is_anomaly),
                'score': float(mse),
                'threshold': float(self.anomaly_threshold),
                'processing_time_ms': round(processing_time, 2)
            }
            
        except Exception as e:
            # print(f"[!] Anomaly detection error: {e}")
            return None

    def process_flows(self):
        with self.lock:
            t = time.time()
            to_remove = []
            malicious_alerts = []
            all_results = []
            ml_features_records = []
            
            for fid, f in list(self.flows.items()):
                total_pkt = f['fwd_packets'] + f['bwd_packets']
                idle_time = t - f['last_time']
                
                should_process = (
                    (idle_time > self.flow_timeout or f['fin_count'] > 0 or f['rst_count'] > 0)
                    and total_pkt >= 1
                )
                
                if should_process:
                    features = extract_features(f)
                    
                    if features:
                        # Use Anomaly Detector only
                        anomaly_result = self.detect_anomaly(features)
                        
                        # Get geolocation
                        geo_data = get_geolocation(f['src_ip'], self.geo_reader)
                        
                        self.stats['total_flows'] += 1
                        
                        # ML features record (ALWAYS - for all flows)
                        ml_record = {col: features[col] for col in FEATURE_COLUMNS_ORDERED}
                        ml_record['Label'] = 'Anomaly' if (anomaly_result and anomaly_result['is_anomaly']) else 'BENIGN'
                        ml_features_records.append(ml_record)
                            
                        # Create standardized result object for both cases
                        result = {
                            'prediction': 'Anomaly' if (anomaly_result and anomaly_result['is_anomaly']) else 'BENIGN',
                            'is_malicious': bool(anomaly_result and anomaly_result['is_anomaly']),
                            'confidence': min(1.0, anomaly_result['score'] / (anomaly_result['threshold'] * 2)) if anomaly_result else 1.0,
                            'probabilities': {'Anomaly': 1.0 if (anomaly_result and anomaly_result['is_anomaly']) else 0.0, 
                                            'BENIGN': 0.0 if (anomaly_result and anomaly_result['is_anomaly']) else 1.0},
                            'processing_time_ms': anomaly_result['processing_time_ms'] if anomaly_result else 0
                        }

                        # Create the flow data object (used as alert payload)
                        flow_payload = create_enhanced_alert(f, result, features, geo_data)
                        
                        if anomaly_result and anomaly_result['is_anomaly']:
                            # HYBRID: Send ANOMALIES immediately
                            backend_sent = False
                            if self.enable_backend:
                                backend_sent = send_to_backend(self.backend_url, flow_payload)
                                if backend_sent:
                                    self.stats['backend_posts'] += 1
                                else:
                                    self.stats['backend_failures'] += 1
                            
                            self.stats['malicious_flows'] += 1
                            self.stats['attack_types']['Anomaly'] = \
                                self.stats['attack_types'].get('Anomaly', 0) + 1
                            
                            malicious_alerts.append(flow_payload)
                            
                            # Create CSV record for malicious list
                            csv_record = create_csv_record(f, result, features, geo_data)
                            all_results.append(csv_record)
                            
                            # Print alert for terminal visibility
                            print_alert(flow_payload, backend_sent, self.backend_url)
                        else:
                            # HYBRID: Add BENIGN to batch buffer
                            self.stats['benign_flows'] += 1
                            with self.buffer_lock:
                                self.benign_buffer.append(flow_payload)
                                if len(self.benign_buffer) >= self.batch_size:
                                    self._flush_benign_buffer()
                        
                        to_remove.append(fid)
            
            # Save to files
            if malicious_alerts:
                save_to_json(malicious_alerts, self.json_output)
                print(f"[+] Saved {len(malicious_alerts)} malicious flows to {self.json_output}")
            
            if ml_features_records:
                df_ml = pd.DataFrame(ml_features_records)
                ml_cols = FEATURE_COLUMNS_ORDERED + ['Label']
                df_ml = df_ml[ml_cols]
                df_ml.to_csv(self.features_output, mode='a', header=False, index=False)
                # print(f"[+] Saved {len(ml_features_records)} ML feature records")
            
            if all_results:
                df = pd.DataFrame(all_results)
                df.to_csv(self.csv_output, mode='a', header=False, index=False)
                print(f"[+] Saved {len(all_results)} malicious flow records to {self.csv_output}")
            
            for fid in to_remove:
                del self.flows[fid]

    def _flush_benign_buffer(self):
        """Send all buffered benign flows to the backend in one request"""
        if not self.benign_buffer or not self.enable_backend:
            self.benign_buffer = []
            return
            
        success = send_batch_to_backend(self.backend_url, self.benign_buffer)
        if success:
            # print(f"📦 Successfully sent batch of {len(self.benign_buffer)} benign flows")
            pass
        
        self.benign_buffer = []

    def print_stats(self):
        """Print statistics and send to backend logs"""
        lines = [
            f"\n{'='*70}",
            f"  IDS STATISTICS",
            f"{'='*70}",
            f"Packets: {self.stats['total_packets']:,} "
            f"(TCP: {self.stats['tcp_packets']:,}, "
            f"UDP: {self.stats['udp_packets']:,}, "
            f"ICMP: {self.stats['icmp_packets']:,})",
            f"Flows: Total={self.stats['total_flows']:,}, "
            f"Active={len(self.flows):,}",
            f"Classification: Malicious={self.stats['malicious_flows']:,}, "
            f"Benign={self.stats['benign_flows']:,}"
        ]
        
        if self.enable_backend:
            lines.append(f"Backend: Posts={self.stats['backend_posts']:,}, "
                         f"Failures={self.stats['backend_failures']:,}")
        
        if self.stats['attack_types']:
            lines.append(f"\nAttack Types Detected:")
            for attack, count in sorted(self.stats['attack_types'].items(), 
                                       key=lambda x: x[1], reverse=True):
                lines.append(f"  - {attack}: {count:,}")
        
        lines.append(f"\nErrors: {self.stats['errors']:,}")
        lines.append(f"{'='*70}\n")
        
        full_msg = "\n".join(lines)
        log_message(self.backend_url, full_msg)

    def start_capture(self, interface=None, packet_count=0, filter_exp=None):
        """Start packet capture"""
        log_message(self.backend_url, f"[*] Starting real-time intrusion detection...")
        log_message(self.backend_url, f"[*] Interface: {interface or 'default'}")
        log_message(self.backend_url, f"[*] Filter: {filter_exp or 'none'}")
        log_message(self.backend_url, f"[*] Press Ctrl+C to stop\n")
        
        def sighandler(sig, frame):
            print("\n" + "="*70)
            print("  SHUTTING DOWN GRACEFULLY")
            print("="*70)
            print("[*] Processing remaining flows...")
            self.process_flows()
            self._flush_benign_buffer()
            
            if self.geoip_loaded and self.geo_reader:
                try:
                    self.geo_reader.close()
                    print("[*] GeoIP database closed")
                except:
                    pass
            
            self.print_stats()
            
            print(f"\n{'='*70}")
            print("  RESULTS SAVED")
            print(f"{'='*70}")
            print(f"[+] Malicious flows (JSON): {self.json_output}")
            print(f"\n[+] Malicious flows (CSV):  {self.csv_output}")
            print(f"\n[+] ML features (all):      {self.features_output}")
            
            print(f"\n{'='*70}")
            print("  IDS STOPPED")
            print(f"{'='*70}\n")
            sys.exit(0)
        
        signal.signal(signal.SIGINT, sighandler)
        
        def stats_printer():
            while True:
                time.sleep(60)
                self.print_stats()
        
        threading.Thread(target=stats_printer, daemon=True).start()
        
        try:
            sniff(iface=interface, prn=self.process_packet,
                  filter=filter_exp, count=packet_count, store=False)
        except PermissionError:
            print(f"\n[!] Permission denied!")
            print("Run with elevated privileges (sudo/Administrator)\n")
            sys.exit(1)
        except Exception as e:
            print(f"\n[!] Error: {e}\n")
            sys.exit(1)
