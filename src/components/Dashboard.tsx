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
  Calculator
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
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer group stagger-item"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold mb-1">₨{stats.totalIncome.toLocaleString()}</p>
              <p className="text-blue-200 text-sm">{stats.totalReceipts} receipts</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-200 text-sm">
            <ArrowRight className="w-4 h-4 mr-1" />
            View all receipts
          </div>
        </div>

        <div 
          onClick={() => onPageChange('expenses')}
          className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer group stagger-item"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <p className="text-3xl font-bold mb-1">₨{stats.totalExpenses.toLocaleString()}</p>
              <p className="text-red-200 text-sm">{expenses.length} entries</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
              <CreditCard className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-red-200 text-sm">
            <ArrowRight className="w-4 h-4 mr-1" />
            Manage expenses
          </div>
        </div>

        <div 
          onClick={() => onPageChange('clients')}
          className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer group stagger-item"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Clients</p>
              <p className="text-3xl font-bold mb-1">{stats.activeClients}</p>
              <p className="text-green-200 text-sm">of {stats.totalClients} total</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-200 text-sm">
            <ArrowRight className="w-4 h-4 mr-1" />
            View all clients
          </div>
        </div>

        <div 
          onClick={() => onPageChange('employees')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer group stagger-item"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Employees</p>
              <p className="text-3xl font-bold mb-1">{stats.activeEmployees}</p>
              <p className="text-purple-200 text-sm">{stats.presentToday} present today</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-purple-200 text-sm">
            <ArrowRight className="w-4 h-4 mr-1" />
            Manage employees
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Net Profit</h3>
            <TrendingUp className={`w-6 h-6 ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <p className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₨{stats.netProfit.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Profit Margin: {stats.profitMargin.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover-lift stagger-item">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">This Month</h3>
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Income:</span>
              <span className="font-semibold text-green-600">₨{stats.monthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Expenses:</span>
              <span className="font-semibold text-red-600">₨{stats.monthlyExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => onPageChange('notifications')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover-lift cursor-pointer group stagger-item"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <Bell className="w-6 h-6 text-orange-500 group-hover:animate-gentle-bounce" />
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats.unreadNotifications}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {stats.unreadNotifications > 0 ? 'Unread messages' : 'All caught up!'}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 stagger-item">
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
              <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="income" />
              <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 stagger-item">
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
                stroke="#3B82F6" 
                strokeWidth={4}
                dot={{ fill: '#3B82F6', strokeWidth: 3, r: 6 }}
                activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 3, fill: '#ffffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 stagger-item">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onOpenForm('receipt')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 transition-all duration-300 group border border-blue-200 dark:border-blue-800"
          >
            <Receipt className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-blue-900 dark:text-blue-100">Add Receipt</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">Record new payment</p>
            </div>
          </button>

          <button
            onClick={() => onOpenForm('client')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/30 transition-all duration-300 group border border-green-200 dark:border-green-800"
          >
            <Users className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-green-900 dark:text-green-100">Add Client</p>
              <p className="text-sm text-green-600 dark:text-green-300">New client profile</p>
            </div>
          </button>

          <button
            onClick={() => onOpenForm('expense')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl hover:from-red-100 hover:to-red-200 dark:hover:from-red-800/30 dark:hover:to-red-700/30 transition-all duration-300 group border border-red-200 dark:border-red-800"
          >
            <CreditCard className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-red-900 dark:text-red-100">Add Expense</p>
              <p className="text-sm text-red-600 dark:text-red-300">Record expense</p>
            </div>
          </button>

          <button
            onClick={() => onOpenForm('vault')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30 transition-all duration-300 group border border-purple-200 dark:border-purple-800"
          >
            <Shield className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-purple-900 dark:text-purple-100">Upload Document</p>
              <p className="text-sm text-purple-600 dark:text-purple-300">Secure vault</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receipts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 stagger-item">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-600" />
              Recent Receipts
            </h3>
            <button
              onClick={() => onPageChange('receipts')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentReceipts.length > 0 ? (
              recentReceipts.map((receipt, index) => (
                <div 
                  key={receipt.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
                  onClick={() => onPageChange('receipts')}
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{receipt.clientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(receipt.date, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₨{receipt.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {receipt.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No receipts yet</p>
                <button
                  onClick={() => onOpenForm('receipt')}
                  className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Add your first receipt
                </button>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 stagger-item">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              System Status
            </h3>
            <div className={`w-3 h-3 rounded-full ${syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                {syncStatus.isOnline ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  Firebase Connection
                </span>
              </div>
              <span className={`text-sm font-semibold ${
                syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {syncStatus.isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Last Sync
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {syncStatus.lastSync ? format(syncStatus.lastSync, 'HH:mm') : 'Never'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Pending Changes
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {syncStatus.queueLength}
              </span>
            </div>

            {syncStatus.queueLength > 0 && (
              <button
                onClick={handleForceSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Business Insights */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-8 shadow-xl stagger-item">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Business Insights</h3>
            <p className="text-indigo-100">Key performance indicators for your tax office</p>
          </div>
          <BarChart3 className="w-12 h-12 text-indigo-200" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-indigo-100 text-sm mb-1">Average Receipt Value</p>
            <p className="text-2xl font-bold">
              ₨{stats.totalReceipts > 0 ? Math.round(stats.totalIncome / stats.totalReceipts).toLocaleString() : 0}
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-indigo-100 text-sm mb-1">Client Retention</p>
            <p className="text-2xl font-bold">
              {stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-indigo-100 text-sm mb-1">Employee Attendance</p>
            <p className="text-2xl font-bold">
              {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => onPageChange('analytics')}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30"
          >
            <BarChart3 className="w-5 h-5" />
            View Analytics
          </button>
          <button
            onClick={() => onPageChange('tax-calculator')}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30"
          >
            <Calculator className="w-5 h-5" />
            Tax Calculator
          </button>
        </div>
      </div>
    </div>
  );
}