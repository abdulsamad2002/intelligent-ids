'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Zap, Clock, Shield, AlertCircle, ChevronRight, FileCheck, Loader2, Trash2 } from 'lucide-react';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reports`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setStatus({ type: '', message: '' }); // Clear previous status
    try {
      const response = await fetch(`${BACKEND_URL}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ time_range: '24h' })
      });
      const result = await response.json();
      if (result.success) {
        setStatus({ type: 'success', message: 'Report generated successfully.' });
        fetchReports();
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to generate report.' });
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setStatus({ type: 'error', message: 'Connection error: Backend may be offline.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async (reportId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reports/${reportId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Security_Report_${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        fetchReports();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Action */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-fg mb-2">Security Intelligence</h1>
          <p className="text-neutral-500 text-sm">Automated AI-driven traffic analysis and audit reports</p>
        </div>
        <button 
          onClick={handleGenerateReport}
          disabled={generating}
          className={`flex items-center gap-2 px-6 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all ${
            generating 
              ? 'bg-sidebar text-neutral-500 cursor-not-allowed' 
              : 'bg-fg text-bg hover:opacity-90 shadow-lg'
          }`}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {generating ? 'AI IS ANALYZING...' : 'GENERATE NEW REPORT'}
        </button>
      </div>

      {status.message && (
        <div className={`p-4 rounded text-xs font-mono border ${
          status.type === 'success' 
            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? <FileCheck size={14} /> : <AlertCircle size={14} />}
            {status.message}
          </div>
        </div>
      )}

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sidebar rounded text-neutral-500">
              <FileCheck size={18} />
            </div>
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Total Archive</h3>
          </div>
          <p className="text-3xl font-light text-fg">{reports.length}</p>
          <p className="text-[10px] text-neutral-500 mt-1 uppercase">Stored Intelligence Reports</p>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sidebar rounded text-neutral-500">
              <Shield size={18} />
            </div>
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Reporting Health</h3>
          </div>
          <p className="text-3xl font-light text-fg">100%</p>
          <p className="text-[10px] text-neutral-500 mt-1 uppercase">AI Engine Status: Operational</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sidebar rounded text-neutral-500">
              <Clock size={18} />
            </div>
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Last Run</h3>
          </div>
          <p className="text-xl font-light text-fg truncate">
            {reports[0] ? new Date(reports[0].createdAt).toLocaleDateString() : 'N/A'}
          </p>
          <p className="text-[10px] text-neutral-500 mt-1 uppercase">Last Intelligence Sweep</p>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Report Archive</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sidebar">
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Report Identity</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Summary</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border">Generated On</th>
                <th className="px-6 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-neutral-500 font-mono text-xs italic">Syncing with Intelligence Database...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-24 text-center">
                    <AlertCircle size={32} className="mx-auto text-neutral-400 mb-4" />
                    <p className="text-neutral-500 text-sm italic font-mono">No intelligence reports have been generated yet.</p>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} className="hover:bg-fg/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-neutral-500 group-hover:text-fg transition-colors" />
                        <div>
                          <p className="text-sm font-bold text-fg">{report.title}</p>
                          <p className="text-[10px] text-neutral-500 uppercase font-mono">{report._id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-[11px] text-fg/80">
                          {report.summary.malicious_count} Threats detected
                        </p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-tighter">
                          Top Vector: {report.summary.top_attack_type}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-sidebar rounded text-[10px] text-fg/70 font-bold border border-border">
                        {report.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                      {new Date(report.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDownloadPDF(report._id)}
                          className="flex items-center gap-2 bg-sidebar border border-border hover:bg-fg hover:text-bg text-fg px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                        >
                          <Download size={12} />
                          PDF
                        </button>
                        <button 
                          onClick={() => handleDeleteReport(report._id)}
                          className="p-1.5 text-neutral-600 hover:text-red-500 transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar Hint */}
      <div className="mt-12 p-6 border border-dashed border-border rounded-lg text-center">
        <p className="text-xs text-neutral-500 italic">
          Tip: AI reports are most effective when based on at least 24 hours of live traffic.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
