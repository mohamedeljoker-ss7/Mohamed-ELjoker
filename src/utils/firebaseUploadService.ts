import { app, firebaseAuth } from '../firebase';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { saveVideoToIndexedDB, setVideoMemoryCache } from './videoStorage';
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

// Session cache: if Firebase Storage bucket is unavailable/unconfigured, subsequent uploads route straight to Firestore chunks
let storageBucketUnavailableForSession = false;

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
 * Permanent Cloud Upload Engine:
 * 1. Validates connectivity, authentication, and size bounds (up to 100 MB).
 * 2. Attempts Firebase Storage with a fast 8s connection probe (and caches session unavailability so retries are instant).
 * 3. Automatically persists up to 100 MB via permanent Firestore Cloud Chunks (`firestore://{id}` in `cloud_media`).
 * 4. Throws clear localized errors if offline, unauthenticated, > 100 MB, or permission-denied.
 */
export async function uploadFileToFirebaseStorage(options: UploadOptions): Promise<string> {
  const { file, folder = 'uploads', onProgress, cancelControlHolder } = options;

  if (!file || typeof file !== 'object') {
    throw new Error('لم يتم اختيار أي ملف للرفع.');
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('لا يوجد اتصال بالإنترنت. يرجى التحقق من الشبكة ثم إعادة المحاولة.');
  }

  if (firebaseAuth && !firebaseAuth.currentUser) {
    throw new Error('يجب تسجيل الدخول بحساب معتمد (المزامنة السحابية) قبل رفع الملفات.');
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

  const MAX_CLOUD_BYTES = 100 * 1024 * 1024; // 100 MB (supported across Storage & Firestore Cloud Chunks)

  if (fileSize > MAX_CLOUD_BYTES) {
    throw new Error(`حجم الملف (${formatBytes(fileSize)}) يتجاوز الحد الأقصى المسموح به (100 MB).`);
  }

  const originalName = uploadTargetFile.name || file.name || 'file';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const storagePath = `${folder}/${uniqueId}_${safeName}`;

  let isCanceledByUser = false;

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

  let storageFailureReason = '';

  // --- Step 1: Firebase Cloud Storage (skipped immediately if bucket failed probe in this session) ---
  if (app && firebaseAppletConfig?.storageBucket && !storageBucketUnavailableForSession) {
    try {
      const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
      const storageInstance = getStorage(app);
      const fileRef = ref(storageInstance, storagePath);
      const ext = (uploadTargetFile.name.split('.').pop() || '').toLowerCase();
      const mimeByExt: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        zip: 'application/zip',
        rar: 'application/vnd.rar',
        py: 'text/x-python',
        js: 'application/javascript',
        ts: 'text/typescript',
        c: 'text/x-c',
        cpp: 'text/x-c++src',
        html: 'text/html',
        css: 'text/css',
        sql: 'application/sql',
        json: 'application/json',
        txt: 'text/plain',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime'
      };
      const contentType = uploadTargetFile.type || mimeByExt[ext] || 'application/octet-stream';
      const metadata = {
        contentType,
        cacheControl: 'public,max-age=31536000'
      };

      const firebaseUploadPromise = new Promise<string>((resolve, reject) => {
        let isSettled = false;
        let lastBytes = 0;
        let lastTime = Date.now();
        let hasRealTransferStarted = false;

        const uploadTask = uploadBytesResumable(fileRef, uploadTargetFile, metadata);

        // Fast 8s connection probe so users fail over swiftly if Storage bucket is unprovisioned
        const probeWatchdog = setTimeout(() => {
          if (!hasRealTransferStarted && !isSettled) {
            isSettled = true;
            storageBucketUnavailableForSession = true;
            try { uploadTask.cancel(); } catch {}
            reject(new Error('تعذر بدء الاتصال بـ Firebase Storage خلال 8 ثوانٍ.'));
          }
        }, 8000);

        let stallTimer: ReturnType<typeof setTimeout> | null = null;
        const resetStallTimer = () => {
          if (stallTimer) clearTimeout(stallTimer);
          stallTimer = setTimeout(() => {
            if (!isSettled) {
              isSettled = true;
              try { uploadTask.cancel(); } catch {}
              reject(new Error('توقف اتصال الرفع عبر Firebase Storage لفترة طويلة.'));
            }
          }, 25000);
        };

        if (cancelControlHolder) {
          cancelControlHolder.current = {
            cancel: () => {
              isCanceledByUser = true;
              clearTimeout(probeWatchdog);
              if (stallTimer) clearTimeout(stallTimer);
              try { uploadTask.cancel(); } catch {}
            },
            pause: () => { try { uploadTask.pause(); } catch {} },
            resume: () => { try { uploadTask.resume(); } catch {} }
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
              const code = String(error?.code || '');
              if (
                code === 'storage/bucket-not-found' ||
                code === 'storage/project-not-found' ||
                code === 'storage/retry-limit-exceeded' ||
                code === 'storage/unauthorized'
              ) {
                storageBucketUnavailableForSession = true;
              }
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
                reject(new Error('رابط التحميل المسترجع من Firebase غير صالح.'));
              }
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      const resultUrl = await firebaseUploadPromise;
      try {
        setVideoMemoryCache(resultUrl, uploadTargetFile);
        await saveVideoToIndexedDB(uploadTargetFile, resultUrl);
      } catch {}

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
      if (firebaseErr?.isCanceled || firebaseErr?.code === 'storage/canceled' || isCanceledByUser) {
        const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
        cancelErr.isCanceled = true;
        throw cancelErr;
      }
      storageFailureReason = firebaseErr?.message || String(firebaseErr);
      console.warn('[UploadService] Firebase Storage unavailable, routing to permanent Firestore Cloud Chunks:', storageFailureReason);
    }
  }

  // --- Step 2: Permanent Firestore Multi-Chunk Persistence (up to 100 MB) ---
  if (cancelControlHolder) {
    cancelControlHolder.current = {
      cancel: () => {
        isCanceledByUser = true;
      }
    };
  }

  try {
    const isPublicMedia = ['images/thumbnails', 'images/banners', 'courses', 'categories', 'news', 'articles', 'teachers', 'settings'].some(
      (f) => (folder || '').includes(f)
    );
    const firestoreUrl = await saveFileToFirestoreChunks(
      uploadTargetFile,
      uniqueId,
      undefined,
      {
        isPublic: isPublicMedia,
        shouldCancel: () => isCanceledByUser,
        onStats: ({ percent, bytesTransferred, totalBytes, bytesPerSec, remainingSeconds }) => {
          if (onProgress && !isCanceledByUser) {
            onProgress({
              progress: percent,
              bytesTransferred,
              totalBytes,
              speed: formatSpeed(bytesPerSec),
              remainingTime: formatTime(remainingSeconds),
              formattedSize: `${formatBytes(bytesTransferred)} / ${formatBytes(totalBytes)}`,
              state: 'running'
            });
          }
        }
      }
    );

    if (isCanceledByUser) {
      const cancelErr: any = new Error('تم إلغاء عملية الرفع من قبل المستخدم.');
      cancelErr.isCanceled = true;
      throw cancelErr;
    }

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
  } catch (firestoreErr: any) {
    if (firestoreErr?.isCanceled || isCanceledByUser) throw firestoreErr;
    const errMsg = firestoreErr?.message || '';
    if (onProgress) {
      onProgress({
        progress: 0,
        bytesTransferred: 0,
        totalBytes: fileSize,
        speed: 'فشل الرفع السحابي',
        remainingTime: '-',
        formattedSize: `0 / ${formatBytes(fileSize)}`,
        state: 'error'
      });
    }
    if (errMsg.includes('permission') || errMsg.includes('Missing or insufficient permissions')) {
      throw new Error('تعذر حفظ الملف لعدم كفاية الصلاحيات السحابية (Missing permissions). تأكد من تسجيل الدخول بحساب معتمد.');
    }
    throw new Error(`فشل رفع وحفظ الملف سحابياً: ${errMsg || storageFailureReason || 'خطأ في الاتصال بقاعدة البيانات'}`);
  }
}
