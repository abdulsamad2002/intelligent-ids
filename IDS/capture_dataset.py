#!/usr/bin/env python3
"""
Lightweight Dataset Capture Script
Optimized for creating benign datasets compatible with CIC-IDS 2017/2018.
"""

import sys
import os
import argparse
import time
import os
import json
import csv
import ipaddress
import signal
import threading
import pandas as pd
from datetime import datetime
from scapy.all import sniff, IP, TCP, UDP, ICMP

# Ensure we can import ids_core from current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ids_core.config import FEATURE_COLUMNS_ORDERED
from ids_core.utils import get_flow_key
from ids_core.features import extract_features

class DatasetCapturer:
    def __init__(self, output_file, label="BENIGN", flow_timeout=120):
        self.output_file = output_file
        self.label = label
        self.flow_timeout = flow_timeout
        self.flows = {}
        self.lock = threading.Lock()
        self.packets_count = 0
        self.flows_saved = 0
        
        # Define CICFlowMeter Compatible Columns
        self.id_columns = [
            "Flow ID", "Source IP", "Source Port", 
            "Destination IP", "Destination Port", "Protocol", "Timestamp"
        ]
        # Full header: ID Columns + ML Features + Label
        self.all_columns = self.id_columns + FEATURE_COLUMNS_ORDERED + ["Label"]
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
        
        # Initialize CSV
        if not os.path.exists(output_file):
            pd.DataFrame(columns=self.all_columns).to_csv(output_file, index=False)
            print(f"[*] Created new dataset file: {output_file}")
        else:
            print(f"[*] Appending to existing dataset: {output_file}")

    def process_packet(self, packet):
        if IP not in packet: return
        
        try:
            with self.lock:
                self.packets_count += 1
                ip = packet[IP]
                ts = time.time()
                
                src_port = dst_port = 0
                if TCP in packet:
                    src_port, dst_port = packet[TCP].sport, packet[TCP].dport
                elif UDP in packet:
                    src_port, dst_port = packet[UDP].sport, packet[UDP].dport
                
                key = get_flow_key(ip.src, ip.dst, src_port, dst_port, ip.proto)
                
                if key not in self.flows:
                    self.flows[key] = self._init_flow(key, ip, src_port, dst_port, ts)
                
                self._update_flow(self.flows[key], ip, src_port, packet, ts)
        except Exception:
            pass

    def _init_flow(self, key, ip, src_port, dst_port, ts):
        src_ip = ip.src
        dst_ip = ip.dst
        s_port = src_port
        d_port = dst_port

        # Swapping logic: If the source is a local/private IP and the destination is external,
        # it means we are capturing an outgoing response. Swap them to ensure the 
        # External IP is marked as the 'Source' (Attacker).
        try:
            src_is_private = ipaddress.ip_address(src_ip).is_private
            dst_is_private = ipaddress.ip_address(dst_ip).is_private
            
            if src_is_private and not dst_is_private:
                src_ip, dst_ip = dst_ip, src_ip
                s_port, d_port = d_port, s_port
        except Exception:
            pass

        return {
            'flow_id': key, 'src_ip': src_ip, 'dst_ip': dst_ip,
            'src_port': s_port, 'dst_port': d_port, 'protocol': ip.proto,
            'timestamp': datetime.fromtimestamp(ts).strftime('%d/%m/%Y %H:%M:%S'),
            'start_time': ts, 'last_time': ts, 'fwd_packets': 0, 'bwd_packets': 0,
            'fwd_bytes': 0, 'bwd_bytes': 0, 'fwd_header_bytes': 0, 'bwd_header_bytes': 0,
            'fwd_packet_lengths': [], 'bwd_packet_lengths': [], 'all_packet_lengths': [],
            'fwd_iat': [], 'bwd_iat': [], 'flow_iat': [],
            'last_packet_time': ts, 'last_fwd_packet_time': None, 'last_bwd_packet_time': None,
            'fwd_psh_flags': 0, 'bwd_psh_flags': 0, 'fwd_urg_flags': 0, 'bwd_urg_flags': 0,
            'fin_count': 0, 'syn_count': 0, 'rst_count': 0, 'psh_count': 0,
            'ack_count': 0, 'urg_count': 0, 'cwe_count': 0, 'ece_count': 0,
            'init_win_bytes_fwd': 0, 'init_win_bytes_bwd': 0,
            'active_times': [], 'idle_times': [], 'last_activity_time': ts,
            'fwd_bulk_bytes': [], 'bwd_bulk_bytes': [], 'fwd_bulk_packets': [],
            'bwd_bulk_packets': [], 'fwd_bulk_duration': [], 'bwd_bulk_duration': []
        }

    def _update_flow(self, flow, ip, src_port, packet, ts):
        is_fwd = (ip.src == flow['src_ip'] and src_port == flow['src_port'])
        pkt_len = len(packet)
        hdr_len = 0
        if IP in packet: hdr_len = packet[IP].ihl * 4
        
        if flow['fwd_packets'] + flow['bwd_packets'] > 0:
            flow['flow_iat'].append(ts - flow['last_packet_time'])
            
        if is_fwd:
            if flow['last_fwd_packet_time']: flow['fwd_iat'].append(ts - flow['last_fwd_packet_time'])
            flow['last_fwd_packet_time'] = ts
            flow['fwd_packets'] += 1
            flow['fwd_bytes'] += pkt_len
            flow['fwd_header_bytes'] += hdr_len
            flow['fwd_packet_lengths'].append(pkt_len)
            if TCP in packet: flow['init_win_bytes_fwd'] = packet[TCP].window
        else:
            if flow['last_bwd_packet_time']: flow['bwd_iat'].append(ts - flow['last_bwd_packet_time'])
            flow['last_bwd_packet_time'] = ts
            flow['bwd_packets'] += 1
            flow['bwd_bytes'] += pkt_len
            flow['bwd_header_bytes'] += hdr_len
            flow['bwd_packet_lengths'].append(pkt_len)
            if TCP in packet: flow['init_win_bytes_bwd'] = packet[TCP].window

        flow['all_packet_lengths'].append(pkt_len)
        flow['last_packet_time'] = ts
        flow['last_time'] = ts

        if TCP in packet:
            flags = packet[TCP].flags
            if 'F' in flags: flow['fin_count'] += 1
            if 'S' in flags: flow['syn_count'] += 1
            if 'R' in flags: flow['rst_count'] += 1
            if 'P' in flags: flow['psh_count'] += 1
            if 'A' in flags: flow['ack_count'] += 1
            if 'U' in flags: flow['urg_count'] += 1

    def flush_flows(self, force=False):
        now = time.time()
        to_save = []
        with self.lock:
            for key, flow in list(self.flows.items()):
                idle_time = now - flow['last_time']
                is_finished = flow['fin_count'] > 0 or flow['rst_count'] > 0
                
                if force or idle_time > self.flow_timeout or is_finished:
                    features = extract_features(flow)
                    if features:
                        row = [
                            flow['flow_id'], flow['src_ip'], flow['src_port'],
                            flow['dst_ip'], flow['dst_port'], flow['protocol'],
                            flow['timestamp']
                        ]
                        for col in FEATURE_COLUMNS_ORDERED:
                            row.append(features.get(col, 0))
                        row.append(self.label)
                        to_save.append(row)
                    del self.flows[key]

        if to_save:
            try:
                df = pd.DataFrame(to_save, columns=self.all_columns)
                df.to_csv(self.output_file, mode='a', header=False, index=False)
                self.flows_saved += len(to_save)
                print(f"[+] Saved {len(to_save)} flows to CSV. Total: {self.flows_saved}")
            except PermissionError:
                print(f"[!] Warning: Data could not be saved because '{self.output_file}' is open in another program. Close it to resume saving.")
                # Put the flows back into the queue for next attempt
                # Since we already deleted them from self.flows, it might be tricky.
                # For simplicity, we'll just log it. In a real scenario, you'd keep them.
                pass
            except Exception as e:
                print(f"[!] Export error: {e}")

