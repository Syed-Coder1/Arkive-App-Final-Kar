import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Shield, Users, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
import { firebaseSync } from '../services/firebaseSync';

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [canCreateAdmin, setCanCreateAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<string>('Checking...');
  const { login } = useAuth();

  useEffect(() => {
    checkAdminCount();
    checkConnectionStatus();
    
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectionStatus();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('Offline Mode');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      if (isOnline) {
        const connected = await firebaseSync.checkConnection();
        setSyncStatus(connected ? 'Connected to Firebase' : 'Connection Issues');
      } else {
        setSyncStatus('Offline Mode');
      }
    } catch (error) {
      setSyncStatus('Connection Error');
      console.warn('Connection check failed:', error);
    }
  };

  const checkAdminCount = async () => {
    try {
      const users = await db.getAllUsers();
      const adminCount = users.filter(u => u.role === 'admin').length;
      setCanCreateAdmin(adminCount < 2);
    } catch (error) {
      console.error('Error checking admin count:', error);
      setCanCreateAdmin(true); // Allow creation if error (might be initial setup)
    }
  };

  const validateForm = () => {
    setError('');
    
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        // Check if username already exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
          setError('Username already exists');
          return;
        }

        // Create admin account
        await db.createUser({
          username,
          password,
          role: 'admin',
          createdAt: new Date(),
        });

        // Sync to Firebase if online
        if (isOnline) {
          try {
            await firebaseSync.addToSyncQueue({
              type: 'create',
              store: 'users',
              data: {
                id: crypto.randomUUID(),
                username,
                password,
                role: 'admin',
                createdAt: new Date(),
              }
            });
          } catch (syncError) {
            console.warn('Failed to sync to Firebase:', syncError);
          }
        }

        // Log the account creation
        await db.createActivity({
          userId: 'system',
          action: 'admin_signup',
          details: `New admin account created: ${username}. Connection: ${isOnline ? 'Online' : 'Offline'}`,
          timestamp: new Date(),
        });

        setSuccess('Admin account created successfully! You can now login.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        
        // Recheck admin count
        await checkAdminCount();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4 animate-gradient-flow">
      <div className="glass-card rounded-3xl shadow-premium-lg p-10 w-full max-w-lg animate-fadeIn">
        {/* Logo and Branding */}
        <div className="text-center mb-10">
          <div className="mx-auto w-28 h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-premium-lg animate-gentle-bounce">
            <Shield className="w-16 h-16 text-white drop-shadow-lg" />
          </div>
          <div className="mb-2">
            <h1 className="text-5xl font-bold text-gradient mb-2">
              Arkive
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-bold mt-3">
              Secure Tax Management System
            </p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-3 text-sm mt-6 glass-card rounded-full px-6 py-3 border border-gray-200 dark:border-gray-600">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className={`font-bold ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {syncStatus}
            </span>
          </div>
          
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400 mt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-2">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold">Encrypted</span>
            </div>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-2">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <span className="font-semibold">Multi-User</span>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-4 mb-10">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`w-full py-5 px-8 rounded-2xl text-lg font-bold transition-all duration-500 flex items-center justify-center shadow-premium ${
              mode === 'login'
                ? 'btn-premium text-white shadow-premium-lg transform scale-105'
                : 'glass-card text-gray-600 dark:text-gray-400 hover:scale-102 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <LogIn className="w-6 h-6 mr-4" />
            Sign In to Account
          </button>
          
          <button
            type="button"
            onClick={() => switchMode('signup')}
            disabled={!canCreateAdmin}
            className={`w-full py-5 px-8 rounded-2xl text-lg font-bold transition-all duration-500 flex items-center justify-center shadow-premium ${
              mode === 'signup'
                ? 'btn-premium text-white shadow-premium-lg transform scale-105'
                : 'glass-card text-gray-600 dark:text-gray-400 hover:scale-102 border border-gray-200 dark:border-gray-600'
            } ${!canCreateAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <UserPlus className="w-6 h-6 mr-4" />
            Create Admin Account
          </button>
        </div>

        {/* Admin Limit Notice */}
        {!canCreateAdmin && mode === 'signup' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Maximum admin accounts (2) reached. Only login is available.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg font-medium"
              placeholder="Enter your username"
              required
              autoFocus
              minLength={3}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg font-medium"
                placeholder="Enter your password"
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg font-medium"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl flex items-center animate-slideInRight shadow-lg">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-6 py-4 rounded-xl flex items-center animate-slideInRight shadow-lg">
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !canCreateAdmin)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {mode === 'login' ? (
                  <>
                    <LogIn className="w-6 h-6 mr-3" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-6 h-6 mr-3" />
                    Create Admin Account
                  </>
                )}
              </div>
            )}
          </button>
        </form>

        {/* Security Features */}
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Security Features
            </p>
            <div className="grid grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-center">
                <Shield className="w-4 h-4 mr-2 text-green-500" />
                <span className="font-medium">Firebase Sync</span>
              </div>
              <div className="flex items-center justify-center">
                <Users className="w-4 h-4 mr-2 text-blue-500" />
                <span className="font-medium">Session Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Default Credentials */}
        {mode === 'login' && (
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700">
            <p className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Default Admin Credentials:</p>
            <div className="space-y-3">
              <p className="flex items-center justify-center gap-2">
                Username: <code className="bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded-lg font-mono font-bold text-blue-800 dark:text-blue-200">admin</code>
              </p>
              <p className="flex items-center justify-center gap-2">
                Password: <code className="bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded-lg font-mono font-bold text-blue-800 dark:text-blue-200">admin123</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}