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
from .backend import check_backend_health, send_to_backend

warnings.filterwarnings('ignore')

class RealtimeIDS:
    def __init__(self, model_path, features_path, encoder_path, 
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
        
        # Load model components
        print(f"\n{'='*70}")
        print(f"  REAL-TIME INTRUSION DETECTION SYSTEM")
        print(f"{'='*70}")
        print(f"[*] Loading model components...")
        
        try:
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
            print(f"    ✓ Model loaded: {model_path}")
            
            with open(features_path, 'rb') as f:
                self.selected_features = pickle.load(f)
            print(f"    ✓ Features loaded: {len(self.selected_features)} features")
            
            with open(encoder_path, 'rb') as f:
                self.label_encoder = pickle.load(f)
            print(f"    ✓ Label encoder loaded")
            
            self.attack_classes = self.label_encoder.classes_
            print(f"    ✓ Attack classes: {list(self.attack_classes)}")
            
            self.model_loaded = True
            
        except Exception as e:
            print(f"    ✗ Error loading model: {e}")
            self.model_loaded = False
            sys.exit(1)
        
        # Load GeoIP database
        print(f"\n[*] Loading GeoIP database...")
        try:
            if not os.path.exists(geoip_db_path):
                print(f"    ✗ GeoIP database not found: {geoip_db_path}")
                print(f"    ⚠ Running without geolocation (all locations will show 'Unknown')")
                self.geoip_loaded = False
                self.geo_reader = None
            else:
                self.geo_reader = geoip2.database.Reader(geoip_db_path)
                print(f"    ✓ GeoIP database loaded: {geoip_db_path}")
                self.geoip_loaded = True
        except Exception as e:
            print(f"    ✗ Error loading GeoIP database: {e}")
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
        
        # ML Features CSV - EXACT ORDER
        pd.DataFrame(columns=FEATURE_COLUMNS_ORDERED).to_csv(self.features_output, index=False)
        
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
                    hdr_len += tcp.dataofs * 4
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
                    hdr_len += 8
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
        return {
            'flow_id': key, 'src_ip': ip.src, 'dst_ip': ip.dst,
            'src_port': src_port, 'dst_port': dst_port, 'protocol': ip.proto,
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
        else:
            if flow['last_bwd_packet_time']:
                flow['bwd_iat'].append(ts - flow['last_bwd_packet_time'])
            flow['last_bwd_packet_time'] = ts
            flow['bwd_packets'] += 1
            flow['bwd_bytes'] += pkt_len
            flow['bwd_header_bytes'] += hdr_len
            flow['bwd_packet_lengths'].append(pkt_len)
        
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

    def classify_flow(self, features, flow):
        try:
            start_time = time.time()
            
            df = pd.DataFrame([features])
            
            for feat in self.selected_features:
                if feat not in df.columns:
                    df[feat] = 0
            
            df = df[self.selected_features]
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.fillna(0, inplace=True)
            
            prediction_numeric = self.model.predict(df)[0]
            probabilities = self.model.predict_proba(df)[0]
            
            attack_type = self.label_encoder.inverse_transform([prediction_numeric])[0]
            confidence = float(np.max(probabilities))
            
            prob_dict = {
                str(self.attack_classes[i]): float(probabilities[i])
                for i in range(len(self.attack_classes))
            }
            
            is_malicious = attack_type != 'BENIGN'
            processing_time = (time.time() - start_time) * 1000  # ms
            
            return {
                'prediction': str(attack_type),
                'confidence': confidence,
                'is_malicious': is_malicious,
                'probabilities': prob_dict,
                'processing_time_ms': round(processing_time, 2)
            }
            
        except Exception as e:
            print(f"[!] Classification error: {e}")
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
                        result = self.classify_flow(features, f)
                        
                        if result:
                            # Get geolocation
                            geo_data = get_geolocation(f['src_ip'], self.geo_reader)
                            
                            self.stats['total_flows'] += 1
                            
                            # ML features record (ALWAYS - for all flows)
                            ml_record = {col: features[col] for col in FEATURE_COLUMNS_ORDERED}
                            ml_features_records.append(ml_record)
                            
                            if result['is_malicious']:
                                self.stats['malicious_flows'] += 1
                                attack_type = result['prediction']
                                self.stats['attack_types'][attack_type] = \
                                    self.stats['attack_types'].get(attack_type, 0) + 1
                                
                                if result['confidence'] >= self.confidence_threshold:
                                    # Create streamlined alert
                                    alert = create_enhanced_alert(f, result, features, geo_data)
                                    
                                    # Save to JSON (ALWAYS)
                                    malicious_alerts.append(alert)
                                    
                                    # Create CSV record (ONLY for malicious)
                                    csv_record = create_csv_record(f, result, features, geo_data)
                                    all_results.append(csv_record)
                                    
                                    # Send to backend (if enabled)
                                    backend_sent = False
                                    if self.enable_backend:
                                        backend_sent = send_to_backend(self.backend_url, alert)
                                        if backend_sent:
                                            self.stats['backend_posts'] += 1
                                        else:
                                            self.stats['backend_failures'] += 1
                                    
                                    # Print alert and send to backend logs
                                    print_alert(alert, backend_sent, self.backend_url)
                            else:
                                self.stats['benign_flows'] += 1
                            
                            to_remove.append(fid)
            
            # Save to files
            if malicious_alerts:
                save_to_json(malicious_alerts, self.json_output)
                print(f"[+] Saved {len(malicious_alerts)} malicious flows to {self.json_output}")
            
            if ml_features_records:
                df_ml = pd.DataFrame(ml_features_records)
                df_ml = df_ml[FEATURE_COLUMNS_ORDERED]
                df_ml.to_csv(self.features_output, mode='a', header=False, index=False)
                # print(f"[+] Saved {len(ml_features_records)} ML feature records")
            
            if all_results:
                df = pd.DataFrame(all_results)
                df.to_csv(self.csv_output, mode='a', header=False, index=False)
                print(f"[+] Saved {len(all_results)} malicious flow records to {self.csv_output}")
            
            for fid in to_remove:
                del self.flows[fid]

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
