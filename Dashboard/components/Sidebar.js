'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Activity, AlertTriangle, Ban, FileText, Search, Map, ChevronLeft, ChevronRight, User, LogOut, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeContext';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@ids.local' });

  // Load state on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { id: 'dashboard', icon: Activity, label: 'Dashboard', path: '/dashboard' },
    { id: 'flows', icon: Shield, label: 'Network Flows', path: '/flows' },
    { id: 'alerts', icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
    { id: 'map', icon: Map, label: 'Threat Map', path: '/map' },
    { id: 'reports', icon: FileText, label: 'Reports', path: '/reports' },
    { id: 'intel', icon: Search, label: 'Threat Intel', path: '/intel' },
    { id: 'blocked', icon: Ban, label: 'Blocked IPs', path: '/blocked' },
  ];

  const isActive = (path) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar border-r border-border flex flex-col transition-all duration-300 h-full`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-border px-4">
        {sidebarCollapsed ? (
          <Shield size={24} className="text-accent" />
        ) : (
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-accent" />
            <span className=" font-light text-fg">Intelligent IDS</span>
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
                ? 'bg-fg text-bg'
                : 'text-neutral-500 hover:text-fg hover:bg-neutral-500/10'
            } ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? label : ''}
          >
            <Icon size={20} />
            {!sidebarCollapsed && <span className="text-sm">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Theme Toggle & User Profile */}
      <div className="p-4 border-t border-border space-y-4">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-4 py-2 text-neutral-500 hover:text-fg hover:bg-neutral-500/10 rounded transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          title={sidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {!sidebarCollapsed && <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center">
            <User size={20} className="text-neutral-500" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg truncate">{user.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          title={sidebarCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} />
          {!sidebarCollapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Collapse Button */}
      <button
        onClick={toggleSidebar}
        className="h-12 flex items-center justify-center border-t border-border hover:bg-neutral-500/10 transition-colors text-fg"
      >
        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </aside>
  );
};

export default Sidebar;
