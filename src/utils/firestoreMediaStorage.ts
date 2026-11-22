import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { firestoreDb, firebaseAuth } from '../firebase';
import { saveVideoToIndexedDB, getVideoFromIndexedDB, deleteVideoFromIndexedDB } from './videoStorage';

export interface CloudMediaMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  uploadedBy?: string;
  isPublic?: boolean;
  createdAt: number;
}

export interface ChunkUploadOptions {
  isPublic?: boolean;
  shouldCancel?: () => boolean;
  onStats?: (stats: {
    percent: number;
    bytesTransferred: number;
    totalBytes: number;
    bytesPerSec: number;
    remainingSeconds: number;
  }) => void;
}

const CHUNK_SIZE = 512 * 1024; // 512 KB raw binary -> ~683 KB Base64 (safely below Firestore's 1 MB doc limit)

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const step = 8192;
  for (let k = 0; k < len; k += step) {
    const slice = bytes.subarray(k, Math.min(k + step, len));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

/**
 * Saves a file by streaming slices and chunking them into permanent Firestore cloud documents.
 * Supports files up to 100 MB without loading full binaries into memory at once.
 */
export async function saveFileToFirestoreChunks(
  file: File,
  fileId: string,
  onProgress?: (percent: number) => void,
  options?: ChunkUploadOptions
): Promise<string> {
  if (!firestoreDb) {
    throw new Error('خدمة قاعدة البيانات غير متاحة حالياً.');
  }

  const totalSize = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));
  const meta: CloudMediaMeta = {
    id: fileId,
    fileName: file.name || 'file',
    fileType: file.type || 'application/octet-stream',
    fileSize: totalSize,
    totalChunks,
    uploadedBy: firebaseAuth?.currentUser?.uid || undefined,
    isPublic: Boolean(options?.isPublic),
    createdAt: Date.now()
  };

  if (options?.shouldCancel?.()) {
    const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
    cancelErr.isCanceled = true;
    throw cancelErr;
  }

  // 1. Save top-level metadata
  await setDoc(doc(firestoreDb, 'cloud_media', fileId), meta);

  // 2. Stream file slices and upload chunks in batches of 4 concurrent writes
  const batchSize = 4;
  const startTime = Date.now();
  let uploadedBytes = 0;

  try {
    for (let i = 0; i < totalChunks; i += batchSize) {
      if (options?.shouldCancel?.()) {
        const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
        cancelErr.isCanceled = true;
        throw cancelErr;
      }

      const promises: Promise<void>[] = [];
      let batchBytes = 0;

      for (let j = i; j < Math.min(i + batchSize, totalChunks); j++) {
        const start = j * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        batchBytes += Math.max(0, end - start);

        promises.push(
          (async () => {
            const sliceBuffer = await file.slice(start, end).arrayBuffer();
            const chunkBytes = new Uint8Array(sliceBuffer);
            const base64Data = uint8ArrayToBase64(chunkBytes);
            await setDoc(doc(firestoreDb, 'cloud_media', fileId, 'chunks', String(j)), {
              index: j,
              data: base64Data
            });
          })()
        );
      }

      await Promise.all(promises);
      uploadedBytes = Math.min(totalSize, uploadedBytes + batchBytes);

      const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
      const bytesPerSec = uploadedBytes / elapsedSec;
      const remainingBytes = Math.max(0, totalSize - uploadedBytes);
      const remainingSeconds = bytesPerSec > 0 ? Math.ceil(remainingBytes / bytesPerSec) : 0;
      const currentPercent = Math.min(99, Math.max(1, Math.round((uploadedBytes / Math.max(1, totalSize)) * 100)));

      if (onProgress) {
        onProgress(currentPercent);
      }
      if (options?.onStats) {
        options.onStats({
          percent: currentPercent,
          bytesTransferred: uploadedBytes,
          totalBytes: totalSize,
          bytesPerSec,
          remainingSeconds
        });
      }
    }
  } catch (err) {
    // Roll back partial chunks if aborted or failed mid-stream
    await deleteFileFromFirestoreChunks(fileId).catch(() => {});
    throw err;
  }

  // Also cache in local IndexedDB for fast access on the current device (non-blocking)
  try {
    await saveVideoToIndexedDB(file, fileId);
  } catch {}

  return `firestore://${fileId}`;
}

