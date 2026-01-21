'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const pathname = usePathname();
  
  // Don't show sidebar on login page or home page (which redirects)
  const isLoginPage = pathname === '/login';
  const isHomePage = pathname === '/';
  
  if (isLoginPage || isHomePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto text-white p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
