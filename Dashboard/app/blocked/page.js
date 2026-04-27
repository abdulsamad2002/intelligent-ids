'use client';

import React, { useState, useEffect } from 'react';
import { Ban, Shield, Trash2, Plus, Search, Globe, Clock, AlertTriangle } from 'lucide-react';

const BlockedPage = () => {
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  const fetchBlockedIPs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/blocked`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setBlockedIPs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch blocked IPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async (e) => {
    e.preventDefault();
    if (!newIP) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/blocked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ip_address: newIP,
          reason: reason || 'Manual block'
        })
      });

      const result = await response.json();
      if (result.success) {
        setStatus({ type: 'success', message: `IP ${newIP} has been blacklisted.` });
        setNewIP('');
        setReason('');
        fetchBlockedIPs();
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to block IP.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Network error occurred.' });
    }
    
    // Clear status after 3 seconds
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const handleUnblockIP = async (ip) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/blocked/${ip}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        fetchBlockedIPs();
      }
    } catch (error) {
      console.error('Failed to unblock IP:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-fg mb-2">Network Blacklist</h1>
        <p className="text-neutral-500 text-sm">Manual IP restriction and access control</p>
      </div>

      {/* Manual Block Form */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
          <Plus size={14} /> Add Manual Restriction
        </h2>
        
        <form onSubmit={handleBlockIP} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">IP Address</label>
            <input 
              type="text"
              placeholder="e.g. 192.168.1.1"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="w-full bg-bg border border-border rounded px-4 py-2 text-fg text-sm focus:border-accent outline-none transition-colors font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Reason / Reference</label>
            <input 
              type="text"
              placeholder="e.g. Suspicious activity"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-bg border border-border rounded px-4 py-2 text-fg text-sm focus:border-accent outline-none transition-colors"
            />
          </div>
          <button 
            type="submit"
            className="bg-fg text-bg text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded hover:opacity-90 transition-opacity h-[38px]"
          >
            Restrict Access
          </button>
        </form>

        {status.message && (
          <div className={`mt-4 px-4 py-2 rounded text-xs font-mono ${
            status.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {status.message}
          </div>
        )}
      </div>

      {/* Blocked IPs Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Active Restrictions</h2>
          <span className="text-[10px] font-mono text-neutral-500 uppercase">Total: {blockedIPs.length}</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sidebar">
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">IP Address</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Reason</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Location</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Date Blocked</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-neutral-500 font-mono text-xs">Scanning registry...</td>
                </tr>
              ) : blockedIPs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-neutral-500 font-mono text-xs">No active restrictions found.</td>
                </tr>
              ) : (
                blockedIPs.map((ip) => (
                  <tr key={ip._id} className="hover:bg-fg/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm text-fg">{ip.ip_address}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500">
                      <span className="px-2 py-0.5 bg-sidebar rounded text-[10px] text-fg/70 border border-border">
                        {ip.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Globe size={12} className="text-neutral-600" />
                        {ip.country_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                      {new Date(ip.blocked_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleUnblockIP(ip.ip_address)}
                        className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                        title="Remove restriction"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlockedPage;
