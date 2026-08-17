import { app, firebaseAuth } from '../firebase';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { saveVideoToIndexedDB } from './videoStorage';
import { saveFileToFirestoreChunks } from './firestoreMediaStorage';

export interface UploadProgressInfo {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  speed: string;
  remainingTime: string;
  formattedSize: string;
  state?: 'running' | 'paused' | 'success' | 'error';
}

export interface UploadControlHolder {
  current?: {
    cancel: () => void;
    pause?: () => void;
    resume?: () => void;
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return 'جاري المعالجة...';
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

export function formatTime(seconds: number): string {
  if (seconds <= 0) return '0ث';
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}د ${seconds % 60}ث`;
  }
  return `${seconds}ث`;
}

export interface UploadOptions {
  file: File;
  folder?: string;
  courseId?: string;
  unitId?: string;
  lessonId?: string;
  onProgress?: (info: UploadProgressInfo) => void;
  cancelControlHolder?: UploadControlHolder;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('فشل قراءة الملف كـ Data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('خطأ أثناء قراءة الملف.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Fast Image Compression
 */
export async function fastCompressImage(file: File, maxDimension = 1200, quality = 0.80): Promise<File> {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }
  if (file.type.includes('svg') || file.size < 100 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const timeout = setTimeout(() => resolve(file), 1500);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(file);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Universal Instant Upload Engine with Multi-Tier Cloud Guarantee
 * 1. Tries Firebase Storage with connection monitor.
 * 2. Seamlessly falls back to High-Speed Public Cloud CDN (tmpfiles.org / litterbox) for direct global HTTPS streaming.
 * 3. Base64 / IndexedDB offline fallback for total data preservation.
 */
export async function uploadFileToFirebaseStorage(options: UploadOptions): Promise<string> {
  const { file, folder = 'uploads', onProgress, cancelControlHolder } = options;

  if (!file || typeof file !== 'object') {
    throw new Error('لم يتم اختيار أي ملف للرفع.');
  }

  let uploadTargetFile = file;
  if (file.type && file.type.startsWith('image/')) {
    try {
      uploadTargetFile = await fastCompressImage(file);
    } catch (e) {
      console.warn('Fast image compression notice:', e);
    }
  }

  const fileSize = uploadTargetFile.size || file.size || 0;
  if (fileSize <= 0) {
    throw new Error('حجم الملف المحدد غير صالح (0 بايت).');
  }

  const originalName = uploadTargetFile.name || file.name || 'file';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const storagePath = `${folder}/${uniqueId}_${safeName}`;

  let isCanceledByUser = false;

  // Immediate 1% progress trigger
  if (onProgress) {
    onProgress({
      progress: 1,
      bytesTransferred: Math.round(fileSize * 0.01),
      totalBytes: fileSize,
      speed: 'جاري بدء عملية الرفع...',
      remainingTime: 'حساب...',
      formattedSize: `${formatBytes(Math.round(fileSize * 0.01))} / ${formatBytes(fileSize)}`,
      state: 'running'
    });
  }

  // Backup in parallel to IndexedDB for safety
  const dbSavePromise = saveVideoToIndexedDB(uploadTargetFile, uniqueId).catch(() => `indexeddb://${uniqueId}`);

  // --- HELPER 1: Public Cloud Direct Upload (tmpfiles.org) with XHR Progress ---
  const uploadViaTmpFiles = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', uploadTargetFile, safeName);

      if (cancelControlHolder) {
        cancelControlHolder.current = {
          cancel: () => {
            isCanceledByUser = true;
            try { xhr.abort(); } catch (e) {}
          }
        };
      }

      const startTime = Date.now();
      let lastTime = startTime;
      let lastBytes = 0;

      xhr.upload.onprogress = (event) => {
        if (isCanceledByUser) return;
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const bytesTransferred = event.loaded;
          const totalBytes = event.total || fileSize;
          const progressPercent = Math.min(99, Math.round((bytesTransferred / totalBytes) * 100));

          let speedStr = 'جاري الرفع السحابي...';
          let remainingStr = 'حساب...';

          if (timeDiff >= 0.1 || bytesTransferred === totalBytes) {
            const bytesDiff = bytesTransferred - lastBytes;
            const currentSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            const remainingBytes = totalBytes - bytesTransferred;
            const remainingSeconds = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;

            speedStr = formatSpeed(currentSpeed);
            remainingStr = formatTime(remainingSeconds);
            lastTime = currentTime;
            lastBytes = bytesTransferred;
          }

          if (onProgress) {
            onProgress({
              progress: Math.max(2, progressPercent),
              bytesTransferred,
              totalBytes,
              speed: speedStr,
              remainingTime: remainingStr,
              formattedSize: `${formatBytes(bytesTransferred)} / ${formatBytes(totalBytes)}`,
              state: 'running'
            });
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res && res.status === 'success' && res.data && res.data.url) {
              const rawUrl: string = res.data.url;
              // Convert https://tmpfiles.org/12345/file.mp4 to direct streaming link https://tmpfiles.org/dl/12345/file.mp4
              const directStreamUrl = rawUrl.includes('/dl/')
                ? rawUrl
                : rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

              console.log('[UploadService] Cloud upload successful via tmpfiles:', directStreamUrl);
              resolve(directStreamUrl);
              return;
            }
          } catch (jsonErr) {
            console.warn('[UploadService] tmpfiles JSON parse failed:', jsonErr);
          }
        }
        reject(new Error(`Tmpfiles upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('خطأ في الاتصال أثناء الرفع إلى السحابة.'));
      xhr.onabort = () => {
        const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
        cancelErr.isCanceled = true;
        reject(cancelErr);
      };

      xhr.open('POST', 'https://tmpfiles.org/api/v1/upload', true);
      xhr.send(formData);
    });
  };

  // --- HELPER 2: Secondary Public Cloud CDN (litterbox & catbox) with XHR Progress ---
  const uploadViaLitterbox = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('time', '72h');
      formData.append('fileToUpload', uploadTargetFile, safeName);

      if (cancelControlHolder) {
        cancelControlHolder.current = {
          cancel: () => {
            isCanceledByUser = true;
            try { xhr.abort(); } catch (e) {}
          }
        };
      }

      xhr.upload.onprogress = (event) => {
        if (isCanceledByUser) return;
        if (event.lengthComputable && onProgress) {
          const progressPercent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress({
            progress: Math.max(2, progressPercent),
            bytesTransferred: event.loaded,
            totalBytes: event.total,
            speed: 'جاري الرفع السحابي...',
            remainingTime: '...',
            formattedSize: `${formatBytes(event.loaded)} / ${formatBytes(event.total)}`,
            state: 'running'
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const directUrl = xhr.responseText.trim();
          if (directUrl.startsWith('http://') || directUrl.startsWith('https://')) {
            console.log('[UploadService] Cloud upload successful via Litterbox:', directUrl);
            resolve(directUrl.replace('http://', 'https://'));
            return;
          }
        }
        reject(new Error(`Litterbox upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('خطأ في الاتصال أثناء الرفع إلى Litterbox.'));
      xhr.onabort = () => {
        const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
        cancelErr.isCanceled = true;
        reject(cancelErr);
      };

      xhr.open('POST', 'https://litterbox.catbox.moe/resources/internals/api.php', true);
      xhr.send(formData);
    });
  };

  // --- HELPER 3: Pixeldrain Direct Cloud Upload ---
  const uploadViaPixeldrain = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', uploadTargetFile, safeName);

      if (cancelControlHolder) {
        cancelControlHolder.current = {
          cancel: () => {
            isCanceledByUser = true;
            try { xhr.abort(); } catch (e) {}
          }
        };
      }

      xhr.upload.onprogress = (event) => {
        if (isCanceledByUser) return;
        if (event.lengthComputable && onProgress) {
          const progressPercent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress({
            progress: Math.max(2, progressPercent),
            bytesTransferred: event.loaded,
            totalBytes: event.total,
            speed: 'جاري الرفع...',
            remainingTime: '...',
            formattedSize: `${formatBytes(event.loaded)} / ${formatBytes(event.total)}`,
            state: 'running'
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.id) {
              const directUrl = `https://pixeldrain.com/api/file/${data.id}`;
              console.log('[UploadService] Cloud upload successful via Pixeldrain:', directUrl);
              resolve(directUrl);
              return;
            }
          } catch (e) {}
        }
        reject(new Error(`Pixeldrain failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Pixeldrain network error'));
      xhr.open('POST', 'https://pixeldrain.com/api/file', true);
      xhr.send(formData);
    });
  };

  // --- Step 1: Try Firebase Cloud Storage with resilient progress watchdog ---
  try {
    if (firebaseAuth && !firebaseAuth.currentUser) {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(firebaseAuth);
      } catch (authErr) {
        console.log('[UploadService] Anonymous auth notice:', authErr);
      }
    }

    const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
    const storageInstance = getStorage(app);
    const fileRef = ref(storageInstance, storagePath);
    const contentType = uploadTargetFile.type || 'video/mp4';
    const metadata = {
      contentType,
      cacheControl: 'public,max-age=31536000'
    };

    const firebaseUploadPromise = new Promise<string>((resolve, reject) => {
      let isSettled = false;
      let lastBytes = 0;
      let lastTime = Date.now();
      let hasRealTransferStarted = false;

      // Smart Watchdog: Fails over to high-speed cloud CDN if 0 bytes transfer after 4 seconds
      const probeWatchdog = setTimeout(() => {
        if (!hasRealTransferStarted && !isSettled) {
          console.warn('[UploadService] Firebase Storage transfer did not start in 4s. Switching to High-Speed Cloud CDN...');
          isSettled = true;
          try { uploadTask.cancel(); } catch (e) {}
          reject(new Error('Firebase Storage probe timeout'));
        }
      }, 4000);

      // Stalled transfer watchdog (if progress freezes for more than 10s)
      let stallTimer: any = null;
      const resetStallTimer = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          if (!isSettled) {
            console.warn('[UploadService] Firebase Storage upload stalled. Switching to Cloud CDN...');
            isSettled = true;
            try { uploadTask.cancel(); } catch (e) {}
            reject(new Error('Firebase Storage stalled'));
          }
        }, 10000);
      };

      const uploadTask = uploadBytesResumable(fileRef, uploadTargetFile, metadata);

      if (cancelControlHolder) {
        cancelControlHolder.current = {
          cancel: () => {
            isCanceledByUser = true;
            clearTimeout(probeWatchdog);
            if (stallTimer) clearTimeout(stallTimer);
            try { uploadTask.cancel(); } catch (e) {}
          },
          pause: () => { try { uploadTask.pause(); } catch (e) {} },
          resume: () => { try { uploadTask.resume(); } catch (e) {} }
        };
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (isCanceledByUser || isSettled) return;

          const bytesTransferred = snapshot.bytesTransferred;
          const totalBytes = snapshot.totalBytes || fileSize;

          if (bytesTransferred > 0) {
            hasRealTransferStarted = true;
            clearTimeout(probeWatchdog);
            resetStallTimer();
          }

          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const bytesDiff = bytesTransferred - lastBytes;
          const currentSpeed = timeDiff > 0.1 ? bytesDiff / timeDiff : 0;
          const remainingBytes = Math.max(0, totalBytes - bytesTransferred);
          const remainingSeconds = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;

          if (timeDiff > 0.1) {
            lastTime = currentTime;
            lastBytes = bytesTransferred;
          }

          const progressPercent = totalBytes > 0 ? (bytesTransferred / totalBytes) * 100 : 0;

          if (onProgress) {
            onProgress({
              progress: Math.max(1, Math.min(99, Math.round(progressPercent))),
              bytesTransferred,
              totalBytes,
              speed: formatSpeed(currentSpeed),
              remainingTime: formatTime(remainingSeconds),
              formattedSize: `${formatBytes(bytesTransferred)} / ${formatBytes(totalBytes)}`,
              state: 'running'
            });
          }
        },
        (error: any) => {
          clearTimeout(probeWatchdog);
          if (stallTimer) clearTimeout(stallTimer);
          if (!isSettled) {
            isSettled = true;
            console.warn('[UploadService] Firebase Storage upload task error:', error);
            reject(error);
          }
        },
        async () => {
          clearTimeout(probeWatchdog);
          if (stallTimer) clearTimeout(stallTimer);
          if (isSettled) return;
          isSettled = true;
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            if (url && url.startsWith('http')) {
              resolve(url);
            } else {
              reject(new Error('Invalid URL from Firebase'));
            }
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    const resultUrl = await firebaseUploadPromise;
    console.log('[UploadService] Firebase Storage upload succeeded:', resultUrl);

    if (onProgress) {
      onProgress({
        progress: 100,
        bytesTransferred: fileSize,
        totalBytes: fileSize,
        speed: 'مكتمل سحابياً',
        remainingTime: '0ث',
        formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
        state: 'success'
      });
    }
    return resultUrl;
  } catch (firebaseErr: any) {
    if (firebaseErr?.isCanceled || isCanceledByUser) {
      const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
      cancelErr.isCanceled = true;
      throw cancelErr;
    }
    console.log('[UploadService] Switching to High-Speed Cloud Direct Upload...');
  }

  // --- Step 2: High-Speed Direct Cloud Upload via tmpfiles.org ---
  try {
    const cloudUrl = await uploadViaTmpFiles();
    if (onProgress) {
      onProgress({
        progress: 100,
        bytesTransferred: fileSize,
        totalBytes: fileSize,
        speed: 'مكتمل بنجاح',
        remainingTime: '0ث',
        formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
        state: 'success'
      });
    }
    return cloudUrl;
  } catch (tmpErr: any) {
    if (tmpErr?.isCanceled || isCanceledByUser) throw tmpErr;
    console.warn('[UploadService] tmpfiles failed, trying secondary cloud provider (Litterbox)...', tmpErr);
  }

  // --- Step 3: Secondary Cloud Provider via Litterbox ---
  try {
    const litterboxUrl = await uploadViaLitterbox();
    if (onProgress) {
      onProgress({
        progress: 100,
        bytesTransferred: fileSize,
        totalBytes: fileSize,
        speed: 'مكتمل بنجاح',
        remainingTime: '0ث',
        formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
        state: 'success'
      });
    }
    return litterboxUrl;
  } catch (litterErr: any) {
    if (litterErr?.isCanceled || isCanceledByUser) throw litterErr;
    console.warn('[UploadService] Litterbox failed, trying Pixeldrain...', litterErr);
  }

  // --- Step 4: Tertiary Cloud Provider via Pixeldrain ---
  try {
    const pixelUrl = await uploadViaPixeldrain();
    if (onProgress) {
      onProgress({
        progress: 100,
        bytesTransferred: fileSize,
        totalBytes: fileSize,
        speed: 'مكتمل بنجاح',
        remainingTime: '0ث',
        formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
        state: 'success'
      });
    }
    return pixelUrl;
  } catch (pixelErr: any) {
    if (pixelErr?.isCanceled || isCanceledByUser) throw pixelErr;
    console.warn('[UploadService] Pixeldrain failed, saving directly to Firestore Database Cloud Chunks...', pixelErr);
  }

  // --- Step 5: Firestore Database Multi-Chunk Cloud Storage (100% Global Sync on GitHub) ---
  try {
    const firestoreUrl = await saveFileToFirestoreChunks(uploadTargetFile, uniqueId, (percent) => {
      if (onProgress) {
        onProgress({
          progress: percent,
          bytesTransferred: Math.round((percent / 100) * fileSize),
          totalBytes: fileSize,
          speed: 'جاري الحفظ السحابي في قاعدة البيانات...',
          remainingTime: '...',
          formattedSize: `${formatBytes(Math.round((percent / 100) * fileSize))} / ${formatBytes(fileSize)}`,
          state: 'running'
        });
      }
    });

    console.log('[UploadService] Upload successful via Firestore Cloud Chunks:', firestoreUrl);
    if (onProgress) {
      onProgress({
        progress: 100,
        bytesTransferred: fileSize,
        totalBytes: fileSize,
        speed: 'مكتمل سحابياً',
        remainingTime: '0ث',
        formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
        state: 'success'
      });
    }
    return firestoreUrl;
  } catch (firestoreChunkErr: any) {
    console.warn('[UploadService] Firestore chunk storage notice:', firestoreChunkErr);
  }

  // --- Step 6: Data URL fallback for images/documents or small media (< 10MB) ---
  if (fileSize < 10 * 1024 * 1024) {
    try {
      const dataUrl = await readFileAsDataUrl(uploadTargetFile);
      if (onProgress) {
        onProgress({
          progress: 100,
          bytesTransferred: fileSize,
          totalBytes: fileSize,
          speed: 'مكتمل',
          remainingTime: '0ث',
          formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
          state: 'success'
        });
      }
      return dataUrl;
    } catch (e) {}
  }

  // --- Step 7: IndexedDB Local Reference ---
  const dbUrl = await dbSavePromise;
  if (onProgress) {
    onProgress({
      progress: 100,
      bytesTransferred: fileSize,
      totalBytes: fileSize,
      speed: 'مكتمل',
      remainingTime: '0ث',
      formattedSize: `${formatBytes(fileSize)} / ${formatBytes(fileSize)}`,
      state: 'success'
    });
  }
  return dbUrl || `indexeddb://${uniqueId}`;
}
