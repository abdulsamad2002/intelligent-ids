'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const CATEGORY_MAP = {
  3: 'Fraud Orders',
  4: 'DDoS Attack',
  5: 'FTP Brute-Force',
  9: 'Open Proxy',
  10: 'Web Spam',
  11: 'Email Spam',
  14: 'Port Scan',
  15: 'Hacking',
  18: 'Brute-Force',
  19: 'Bad Bot',
  20: 'Exploited Host',
  21: 'Web App Attack',
  22: 'SSH Brute-Force',
  23: 'IoT Targeting'
};

const IntelPage = () => {
  const [enrichedFlows, setEnrichedFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    autoSyncAndFetch();
  }, []);

  const autoSyncAndFetch = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Silent Background Sync
      fetch(`${BACKEND_URL}/api/threat-intel/sync-alerts`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` } 
      }).catch(err => {});

      // Fetch Data
      const res = await fetch(`${BACKEND_URL}/api/flows?enriched=true&unique=true&min_severity=8&limit=50`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await res.json();
      
      if (data.success) {
        setEnrichedFlows(data.data);
      }
    } catch (error) {
      console.error('Automated fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrimaryCategory = (categories) => {
    if (!categories || categories.length === 0) return 'Unclassified';
    return CATEGORY_MAP[categories[0]] || 'General Malice';
  };

  return (
    <div className="animate-in fade-in duration-700">
      <div className="bg-card border border-border rounded-lg overflow-hidden relative min-h-[600px]">
        {loading && (
           <div className="absolute inset-0 bg-bg/40 backdrop-blur-sm z-10 flex items-center justify-center">
              <Loader2 size={24} className="text-fg animate-spin opacity-20" />
           </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sidebar border-b border-border">
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Attacker Identity</th>
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest text-center">Global Risk</th>
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Global Intent</th>
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Local Detection</th>
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest text-center">Local Sev</th>
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Provider Context</th>
                <th className="px-6 py-4 text-[9px] font-bold text-neutral-500 uppercase tracking-widest text-right">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrichedFlows.map((flow) => (
                <tr key={flow._id} className="hover:bg-fg/[0.02] transition-colors group">
                  {/* IP & Location */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-mono font-bold text-fg tracking-tight leading-none mb-1">{flow.src_ip}</span>
                      <span className="text-[9px] text-neutral-500 uppercase font-black tracking-tighter">{flow.src_country_name || 'Global'}</span>
                    </div>
                  </td>

                  {/* Abuse Score */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-mono font-black ${flow.threat_intel?.abuse_score > 80 ? 'text-red-500' : 'text-fg'}`}>
                        {flow.threat_intel?.abuse_score}%
                      </span>
                    </div>
                  </td>

                  {/* Global Intent */}
                  <td className="px-6 py-4">
                    <span className="text-xs text-neutral-400 font-medium">
                      {getPrimaryCategory(flow.threat_intel?.categories)}
                    </span>
                  </td>

                  {/* Local Vector */}
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-fg font-bold uppercase tracking-tight">
                      {flow.attack_type || 'Unknown'}
                    </span>
                  </td>

                  {/* Local Severity */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        flow.severity_score >= 9 ? 'border-red-500/30 text-red-500 bg-red-500/5' : 'border-orange-500/30 text-orange-500 bg-orange-500/5'
                      }`}>
                        {flow.severity_score}
                      </div>
                    </div>
                  </td>

                  {/* ISP */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col max-w-[180px]">
                      <span className="text-[11px] text-fg/80 font-bold truncate leading-none mb-1">
                        {flow.threat_intel?.isp || 'Unknown Provider'}
                      </span>
                      <span className="text-[9px] text-neutral-500 truncate font-mono uppercase">
                        {flow.threat_intel?.domain || 'no-ptr'}
                      </span>
                    </div>
                  </td>

                  {/* Usage Type */}
                  <td className="px-6 py-4 text-right">
                    <span className="text-[9px] text-neutral-500 uppercase font-black tracking-widest italic">
                      {flow.threat_intel?.usage_type || 'Unclassified'}
                    </span>
                  </td>
                </tr>
              ))}
              
              {enrichedFlows.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-black">
                      No matching high-severity threats in signal buffer
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IntelPage;
