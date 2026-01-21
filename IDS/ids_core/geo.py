"""
Geolocation lookup functions.
"""
from geoip2.errors import AddressNotFoundError

def get_geolocation(ip, reader=None):
    """Lookup IP geolocation using GeoIP2"""
    if not reader:
        return default_geo_data()
    
    try:
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
    except Exception as e:
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
