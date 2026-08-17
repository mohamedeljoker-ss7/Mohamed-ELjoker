import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../firebase';
import { saveVideoToIndexedDB, getVideoFromIndexedDB } from './videoStorage';

export interface CloudMediaMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  createdAt: number;
}

const CHUNK_SIZE = 400 * 1024; // 400 KB per chunk (safely below Firestore 1MB doc limit)

/**
 * Saves a file by chunking it into Firestore cloud documents.
 * Ensures the video is accessible globally on any device or GitHub Pages.
 */
export async function saveFileToFirestoreChunks(
  file: File,
  fileId: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const meta: CloudMediaMeta = {
    id: fileId,
    fileName: file.name || 'file',
    fileType: file.type || 'video/mp4',
    fileSize: totalSize,
    totalChunks,
    createdAt: Date.now()
  };

  // 1. Save top-level metadata
  await setDoc(doc(firestoreDb, 'cloud_media', fileId), meta);

  // 2. Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // 3. Upload chunks in parallel batches of 3
  const batchSize = 3;
  for (let i = 0; i < totalChunks; i += batchSize) {
    const promises: Promise<any>[] = [];
    for (let j = i; j < Math.min(i + batchSize, totalChunks); j++) {
      const start = j * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunkBytes = uint8Array.subarray(start, end);
      
      // Efficiently convert Uint8Array chunk to base64
      let binary = '';
      const len = chunkBytes.byteLength;
      const step = 8192;
      for (let k = 0; k < len; k += step) {
        binary += String.fromCharCode.apply(null, Array.from(chunkBytes.subarray(k, Math.min(k + step, len))));
      }
      const base64Data = btoa(binary);

      promises.push(
        setDoc(doc(firestoreDb, 'cloud_media', fileId, 'chunks', String(j)), {
          index: j,
          data: base64Data
        })
      );
    }
    await Promise.all(promises);
    if (onProgress) {
      const currentPercent = Math.min(99, Math.round(((i + batchSize) / totalChunks) * 100));
      onProgress(currentPercent);
    }
  }

  // Also cache in local IndexedDB for fast access on the current device
  try {
    await saveVideoToIndexedDB(file, fileId);
  } catch (e) {}

  return `firestore://${fileId}`;
}

/**
 * Downloads and reassembles a chunked file from Firestore into a Blob.
 * Automatically utilizes and populates IndexedDB local cache.
 */
export async function getFileFromFirestoreChunks(
  fileId: string,
  onProgress?: (percent: number) => void
): Promise<Blob | null> {
  // 1. Check local IndexedDB cache first for zero-latency playback
  try {
    const cachedBlob = await getVideoFromIndexedDB(fileId);
    if (cachedBlob && cachedBlob.size > 0) {
      if (onProgress) onProgress(100);
      return cachedBlob;
    }
  } catch (e) {}

  // 2. Fetch metadata from Firestore
  const metaDoc = await getDoc(doc(firestoreDb, 'cloud_media', fileId));
  if (!metaDoc.exists()) {
    console.warn('[FirestoreMedia] Metadata not found for:', fileId);
    return null;
  }
  const meta = metaDoc.data() as CloudMediaMeta;
  const totalChunks = meta.totalChunks || 1;

  // 3. Fetch all chunk documents
  const chunksCollection = collection(firestoreDb, 'cloud_media', fileId, 'chunks');
  const snap = await getDocs(chunksCollection);
  if (snap.empty) {
    console.warn('[FirestoreMedia] No chunk documents found for:', fileId);
    return null;
  }

  const chunkDocs: { index: number; data: string }[] = [];
  snap.forEach((d) => {
    chunkDocs.push(d.data() as { index: number; data: string });
  });

  // Sort chunks by index to ensure proper binary order
  chunkDocs.sort((a, b) => a.index - b.index);

  // Combine chunks into Uint8Array list
  const byteArrays: Uint8Array[] = [];
  let loadedChunks = 0;

  for (const chunk of chunkDocs) {
    const binaryStr = atob(chunk.data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    byteArrays.push(bytes);
    loadedChunks++;
    if (onProgress) {
      onProgress(Math.round((loadedChunks / totalChunks) * 100));
    }
  }

  const combinedBlob = new Blob(byteArrays, { type: meta.fileType || 'video/mp4' });

  // Cache in IndexedDB for subsequent plays on this device
  try {
    const file = new File([combinedBlob], meta.fileName || 'video.mp4', { type: meta.fileType || 'video/mp4' });
    await saveVideoToIndexedDB(file, fileId);
  } catch (e) {}

  return combinedBlob;
}
