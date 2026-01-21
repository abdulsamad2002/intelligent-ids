#!/usr/bin/env python3
"""
Real-time Intrusion Detection System
Entry Point Script
"""

import sys
import os
import argparse
import threading
import time

# Ensure we can import ids_core from current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ids_core.detector import RealtimeIDS

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Real-time IDS with Geolocation and Backend Integration',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EXAMPLES:
  Basic usage:
    sudo python ids.py -m models/rf_model.pkl -f models/features.pkl -e models/encoder.pkl

  List interfaces:
    sudo python ids.py --list
        """)
    
    parser.add_argument('-m', '--model', required=True,
                        help='Path to Random Forest model pickle file')
    parser.add_argument('-f', '--features', required=True,
                        help='Path to selected features pickle file')
    parser.add_argument('-e', '--encoder', required=True,
                        help='Path to label encoder pickle file')
    parser.add_argument('--geoip-db', default='GeoDB/GeoLite2-City.mmdb',
                        help='Path to GeoIP2 database (default: GeoDB/GeoLite2-City.mmdb)')
    parser.add_argument('--backend-url', default='http://localhost:3000',
                        help='Backend API URL (default: http://localhost:3000)')
    parser.add_argument('--no-backend', action='store_true',
                        help='Disable backend POST (offline mode)')
    parser.add_argument('-i', '--interface',
                        help='Network interface to capture from')
    parser.add_argument('--json', default='output/malicious_flows.json',
                        help='JSON output file (default: output/malicious_flows.json)')
    parser.add_argument('--csv', default='output/all_flows.csv',
                        help='CSV output file (default: output/all_flows.csv)')
    parser.add_argument('--features-output', default='output/ml_features.csv',
                        help='ML features CSV (default: output/ml_features.csv)')
    parser.add_argument('-s', '--save-interval', type=int, default=10,
                        help='Flow check interval in seconds (default: 10)')
    parser.add_argument('-t', '--timeout', type=int, default=120,
                        help='Flow timeout in seconds (default: 120)')
    parser.add_argument('-c', '--confidence', type=float, default=0.7,
                        help='Confidence threshold 0-1 (default: 0.7)')
    parser.add_argument('-n', '--count', type=int, default=0,
                        help='Number of packets to capture (0=infinite)')
    parser.add_argument('--filter', help='BPF filter expression')
    parser.add_argument('-d', '--duration', type=int,
                        help='Capture duration in seconds')
    parser.add_argument('--list', action='store_true',
                        help='List available network interfaces')
    
    args = parser.parse_args()
    
    if args.list:
        try:
            from scapy.arch import get_if_list
            print(f"\n{'='*70}")
            print("  AVAILABLE NETWORK INTERFACES")
            print(f"{'='*70}\n")
            for i, iface in enumerate(get_if_list(), 1):
                print(f"  {i}. {iface}")
            print(f"\n{'='*70}\n")
            sys.exit(0)
        except ImportError:
            print("Error: scapy not installed. Cannot list interfaces.")
            sys.exit(1)
    
    # Validate files
    for fpath, fname in [(args.model, 'Model'), 
                         (args.features, 'Features'), 
                         (args.encoder, 'Encoder')]:
        if not os.path.exists(fpath):
            print(f"\n[!] Error: {fname} file not found: {fpath}\n")
            sys.exit(1)
    
    if not 0 <= args.confidence <= 1:
        print(f"\n[!] Error: Confidence must be between 0 and 1\n")
        sys.exit(1)
    
    try:
        ids = RealtimeIDS(
            model_path=args.model,
            features_path=args.features,
            encoder_path=args.encoder,
            geoip_db_path=args.geoip_db,
            backend_url=args.backend_url,
            enable_backend=not args.no_backend,
            json_output=args.json,
            csv_output=args.csv,
            features_output=args.features_output,
            save_interval=args.save_interval,
            flow_timeout=args.timeout,
            confidence_threshold=args.confidence
        )
    except Exception as e:
        print(f"\n[!] Failed to initialize IDS: {e}\n")
        sys.exit(1)
    
    if args.duration:
        def timeout():
            time.sleep(args.duration)
            print(f"\n[*] Duration limit reached - stopping...")
            ids.process_flows()
            ids.print_stats()
            os._exit(0) # Force exit
        threading.Thread(target=timeout, daemon=True).start()
    
    print(f"[+] IDS Ready - Starting capture...\n")
    ids.start_capture(args.interface, args.count, args.filter)