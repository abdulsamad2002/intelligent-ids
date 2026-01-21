"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Activity, AlertTriangle, Ban, FileText, Search, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, Globe, Clock, Zap, Eye, Download, LogOut } from 'lucide-react';
import { io } from 'socket.io-client';

const GuardianIDSDashboard = () => {
  const router = useRouter();

  const [timeRange, setTimeRange] = useState('24h');
  const [dashboardData, setDashboardData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

      const response = await fetch(`${BACKEND_URL}/api/stats?time_range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
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

  const StatCard = ({ label, value, subtitle, trend, icon: Icon, badge }) => (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-neutral-400 text-sm">{label}</p>
          {badge && (
            <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${getThreatBadgeColor(badge)}`}>
              {badge}
            </span>
          )}
        </div>
        {Icon && <Icon size={20} className="text-neutral-600" />}
      </div>
      <p className="text-4xl font-light text-white mb-2">{value || '0'}</p>
      {subtitle && (
        <div className="flex items-center gap-2">
          {trend && (
            trend === 'up' ?
              <TrendingUp size={14} className="text-red-500" /> :
              <TrendingDown size={14} className="text-green-500" />
          )}
          <p className={`text-xs ${trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-neutral-400'}`}>
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );

  const TimelineChart = ({ data, timeRange = '24h' }) => {
    if (!data) return <div className="h-48 flex items-center justify-center text-neutral-600">No timeline data</div>;

    const processData = () => {
      const now = new Date();
      let buckets = [];
      let count = 24;
      let stepInMs = 3600000;

      if (timeRange === '1h') { count = 12; stepInMs = 300000; }
      if (timeRange === '6h') { count = 24; stepInMs = 900000; }
      if (timeRange === '7d') { count = 14; stepInMs = 43200000; }
      if (timeRange === '30d') { count = 30; stepInMs = 86400000; }

      for (let i = count - 1; i >= 0; i--) {
        const time = new Date(now - (i * stepInMs));
        let label = '';
        if (timeRange === '24h' || timeRange === '6h' || timeRange === '1h') {
          label = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
          label = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        const backendMatch = data.find(item => {
          const itemDate = new Date(item._id);
          return Math.abs(itemDate - time) < stepInMs;
        });

        buckets.push({
          label,
          count: backendMatch ? backendMatch.count : 0
        });
      }
      return buckets;
    };

    const buckets = processData();
    const maxVal = Math.max(...buckets.map(b => b.count), 5);

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between h-48 gap-1 px-1">
          {buckets.map((b, i) => {
            const height = (b.count / maxVal) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div
                  className="w-full bg-white/20 group-hover:bg-white transition-all duration-300 rounded-t-sm"
                  style={{ height: `${height}%`, minHeight: b.count > 0 ? '4px' : '0px' }}
                />
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-bold">
                  {b.label}: {b.count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Labels Row */}
        <div className="flex justify-between px-1">
          {buckets.filter((_, i) => i % (buckets.length > 20 ? 4 : 2) === 0).map((b, i) => (
            <span key={i} className="text-[10px] text-neutral-500 font-mono">
              {b.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const AttackTypeChart = ({ data }) => {
    if (!data || data.length === 0) {
      return <div className="h-48 flex items-center justify-center text-neutral-600">No attack type data</div>;
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;

    return (
      <div className="space-y-4">
        <div className="relative w-48 h-48 mx-auto">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.map((item, i) => {
              const percentage = (item.count / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;

              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);

              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={i}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill="white"
                  opacity={0.9 - (i * 0.15)}
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                />
              );
            })}
            <circle cx="50" cy="50" r="25" fill="black" />
          </svg>
        </div>
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded" style={{ opacity: 0.9 - (i * 0.15) }} />
                <span className="text-neutral-300">{item._id}</span>
              </div>
              <span className="text-white font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <Shield size={48} className="text-white mx-auto mb-4 animate-pulse" />
          <p className="text-neutral-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-neutral-400">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, attack_type_breakdown, top_countries, top_ips, timeline, recent_attacks } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light mb-2">Security Dashboard</h1>
          <p className="text-neutral-400 text-sm">Real-time threat monitoring and analysis</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-neutral-400">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Attacks"
          value={summary?.total_attacks?.toLocaleString() || '0'}
          subtitle={`${timeRange.toUpperCase()} period`}
          icon={AlertTriangle}
        />
        <StatCard
          label="Attack Rate"
          value={summary?.attack_rate ? `${summary.attack_rate.toFixed(1)}%` : '0%'}
          subtitle="of total traffic"
          trend={summary?.attack_rate > 10 ? 'up' : 'down'}
          icon={TrendingUp}
        />
        <StatCard
          label="Avg Threat Level"
          value={summary?.avg_threat_level?.toFixed(1) || '0.0'}
          subtitle="out of 10"
          badge={summary?.threat_level}
          icon={Shield}
        />
        <StatCard
          label="Total Flows"
          value={summary?.total_flows?.toLocaleString() || '0'}
          subtitle={`${summary?.benign_flows?.toLocaleString() || '0'} benign`}
          icon={Activity}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-light">Attack Timeline</h3>
            <button className="text-neutral-400 hover:text-white">
              <Download size={18} />
            </button>
          </div>
          <TimelineChart data={timeline} timeRange={timeRange} />
        </div>

        {/* Attack Type Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-lg font-light mb-6">Attack Types</h3>
          <AttackTypeChart data={attack_type_breakdown} />
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Eye size={20} />
          <h3 className="text-lg font-light">Live Attack Stream</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-neutral-400">Real-time</span>
          </div>
        </div>
        {recent_attacks && recent_attacks.length > 0 ? (
          <div className="space-y-3">
            {recent_attacks.map((attack) => (
              <div key={attack.flow_id} className="flex items-center justify-between p-4 bg-neutral-800/30 rounded border-l-4 border-white hover:bg-neutral-800/50 transition-colors">
                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-sm text-white font-medium">{attack.attack_type}</p>
                    <p className="text-xs text-neutral-500 font-mono">{attack.src_ip}</p>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {new Date(attack.timestamp).toLocaleString()}
                  </div>
                  <div className={`text-sm font-medium ${getSeverityColor(attack.severity_score)}`}>
                    Severity: {attack.severity_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1 bg-neutral-700 text-white text-xs rounded hover:bg-neutral-600 transition-colors">
                      Investigate
                    </button>
                    <button className="px-3 py-1 bg-white text-black text-xs rounded hover:bg-neutral-200 transition-colors">
                      Block
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-600">No recent attacks</div>
        )}
      </div>
    </div>
  );
};

export default GuardianIDSDashboard;