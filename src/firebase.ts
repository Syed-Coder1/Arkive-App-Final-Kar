// firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref } from 'firebase/database';
import { db as localDb } from "./services/database";

const firebaseConfig = {
  apiKey: "AIzaSyDIo7q8OuI1P63q9t9E1s-ENQjBdCd37nI",
  authDomain: "arkive-da661.firebaseapp.com",
  databaseURL: "https://arkive-da661-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "arkive-da661",
  storageBucket: "arkive-da661.appspot.com",
  messagingSenderId: "416097604327",
  appId: "1:416097604327:web:198600d582bd82aeee8842"
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);

// Start realtime sync for receipts
export function startRealtimeListeners() {
  const receiptsRef = ref(rtdb, 'receipts');
  onValue(receiptsRef, async (snapshot) => {
    const data = snapshot.val() || {};
    const receipts = Object.values(data);

    // Clear local IndexedDB and replace with Firebase data
    await localDb.clearStore('receipts');
    for (const r of receipts) {
      await localDb.createReceipt(r);
    }

    console.log('Receipts updated from Firebase');
  });
}
