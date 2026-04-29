"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Activity, AlertTriangle, Ban, FileText, Search, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, Globe, Clock, Zap, Eye, Download, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';

const IntelligentIDSDashboard = () => {
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const timeRange = '24h'; // Fixed to today's view

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // WebSocket for real-time updates
  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✓ Connected to backend WebSocket');
      setWsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('✗ Disconnected from backend WebSocket');
      setWsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('Backend message:', data.message);
    });

    socket.on('new_attack', (data) => {
      console.log('New attack received:', data);
      fetchDashboardData();
    });

    socket.on('stats_update', (data) => {
      console.log('Stats update received:', data);
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      
      if (!token) {
        return; // Don't fetch if no token
      }

      const response = await fetch(`${BACKEND_URL}/api/stats?time_range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Session expired or invalid. Logging out...');
          handleLogout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        console.error('API returned error:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getThreatBadgeColor = (level) => {
    const colors = {
      'CRITICAL': 'bg-red-600',
      'HIGH': 'bg-orange-500',
      'MEDIUM': 'bg-yellow-500',
      'LOW': 'bg-blue-500'
    };
    return colors[level] || 'bg-neutral-600';
  };

  const getSeverityColor = (severity) => {
    if (severity >= 8) return 'text-red-500';
    if (severity >= 6) return 'text-orange-500';
    if (severity >= 4) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getCountryFlag = (code) => {
    const flags = {
      'US': '🇺🇸', 'RU': '🇷🇺', 'CN': '🇨🇳', 'GB': '🇬🇧',
      'DE': '🇩🇪', 'FR': '🇫🇷', 'NL': '🇳🇱', 'IN': '🇮🇳',
      'BR': '🇧🇷', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CA': '🇨🇦'
    };
    return flags[code] || '🌍';
  };

  const StatCard = ({ label, value, subtitle }) => (
    <div className="bg-card border border-border rounded-lg p-4 transition-colors">
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-light text-fg mb-1">{value || '0'}</p>
      <p className="text-[9px] text-neutral-500 font-mono uppercase">{subtitle}</p>
    </div>
  );

  const TimelineChart = ({ data }) => {
    if (!data) return <div className="h-64 flex items-center justify-center text-neutral-600">No timeline data available</div>;

    const processData = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const buckets = [];
      for (let i = 0; i < 24; i++) {
        const time = new Date(today.getTime() + (i * 3600000));
        const label = time.getHours().toString().padStart(2, '0');
        
        // Find if we have data for this hour in the backend response
        const hourData = data.find(item => {
          const itemDate = new Date(item._id);
          return itemDate.getHours() === time.getHours() && 
                 itemDate.getDate() === today.getDate() &&
                 itemDate.getMonth() === today.getMonth() &&
                 itemDate.getFullYear() === today.getFullYear();
        });

        const total = hourData ? hourData.totalFlows : 0;
        const malicious = hourData ? hourData.maliciousFlows : 0;
        const percentage = total > 0 ? (malicious / total) * 100 : 0;

        buckets.push({
          label,
          total,
          malicious,
          percentage
        });
      }
      return buckets;
    };

    const buckets = processData();

    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex items-end justify-between flex-1 gap-[2px] px-1 relative min-h-0">
          {buckets.map((b, i) => {
            return (
              <div key={i} className="flex-1 flex flex-col h-full group">
                {/* Bar Container */}
                <div className="flex-1 relative flex flex-col justify-end w-full">
                  {/* Background Bar (Total Capacity) */}
                  <div className="absolute inset-0 bg-sidebar rounded-t-[1px] transition-colors group-hover:bg-neutral-500/10" />
                  
                  {/* Malicious Fill (Percentage) */}
                  <div 
                    className={`w-full transition-all duration-700 ease-out rounded-t-[1px] relative z-10 ${
                      b.malicious > 0 
                        ? 'bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]' 
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${b.percentage}%` }}
                  >
                    {b.malicious > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-accent">
                        {Math.round(b.percentage)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Tooltip Flyout */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border border-border text-fg text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 font-black uppercase tracking-tighter shadow-xl">
                    {b.percentage.toFixed(1)}% Malicious ({b.malicious}/{b.total})
                  </div>
                </div>

                {/* Direct Hourly Label */}
                <div className="pt-2 mt-2 border-t border-border w-full text-center shrink-0">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase">
                    {b.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const SeverityDistribution = ({ data, total }) => {
    if (!data) return null;
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const colors = {
      LOW: 'bg-blue-500',
      MEDIUM: 'bg-yellow-500',
      HIGH: 'bg-orange-500',
      CRITICAL: 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.2)]'
    };

    return (
      <div className="space-y-4">
        {levels.map(level => {
          const count = data[level] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={level} className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                <span>{level}</span>
                <span className="text-fg font-bold">{count}</span>
              </div>
              <div className="h-[2px] bg-neutral-800/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colors[level]} transition-all duration-1000`} 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ThreatTypeChart = ({ data }) => {
    if (!data || data.length === 0) {
      return <div className="h-48 flex items-center justify-center text-neutral-600">No threat data</div>;
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border">
              <span className="text-neutral-500 font-mono text-xs uppercase">{item._id}</span>
              <span className="text-fg font-bold">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-center">
          <Shield size={48} className="text-fg mx-auto mb-4 animate-pulse" />
          <p className="text-neutral-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-neutral-500">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-fg text-bg rounded hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const PortBarList = ({ data }) => {
    if (!data || data.length === 0) return null;
    const top3 = data.slice(0, 3);
    const maxCount = top3[0]?.count || 1;

    return (
      <div className="space-y-5 py-2">
        {top3.map((item, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono tracking-tighter">
              <div className="flex items-center gap-2">
                <span className="text-fg font-bold">PORT {item._id}</span>
              </div>
              <span className="text-neutral-600 dark:text-neutral-400">{item.count.toLocaleString()} FLOWS</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-1000" 
                style={{ 
                  width: `${(item.count / maxCount) * 100}%`,
                  opacity: 1 - (i * 0.3)
                }} 
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const { summary, attack_type_breakdown: threat_type_breakdown, top_countries, top_ips, top_ports, timeline, recent_attacks: recent_threats } = dashboardData;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2">Security Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-neutral-400 text-sm">Real-time threat monitoring and analysis</p>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-neutral-500 uppercase tracking-tighter">Peak Threat:</span>
              <span className="text-fg font-bold">{summary?.peak_hour || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-sidebar border border-border px-3 py-1.5 rounded-full">
            <div className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Malicious Flows"
          value={summary?.total_attacks?.toLocaleString() || '0'}
          subtitle="Detected today"
        />
        <StatCard
          label="Malicious Rate"
          value={summary?.attack_rate ? `${summary.attack_rate.toFixed(1)}%` : '0%'}
          subtitle="Threat density"
        />
        <StatCard
          label="Top Threat Actor"
          value={top_ips?.[0]?._id || 'N/A'}
          subtitle={`${top_ips?.[0]?.count || 0} hits from ${top_ips?.[0]?.country || 'Unknown'}`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-3 bg-card border border-border rounded-lg p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium uppercase tracking-widest text-neutral-500">Threat Timeline</h3>
          </div>
          <div className="flex-1 min-h-0">
            <TimelineChart data={timeline} timeRange={timeRange} />
          </div>
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm flex-1 flex flex-col">
            <h3 className="text-[10px] font-bold mb-4 uppercase tracking-widest text-neutral-500">Severity</h3>
            <div className="flex-1 overflow-auto">
              <SeverityDistribution data={summary?.severity_distribution} total={summary?.total_attacks} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-[10px] font-bold mb-4 uppercase tracking-widest text-neutral-500">Targeted Ports</h3>
            <PortBarList data={top_ports} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligentIDSDashboard;