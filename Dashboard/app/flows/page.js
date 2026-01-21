'use client';

import React, { useState } from 'react';

const FlowsPage = () => {
  const [flows] = useState([]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-2">Network Flows</h2>
        <p className="text-neutral-400 text-sm">Monitor all network traffic</p>
      </div>
      
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-neutral-800">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-normal text-neutral-400 uppercase tracking-wider">Source IP</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-neutral-400 uppercase tracking-wider">Destination IP</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-neutral-400 uppercase tracking-wider">Protocol</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-normal text-neutral-400 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {flows.length > 0 ? (
              flows.map((flow, i) => (
                <tr key={i} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-white">{flow.src_ip}</td>
                  <td className="px-6 py-4 text-sm font-mono text-white">{flow.dst_ip}</td>
                  <td className="px-6 py-4 text-sm text-neutral-300">{flow.protocol}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      flow.malicious ? 'bg-white text-black' : 'bg-neutral-800 text-white'
                    }`}>
                      {flow.malicious ? 'Malicious' : 'Benign'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-400">{flow.timestamp}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-neutral-500">
                  No network flows detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FlowsPage;
