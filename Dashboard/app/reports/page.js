'use client';

import React from 'react';

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-2">Reports</h2>
        <p className="text-neutral-400 text-sm">System reports and traffic analysis</p>
      </div>
      
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center text-neutral-500">
        <p>No reports available</p>
      </div>
    </div>
  );
};

export default ReportsPage;
