'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Activity, AlertTriangle, Ban, FileText, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@guardian.ids' });

  const navItems = [
    { id: 'dashboard', icon: Activity, label: 'Dashboard', path: '/dashboard' },
    { id: 'flows', icon: Shield, label: 'Network Flows', path: '/flows' },
    { id: 'alerts', icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
    { id: 'blocked', icon: Ban, label: 'Blocked IPs', path: '/blocked' },
    { id: 'reports', icon: FileText, label: 'Reports', path: '/reports' },
    { id: 'intel', icon: Search, label: 'Threat Intel', path: '/intel' },
  ];

  const isActive = (path) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-neutral-950 border-r border-neutral-800 flex flex-col transition-all duration-300 h-full`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-neutral-800 px-4">
        {sidebarCollapsed ? (
          <Shield size={24} className="text-white" />
        ) : (
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-white" />
            <span className=" font-light">Guardian IDS</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ id, icon: Icon, label, path }) => (
          <Link
            key={id}
            href={path}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
              isActive(path)
                ? 'bg-white text-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            } ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? label : ''}
          >
            <Icon size={20} />
            {!sidebarCollapsed && <span className="text-sm">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-neutral-800">
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <User size={20} className="text-neutral-400" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="h-12 flex items-center justify-center border-t border-neutral-800 hover:bg-neutral-900 transition-colors text-white"
      >
        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </aside>
  );
};

export default Sidebar;
