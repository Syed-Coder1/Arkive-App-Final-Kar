import { User } from '../types';
import { db } from './database';
import { firebaseSync } from './firebaseSync';
import { startRealtimeListeners } from '../firebase';

class AuthService {
  private currentUser: User | null = null;
  private sessionStartTime: Date | null = null;

  async init(): Promise<void> {
    try {
      console.log('Auth: Initializing Firebase authentication...');
      
      // Check if Firebase is accessible and sync users
      const isConnected = await firebaseSync.checkConnection();
      if (isConnected) {
        try {
          // Sync users from Firebase first
          const firebaseUsers = await firebaseSync.getStoreFromFirebase('users');
          if (firebaseUsers.length > 0) {
            // Clear local users and import from Firebase
            await db.clearStore('users');
            for (const user of firebaseUsers) {
              await db.createUser({
                id: user.id,
                username: user.username,
                password: user.password,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
              });
            }
            console.log('Auth: Users synced from Firebase');
          }
        } catch (syncError) {
          console.warn('Auth: Firebase sync failed, using local data:', syncError);
        }
      }

      // Create default admin account if no users exist
      const allUsers = await db.getAllUsers();
      if (allUsers.length === 0) {
        console.log('Auth: Creating default admin user...');
        const defaultAdmin = await db.createUser({
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date(),
        });

        // Sync to Firebase if connected
        if (isConnected) {
          await firebaseSync.addToSyncQueue({
            type: 'create',
            store: 'users',
            data: defaultAdmin
          });
        }
        console.log('Auth: Default admin user created');
      }

      // Check for stored session
      const storedUser = localStorage.getItem('currentUser');
      const sessionStart = localStorage.getItem('sessionStartTime');
      
      if (storedUser && sessionStart) {
        this.currentUser = JSON.parse(storedUser);
        this.sessionStartTime = new Date(sessionStart);
        
        // Check session timeout (30 minutes)
        const sessionDuration = Date.now() - new Date(sessionStart).getTime();
        const maxSessionTime = 30 * 60 * 1000; // 30 minutes
        
        if (sessionDuration > maxSessionTime) {
          console.log('Auth: Session expired, logging out');
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Auth: Error during initialization:', error);
    }
  }

  async login(username: string, password: string): Promise<User> {
    const user = await db.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      // Log failed login attempt
      await db.createActivity({
        userId: 'system',
        action: 'failed_login',
        details: `Failed login attempt for username: ${username} from IP: ${await this.getClientIP()}`,
        timestamp: new Date(),
      });
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await db.updateUser(user);

    // Sync to Firebase
    const isConnected = await firebaseSync.checkConnection();
    if (isConnected) {
      await firebaseSync.addToSyncQueue({
        type: 'update',
        store: 'users',
        data: user
      });
    }

    this.currentUser = user;
    this.sessionStartTime = new Date();
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('sessionStartTime', this.sessionStartTime.toISOString());

    // Log successful login with session info
    await db.createActivity({
      userId: user.id,
      action: 'login',
      details: `User ${username} logged in successfully. Session started at ${this.sessionStartTime.toLocaleString()}`,
      timestamp: new Date(),
    });

    // ✅ Force fresh data from server
    await firebaseSync.performFullSync();
    startRealtimeListeners();

    return user;
  }

  async logout(): Promise<void> {
    if (this.currentUser && this.sessionStartTime) {
      const sessionDuration = Date.now() - this.sessionStartTime.getTime();
      const durationMinutes = Math.round(sessionDuration / (1000 * 60));
      
      await db.createActivity({
        userId: this.currentUser.id,
        action: 'logout',
        details: `User ${this.currentUser.username} logged out. Session duration: ${durationMinutes} minutes`,
        timestamp: new Date(),
      });
    }

    this.currentUser = null;
    this.sessionStartTime = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionStartTime');
  }

  async register(username: string, password: string, role: 'admin' | 'employee' = 'employee'): Promise<User> {
    // Check if user already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check admin limit
    if (role === 'admin') {
      const users = await db.getAllUsers();
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount >= 2) {
        throw new Error('Maximum number of admin accounts (2) reached');
      }
    }

    // Only admins can create accounts (except for initial setup)
    const users = await db.getAllUsers();
    if (users.length > 0 && (!this.currentUser || this.currentUser.role !== 'admin')) {
      throw new Error('Only administrators can create new accounts');
    }

    const user = await db.createUser({
      username,
      password,
      role,
      createdAt: new Date(),
    });

    // Sync to Firebase
    const isConnected = await firebaseSync.checkConnection();
    if (isConnected) {
      await firebaseSync.addToSyncQueue({
        type: 'create',
        store: 'users',
        data: user
      });
    }

    // Log activity
    if (this.currentUser) {
      await db.createActivity({
        userId: this.currentUser.id,
        action: 'create_user',
        details: `Admin ${this.currentUser.username} created ${role} account for ${username}`,
        timestamp: new Date(),
      });
    } else {
      await db.createActivity({
        userId: 'system',
        action: 'create_user',
        details: `${role} account created for ${username} during initial setup`,
        timestamp: new Date(),
      });
    }

    return user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Math.round((Date.now() - this.sessionStartTime.getTime()) / (1000 * 60));
  }

  getSessionStartTime(): Date | null {
    return this.sessionStartTime;
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) {
      throw new Error('Only administrators can view all users');
    }
    return db.getAllUsers();
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  // Auto-logout on session timeout
  startSessionMonitoring(): void {
    setInterval(() => {
      if (this.sessionStartTime) {
        const sessionDuration = Date.now() - this.sessionStartTime.getTime();
        const maxSessionTime = 30 * 60 * 1000; // 30 minutes
        
        if (sessionDuration > maxSessionTime) {
          this.logout();
          window.location.reload();
        }
      }
    }, 60000); // Check every minute
  }
}

export const auth = new AuthService();