import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  Plus,
  X,
  Check,
  AlertCircle,
  Calendar,
  CreditCard,
  BarChart3,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { firebaseSync } from '../services/firebaseSync';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onPageChange: (page: string) => void;
  onOpenForm: (formType: 'receipt' | 'client' | 'expense' | 'vault') => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange, onOpenForm }) => {
  const { 
    receipts, 
    clients, 
    expenses, 
    notifications, 
    employees,
    attendance,
    markNotificationAsRead,
    markAllNotificationsAsRead 
  } = useDatabase();
  const { user } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>({ isOnline: true, queueLength: 0, lastSync: null });
  const [syncing, setSyncing] = useState(false);

  // Load sync status
  useEffect(() => {
    const loadSyncStatus = async () => {
      try {
        const status = await firebaseSync.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Error loading sync status:', error);
      }
    };

    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Force sync function
  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await firebaseSync.performFullSync();
      const status = await firebaseSync.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  // Memoized chart data to prevent flickering
  const chartData = React.useMemo(() => {
    const monthlyData = [];
    const currentMonth = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentMonth, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthReceipts = receipts.filter(r => 
        r.date >= monthStart && r.date <= monthEnd
      );
      const monthExpenses = expenses.filter(e => 
        e.date >= monthStart && e.date <= monthEnd
      );
      
      const income = monthReceipts.reduce((sum, r) => sum + r.amount, 0);
      const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      monthlyData.push({
        month: format(monthDate, 'MMM yy'),
        income,
        expense,
        profit: income - expense,
        receiptCount: monthReceipts.length,
        clientCount: new Set(monthReceipts.map(r => r.clientCnic)).size,
        avgReceiptValue: monthReceipts.length > 0 ? income / monthReceipts.length : 0
      });
    }
    return monthlyData;
  }, [receipts, expenses]);

  const expenseData = React.useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseCategories = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(expenseCategories).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }));
  }, [expenses]);

  // Calculate stats
  const totalRevenue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const unreadNotifications = notifications.filter(n => !n.read);
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;
  const todayAttendance = attendance.filter(att => 
    format(att.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  // Current month stats
  const currentMonth = new Date();
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  
  const currentMonthReceipts = receipts.filter(r => 
    r.date >= currentMonthStart && r.date <= currentMonthEnd
  );
  const currentMonthExpenses = expenses.filter(e => 
    e.date >= currentMonthStart && e.date <= currentMonthEnd
  );
  
  const currentMonthRevenue = currentMonthReceipts.reduce((sum, r) => sum + r.amount, 0);
  const currentMonthExpenseTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0) return;
    
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead();
      setTimeout(() => {
        setShowNotifications(false);
        setIsMarkingAllRead(false);
      }, 500);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setIsMarkingAllRead(false);
    }
  };

  // Quick Actions data
  const quickActions = [
    {
      title: 'New Receipt',
      description: 'Add a new receipt entry',
      icon: Receipt,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      action: () => onOpenForm('receipt')
    },
    {
      title: 'Add Client',
      description: 'Register a new client',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      action: () => onOpenForm('client')
    },
    {
      title: 'Upload Document',
      description: 'Add to secure vault',
      icon: Shield,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      action: () => onOpenForm('vault')
    },
    {
      title: 'Add Expense',
      description: 'Record a new expense',
      icon: CreditCard,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      action: () => onOpenForm('expense')
    }
  ];

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      change: currentMonthRevenue > 0 ? `+Rs. ${currentMonthRevenue.toLocaleString()} this month` : 'No revenue this month',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Total Clients',
      value: clients.length.toString(),
      change: `${clients.filter(c => new Date(c.createdAt) >= currentMonthStart).length} new this month`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Total Expenses',
      value: `Rs. ${totalExpenses.toLocaleString()}`,
      change: currentMonthExpenseTotal > 0 ? `Rs. ${currentMonthExpenseTotal.toLocaleString()} this month` : 'No expenses this month',
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: 'Net Profit',
      value: `Rs. ${netProfit.toLocaleString()}`,
      change: `${netProfit >= 0 ? 'Profit' : 'Loss'} margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
      icon: TrendingUp,
      color: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-4">
            Welcome back, <span className="font-medium text-gray-900 dark:text-white">{user?.username}</span>! 
            <span className="flex items-center gap-2 text-sm">
              {syncStatus.isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
              {syncStatus.queueLength > 0 && (
                <span className="text-orange-600">({syncStatus.queueLength} pending)</span>
              )}
            </span>
          </p>
        </div>
        
        {/* Notifications and Sync */}
        <div className="flex items-center gap-3">
          {/* Sync Button */}
          <button
            onClick={handleForceSync}
            disabled={syncing || !syncStatus.isOnline}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Force sync with Firebase"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>

          {/* Notifications */}
          <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <Bell className="w-6 h-6" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-gentle-bounce shadow-lg">
                {unreadNotifications.length}
              </span>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            title: 'Total Revenue',
            value: `Rs. ${totalRevenue.toLocaleString()}`,
            change: currentMonthRevenue > 0 ? `+Rs. ${currentMonthRevenue.toLocaleString()} this month` : 'No revenue this month',
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
            borderColor: 'border-green-200 dark:border-green-800'
          },
          {
            title: 'Active Clients',
            value: clients.length.toString(),
            change: `${clients.filter(c => new Date(c.createdAt) >= currentMonthStart).length} new this month`,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
            borderColor: 'border-blue-200 dark:border-blue-800'
          },
          {
            title: 'Total Expenses',
            value: `Rs. ${totalExpenses.toLocaleString()}`,
            change: currentMonthExpenseTotal > 0 ? `Rs. ${currentMonthExpenseTotal.toLocaleString()} this month` : 'No expenses this month',
            icon: DollarSign,
            color: 'text-red-600',
            bgColor: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
            borderColor: 'border-red-200 dark:border-red-800'
          },
          {
            title: 'Net Profit',
            value: `Rs. ${netProfit.toLocaleString()}`,
            change: `${netProfit >= 0 ? 'Profit' : 'Loss'} margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
            icon: TrendingUp,
            color: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
            bgColor: netProfit >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
            borderColor: netProfit >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'
          },
          {
            title: 'Employees',
            value: activeEmployees.toString(),
            change: `${todayAttendance.filter(att => att.status === 'present').length} present today`,
            icon: Users,
            color: 'text-purple-600',
            bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
            borderColor: 'border-purple-200 dark:border-purple-800'
          }
        ].map((card, index) => (
          <div
            key={card.title}
            className={`${card.bgColor} ${card.borderColor} p-6 rounded-2xl border-2 hover-lift transition-all duration-300 group cursor-pointer`}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => {
              if (card.title === 'Total Revenue') onPageChange('receipts');
              else if (card.title === 'Active Clients') onPageChange('clients');
              else if (card.title === 'Total Expenses') onPageChange('expenses');
              else if (card.title === 'Employees') onPageChange('employees');
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  {card.title}
                </p>
                <p className={`text-3xl font-bold ${card.color} mt-2 group-hover:scale-105 transition-transform`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.color.replace('text-', 'bg-').replace('-600', '-100')} dark:bg-opacity-20 group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-8 h-8 ${card.color}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
              {card.change}
            </p>
          </div>
        ))}
      </div>
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-slideInRight max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <div className="flex items-center space-x-2">
                    {unreadNotifications.length > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingAllRead}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 transition-colors duration-200"
                      >
                        {isMarkingAllRead ? 'Marking...' : 'Mark All as Read'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-1 rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                          notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {notification.type === 'success' ? (
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : notification.type === 'warning' ? (
                            <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                          ) : notification.type === 'error' ? (
                            <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                          ) : (
                            <Bell className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {format(notification.createdAt, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover-lift">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Revenue Trends (Last 6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-50" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                tickLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }}
                axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                tickLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                tickFormatter={(value) => `${(value / 1000)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `Rs. ${value.toLocaleString()}`, 
                  name === 'income' ? 'Revenue' : name === 'expense' ? 'Expenses' : 'Profit'
                ]}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                labelStyle={{ color: '#374151', fontWeight: 'medium' }}
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10B981" 
                strokeWidth={4} 
                name="Income"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#10B981', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="expense" 
                stroke="#EF4444" 
                strokeWidth={4} 
                name="Expenses"
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#EF4444', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#3B82F6" 
                strokeWidth={4} 
                name="Profit"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover-lift">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            Expense Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => 
                  percentage > 8 ? `${category}` : ''
                }
                outerRadius={90}
                innerRadius={30}
                fill="#8884d8"
                dataKey="amount"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `Rs. ${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`, 
                  'Amount'
                ]}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={action.title}
              onClick={action.action}
              className={`${action.color} ${action.hoverColor} text-white p-6 rounded-2xl transition-all duration-300 hover-lift group shadow-lg hover:shadow-xl`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
                  <action.icon className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">{action.title}</h3>
                  <p className="text-sm opacity-90 mt-1">{action.description}</p>
                </div>
                <Plus className="w-6 h-6 ml-auto group-hover:rotate-90 transition-transform duration-300" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receipts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-600" />
              Recent Receipts
            </h2>
            <button
              onClick={() => onPageChange('receipts')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {receipts.slice(0, 5).map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 transition-all duration-300 cursor-pointer group"
                onClick={() => onPageChange('receipts')}
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
                    {receipt.clientName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {receipt.date ? format(new Date(receipt.date), 'MMM dd, yyyy') : 'No Date'}
                  </p>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg group-hover:scale-105 transition-transform">
                  Rs. {receipt.amount.toLocaleString()}
                </span>
              </div>
            ))}
            {receipts.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No receipts yet</p>
                <button
                  onClick={() => onOpenForm('receipt')}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  Create your first receipt →
                </button>
              </div>
            )}
          </div>
        </div>
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              System Overview
            </h2>
            <button
              onClick={() => onPageChange('activity')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Clients</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{clients.length}</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Active Employees</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{activeEmployees}</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Today's Attendance</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {todayAttendance.filter(att => att.status === 'present').length} / {activeEmployees} Present
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {activeEmployees > 0 ? Math.round((todayAttendance.filter(att => att.status === 'present').length / activeEmployees) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Sync Status</p>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                    {syncStatus.isOnline ? 'Connected' : 'Offline'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {syncStatus.lastSync ? format(syncStatus.lastSync, 'HH:mm') : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600" />
            Recent Expenses
          </h2>
          <button
            onClick={() => onPageChange('expenses')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.slice(0, 6).map((expense, index) => (
            <div
              key={expense.id}
              className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-300 cursor-pointer group"
              onClick={() => onPageChange('expenses')}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  {expense.category}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {format(expense.date, 'MMM dd')}
                </span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white group-hover:text-red-900 dark:group-hover:text-red-100 transition-colors truncate">
                {expense.description}
              </p>
              <p className="font-bold text-red-600 dark:text-red-400 mt-2 group-hover:scale-105 transition-transform">
                Rs. {expense.amount.toLocaleString()}
        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Expenses
            </h2>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {expenses.slice(0, 5).map((expense) => (
              <div
      </div>
    </div>
  );
};