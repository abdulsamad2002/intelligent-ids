'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 200;
  const router = useRouter();

  const fetchAlerts = async (currentPage) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const skip = (currentPage - 1) * limit;
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${BACKEND_URL}/api/alerts?limit=${limit}&skip=${skip}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setAlerts(result.data);
        setTotalPages(result.pagination.pages || 1);
        setTotalCount(result.pagination.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(page);
    let interval;
    if (page === 1) {
      interval = setInterval(() => fetchAlerts(1), 5000);
    }
    return () => interval && clearInterval(interval);
  }, [page]);

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
      setLoading(true);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
      setLoading(true);
    }
  };

  // Helper to get country flag SVG
  const getFlagSVG = (countryCode) => {
    if (!countryCode || countryCode === 'Unknown' || countryCode === 'LCL') {
      return <span className="mr-2 text-neutral-600">🌐</span>;
    }
    
    const code = countryCode.toLowerCase();
    if (code.length !== 2) return <span className="mr-2 text-neutral-600">🌐</span>;

    return (
      <img 
        src={`https://flagcdn.com/w40/${code}.png`}
        className="w-4 h-3 inline-block mr-2 rounded-[2px] shadow-sm object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        alt={countryCode}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  };

  // Helper to format bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="h-[calc(100vh-50px)] flex flex-col space-y-2">
      <div className="flex justify-between items-end flex-shrink-0 px-1">
        <div>
          <h2 className="text-2xl font-light text-fg mb-1 tracking-tight">Security Alerts</h2>
        </div>
        <div className="text-[10px] font-black text-neutral-500 bg-card px-4 py-1.5 rounded-full border border-border tracking-[0.2em] uppercase">
          Page {page} / {totalPages}
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col flex-grow">
        {/* Scrollable Table Area */}
        <div className="flex-grow overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-sidebar shadow-sm">
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-500 uppercase tracking-widest">Source IP</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-500 uppercase tracking-widest">Destination IP</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-500 uppercase tracking-widest">Protocol</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-500 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-center text-[11px] font-black text-neutral-500 uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-500 uppercase tracking-widest">Size</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-500 uppercase tracking-widest">Confidence</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-500 uppercase tracking-widest">Rate</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-500 uppercase tracking-widest">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-900/10">
              {loading && alerts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                      <span className="text-neutral-600 text-[10px] tracking-widest uppercase font-black">Scanning Alert History...</span>
                    </div>
                  </td>
                </tr>
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr 
                    key={alert._id} 
                    className="group bg-red-500/[0.03] dark:bg-red-500/[0.04] hover:bg-red-500/[0.08] transition-colors duration-150 border-b border-border"
                  >
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-fg/70 group-hover:text-fg">
                      {alert.src_ip}<span className="text-neutral-500 text-xs ml-1 font-normal">:{alert.src_port}</span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-fg/70 group-hover:text-fg">
                      {alert.dst_ip}<span className="text-neutral-500 text-xs ml-1 font-normal">:{alert.dst_port}</span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[10px] text-neutral-500 font-black group-hover:text-neutral-600 uppercase">
                      {alert.protocol}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-xs text-neutral-500 group-hover:text-fg/80">
                      {getFlagSVG(alert.src_country)}
                      {alert.src_city || 'Unknown'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center">
                      <span className="text-[11px] font-black px-3 py-1 rounded-md text-red-500 bg-red-500/10 border border-red-500/20">
                        {alert.severity_score?.toFixed(1) || '0.0'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs text-fg/70 font-mono group-hover:text-fg">
                      {formatBytes(alert.total_bytes)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs text-neutral-500 font-mono group-hover:text-fg/80">
                      {(alert.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-[10px] text-neutral-500 font-mono group-hover:text-neutral-600">
                      {alert.flow_packets_per_sec?.toFixed(1) || '0'} p/s
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs text-fg/70 font-mono group-hover:text-fg">
                      {alert.duration?.toFixed(3) || '0.000'}s
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center text-neutral-700 text-[10px] uppercase tracking-widest font-black">
                    Zero security alerts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fixed Pagination Footer (Slim) */}
        <div className="bg-sidebar px-6 py-2.5 border-t border-border flex items-center justify-between flex-shrink-0">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            Showing <span className="text-fg/80">{(page - 1) * limit + 1}</span>—<span className="text-fg/80">{Math.min(page * limit, totalCount)}</span> of <span className="text-fg/80">{totalCount}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md border transition-all duration-200 ${
                page === 1 
                  ? 'border-border text-neutral-300 dark:text-neutral-800 cursor-not-allowed' 
                  : 'border-border text-fg/60 hover:border-accent hover:text-accent bg-bg shadow-sm'
              }`}
            >
              Prev
            </button>
            <button
              onClick={handleNextPage}
              disabled={page === totalPages}
              className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md border transition-all duration-200 ${
                page === totalPages 
                  ? 'border-border text-neutral-300 dark:text-neutral-800 cursor-not-allowed' 
                  : 'border-border text-fg/60 hover:border-accent hover:text-accent bg-bg shadow-sm'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
