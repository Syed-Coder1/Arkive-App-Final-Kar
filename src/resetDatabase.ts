import { ref, remove } from 'firebase/database';
import { rtdb } from './firebase'; // adjust path if needed

async function resetDatabase() {
  try {
    // 1️⃣ Delete everything in Firebase Realtime Database
    await remove(ref(rtdb, '/'));
    console.log('✅ All Firebase Realtime Database data deleted');

    // 2️⃣ Clear Local Storage
    localStorage.clear();
    console.log('✅ LocalStorage cleared');

    // 3️⃣ Clear IndexedDB
    if ('indexedDB' in window) {
      const dbs = await (window.indexedDB as any).databases();
      for (const db of dbs) {
        await new Promise((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(db.name);
          request.onsuccess = () => resolve(true);
          request.onerror = () => reject();
          request.onblocked = () => resolve(true);
        });
      }
      console.log('✅ IndexedDB cleared');
    }

    console.log('🎉 Reset complete — restart the app and log in fresh');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

resetDatabase();
