"""
Utility functions for IDS.
"""
import numpy as np

def safe_divide(num, denom, default=0.0):
    try:
        if denom == 0 or denom is None:
            return default
        result = float(num) / float(denom)
        return default if np.isinf(result) or np.isnan(result) else result
    except:
        return default

def protocol_name(proto_num):
    """Convert protocol number to name"""
    protocols = {
        1: 'ICMP',
        6: 'TCP',
        17: 'UDP',
        41: 'IPv6',
        47: 'GRE',
        50: 'ESP',
        51: 'AH',
        89: 'OSPF',
        132: 'SCTP'
    }
    return protocols.get(proto_num, f'Protocol-{proto_num}')

def get_flow_key(src_ip, dst_ip, src_port, dst_port, protocol):
    f = f"{src_ip}:{src_port}-{dst_ip}:{dst_port}-{protocol}"
    b = f"{dst_ip}:{dst_port}-{src_ip}:{src_port}-{protocol}"
    return min(f, b)
