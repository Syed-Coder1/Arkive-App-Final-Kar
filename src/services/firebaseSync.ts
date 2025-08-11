import { ref, set, get, remove, onValue, off, push, update } from 'firebase/database';
import { rtdb } from '../firebase';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: Date;
  deviceId: string;
  retryCount?: number;
}

class FirebaseSyncService {
  private deviceId: string;
  private isOnline = navigator.onLine;
  private syncQueue: SyncOperation[] = [];
  private listeners: { [key: string]: any } = {};
  private retryAttempts = 0;
  private maxRetries = 3;
  private syncInProgress = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    this.deviceId = this.getDeviceId();
    this.init();
  }

  private async init() {
    try {
      this.initializeConnectionMonitoring();
      this.loadSyncQueue();
      
      // Process sync queue every 5 seconds when online
      setInterval(() => {
        if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
          this.processSyncQueue().catch(console.warn);
        }
      }, 5000);
      
      this.initialized = true;
      console.log('✅ Firebase sync service initialized');
    } catch (error) {
      console.error('❌ Firebase sync initialization failed:', error);
    }
  }

  private initializeConnectionMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.retryAttempts = 0;
      console.log('🌐 Connection restored - processing sync queue');
      this.processSyncQueue().catch(console.warn);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Connection lost - queuing operations');
    });

    // Check Firebase connection every 30 seconds
    this.connectionCheckInterval = setInterval(async () => {
      if (this.isOnline) {
        try {
          const connected = await this.checkConnection();
          if (!connected && this.isOnline) {
            console.warn('🔥 Firebase connection lost despite being online');
          }
        } catch (error) {
          console.warn('Connection check failed:', error);
        }
      }
    }, 30000);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('arkive-device-id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('arkive-device-id', deviceId);
    }
    return deviceId;
  }

  private loadSyncQueue(): void {
    const savedQueue = localStorage.getItem('arkive-sync-queue');
    if (savedQueue) {
      try {
        this.syncQueue = JSON.parse(savedQueue).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
        console.log(`📦 Loaded ${this.syncQueue.length} operations from sync queue`);
      } catch (error) {
        console.error('Error loading sync queue:', error);
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue(): void {
    try {
      localStorage.setItem('arkive-sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!this.isOnline) return false;
    
    try {
      const testRef = ref(rtdb, '.info/connected');
      const snapshot = await get(testRef);
      return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
      console.warn('Firebase connection check failed:', error);
      return false;
    }
  }

  async wipeAllData(): Promise<void> {
    try {
      console.log('🗑️ Wiping all Firebase data...');
      
      // Remove all data stores from Firebase
      const stores = ['users', 'clients', 'receipts', 'expenses', 'employees', 'attendance', 'notifications', 'documents', 'sync_metadata'];
      
      for (const store of stores) {
        try {
          const storeRef = ref(rtdb, store);
          await remove(storeRef);
          console.log(`✅ Cleared ${store} from Firebase`);
        } catch (error) {
          console.warn(`⚠️ Failed to clear ${store}:`, error);
        }
      }
      
      // Clear local sync queue
      this.syncQueue = [];
      this.saveSyncQueue();
      
      // Clear local storage
      localStorage.removeItem('arkive-sync-queue');
      localStorage.removeItem('lastSyncTime');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('arkive-device-id');
      
      console.log('✅ All data wiped successfully');
    } catch (error) {
      console.error('❌ Error wiping data:', error);
      throw error;
    }
  }

  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'deviceId'>) {
    const syncOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      deviceId: this.deviceId,
      retryCount: 0
    };

    // Check for duplicates to prevent duplicate entries
    const existingIndex = this.syncQueue.findIndex(op => 
      op.store === syncOp.store && 
      op.data.id === syncOp.data.id && 
      op.type === syncOp.type
    );

    if (existingIndex !== -1) {
      // Update existing operation instead of adding duplicate
      this.syncQueue[existingIndex] = syncOp;
    } else {
      this.syncQueue.push(syncOp);
    }

    this.saveSyncQueue();
    
    if (this.isOnline && !this.syncInProgress) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0 || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    const queue = [...this.syncQueue];
    const successfulOps: string[] = [];

    console.log(`🔄 Processing ${queue.length} sync operations...`);

    for (const operation of queue) {
      try {
        await this.syncToFirebase(operation);
        successfulOps.push(operation.id);
        console.log(`✅ Synced ${operation.type} operation for ${operation.store}/${operation.data.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${operation.type} operation for ${operation.store}:`, error);
        
        // Increment retry count
        operation.retryCount = (operation.retryCount || 0) + 1;
        
        // Remove operation if max retries exceeded
        if (operation.retryCount >= this.maxRetries) {
          console.warn(`🚫 Max retries exceeded for operation ${operation.id}, removing from queue`);
          successfulOps.push(operation.id);
        }
      }
    }

    // Remove successful operations from queue
    this.syncQueue = this.syncQueue.filter(op => !successfulOps.includes(op.id));
    this.saveSyncQueue();
    this.syncInProgress = false;

    if (successfulOps.length > 0) {
      localStorage.setItem('lastSyncTime', new Date().toISOString());
    }
  }

  private async syncToFirebase(operation: SyncOperation) {
    if (!this.isOnline) throw new Error('Offline');

    const path = `${operation.store}/${operation.data.id}`;
    const dataRef = ref(rtdb, path);

    if (operation.type === 'create' || operation.type === 'update') {
      // Prevent duplicates by checking if record exists for creates
      if (operation.type === 'create') {
        const existing = await get(dataRef);
        if (existing.exists()) {
          console.log(`⚠️ Record already exists, converting to update: ${path}`);
          operation.type = 'update';
        }
      }

      const syncData = this.serializeForFirebase(operation.data);
      syncData.lastModified = operation.timestamp.toISOString();
      syncData.syncedBy = this.deviceId;

      await set(dataRef, syncData);
    } else if (operation.type === 'delete') {
      await remove(dataRef);
    }
  }

  private serializeForFirebase(data: any): any {
    const serialized = { ...data };
    
    // Convert undefined values to null (Firebase doesn't accept undefined)
    const convertUndefinedToNull = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => convertUndefinedToNull(item));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertUndefinedToNull(value);
        }
        return converted;
      }
      
      return obj;
    };
    
    // Apply undefined to null conversion
    const cleanedData = convertUndefinedToNull(serialized);
    
    // Convert Date objects to ISO strings
    const dateFields = [
      'date', 'createdAt', 'updatedAt', 'lastLogin', 'uploadedAt', 
      'joinDate', 'timestamp', 'lastModified', 'lastAccessed', 'checkIn', 'checkOut'
    ];
    
    dateFields.forEach(field => {
      if (cleanedData[field] instanceof Date) {
        cleanedData[field] = cleanedData[field].toISOString();
      }
    });

    // Handle nested date objects in accessLog
    if (cleanedData.accessLog && Array.isArray(cleanedData.accessLog)) {
      cleanedData.accessLog = cleanedData.accessLog.map((log: any) => ({
        ...log,
        timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp
      }));
    }

    return cleanedData;
  }

  async getStoreFromFirebase(storeName: string): Promise<any[]> {
    if (!this.isOnline) throw new Error('Offline');

    try {
      const storeRef = ref(rtdb, storeName);
      const snapshot = await get(storeRef);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.values(data).map((item: any) => this.deserializeFromFirebase(item));
    } catch (error) {
      console.error(`Error fetching ${storeName} from Firebase:`, error);
      throw error;
    }
  }

  private deserializeFromFirebase(item: any): any {
    const deserialized = { ...item };
    
    // Convert ISO strings back to Date objects
    const dateFields = [
      'date', 'createdAt', 'updatedAt', 'lastLogin', 'uploadedAt', 
      'joinDate', 'timestamp', 'lastModified', 'lastAccessed', 'checkIn', 'checkOut'
    ];
    
    dateFields.forEach(field => {
      if (deserialized[field] && typeof deserialized[field] === 'string') {
        try {
          const date = new Date(deserialized[field]);
          if (!isNaN(date.getTime())) {
            deserialized[field] = date;
          }
        } catch (error) {
          console.warn(`Failed to parse date field ${field}:`, error);
        }
      }
    });

    // Handle nested date objects in accessLog
    if (deserialized.accessLog && Array.isArray(deserialized.accessLog)) {
      deserialized.accessLog = deserialized.accessLog.map((log: any) => ({
        ...log,
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
      }));
    }

    return deserialized;
  }

  setupRealtimeListener(storeName: string, callback: (data: any[]) => void) {
    // Remove existing listener if any
    if (this.listeners[storeName]) {
      this.removeRealtimeListener(storeName);
    }

    const storeRef = ref(rtdb, storeName);
    const listener = onValue(storeRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const items = Object.values(data)
            .map((item: any) => this.deserializeFromFirebase(item))
            .filter((item: any) => item.syncedBy !== this.deviceId); // Don't sync back our own changes
          
          console.log(`📡 Realtime update for ${storeName}: ${items.length} items`);
          callback(items);
        } else {
          callback([]);
        }
      } catch (error) {
        console.error(`Error processing realtime update for ${storeName}:`, error);
        callback([]);
      }
    }, (error) => {
      console.error(`Realtime listener error for ${storeName}:`, error);
    });

    this.listeners[storeName] = { ref: storeRef, listener };
    console.log(`✅ Realtime listener setup for ${storeName}`);
  }

  removeRealtimeListener(storeName?: string) {
    if (storeName) {
      const listener = this.listeners[storeName];
      if (listener) {
        off(listener.ref);
        delete this.listeners[storeName];
        console.log(`✅ Listener removed for ${storeName}`);
      }
    } else {
      // Remove all listeners
      Object.keys(this.listeners).forEach(store => {
        const listener = this.listeners[store];
        if (listener) {
          off(listener.ref);
        }
      });
      this.listeners = {};
      console.log('✅ All listeners removed');
    }
  }

  async performFullSync(): Promise<void> {
    if (!this.isOnline) {
      console.warn('Cannot perform full sync - offline');
      return;
    }

    try {
      console.log('🔄 Starting full sync...');
      
      // Process any pending sync operations first
      await this.processSyncQueue();
      
      // Sync all data stores to Firebase
      const stores = ['users', 'clients', 'receipts', 'expenses', 'employees', 'attendance', 'notifications', 'documents'];
      
      for (const store of stores) {
        try {
          console.log(`🔄 Syncing ${store} to Firebase...`);
          const localData = await this.getLocalStoreData(store);
          
          for (const item of localData) {
            await this.addToSyncQueue({
              type: 'create',
              store,
              data: item
            });
          }
        } catch (error) {
          console.warn(`Failed to sync ${store}:`, error);
        }
      }
      
      // Process the sync queue
      await this.processSyncQueue();
      
      // Update last sync time
      const syncTimeRef = ref(rtdb, `sync_metadata/${this.deviceId}/lastSync`);
      await set(syncTimeRef, new Date().toISOString());
      
      localStorage.setItem('lastSyncTime', new Date().toISOString());
      
      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }

  private async getLocalStoreData(storeName: string): Promise<any[]> {
    const { db } = await import('./database');
    
    switch (storeName) {
      case 'users': return await db.getAllUsers();
      case 'clients': return await db.getAllClients();
      case 'receipts': return await db.getAllReceipts();
      case 'expenses': return await db.getAllExpenses();
      case 'employees': return await db.getAllEmployees();
      case 'attendance': return await db.getAllAttendance();
      case 'notifications': return await db.getAllNotifications();
      case 'documents': return await db.getAllDocuments();
      default: return [];
    }
  }

  async getSyncStatus() {
    const lastSyncTime = localStorage.getItem('lastSyncTime');
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      lastSync: lastSyncTime ? new Date(lastSyncTime) : null,
      deviceId: this.deviceId,
      retryAttempts: this.retryAttempts
    };
  }

  // Specific method for receipts realtime listener (for backward compatibility)
  startRealtimeReceiptsListener(userId: string, callback: (data: any[]) => void) {
    this.setupRealtimeListener('receipts', callback);
  }

  // Clean up resources
  destroy() {
    this.removeRealtimeListener();
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }
}

export const firebaseSync = new FirebaseSyncService();