import { ref, set, get, remove, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase';

// ================== Your existing Sync Service ==================
const validateAccess = () => {
  const deviceId = localStorage.getItem('arkive-device-id');
  if (!deviceId) throw new Error('Device not authorized');
  return deviceId;
};

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
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000);
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
        this.syncQueue = JSON.parse(savedQueue);
      } catch {
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue(): void {
    localStorage.setItem('arkive-sync-queue', JSON.stringify(this.syncQueue));
  }

  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'deviceId'>) {
    try { validateAccess(); } catch { return; }

    const syncOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      deviceId: this.deviceId
    };

    this.syncQueue.push(syncOp);
    this.saveSyncQueue();
    if (this.isOnline) await this.processSyncQueue();
  }

  private async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0 || this.retryAttempts >= this.maxRetries) return;
    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of queue) {
      try {
        await this.syncToFirebase(operation);
      } catch {
        this.retryAttempts++;
        this.syncQueue.push(operation);
      }
    }

    this.saveSyncQueue();
  }

  private async syncToFirebase(operation: SyncOperation) {
    validateAccess();
    if (!this.isOnline) throw new Error('Offline');

    const path = `${operation.store}/${operation.data.id}`;
    const dataRef = ref(rtdb, path);

    if (operation.type === 'create' || operation.type === 'update') {
      await set(dataRef, {
        ...operation.data,
        lastModified: new Date(operation.timestamp).toISOString(),
        syncedBy: this.deviceId
      });
    } else if (operation.type === 'delete') {
      await remove(dataRef);
    }
  }

  async getStoreFromFirebase(storeName: string) {
    validateAccess();
    if (!this.isOnline) throw new Error('Offline');

    const storeRef = ref(rtdb, storeName);
    const snapshot = await get(storeRef);
    const data = snapshot.val();
    if (!data) return [];
    return Object.values(data).map((item: any) => ({
      ...item,
      date: item.date ? new Date(item.date) : undefined
    }));
  }

  setupRealtimeListener(storeName: string, callback: (data: any[]) => void) {
    validateAccess();
    if (this.listeners[storeName]) return; // ✅ Prevent duplicate listener

    const storeRef = ref(rtdb, storeName);
    const listener = onValue(storeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.values(data)
          .filter((item: any) => item.syncedBy !== this.deviceId)
          .map((item: any) => ({
            ...item,
            date: item.date ? new Date(item.date) : undefined
          }));
        callback(items);
      } else {
        callback([]);
      }
    });

    this.listeners[storeName] = { ref: storeRef, listener };
  }

  removeRealtimeListener(storeName: string) {
    const l = this.listeners[storeName];
    if (l) {
      off(l.ref);
      delete this.listeners[storeName];
      console.log(`✅ Listener removed for ${storeName}`);
    }
  }
}

export const firebaseSync = new FirebaseSyncService();

// ================== New: Receipts-specific listener ==================
let receiptsRefObj: any = null;

export function startRealtimeReceiptsListener(callback: (data: any[]) => void) {
  if (receiptsRefObj) return; // ✅ Prevent duplicate listener

  receiptsRefObj = ref(rtdb, 'receipts');
  onValue(receiptsRefObj, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const items = Object.values(data).map((item: any) => ({
        ...item,
        date: item.date ? new Date(item.date) : undefined
      }));
      callback(items);
    } else {
      callback([]);
    }
  });
}

export function removeRealtimeListener() {
  if (receiptsRefObj) {
    off(receiptsRefObj);
    receiptsRefObj = null;
    console.log("✅ Receipts listener removed");
  }
}
