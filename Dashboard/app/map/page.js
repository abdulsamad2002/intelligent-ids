'use client';

import React, { useState, useEffect } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  Marker,
  Line,
  ZoomableGroup
} from "react-simple-maps";
import { Loader2, Plus, Minus, RotateCcw } from 'lucide-react';
import { useTheme } from '@/components/ThemeContext';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Theme shades for countries
const darkShades = ["#1a1a1a", "#222222", "#262626", "#2d2d2d", "#333333"];
const lightShades = ["#f0f0f0", "#e5e5e5", "#dadada", "#d1d1d1", "#c7c7c7"];

const ThreatMapPage = () => {
  const { theme } = useTheme();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState([]);
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });
  const [tooltip, setTooltip] = useState({ content: "", x: 0, y: 0, visible: false });

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  const homePos = [78.9629, 20.5937]; // [lng, lat]

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/alerts?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const countryFallbacks = {
          'US': [-95.7129, 37.0902], 'CN': [104.1954, 35.8617], 'RU': [105.3188, 61.5240],
          'IN': [78.9629, 20.5937], 'GB': [-3.4360, 55.3781], 'FR': [2.2137, 46.2276],
          'DE': [10.4515, 51.1657], 'BR': [-51.9253, -14.2350], 'AU': [133.7751, -25.2744],
          'NL': [5.2913, 52.1326], 'CA': [-106.3468, 56.1304], 'JP': [138.2529, 36.2048],
          'IT': [12.5674, 41.8719], 'ES': [-3.7492, 40.4637], 'PK': [69.3451, 30.3753], 
          'SA': [45.0792, 23.8859], 'TR': [35.2433, 38.9637], 'IR': [53.6880, 32.4279], 
          'KR': [127.7669, 35.9078], 'ID': [113.9213, -0.7893], 'VN': [108.2772, 14.0583], 
          'TH': [100.9925, 15.8700], 'MY': [101.9758, 4.2105], 'SG': [103.8198, 1.3521], 
          'ZA': [22.9375, -30.5595], 'EG': [30.8025, 26.8206], 'NG': [8.6753, 9.0820], 
          'MX': [-102.5528, 23.6345], 'UA': [31.1656, 48.3794]
        };

        const activeAlerts = data.data.map(a => {
          let coords = [a.src_longitude, a.src_latitude];
          if ((!coords[0] || Math.abs(coords[0]) < 0.01) && a.src_country) {
            const fallback = countryFallbacks[a.src_country.toUpperCase()];
            if (fallback) coords = fallback;
          }
          return { ...a, displayCoords: coords };
        }).filter(a => a.displayCoords && (Math.abs(a.displayCoords[0]) > 0.01 || Math.abs(a.displayCoords[1]) > 0.01));

        setFlows(activeAlerts);
        setMarkers(activeAlerts.map(a => ({ coordinates: a.displayCoords, id: a._id })));
      }
    } catch (err) {
      console.error('Alert data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFillColor = (name) => {
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const shades = theme === 'dark' ? darkShades : lightShades;
    return shades[charCodeSum % shades.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg">
        <Loader2 size={24} className="text-fg opacity-20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-75px)] w-full bg-bg flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col mb-4 px-2">
        <h2 className="text-sm font-bold text-fg tracking-widest uppercase opacity-80">Threat Surveillance Matrix</h2>
      </div>

      <div className="flex-1 bg-card rounded border border-border relative overflow-hidden shadow-sm">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140, center: [0, 45] }}
          width={1000}
          height={600}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={(pos) => setPosition(pos)}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFillColor(geo.properties.name || "Default")}
                    stroke={theme === 'dark' ? "#333" : "#ddd"}
                    strokeWidth={0.5}
                    onMouseEnter={() => {
                      setTooltip(prev => ({ ...prev, content: geo.properties.name, visible: true }));
                    }}
                    onMouseMove={(e) => {
                      setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                    }}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, visible: false }));
                    }}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: theme === 'dark' ? '#ffffff' : '#000000', outline: 'none', transition: 'all 200ms', cursor: 'crosshair' }
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Threat Markers */}
            {markers.map(({ coordinates }, i) => (
              <Marker key={`marker-${i}`} coordinates={coordinates}>
                <circle 
                  r={2.5 / position.zoom} 
                  fill="#ef4444" 
                />
              </Marker>
            ))}

            {/* Target Node */}
            <Marker coordinates={homePos}>
              <circle r={4 / position.zoom} fill={theme === 'dark' ? "#ffffff" : "#000000"} />
              <circle 
                r={10 / position.zoom} 
                fill="none" 
                stroke={theme === 'dark' ? "#ffffff" : "#000000"} 
                strokeWidth={0.5 / position.zoom} 
                opacity={0.3} 
                className="animate-pulse" 
              />
            </Marker>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Interactive Tooltip */}
      {tooltip.visible && (
        <div 
          className="fixed pointer-events-none z-50 px-3 py-1.5 bg-card border border-border text-[10px] font-black tracking-widest text-fg uppercase rounded shadow-lg"
          style={{ 
            left: tooltip.x + 15, 
            top: tooltip.y + 15,
            transform: 'translateY(-50%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default ThreatMapPage;