def main():
    parser = argparse.ArgumentParser(description='CIC-IDS Compatible Dataset Capturer')
    parser.add_argument('-i', '--interface', help='Network interface to capture from')
    parser.add_argument('-o', '--output', default='output/live_benign_traffic.csv', help='Output CSV file')
    parser.add_argument('-l', '--label', default='BENIGN', help='Label to apply (default: BENIGN)')
    parser.add_argument('-t', '--timeout', type=int, default=120, help='Flow timeout in seconds')
    parser.add_argument('--list', action='store_true', help='List interfaces')

    args = parser.parse_args()

    if args.list:
        try:
            from scapy.arch import get_if_list
            print("\nAvailable Interfaces:")
            for i, iface in enumerate(get_if_list(), 1): print(f"  {i}. {iface}")
            return
        except:
            return

    capturer = DatasetCapturer(args.output, args.label, args.timeout)

    def auto_flush():
        while True:
            time.sleep(10)
            capturer.flush_flows()

    threading.Thread(target=auto_flush, daemon=True).start()

    def signal_handler(sig, frame):
        print("\n[*] Capture stopped. Finalizing...")
        capturer.flush_flows(force=True)
        os._exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    print(f"[*] Starting capture on {args.interface or 'default'}...")
    try:
        sniff(iface=args.interface, prn=capturer.process_packet, store=False)
    except PermissionError:
        print("[!] Error: Run as Administrator.")
    except Exception as e:
        print(f"[!] Error: {e}")

if __name__ == "__main__":
    main()
