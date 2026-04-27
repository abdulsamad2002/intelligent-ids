'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const isLoginPage = pathname === '/login';
  const isHomePage = pathname === '/';
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token && !isLoginPage && !isHomePage) {
      router.push('/login');
    } else {
      setIsAuthenticated(!!token);
    }
    setLoading(false);
  }, [pathname, isLoginPage, isHomePage, router]);

  if (isLoginPage || isHomePage) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-fg"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
