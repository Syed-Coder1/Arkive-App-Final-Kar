import { ref, set, get, remove, onValue, off, push } from 'firebase/database';
import { rtdb } from '../firebase';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: Date;
  deviceId: string;
}

class FirebaseSyncService {
  private deviceId: string;
  private isOnline = navigator.onLine;
  private syncQueue: SyncOperation[] = [];
  private listeners: { [key: string]: any } = {};
  private retryAttempts = 0;
  private maxRetries = 3;
  private syncInProgress = false;

  constructor() {
    this.deviceId = this.getDeviceId();

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.retryAttempts = 0;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    this.loadSyncQueue();
    
    // Process sync queue every 10 seconds when online
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, 10000);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('arkive-device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
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
      } catch {
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue(): void {
    localStorage.setItem('arkive-sync-queue', JSON.stringify(this.syncQueue));
  }

  async checkConnection(): Promise<boolean> {
    if (!this.isOnline) return false;
    
    try {
      const testRef = ref(rtdb, '.info/connected');
      const snapshot = await get(testRef);
      return snapshot.exists();
    } catch (error) {
      console.warn('Firebase connection check failed:', error);
      return false;
    }
  }

  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'deviceId'>) {
    const syncOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      deviceId: this.deviceId
    };

    this.syncQueue.push(syncOp);
    this.saveSyncQueue();
    
    if (this.isOnline && !this.syncInProgress) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0 || this.retryAttempts >= this.maxRetries || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of queue) {
      try {
        await this.syncToFirebase(operation);
        console.log(`✅ Synced ${operation.type} operation for ${operation.store}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${operation.type} operation for ${operation.store}:`, error);
        this.retryAttempts++;
        this.syncQueue.push(operation);
      }
    }

    this.saveSyncQueue();
    this.syncInProgress = false;
  }

  private async syncToFirebase(operation: SyncOperation) {
    if (!this.isOnline) throw new Error('Offline');

    const path = `${operation.store}/${operation.data.id}`;
    const dataRef = ref(rtdb, path);

    if (operation.type === 'create' || operation.type === 'update') {
      const syncData = {
        ...operation.data,
        lastModified: operation.timestamp.toISOString(),
        syncedBy: this.deviceId,
        // Convert dates to ISO strings for Firebase
        ...(operation.data.date && { date: operation.data.date instanceof Date ? operation.data.date.toISOString() : operation.data.date }),
        ...(operation.data.createdAt && { createdAt: operation.data.createdAt instanceof Date ? operation.data.createdAt.toISOString() : operation.data.createdAt }),
        ...(operation.data.updatedAt && { updatedAt: operation.data.updatedAt instanceof Date ? operation.data.updatedAt.toISOString() : operation.data.updatedAt }),
        ...(operation.data.lastLogin && { lastLogin: operation.data.lastLogin instanceof Date ? operation.data.lastLogin.toISOString() : operation.data.lastLogin }),
        ...(operation.data.uploadedAt && { uploadedAt: operation.data.uploadedAt instanceof Date ? operation.data.uploadedAt.toISOString() : operation.data.uploadedAt }),
        ...(operation.data.joinDate && { joinDate: operation.data.joinDate instanceof Date ? operation.data.joinDate.toISOString() : operation.data.joinDate }),
        ...(operation.data.timestamp && { timestamp: operation.data.timestamp instanceof Date ? operation.data.timestamp.toISOString() : operation.data.timestamp }),
      };

      await set(dataRef, syncData);
    } else if (operation.type === 'delete') {
      await remove(dataRef);
    }
  }

  async getStoreFromFirebase(storeName: string): Promise<any[]> {
    if (!this.isOnline) throw new Error('Offline');

    try {
      const storeRef = ref(rtdb, storeName);
      const snapshot = await get(storeRef);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.values(data).map((item: any) => this.deserializeItem(item));
    } catch (error) {
      console.error(`Error fetching ${storeName} from Firebase:`, error);
      throw error;
    }
  }

  private deserializeItem(item: any): any {
    const deserialized = { ...item };
    
    // Convert ISO strings back to Date objects
    const dateFields = ['date', 'createdAt', 'updatedAt', 'lastLogin', 'uploadedAt', 'joinDate', 'timestamp', 'lastModified', 'lastAccessed'];
    
    dateFields.forEach(field => {
      if (deserialized[field] && typeof deserialized[field] === 'string') {
        try {
          deserialized[field] = new Date(deserialized[field]);
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
    if (this.listeners[storeName]) {
      this.removeRealtimeListener(storeName);
    }

    const storeRef = ref(rtdb, storeName);
    const listener = onValue(storeRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const items = Object.values(data)
            .map((item: any) => this.deserializeItem(item))
            .filter((item: any) => item.syncedBy !== this.deviceId); // Don't sync back our own changes
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
      
      // Update last sync time
      const syncTimeRef = ref(rtdb, `sync_metadata/${this.deviceId}/lastSync`);
      await set(syncTimeRef, new Date().toISOString());
      
      console.log('✅ Full sync completed');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }

  async getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      lastSync: localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime')!) : null,
      deviceId: this.deviceId
    };
  }

  // Specific method for receipts realtime listener (for backward compatibility)
  startRealtimeReceiptsListener(userId: string, callback: (data: any[]) => void) {
    this.setupRealtimeListener('receipts', callback);
  }
}

export const firebaseSync = new FirebaseSyncService();