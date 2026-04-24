"""
Geolocation lookup functions.
"""
import ipaddress
from geoip2.errors import AddressNotFoundError

def get_geolocation(ip, reader=None):
    """Lookup IP geolocation using GeoIP2"""
    try:
        # Check if it is a private/local IP
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_private or ip_obj.is_loopback:
            return {
                'country_code': 'LCL',
                'country_name': 'Local Network',
                'city': 'Internal',
                'latitude': 0.0,
                'longitude': 0.0
            }
            
        if not reader:
            return default_geo_data()
            
        response = reader.city(ip)
        return {
            'country_code': response.country.iso_code or 'Unknown',
            'country_name': response.country.name or 'Unknown',
            'city': response.city.name or 'Unknown',
            'latitude': response.location.latitude or 0.0,
            'longitude': response.location.longitude or 0.0
        }
    except AddressNotFoundError:
        return default_geo_data()
    except Exception:
        return default_geo_data()

def default_geo_data():
    """Return default geolocation data"""
    return {
        'country_code': 'Unknown',
        'country_name': 'Unknown',
        'city': 'Unknown',
        'latitude': 0.0,
        'longitude': 0.0
    }
