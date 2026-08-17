// Local IndexedDB persistence utility for video uploads fallback

const DB_NAME = 'MohamedAbdelTawab_VideoStore';
const STORE_NAME = 'videos';

function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        const nextVersion = (db.version || 1) + 1;
        const req2 = indexedDB.open(DB_NAME, nextVersion);
        req2.onupgradeneeded = (e) => {
          const db2 = (e.target as IDBOpenDBRequest).result;
          if (!db2.objectStoreNames.contains(STORE_NAME)) {
            db2.createObjectStore(STORE_NAME);
          }
        };
        req2.onsuccess = () => resolve(req2.result);
        req2.onerror = () => reject(req2.error);
      } else {
        resolve(db);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a video Blob or File into local IndexedDB permanently.
 * Returns an 'indexeddb://key' URL string that survives page reloads.
 */
export async function saveVideoToIndexedDB(file: Blob, key: string): Promise<string> {
  try {
    const db = await openVideoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, key);
      req.onsuccess = () => resolve(`indexeddb://${key}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to save video to IndexedDB:", err);
    throw err;
  }
}

/**
 * Retrieves a video or file Blob from local IndexedDB by key.
 */
export async function getVideoFromIndexedDB(key: string): Promise<Blob | null> {
  try {
    const db = await openVideoDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Failed to retrieve file from IndexedDB:", err);
    return null;
  }
}

export const getFileFromIndexedDB = getVideoFromIndexedDB;

import { getFileFromFirestoreChunks } from './firestoreMediaStorage';

/**
 * Downloads or opens any file (PDF, worksheet, attachment, video) across Firestore chunks, IndexedDB, Blob, Data URLs, or Firebase Storage.
 */
export async function triggerFileDownload(url: string | undefined | null, fileName?: string): Promise<void> {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === '#') {
    alert('رابط الملف غير متاح حالياً.');
    return;
  }

  const clean = url.trim();
  const safeName = fileName || clean.split('/').pop()?.split('?')[0] || 'lesson_document.pdf';

  // 1. Firestore Cloud Multi-Chunk stored file
  if (clean.startsWith('firestore://')) {
    const key = clean.replace('firestore://', '');
    try {
      const blob = await getFileFromFirestoreChunks(key);
      if (blob) {
        const mimeType = (blob.type && blob.type.trim() !== '') 
          ? blob.type 
          : (safeName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const safeBlob = new Blob([blob], { type: mimeType });
        const objectUrl = URL.createObjectURL(safeBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        return;
      } else {
        alert('تعذر تحميل الملف من السحابة.');
        return;
      }
    } catch (err) {
      console.error('Error downloading Firestore chunked file:', err);
      alert('تعذر فتح الملف السحابي.');
      return;
    }
  }

  // 2. IndexedDB stored file
  if (clean.startsWith('indexeddb://')) {
    const key = clean.replace('indexeddb://', '');
    try {
      const blob = await getVideoFromIndexedDB(key);
      if (blob) {
        const mimeType = (blob.type && blob.type.trim() !== '') 
          ? blob.type 
          : (safeName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const safeBlob = new Blob([blob], { type: mimeType });
        const objectUrl = URL.createObjectURL(safeBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        return;
      } else {
        alert('الملف غير موجود في التخزين المحلي المحفوظ.');
        return;
      }
    } catch (err) {
      console.error('Error downloading IndexedDB file:', err);
      alert('تعذر فتح الملف المحلي.');
      return;
    }
  }

  // 2. Data URL or Blob URL
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = clean;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 3. HTTP / HTTPS / Firebase Storage file
  try {
    const response = await fetch(clean, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
      return;
    }
  } catch (e) {
    console.warn('Direct fetch download fallback to direct anchor link:', e);
  }

  // Fallback direct anchor click / new tab
  const a = document.createElement('a');
  a.href = clean;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
