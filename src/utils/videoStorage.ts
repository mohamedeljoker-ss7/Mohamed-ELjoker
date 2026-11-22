// Local IndexedDB persistence utility for video uploads fallback

const DB_NAME = 'MohamedAbdelTawab_VideoStore';
const STORE_NAME = 'videos';

// Fast in-memory Blob cache for instant zero-latency playback across the app
const memoryBlobCache = new Map<string, Blob>();

export function setVideoMemoryCache(key: string, blob: Blob): void {
  if (key && blob) {
    const cleanKey = key.replace('indexeddb://', '').replace('firestore://', '');
    memoryBlobCache.set(cleanKey, blob);
    memoryBlobCache.set(key, blob);
  }
}

export function getVideoFromMemoryCache(key: string): Blob | null {
  if (!key) return null;
  const cleanKey = key.replace('indexeddb://', '').replace('firestore://', '');
  return memoryBlobCache.get(cleanKey) || memoryBlobCache.get(key) || null;
}

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
  const cleanKey = key.replace('indexeddb://', '').replace('firestore://', '');
  setVideoMemoryCache(cleanKey, file);
  try {
    const db = await openVideoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, cleanKey);
      req.onsuccess = () => resolve(`indexeddb://${cleanKey}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to save video to IndexedDB:", err);
    return `indexeddb://${cleanKey}`;
  }
}

/**
 * Retrieves a video or file Blob from memory cache or local IndexedDB by key.
 */
export async function getVideoFromIndexedDB(key: string): Promise<Blob | null> {
  if (!key) return null;
  const cleanKey = key.replace('indexeddb://', '').replace('firestore://', '');

  // 1. Check in-memory cache first
  const inMemory = getVideoFromMemoryCache(cleanKey);
  if (inMemory) {
    return inMemory;
  }

  // 2. Check IndexedDB
  try {
    const db = await openVideoDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanKey);
      req.onsuccess = () => {
        const result = req.result || null;
        if (result) {
          setVideoMemoryCache(cleanKey, result);
        }
        resolve(result);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Failed to retrieve file from IndexedDB:", err);
    return null;
  }
}

export function emitAppToast(message: string, type: 'error' | 'info' | 'success' = 'info'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
  }
}

export async function deleteVideoFromIndexedDB(key: string): Promise<void> {
  if (!key) return;
  const cleanKey = key.replace('indexeddb://', '').replace('firestore://', '');
  memoryBlobCache.delete(cleanKey);
  memoryBlobCache.delete(key);
  try {
    const db = await openVideoDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(cleanKey);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}
}

export const getFileFromIndexedDB = getVideoFromIndexedDB;

import { getFileFromFirestoreChunks, getFirestoreMediaMeta } from './firestoreMediaStorage';

function inferExtensionFromMime(mime?: string): string {
  if (!mime) return '';
  const m = mime.toLowerCase();
  if (m.includes('pdf')) return '.pdf';
  if (m.includes('wordprocessingml')) return '.docx';
  if (m.includes('msword')) return '.doc';
  if (m.includes('presentationml')) return '.pptx';
  if (m.includes('powerpoint')) return '.ppt';
  if (m.includes('png')) return '.png';
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  if (m.includes('svg')) return '.svg';
  if (m.includes('zip')) return '.zip';
  if (m.includes('mp4')) return '.mp4';
  if (m.includes('webm')) return '.webm';
  if (m.includes('json')) return '.json';
  if (m.includes('text/plain')) return '.txt';
  return '';
}

/**
 * Downloads or opens any file (PDF, worksheet, attachment, video) across Firestore chunks, IndexedDB, Blob, Data URLs, or Firebase Storage.
 */
export async function triggerFileDownload(url: string | undefined | null, fileName?: string): Promise<void> {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === '#') {
    emitAppToast('رابط الملف غير متاح حالياً.', 'error');
    return;
  }

  const clean = url.trim();
  const hasExt = Boolean(fileName && /\.[a-z0-9]{1,6}$/i.test(fileName.trim()));
  let safeName = (fileName && fileName.trim()) || clean.split('/').pop()?.split('?')[0] || 'lesson_document.pdf';

  // 1. Firestore Cloud Multi-Chunk stored file
  if (clean.startsWith('firestore://')) {
    const key = clean.replace('firestore://', '');
    try {
      const [blob, meta] = await Promise.all([
        getFileFromFirestoreChunks(key),
        getFirestoreMediaMeta(key).catch(() => null)
      ]);
      if (blob) {
        if ((!fileName || !hasExt) && meta?.fileName) {
          safeName = meta.fileName;
        } else if (!/\.[a-z0-9]{1,6}$/i.test(safeName)) {
          safeName += inferExtensionFromMime(meta?.fileType || blob.type) || '.bin';
        }
        const mimeType =
          (meta?.fileType && meta.fileType !== 'application/octet-stream')
            ? meta.fileType
            : (blob.type && blob.type.trim() !== '')
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
        emitAppToast('تعذر تحميل الملف من التخزين السحابي.', 'error');
        return;
      }
    } catch (err) {
      console.error('Error downloading Firestore chunked file:', err);
      emitAppToast('تعذر فتح الملف السحابي.', 'error');
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
        emitAppToast('الملف غير موجود في التخزين المحلي المحفوظ على هذا الجهاز.', 'error');
        return;
      }
    } catch (err) {
      console.error('Error downloading IndexedDB file:', err);
      emitAppToast('تعذر فتح الملف المحلي.', 'error');
      return;
    }
  }

  // 3. Data URL or Blob URL
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = clean;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 4. HTTP / HTTPS / Firebase Storage file
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
