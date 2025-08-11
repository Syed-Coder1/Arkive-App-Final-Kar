import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Receipt,
  CreditCard,
  Calendar,
  DollarSign,
  BarChart3,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Plus,
  Eye,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calculator,
  Bell
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { firebaseSync } from '../services/firebaseSync';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface DashboardProps {
  onPageChange: (page: string) => void;
  onOpenForm: (formType: 'receipt' | 'client' | 'expense' | 'vault') => void;
}

export function Dashboard({ onPageChange, onOpenForm }: DashboardProps) {
  const {
    receipts,
    expenses,
    clients,
    employees,
    attendance,
    notifications,
    receiptsLoading,
    expensesLoading,
    clientsLoading
  } = useDatabase();
  
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<any>({
    isOnline: navigator.onLine,
    queueLength: 0,
    lastSync: null
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await firebaseSync.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await firebaseSync.performFullSync();
      await loadSyncStatus();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalIncome = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthlyIncome = receipts
      .filter(r => r.date >= monthStart && r.date <= monthEnd)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const monthlyExpenses = expenses
      .filter(e => e.date >= monthStart && e.date <= monthEnd)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const activeClients = new Set(receipts.map(r => r.clientCnic)).size;
    const activeEmployees = employees.filter(emp => emp.status === 'active').length;
    
    // Today's attendance
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAttendance = attendance.filter(att => 
      format(att.date, 'yyyy-MM-dd') === today
    );
    const presentToday = todayAttendance.filter(att => att.status === 'present').length;
    
    const unreadNotifications = notifications.filter(n => !n.read).length;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      monthlyIncome,
      monthlyExpenses,
      activeClients,
      totalClients: clients.length,
      totalReceipts: receipts.length,
      activeEmployees,
      totalEmployees: employees.length,
      presentToday,
      unreadNotifications,
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0
    };
  }, [receipts, expenses, clients, employees, attendance, notifications]);

  // Monthly trend data
  const monthlyTrend = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthReceipts = receipts.filter(r => 
        r.date >= monthStart && r.date <= monthEnd
      );
      const monthExpenses = expenses.filter(e => 
        e.date >= monthStart && e.date <= monthEnd
      );
      
      const income = monthReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
      const expense = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      months.push({
        month: format(monthDate, 'MMM'),
        income: Math.round(income),
        expense: Math.round(expense),
        profit: Math.round(income - expense)
      });
    }
    return months;
  }, [receipts, expenses]);

  // Recent activities
  const recentReceipts = receipts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const loading = receiptsLoading || expensesLoading || clientsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Sync Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Here's your business overview for today
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Sync Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {syncStatus.isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              syncStatus.isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
            {syncStatus.queueLength > 0 && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">
                {syncStatus.queueLength} pending
              </span>
            )}
          </div>
          
          <button
            onClick={handleForceSync}
            disabled={syncing || !syncStatus.isOnline}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Force Sync'}
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => onPageChange('receipts')}
          className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-3xl p-8 shadow-premium-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group stagger-item animate-gradient-flow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold tracking-wide uppercase">Total Revenue</p>
              <p className="text-4xl font-bold mb-2 text-shadow">₨{stats.totalIncome.toLocaleString()}</p>
              <p className="text-blue-200 text-sm font-medium">{stats.totalReceipts} receipts</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
              <DollarSign className="w-10 h-10" />
            </div>
          </div>
          <div className="mt-6 flex items-center text-blue-200 text-sm font-medium">
            <ArrowRight className="w-4 h-4 mr-1" />
            View all receipts
          </div>
        </div>

        <div 
          onClick={() => onPageChange('expenses')}
          className="bg-gradient-to-br from-red-500 via-red-600 to-pink-600 text-white rounded-3xl p-8 shadow-premium-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group stagger-item animate-gradient-flow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-semibold tracking-wide uppercase">Total Expenses</p>
              <p className="text-4xl font-bold mb-2 text-shadow">₨{stats.totalExpenses.toLocaleString()}</p>
              <p className="text-red-200 text-sm font-medium">{expenses.length} entries</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
              <CreditCard className="w-10 h-10" />
            </div>
          </div>
          <div className="mt-6 flex items-center text-red-200 text-sm font-medium">
            <ArrowRight className="w-4 h-4 mr-1" />
            Manage expenses
          </div>
        </div>

        <div 
          onClick={() => onPageChange('clients')}
          className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 text-white rounded-3xl p-8 shadow-premium-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group stagger-item animate-gradient-flow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-semibold tracking-wide uppercase">Active Clients</p>
              <p className="text-4xl font-bold mb-2 text-shadow">{stats.activeClients}</p>
              <p className="text-green-200 text-sm font-medium">of {stats.totalClients} total</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Users className="w-10 h-10" />
            </div>
          </div>
          <div className="mt-6 flex items-center text-green-200 text-sm font-medium">
            <ArrowRight className="w-4 h-4 mr-1" />
            View all clients
          </div>
        </div>

        <div 
          onClick={() => onPageChange('employees')}
          className="bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 text-white rounded-3xl p-8 shadow-premium-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-500 cursor-pointer group stagger-item animate-gradient-flow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-semibold tracking-wide uppercase">Employees</p>
              <p className="text-4xl font-bold mb-2 text-shadow">{stats.activeEmployees}</p>
              <p className="text-purple-200 text-sm font-medium">{stats.presentToday} present today</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Users className="w-10 h-10" />
            </div>
          </div>
          <div className="mt-6 flex items-center text-purple-200 text-sm font-medium">
            <ArrowRight className="w-4 h-4 mr-1" />
            Manage employees
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card glass-card rounded-3xl p-8 shadow-premium-lg hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Net Profit</h3>
            <div className={`p-3 rounded-2xl ${stats.netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <TrendingUp className={`w-8 h-8 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className={`text-4xl font-bold mb-2 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₨{stats.netProfit.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Profit Margin: {stats.profitMargin.toFixed(1)}%
          </p>
        </div>

        <div className="premium-card glass-card rounded-3xl p-8 shadow-premium-lg hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">This Month</h3>
            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Income:</span>
              <span className="font-bold text-green-600 text-lg">₨{stats.monthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Expenses:</span>
              <span className="font-bold text-red-600 text-lg">₨{stats.monthlyExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => onPageChange('notifications')}
          className="premium-card glass-card rounded-3xl p-8 shadow-premium-lg hover-lift cursor-pointer group stagger-item"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h3>
            <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/30">
              <Bell className="w-8 h-8 text-orange-600 group-hover:animate-gentle-bounce" />
            </div>
          </div>
          <p className="text-4xl font-bold text-orange-600 mb-2">{stats.unreadNotifications}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {stats.unreadNotifications > 0 ? 'Unread messages' : 'All caught up!'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="chart-container stagger-item">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            6-Month Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                tickFormatter={(value) => `${(value / 1000)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₨${value.toLocaleString()}`, 
                  name === 'income' ? 'Revenue' : name === 'expense' ? 'Expenses' : 'Profit'
                ]}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              />
              <Bar dataKey="income" fill="url(#greenGradient)" radius={[6, 6, 0, 0]} name="income" />
              <Bar dataKey="expense" fill="url(#redGradient)" radius={[6, 6, 0, 0]} name="expense" />
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Trend */}
        <div className="chart-container stagger-item">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Profit Analysis
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }}
                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                tickFormatter={(value) => `${(value / 1000)}K`}
              />
              <Tooltip 
                formatter={(value: number) => [`₨${value.toLocaleString()}`, 'Profit']}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="url(#blueGradient)" 
                strokeWidth={5}
                dot={{ fill: '#3B82F6', strokeWidth: 3, r: 8 }}
                activeDot={{ r: 10, stroke: '#3B82F6', strokeWidth: 3, fill: '#ffffff', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
              />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-3xl p-8 shadow-premium-lg stagger-item">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => onOpenForm('receipt')}
            className="flex items-center gap-3 p-6 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-blue-900/30 dark:via-blue-800/30 dark:to-indigo-800/30 rounded-2xl hover:from-blue-100 hover:via-blue-200 hover:to-indigo-200 dark:hover:from-blue-800/40 dark:hover:via-blue-700/40 dark:hover:to-indigo-700/40 transition-all duration-500 group border-2 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 hover:scale-105 hover:shadow-xl"
          >
            <div className="p-2 bg-blue-600 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-blue-900 dark:text-blue-100 text-lg">Add Receipt</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Record new payment</p>
            </div>
          </button>

          <button
            onClick={() => onOpenForm('client')}
            className="flex items-center gap-3 p-6 bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 dark:from-green-900/30 dark:via-green-800/30 dark:to-emerald-800/30 rounded-2xl hover:from-green-100 hover:via-green-200 hover:to-emerald-200 dark:hover:from-green-800/40 dark:hover:via-green-700/40 dark:hover:to-emerald-700/40 transition-all duration-500 group border-2 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 hover:scale-105 hover:shadow-xl"
          >
            <div className="p-2 bg-green-600 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-green-900 dark:text-green-100 text-lg">Add Client</p>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">New client profile</p>
            </div>
          </button>

          <button
            onClick={() => onOpenForm('expense')}
            className="flex items-center gap-3 p-6 bg-gradient-to-br from-red-50 via-red-100 to-pink-100 dark:from-red-900/30 dark:via-red-800/30 dark:to-pink-800/30 rounded-2xl hover:from-red-100 hover:via-red-200 hover:to-pink-200 dark:hover:from-red-800/40 dark:hover:via-red-700/40 dark:hover:to-pink-700/40 transition-all duration-500 group border-2 border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 hover:scale-105 hover:shadow-xl"
          >
            <div className="p-2 bg-red-600 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-red-900 dark:text-red-100 text-lg">Add Expense</p>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">Record expense</p>
            </div>
          </button>

          <button
            onClick={() => onOpenForm('vault')}
            className="flex items-center gap-3 p-6 bg-gradient-to-br from-purple-50 via-purple-100 to-violet-100 dark:from-purple-900/30 dark:via-purple-800/30 dark:to-violet-800/30 rounded-2xl hover:from-purple-100 hover:via-purple-200 hover:to-violet-200 dark:hover:from-purple-800/40 dark:hover:via-purple-700/40 dark:hover:to-violet-700/40 transition-all duration-500 group border-2 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 hover:scale-105 hover:shadow-xl"
          >
            <div className="p-2 bg-purple-600 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-purple-900 dark:text-purple-100 text-lg">Upload Document</p>
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">Secure vault</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receipts */}
        <div className="glass-card rounded-3xl p-8 shadow-premium-lg stagger-item">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-600" />
              Recent Receipts
            </h3>
            <button
              onClick={() => onPageChange('receipts')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all duration-300 flex items-center gap-1 text-sm font-semibold hover:scale-105"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {recentReceipts.length > 0 ? (
              recentReceipts.map((receipt, index) => (
                <div 
                  key={receipt.id} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 transition-all duration-300 cursor-pointer hover:scale-102 hover:shadow-lg border border-gray-200 dark:border-gray-600"
                  onClick={() => onPageChange('receipts')}
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{receipt.clientName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {format(receipt.date, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-xl">₨{receipt.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">
                      {receipt.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No receipts yet</p>
                <button
                  onClick={() => onOpenForm('receipt')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 text-sm font-semibold hover:scale-105"
                >
                  Add your first receipt
                </button>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="glass-card rounded-3xl p-8 shadow-premium-lg stagger-item">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              System Status
            </h3>
            <div className={`w-4 h-4 rounded-full ${syncStatus.isOnline ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'} animate-pulse shadow-lg`}></div>
          </div>
          
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                {syncStatus.isOnline ? (
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <span className="font-bold text-gray-900 dark:text-white">
                  Firebase Connection
                </span>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {syncStatus.isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  Last Sync
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {syncStatus.lastSync ? format(syncStatus.lastSync, 'HH:mm') : 'Never'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  Pending Changes
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {syncStatus.queueLength}
              </span>
            </div>

            {syncStatus.queueLength > 0 && (
              <button
                onClick={handleForceSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 btn-premium text-white rounded-2xl transition-all duration-300 disabled:opacity-50 font-semibold"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Business Insights */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white rounded-3xl p-10 shadow-premium-lg stagger-item animate-gradient-flow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-3xl font-bold mb-3 text-shadow">Business Insights</h3>
            <p className="text-indigo-100 text-lg font-medium">Key performance indicators for your tax office</p>
          </div>
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-sm">
            <BarChart3 className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300">
            <p className="text-indigo-100 text-sm mb-2 font-semibold uppercase tracking-wide">Average Receipt Value</p>
            <p className="text-3xl font-bold text-shadow">
              ₨{stats.totalReceipts > 0 ? Math.round(stats.totalIncome / stats.totalReceipts).toLocaleString() : 0}
            </p>
          </div>
          
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300">
            <p className="text-indigo-100 text-sm mb-2 font-semibold uppercase tracking-wide">Client Retention</p>
            <p className="text-3xl font-bold text-shadow">
              {stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%
            </p>
          </div>
          
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:bg-white/20 transition-all duration-300">
            <p className="text-indigo-100 text-sm mb-2 font-semibold uppercase tracking-wide">Employee Attendance</p>
            <p className="text-3xl font-bold text-shadow">
              {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex gap-6">
          <button
            onClick={() => onPageChange('analytics')}
            className="flex items-center gap-3 px-8 py-4 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-all duration-300 border border-white/30 hover:scale-105 font-semibold"
          >
            <BarChart3 className="w-6 h-6" />
            View Analytics
          </button>
          <button
            onClick={() => onPageChange('tax-calculator')}
            className="flex items-center gap-3 px-8 py-4 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-all duration-300 border border-white/30 hover:scale-105 font-semibold"
          >
            <Calculator className="w-6 h-6" />
            Tax Calculator
          </button>
        </div>
      </div>
    </div>
  );
}