"""
Backend communication logic.
"""
import requests
import json
import os

# Default API key for the IDS engine (should match backend .env)
IDS_API_KEY = os.environ.get('IDS_API_KEY', 'ids_engine_secret_key_7788')

def check_backend_health(backend_url):
    """Check if backend is reachable on startup"""
    msg = f"\n[*] Checking backend connection..."
    print(msg)
    try:
        response = requests.get(
            f"{backend_url}/health",
            timeout=3
        )
        if response.status_code == 200:
            success_msg = f"    ✓ Backend connected: {backend_url}"
            print(success_msg)
            send_log_to_backend(backend_url, success_msg)
            return True
    except requests.exceptions.ConnectionError:
        err_msg = f"    ✗ Backend unreachable: {backend_url}"
        print(err_msg)
        return False
    except requests.exceptions.Timeout:
        err_msg = f"    ✗ Backend timeout: {backend_url}"
        print(err_msg)
        return False
    except Exception as e:
        err_msg = f"    ✗ Backend check failed: {e}"
        print(err_msg)
        return False

def send_to_backend(backend_url, flow_data):
    """Send classified flow to Express backend via HTTP POST"""
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-IDS-Key': IDS_API_KEY
        }
        
        response = requests.post(
            f"{backend_url}/api/flows",
            json=flow_data,
            timeout=2,
            headers=headers
        )
        
        if response.status_code in [200, 201]:
            return True
        else:
            print(f"[!] Backend returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        return False
    except requests.exceptions.Timeout:
        return False
    except Exception as e:
        print(f"[!] Backend error: {e}")
        return False

def send_log_to_backend(backend_url, message, level='info'):
    """Send terminal log message to backend via HTTP POST"""
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-IDS-Key': IDS_API_KEY
        }
        
        payload = {
            'message': message,
            'level': level
        }
        
        requests.post(
            f"{backend_url}/api/logs",
            json=payload,
            timeout=1, # Very short timeout for logs to avoid blocking
            headers=headers
        )
    except:
        # Fail silently for logs to not interrupt capture
        pass