export async function getFirestoreMediaMeta(fileId: string): Promise<CloudMediaMeta | null> {
  if (!firestoreDb || !fileId) return null;
  const cleanId = fileId.replace(/^firestore:\/\//, '').trim();
  if (!cleanId) return null;
  try {
    const metaDoc = await getDoc(doc(firestoreDb, 'cloud_media', cleanId));
    if (!metaDoc.exists()) return null;
    return metaDoc.data() as CloudMediaMeta;
  } catch (err) {
    console.warn('[FirestoreMedia] Meta read warning for:', cleanId, err);
    return null;
  }
}

/**
 * Downloads and reassembles a chunked file from Firestore into a Blob.
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
  } catch {}

  if (!firestoreDb) return null;

  // 2. Fetch metadata from Firestore
  const metaDoc = await getDoc(doc(firestoreDb, 'cloud_media', fileId));
  if (!metaDoc.exists()) {
    console.warn('[FirestoreMedia] Metadata not found for:', fileId);
    return null;
  }
  const meta = metaDoc.data() as CloudMediaMeta;
  const totalChunks = meta.totalChunks || 1;

  const chunkDocs: { index: number; data: string }[] = [];

  if (totalChunks <= 30) {
    // Fast single-query fetch for small/medium files
    const chunksCollection = collection(firestoreDb, 'cloud_media', fileId, 'chunks');
    const snap = await getDocs(chunksCollection);
    if (snap.empty) {
      console.warn('[FirestoreMedia] No chunk documents found for:', fileId);
      return null;
    }
    snap.forEach((d) => {
      chunkDocs.push(d.data() as { index: number; data: string });
    });
  } else {
    // Batched point-reads for large files (avoids oversized single-RPC timeout)
    const fetchBatchSize = 10;
    for (let i = 0; i < totalChunks; i += fetchBatchSize) {
      const reads: Promise<void>[] = [];
      for (let j = i; j < Math.min(i + fetchBatchSize, totalChunks); j++) {
        reads.push(
          getDoc(doc(firestoreDb!, 'cloud_media', fileId, 'chunks', String(j))).then((snap) => {
            if (snap.exists()) {
              chunkDocs.push(snap.data() as { index: number; data: string });
            }
          })
        );
      }
      await Promise.all(reads);
      if (onProgress) {
        onProgress(Math.min(75, Math.round((chunkDocs.length / totalChunks) * 75)));
      }
    }
  }

  if (chunkDocs.length < totalChunks) {
    console.error(`[FirestoreMedia] Incomplete chunks for ${fileId}: expected ${totalChunks}, got ${chunkDocs.length}`);
    return null;
  }

  chunkDocs.sort((a, b) => a.index - b.index);

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
      const base = totalChunks > 30 ? 75 : 0;
      const span = 100 - base;
      onProgress(base + Math.round((loadedChunks / totalChunks) * span));
    }
  }

  const combinedBlob = new Blob(byteArrays, { type: meta.fileType || 'application/octet-stream' });

  // Cache in IndexedDB for subsequent opens on this device
  try {
    const file = new File([combinedBlob], meta.fileName || 'resource', { type: meta.fileType || 'application/octet-stream' });
    await saveVideoToIndexedDB(file, fileId);
  } catch {}

  return combinedBlob;
}

/**
 * Deletes a chunked media item and all its chunk subdocuments from Firestore and local cache.
 */
export async function deleteFileFromFirestoreChunks(fileId: string): Promise<void> {
  const cleanId = fileId.replace(/^firestore:\/\//, '').trim();
  if (!cleanId) return;

  try {
    await deleteVideoFromIndexedDB(cleanId);
  } catch {}

  if (!firestoreDb) return;
  try {
    const chunksSnap = await getDocs(collection(firestoreDb, 'cloud_media', cleanId, 'chunks'));
    // Delete in batches to stay cleanly within request limits on large files
    const docs = chunksSnap.docs;
    for (let i = 0; i < docs.length; i += 20) {
      await Promise.all(docs.slice(i, i + 20).map((d) => deleteDoc(d.ref)));
    }
    await deleteDoc(doc(firestoreDb, 'cloud_media', cleanId));
  } catch (err) {
    console.warn('[FirestoreMedia] Cleanup delete warning for', cleanId, err);
  }
}
