'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const FlowsPage = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 200;
  const router = useRouter();

  const fetchFlows = async (currentPage) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const skip = (currentPage - 1) * limit;
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${BACKEND_URL}/api/flows?limit=${limit}&skip=${skip}`, {
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
        setFlows(result.data);
        setTotalPages(result.pagination.pages || 1);
        setTotalCount(result.pagination.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch flows:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows(page);
    let interval;
    if (page === 1) {
      interval = setInterval(() => fetchFlows(1), 5000);
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

  // Helper to get country flag emoji
  const getFlagEmoji = (countryCode) => {
    if (!countryCode || countryCode === 'Unknown' || countryCode === 'LCL') return '🌐';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char =>  127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
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
          <h2 className="text-2xl font-light text-white mb-1 tracking-tight">Network Traffic Explorer</h2>
          <p className="text-neutral-500 text-xs font-medium">Analyzing {totalCount.toLocaleString()} persistent network flows</p>
        </div>
        <div className="text-[10px] font-black text-neutral-500 bg-neutral-900 px-4 py-1.5 rounded-full border border-neutral-800 tracking-[0.2em] uppercase">
          Page {page} / {totalPages}
        </div>
      </div>
      
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col flex-grow">
        {/* Scrollable Table Area */}
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-neutral-950 shadow-md">
              <tr className="border-b border-neutral-700">
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-400 uppercase tracking-widest">Source IP</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-400 uppercase tracking-widest">Destination IP</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-400 uppercase tracking-widest">Protocol</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-neutral-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-center text-[11px] font-black text-neutral-400 uppercase tracking-widest">Severity</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-400 uppercase tracking-widest">Size</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-400 uppercase tracking-widest">Confidence</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-400 uppercase tracking-widest">Rate</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-neutral-400 uppercase tracking-widest">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {loading && flows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-neutral-600 text-[10px] tracking-widest uppercase font-black">Syncing with DB...</span>
                    </div>
                  </td>
                </tr>
              ) : flows.length > 0 ? (
                flows.map((flow) => (
                  <tr 
                    key={flow._id} 
                    className={`group transition-colors duration-150 border-b border-neutral-800/30 ${
                      flow.is_malicious 
                        ? 'bg-red-500/[0.04] hover:bg-red-500/[0.08]' 
                        : 'bg-blue-500/[0.02] hover:bg-blue-500/[0.06]'
                    }`}
                  >
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-neutral-400 group-hover:text-neutral-200">
                      {flow.src_ip}<span className="text-neutral-700 text-xs ml-1 font-normal">:{flow.src_port}</span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-neutral-400 group-hover:text-neutral-200">
                      {flow.dst_ip}<span className="text-neutral-700 text-xs ml-1 font-normal">:{flow.dst_port}</span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[10px] text-neutral-600 font-black group-hover:text-neutral-400 uppercase">
                      {flow.protocol}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-xs text-neutral-500 group-hover:text-neutral-300">
                      <span className="mr-2 opacity-70">{getFlagEmoji(flow.src_country)}</span>
                      {flow.src_city || 'Unknown'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center">
                      <span className="text-[11px] font-black px-3 py-1 rounded-md text-neutral-400 bg-neutral-800 border border-neutral-700">
                        {flow.severity_score?.toFixed(1) || '0.0'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs text-neutral-400 font-mono group-hover:text-neutral-200">
                      {formatBytes(flow.total_bytes)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs text-neutral-500 font-mono group-hover:text-neutral-300">
                      {(flow.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-[10px] text-neutral-600 font-mono group-hover:text-neutral-400">
                      {flow.flow_packets_per_sec?.toFixed(1) || '0'} p/s
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-xs text-neutral-400 font-mono group-hover:text-neutral-200">
                      {flow.duration?.toFixed(3) || '0.000'}s
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center text-neutral-700 text-[10px] uppercase tracking-widest font-black">
                    Zero traffic packets detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fixed Pagination Footer (Slim) */}
        <div className="bg-neutral-950/90 backdrop-blur-md px-6 py-2.5 border-t border-neutral-800 flex items-center justify-between flex-shrink-0">
          <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
            Showing <span className="text-neutral-400">{(page - 1) * limit + 1}</span>—<span className="text-neutral-400">{Math.min(page * limit, totalCount)}</span> of <span className="text-neutral-400">{totalCount}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md border transition-all duration-200 ${
                page === 1 
                  ? 'border-neutral-800 text-neutral-800 cursor-not-allowed' 
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white bg-neutral-900/50'
              }`}
            >
              Prev
            </button>
            <button
              onClick={handleNextPage}
              disabled={page === totalPages}
              className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md border transition-all duration-200 ${
                page === totalPages 
                  ? 'border-neutral-800 text-neutral-800 cursor-not-allowed' 
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white bg-neutral-900/50'
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

export default FlowsPage;
