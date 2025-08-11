import React, { useState } from 'react';
import {
  Home, Receipt, Users, CreditCard, BarChart3, Activity, HardDrive,
  Settings, LogOut, Menu, X, Moon, Sun, TrendingUp, ChevronLeft, Shield,
  ChevronRight, Bell, Calculator
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'receipts', label: 'Receipts', icon: Receipt },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'vault', label: 'Secure Vault', icon: Shield },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'tax-calculator', label: 'Tax Calculator', icon: Calculator },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'activity', label: 'Activity Log', icon: Activity },
  { id: 'backup', label: 'Backup/Restore', icon: HardDrive },
];

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' ||
        (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [themeTransition, setThemeTransition] = useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  React.useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  const toggleDarkMode = () => {
    setThemeTransition(true);
    setTimeout(() => {
      setDarkMode(!darkMode);
      setTimeout(() => setThemeTransition(false), 300);
    }, 150);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={clsx("flex h-screen bg-gray-50 dark:bg-gray-900 transition-all duration-500", themeTransition && "animate-pulse")}>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg text-gray-900 dark:text-white transition-all duration-300 hover:scale-105 border border-gray-200 dark:border-gray-700"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={clsx(
        "z-40 bg-gradient-to-b from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 shadow-xl transform transition-all duration-300 ease-in-out h-screen flex flex-col",
        sidebarOpen ? "fixed inset-y-0 left-0" : "fixed inset-y-0 left-0 -translate-x-full",
        "lg:translate-x-0 lg:static",
        sidebarCollapsed ? "lg:w-20" : "lg:w-64",
        "w-64" // Always full width on mobile
      )}>
          {/* Header */}
          <div className={clsx("border-b border-blue-500/20 dark:border-gray-700/50", sidebarCollapsed ? "p-4" : "p-6")}>
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-white to-blue-50 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Arkive</h1>
                    <p className="text-sm text-blue-100 mt-1">Tax Management</p>
                  </div>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="flex items-center justify-center w-full">
                  <div className="w-10 h-10 bg-gradient-to-br from-white to-blue-50 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              )}
              <button
                onClick={toggleSidebarCollapse}
                className="hidden lg:block p-2 rounded-lg hover:bg-white/10 text-blue-100 hover:text-white transition-all duration-200"
              >
                <div className={clsx("transition-transform duration-300", sidebarCollapsed ? "rotate-180" : "rotate-0")}>
                  {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </div>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center text-left rounded-2xl transition-all duration-300 sidebar-item-premium",
                    sidebarCollapsed ? "px-3 py-4 justify-center" : "px-5 py-4",
                    currentPage === item.id
                      ? "bg-white/20 text-white shadow-xl backdrop-blur-sm border border-white/20 scale-105"
                      : "text-blue-100 hover:bg-white/15 hover:text-white hover:scale-102"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={22} className={clsx(
                    "transition-all duration-200",
                    sidebarCollapsed ? "mx-auto" : "mr-3",
                    currentPage === item.id ? "text-white drop-shadow-sm" : ""
                  )} />
                  {!sidebarCollapsed && (
                    <span className="transition-all duration-200 font-semibold">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={clsx("border-t border-blue-500/30 dark:border-gray-700/50 mt-auto backdrop-blur-sm", sidebarCollapsed ? "p-4" : "p-6")}>
            {!sidebarCollapsed ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-base font-bold text-white">{user?.username}</p>
                    <p className="text-sm text-blue-200 capitalize flex items-center font-medium">
                      {user?.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user?.role}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleDarkMode}
                      className="p-3 rounded-xl bg-white/15 hover:bg-white/25 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/20"
                      title="Toggle Dark Mode"
                    >
                      <div className={clsx("transition-all duration-300", themeTransition && "animate-spin")}>
                        {darkMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-blue-100" />}
                      </div>
                    </button>
                    <button
                      onClick={() => onPageChange('settings')}
                      className="p-3 text-blue-100 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/15 hover:scale-110 backdrop-blur-sm border border-white/20"
                      title="Settings"
                    >
                      <Settings size={20} />
                    </button>
                    <button
                      onClick={handleLogout}
                      className="p-3 text-blue-100 hover:text-red-300 transition-all duration-300 rounded-xl hover:bg-red-500/30 hover:scale-110 backdrop-blur-sm border border-white/20"
                      title="Logout"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <button 
                  onClick={toggleDarkMode} 
                  className="p-3 rounded-xl bg-white/15 hover:bg-white/25 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-white/20"
                  title="Toggle Dark Mode"
                >
                  <div className={clsx("transition-all duration-300", themeTransition && "animate-spin")}>
                    {darkMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-blue-100" />}
                  </div>
                </button>
                <button
                  onClick={() => onPageChange('settings')}
                  className="p-3 text-blue-100 hover:text-white transition-all duration-300 rounded-xl hover:bg-white/15 hover:scale-110 backdrop-blur-sm border border-white/20"
                  title="Settings"
                >
                  <Settings size={20} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-3 text-blue-100 hover:text-red-300 transition-all duration-300 rounded-xl hover:bg-red-500/30 hover:scale-110 backdrop-blur-sm border border-white/20"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/10">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}