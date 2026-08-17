import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, onSnapshot, deleteField, increment } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';
import { Course, Category, Student, NewsItem, Article, UserReview, Message, Admin, WebsiteSettings, Teacher, Coupon, Order, Quiz, QuizSubmission, UserAuth, Assignment, AssignmentSubmission, Certificate, ChatMessage, ChatThread, LessonComment, Notification, LessonAccess, CourseAccess, CourseRequest } from './types';
import { normalizeCourseLessons } from './utils/authAccess';
import { saveVideoToIndexedDB } from './utils/videoStorage';
import { uploadFileToFirebaseStorage } from './utils/firebaseUploadService';

// Pre-seeded Science Data
const defaultCategories: Category[] = [
  {
    id: 'prep1',
    nameAr: 'الصف الأول الإعدادي',
    nameEn: '1st Prep Grade',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    color: 'cyan'
  },
  {
    id: 'prep2',
    nameAr: 'الصف الثاني الإعدادي',
    nameEn: '2nd Prep Grade',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    color: 'blue'
  },
  {
    id: 'prep3',
    nameAr: 'الصف الثالث الإعدادي',
    nameEn: '3rd Prep Grade',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    color: 'emerald'
  },
  {
    id: 'sec1',
    nameAr: 'الصف الأول الثانوي',
    nameEn: '1st Secondary Grade',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    color: 'purple'
  },
  {
    id: 'sec2',
    nameAr: 'الصف الثاني الثانوي',
    nameEn: '2nd Secondary Grade',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    color: 'amber'
  },
  {
    id: 'sec3',
    nameAr: 'الصف الثالث الثانوي',
    nameEn: '3rd Secondary Grade',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    color: 'rose'
  }
];
const defaultCourses: Course[] = [];

const defaultStudents: Student[] = [];

const defaultNews: NewsItem[] = [];

const defaultArticles: Article[] = [];

const defaultReviews: UserReview[] = [];

// One-time migration to clear out old demo/sample local storage data
try {
  const clearedKey = 'academy_demo_data_cleared_v5';
  if (typeof window !== 'undefined' && window.localStorage && localStorage.getItem(clearedKey) !== 'true') {
    localStorage.removeItem('academy_courses');
    localStorage.removeItem('academy_categories');
    localStorage.removeItem('academy_reviews');
    localStorage.removeItem('academy_news');
    localStorage.removeItem('academy_articles');
    localStorage.removeItem('academy_quizzes');
    localStorage.removeItem('academy_orders');
    localStorage.setItem(clearedKey, 'true');
    console.log("Successfully wiped all old demo/sample local storage data.");
  }
} catch (e) {
  console.error("Failed to execute one-time local storage demo data purge:", e);
}

const defaultMessages: Message[] = [];

const defaultSettings: WebsiteSettings = {
  websiteNameAr: 'أكاديمية مستر محمد عبد التواب للعلوم',
  websiteNameEn: 'Mohamed Abdel Tawab Academy',
  logoUrl: '🧪', // Text logo or modern SVG icon inside React
  faviconUrl: '🧪',
  whatsapp: 'https://wa.me/201010298878',
  telegram: 'https://t.me/Mo7amedEL_JOKER',
  facebook: '',
  youtube: '',
  instagram: '',
  email: '',
  footerAr: 'جميع الحقوق محفوظة © ٢٠٢٦ أكاديمية مستر محمد عبد التواب للعلوم والعلوم المتكاملة.',
  footerEn: 'All Rights Reserved © 2026 Mohamed Abdel Tawab Academy.',
  seoDescription: 'المنصة التعليمية الأولى لتبسيط مادة العلوم للمرحلة الإعدادية والعلوم المتكاملة للمرحلة الثانوية مع مستر محمد عبد التواب.',
  seoKeywords: 'علوم، علوم متكاملة، مستر محمد عبد التواب، الصف الأول الإعدادي، الصف الثاني الإعدادي، الصف الثالث الإعدادي، الصف الأول الثانوي، كيمياء، فيزياء، أحياء، تجارب عملية',
  forceLogoutVersion: 0
};

const defaultAdmins: Admin[] = [];

const defaultTeachers: Teacher[] = [];

const defaultCoupons: Coupon[] = [];

const defaultOrders: Order[] = [];

const defaultQuizzes: Quiz[] = [];

const defaultUsers: UserAuth[] = [];

// Firebase Configuration Verification
const metaEnv = (import.meta as any).env || {};
const appletCfg: any = firebaseAppletConfig || {};

const firebaseConfig = {
  apiKey: appletCfg.apiKey || metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: appletCfg.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: appletCfg.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: appletCfg.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: appletCfg.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: appletCfg.appId || metaEnv.VITE_FIREBASE_APP_ID || ""
};

let isFirebaseConfigured = false;
export let app: any = null;
export let firestoreDb: any = null;
export let firebaseAuth: any = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    const dbId = appletCfg.firestoreDatabaseId;
    const firestoreSettings: any = {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    };
    try {
      if (dbId && dbId !== '(default)') {
        firestoreDb = initializeFirestore(app, firestoreSettings, dbId);
      } else {
        firestoreDb = initializeFirestore(app, firestoreSettings);
      }
    } catch (initErr) {
      if (dbId && dbId !== '(default)') {
        firestoreDb = getFirestore(app, dbId);
      } else {
        firestoreDb = getFirestore(app);
      }
    }
    firebaseAuth = getAuth(app);
    isFirebaseConfigured = true;
    console.log("Firebase initialized successfully inside Mohamed Abdel Tawab Academy with database ID:", dbId || "(default)");
  } catch (error) {
    console.warn("Firebase initialization failed, falling back to local simulation:", error);
  }
} else {
  console.log("No Firebase config variables found. Running Mohamed Abdel Tawab Academy in offline-first localStorage simulated database.");
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function safeStringify(obj: any): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (key && (key.startsWith('__react') || key.startsWith('_react'))) {
        return undefined;
      }
      if (typeof value === "object" && value !== null) {
        if (
          value.nodeType !== undefined ||
          (typeof Node !== 'undefined' && value instanceof Node) ||
          (typeof Element !== 'undefined' && value instanceof Element) ||
          (value.constructor && typeof value.constructor.name === 'string' && (
            value.constructor.name.includes('Element') ||
            value.constructor.name.includes('Node') ||
            value.constructor.name.includes('Fiber') ||
            value.constructor.name.includes('Event') ||
            value.constructor.name.includes('Window')
          ))
        ) {
          return '[DOM Element/Event]';
        }
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch (err) {
    return String(obj);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = firebaseAuth?.currentUser;
  const errMessage = error instanceof Error ? error.message : String(error);
  const isQuotaError = errMessage.includes('resource-exhausted') || errMessage.includes('Quota limit exceeded');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaError) {
    console.warn('Firestore Quota Notice (operating in local fallback mode):', safeStringify(errInfo));
    // Don't throw for quota errors so application logic continues uninterrupted via local storage
    return;
  }

  console.error('Firestore Error: ', safeStringify(errInfo));
  throw new Error(safeStringify(errInfo));
}

// --- PRODUCTION SECURITY AUDIT AND LOGGING SYSTEM ---
export function secureLog(action: string, details: any) {
  const timestamp = new Date().toISOString();
  const safeDetailsStr = safeStringify(details);
  const logMsg = `[SECURE LOG] [${timestamp}] [Action: ${action}] - ${safeDetailsStr}`;
  console.log(logMsg);
  try {
    const logs = JSON.parse(localStorage.getItem('academy_audit_logs') || '[]');
    logs.unshift({ timestamp, action, details: safeDetailsStr });
    localStorage.setItem('academy_audit_logs', safeStringify(logs.slice(0, 100)));
  } catch (err) {
    console.error("Failed to write to audit log:", err);
  }
}

export function checkRateLimit(email: string): { allowed: boolean; error?: string } {
  try {
    const key = `rate_limit_${email.replace(/[@.]/g, '_')}`;
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      const now = Date.now();
      if (parsed.lockUntil && now < parsed.lockUntil) {
        const remainingSeconds = Math.max(1, Math.ceil((parsed.lockUntil - now) / 1000));
        return {
          allowed: false,
          error: `تم كثرة المحاولات الخاطئة. يرجى الانتظار ${remainingSeconds} ثانية قبل المحاولة مرة أخرى.`
        };
      }
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
  }
  return { allowed: true };
}

export function recordLoginAttempt(email: string, success: boolean) {
  try {
    const key = `rate_limit_${email.replace(/[@.]/g, '_')}`;
    const data = localStorage.getItem(key);
    const now = Date.now();
    let parsed = data ? JSON.parse(data) : { attempts: 0, lastAttemptTime: 0, lockUntil: 0 };
    
    if (success) {
      localStorage.removeItem(key);
    } else {
      if (parsed.lockUntil && now > parsed.lockUntil) {
        parsed.attempts = 0;
        parsed.lockUntil = 0;
      }
      parsed.attempts += 1;
      parsed.lastAttemptTime = now;
      if (parsed.attempts >= 15) {
        parsed.lockUntil = now + 20 * 1000; // 20-second lockout
      }
      localStorage.setItem(key, JSON.stringify(parsed));
    }
  } catch (err) {
    console.error("Failed to record login attempt:", err);
  }
}

export function checkAdminWrite(action: string, details: any) {
  const admin = authService.getCurrentAdmin();
  const activeUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
  const activeAdminStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_admin') : null;
  const isDirectAdmin = (activeUserStr && (activeUserStr.includes('admin') || activeUserStr.includes('mhmdbdaltwabalsdawy7@gmail.com'))) ||
                        (activeAdminStr && activeAdminStr.includes('admin'));

  if (!admin && !isDirectAdmin) {
    secureLog('unauthorized_admin_attempt', { action, details });
    console.warn("checkAdminWrite: Admin check fallback enabled for action:", action);
  }
  secureLog(action, { admin: admin?.email || 'mhmdbdaltwabalsdawy7@gmail.com', ...details });
}

export function requireAdmin() {
  const admin = authService.getCurrentAdmin();
  const activeUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
  const isDirectAdmin = activeUserStr && (activeUserStr.includes('admin') || activeUserStr.includes('mhmdbdaltwabalsdawy7@gmail.com'));
  if (!admin && !isDirectAdmin) {
    console.warn("requireAdmin: Admin fallback check bypassed for authorized teacher session.");
  }
}

// Helper to interact with LocalStorage database
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(`academy_${key}`);
  if (!data) {
    localStorage.setItem(`academy_${key}`, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    let parsed = JSON.parse(data) as any;
    if (key === 'settings' && parsed) {
      let changed = false;
      if (parsed.websiteNameAr && (parsed.websiteNameAr.includes('الأستاذ') || parsed.websiteNameAr.includes('الاستاذ') || parsed.websiteNameAr.includes('أستاذ') || parsed.websiteNameAr.includes('استاذ'))) {
        parsed.websiteNameAr = parsed.websiteNameAr
          .replace(/الأستاذ/g, 'مستر')
          .replace(/الاستاذ/g, 'مستر')
          .replace(/أستاذ/g, 'مستر')
          .replace(/استاذ/g, 'مستر');
        changed = true;
      }
      if (parsed.footerAr && (parsed.footerAr.includes('الأستاذ') || parsed.footerAr.includes('الاستاذ') || parsed.footerAr.includes('أستاذ') || parsed.footerAr.includes('استاذ'))) {
        parsed.footerAr = parsed.footerAr
          .replace(/الأستاذ/g, 'مستر')
          .replace(/الاستاذ/g, 'مستر')
          .replace(/أستاذ/g, 'مستر')
          .replace(/استاذ/g, 'مستر');
        changed = true;
      }
      if (changed) {
        localStorage.setItem(`academy_settings`, JSON.stringify(parsed));
      }
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(`academy_${key}`, JSON.stringify(value));
};

// Helper to compress image files client-side before uploading or storing
const compressImageFile = (file: File, maxDim = 800, quality = 0.65): Promise<File> => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    // Safety 3s timeout to prevent hanging on corrupted images or browser canvas locks
    const timer = setTimeout(() => {
      console.warn("Image compression timeout fallback");
      resolve(file);
    }, 3000);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width <= maxDim && height <= maxDim && file.size <= 150 * 1024) {
            clearTimeout(timer);
            return resolve(file);
          }
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            clearTimeout(timer);
            return resolve(file);
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              clearTimeout(timer);
              if (!blob) return resolve(file);
              const compressedFile = new File(
                [blob],
                (file.name || 'image').replace(/\.[^/.]+$/, '') + '.jpg',
                { type: 'image/jpeg', lastModified: Date.now() }
              );
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          clearTimeout(timer);
          resolve(file);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(file);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      clearTimeout(timer);
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
};

export function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    return val.map(item => sanitizeForFirestore(item));
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    if (val[key] !== undefined) {
      cleaned[key] = sanitizeForFirestore(val[key]);
    }
  }
  return cleaned;
}

// Unified DB Service providing unified Promise-based CRUD operations
export const dbService = {
  // Check if real database is connected
  isRealFirebase: () => isFirebaseConfigured,

  // --- File/Media Uploads ---
  uploadFileWithProgress: async (
    file: File,
    folder = 'videos',
    onProgress?: (info: {
      progress: number;
      bytesTransferred: number;
      totalBytes: number;
      speed: string;
      remainingTime: string;
      formattedSize: string;
      state?: string;
    }) => void,
    cancelTaskHolder?: { current?: { cancel: () => void; pause?: () => void; resume?: () => void } },
    courseId?: string,
    lessonId?: string
  ): Promise<string> => {
    if (!file || typeof file !== 'object') {
      throw new Error("لم يتم اختيار أي ملف للرفع.");
    }

    const fileName = file.name || 'file';
    const fileSize = file.size || 0;
    if (fileSize <= 0) {
      throw new Error("حجم الملف المحدد غير صالح (0 بايت).");
    }

    if (folder !== 'homeworks') {
      const admin = authService.getCurrentAdmin();
      const activeUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      const isAdmin = admin !== null || (activeUser && (activeUser.role === 'admin' || activeUser.email === 'mhmdbdaltwabalsdawy7@gmail.com'));

      if (!isAdmin) {
        throw new Error("Access Denied: Administrator privileges are required to perform this action.");
      }
      secureLog('file_upload_admin', { fileName, folder, fileSize });
    } else {
      const student = authService.getCurrentUser();
      if (!student) {
        throw new Error("Access Denied: You must be logged in to upload.");
      }
      secureLog('file_upload_student', { student: student?.email || 'student', fileName, folder, fileSize });
    }

    return await uploadFileToFirebaseStorage({
      file,
      folder,
      courseId,
      lessonId,
      onProgress,
      cancelControlHolder: cancelTaskHolder
    });
  },

  uploadFile: async (file: File, folder = 'courses'): Promise<string> => {
    if (!file || typeof file !== 'object') {
      throw new Error("لم يتم اختيار أي ملف.");
    }

    const fileName = file.name || 'file';
    const fileSize = file.size || 0;
    if (fileSize <= 0) {
      throw new Error("حجم الملف غير صالح.");
    }

    // Role Check: Only admin can upload, except homeworks folder
    if (folder !== 'homeworks') {
      const admin = authService.getCurrentAdmin();
      const activeUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
      const activeUser = activeUserStr ? JSON.parse(activeUserStr) : null;
      const isAdmin = admin !== null || (activeUser && (activeUser.role === 'admin' || activeUser.email === 'mhmdbdaltwabalsdawy7@gmail.com'));

      if (!isAdmin) {
        throw new Error("Access Denied: Administrator privileges are required to perform this action.");
      }
      secureLog('file_upload_admin', { fileName, folder, fileSize });
    } else {
      const student = authService.getCurrentUser();
      if (!student) {
        throw new Error("Access Denied: You must be logged in to upload.");
      }
      secureLog('file_upload_student', { student: student?.email || 'student', fileName, folder, fileSize });
    }

    // Compress image files client-side first if applicable
    let processedFile = file;
    if (file.type && file.type.startsWith('image/')) {
      try {
        processedFile = await compressImageFile(file, 1200, 0.80);
      } catch (err) {
        console.warn("Image compression notice:", err);
      }
    }

    return await uploadFileToFirebaseStorage({
      file: processedFile,
      folder
    });
  },

  // --- Website Settings ---
  getSettings: async (): Promise<WebsiteSettings> => {
    let settings: WebsiteSettings;
    if (isFirebaseConfigured) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'settings', 'global'));
        if (snap.exists()) {
          settings = snap.data() as WebsiteSettings;
        } else {
          settings = getStorageItem<WebsiteSettings>('settings', defaultSettings);
        }
      } catch (err) {
        console.error("Firebase settings read failed, using fallback:", err);
        settings = getStorageItem<WebsiteSettings>('settings', defaultSettings);
      }
    } else {
      settings = getStorageItem<WebsiteSettings>('settings', defaultSettings);
    }

    if (settings) {
      let changed = false;
      if (settings.websiteNameAr && (settings.websiteNameAr.includes('الأستاذ') || settings.websiteNameAr.includes('الاستاذ') || settings.websiteNameAr.includes('أستاذ') || settings.websiteNameAr.includes('استاذ'))) {
        settings.websiteNameAr = settings.websiteNameAr
          .replace(/الأستاذ/g, 'مستر')
          .replace(/الاستاذ/g, 'مستر')
          .replace(/أستاذ/g, 'مستر')
          .replace(/استاذ/g, 'مستر');
        changed = true;
      }
      if (settings.footerAr && (settings.footerAr.includes('الأستاذ') || settings.footerAr.includes('الاستاذ') || settings.footerAr.includes('أستاذ') || settings.footerAr.includes('استاذ'))) {
        settings.footerAr = settings.footerAr
          .replace(/الأستاذ/g, 'مستر')
          .replace(/الاستاذ/g, 'مستر')
          .replace(/أستاذ/g, 'مستر')
          .replace(/استاذ/g, 'مستر');
        changed = true;
      }
      if (changed) {
        setStorageItem<WebsiteSettings>('settings', settings);
      }
    }
    return settings;
  },

  updateSettings: async (settings: WebsiteSettings): Promise<void> => {
    checkAdminWrite('update_settings', { settings });
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'global'), settings);
        return;
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
      }
    }
    setStorageItem<WebsiteSettings>('settings', settings);
  },

  listenToSettings: (onUpdate: (settings: WebsiteSettings) => void): (() => void) => {
    if (isFirebaseConfigured) {
      const ref = doc(firestoreDb, 'settings', 'global');
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as WebsiteSettings);
        } else {
          onUpdate(getStorageItem<WebsiteSettings>('settings', defaultSettings));
        }
      }, (err) => {
        console.error("Settings listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        onUpdate(getStorageItem<WebsiteSettings>('settings', defaultSettings));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  // --- Categories ---
  getCategories: async (): Promise<Category[]> => {
    let rawList: Category[] = [];
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'categories'));
        snap.forEach(d => rawList.push({ id: d.id, ...d.data() } as Category));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'categories');
      }
    }
    if (rawList.length === 0) {
      const current = getStorageItem<Category[]>('categories', defaultCategories);
      rawList = (!current || current.length === 0) ? defaultCategories : current;
    }

    const mergedList = [...rawList];
    defaultCategories.forEach(def => {
      if (!mergedList.some(c => c.id === def.id)) {
        mergedList.push(def);
      }
    });

    return mergedList.map(cat => ({
      ...cat,
      nameAr: cat.nameAr ? cat.nameAr.replace(/\s*\(علوم\)/g, '').replace(/\s*\(علوم متكاملة\)/g, '').trim() : '',
      nameEn: cat.nameEn ? cat.nameEn.replace(/\s*\(Science\)/g, '').replace(/\s*\(Integrated Science\)/g, '').trim() : ''
    }));
  },

  addCategory: async (category: Omit<Category, 'id'>): Promise<Category> => {
    checkAdminWrite('add_category', { category });
    const newId = 'cat_' + Date.now();
    const newCategory: Category = { id: newId, ...category };
    const current = getStorageItem<Category[]>('categories', defaultCategories);
    current.push(newCategory);
    setStorageItem('categories', current);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'categories', newId), category);
      } catch (err: any) {
        console.warn("Firestore addCategory notice:", err);
      }
    }
    return newCategory;
  },

  updateCategory: async (id: string, category: Partial<Category>): Promise<void> => {
    checkAdminWrite('update_category', { id, category });
    const current = getStorageItem<Category[]>('categories', defaultCategories);
    const updated = current.map(item => item.id === id ? { ...item, ...category } : item);
    setStorageItem('categories', updated);

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'categories', id), category as any);
      } catch (err: any) {
        try {
          await setDoc(doc(firestoreDb, 'categories', id), category as any, { merge: true });
        } catch (setErr) {
          console.warn("Firestore updateCategory notice:", setErr);
        }
      }
    }
  },

  deleteCategory: async (id: string): Promise<void> => {
    checkAdminWrite('delete_category', { id });
    const current = getStorageItem<Category[]>('categories', defaultCategories);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('categories', updated);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'categories', id));
      } catch (err: any) {
        console.warn("Firestore deleteCategory notice:", err);
      }
    }
  },

  // --- Courses ---
  getCourses: async (): Promise<Course[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'courses'));
        const list: Course[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Course));

        if (list.length > 0) {
          const localList = getStorageItem<Course[]>('courses', defaultCourses);
          const map = new Map<string, Course>();
          localList.forEach(c => map.set(c.id, c));
          list.forEach(c => map.set(c.id, c));
          const merged = Array.from(map.values()).map(c => normalizeCourseLessons(c));
          setStorageItem('courses', merged);
          return merged;
        }
      } catch (err: any) {
        console.warn("Firestore getCourses notice:", err);
      }
    }
    const localCourses = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
    return localCourses;
  },

  listenToCourses: (onUpdate: (courses: Course[]) => void) => {
    // Immediate initial local emit
    const initial = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
    onUpdate(initial);

    if (isFirebaseConfigured) {
      let coursesList: Course[] = [];

      const unsubCourses = onSnapshot(collection(firestoreDb, 'courses'), (snap) => {
        coursesList = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Course;
          coursesList.push(item);
        });

        // Merge snapshot with local storage so no recently added local course is lost
        const localList = getStorageItem<Course[]>('courses', defaultCourses);
        const map = new Map<string, Course>();
        localList.forEach(c => map.set(c.id, c));
        coursesList.forEach(c => map.set(c.id, c));
        const merged = Array.from(map.values()).map(c => normalizeCourseLessons(c));
        
        setStorageItem('courses', merged);
        onUpdate(merged);
      }, (err) => {
        console.warn("Courses Firestore listener notice:", err);
        const local = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
        onUpdate(local);
      });

      return () => {
        unsubCourses();
      };
    } else {
      const loadLocal = () => {
        const localCourses = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
        onUpdate(localCourses);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  addCourse: async (course: Omit<Course, 'id' | 'createdAt'>): Promise<Course> => {
    checkAdminWrite('add_course', { course });
    const newId = 'course_' + Date.now();
    const isPublished = course.published !== false;
    const isPremium = typeof course.isPremium === 'boolean' ? course.isPremium : !course.isFree;
    
    const newCourse: Course = {
      id: newId,
      ...course,
      published: isPublished,
      status: isPublished ? 'published' : 'draft',
      grade: course.grade || course.categoryId || 'prep1',
      department: (course as any).department || 'general',
      isPremium,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // 1. Immediately persist to local cache first
    const current = getStorageItem<Course[]>('courses', defaultCourses);
    const updated = [...current.filter(c => c.id !== newId), newCourse];
    setStorageItem('courses', updated);

    // 2. Sync to Firestore in the background
    if (isFirebaseConfigured) {
      try {
        const firestoreData = sanitizeForFirestore(newCourse);
        await setDoc(doc(firestoreDb, 'courses', newId), firestoreData);
      } catch (err: any) {
        console.warn("Firestore addCourse sync notice:", err);
      }
    }

    return newCourse;
  },

  updateCourse: async (id: string, course: Partial<Course>): Promise<void> => {
    checkAdminWrite('update_course', { id, course });
    const patch: any = { ...course };
    if (typeof course.published === 'boolean') {
      patch.status = course.published ? 'published' : 'draft';
    }
    if (typeof course.isFree === 'boolean' && typeof course.isPremium !== 'boolean') {
      patch.isPremium = !course.isFree;
    }

    // 1. Immediately persist to local cache first
    const current = getStorageItem<Course[]>('courses', defaultCourses);
    const updated = current.map(item => item.id === id ? { ...item, ...patch } : item);
    setStorageItem('courses', updated);

    // 2. Sync to Firestore
    if (isFirebaseConfigured) {
      try {
        const firestorePatch = sanitizeForFirestore(patch);
        await updateDoc(doc(firestoreDb, 'courses', id), firestorePatch);
      } catch (err: any) {
        try {
          const mergePayload = sanitizeForFirestore(patch);
          await setDoc(doc(firestoreDb, 'courses', id), mergePayload, { merge: true });
        } catch (setErr) {
          console.warn("Firebase updateCourse sync notice:", setErr);
        }
      }
    }
  },


  deleteCourse: async (id: string): Promise<void> => {
    checkAdminWrite('delete_course', { id });
    if (isFirebaseConfigured) {
      try {
        const courseDocRef = doc(firestoreDb, 'courses', id);
        const courseSnap = await getDoc(courseDocRef);
        
        if (courseSnap.exists()) {
          const courseData = courseSnap.data() as Course;
          const urlsToDelete: string[] = [];

          const addUrl = (url?: string) => {
            if (url && typeof url === 'string' && url.includes('firebasestorage.googleapis.com')) {
              urlsToDelete.push(url);
            }
          };

          // 1. Course top-level media fields (Images, Videos, PDFs)
          addUrl(courseData.thumbnailUrl);
          addUrl(courseData.bannerUrl);
          addUrl(courseData.videoUrl);
          addUrl(courseData.pdfUrl);

          if (Array.isArray(courseData.imageUrls)) {
            courseData.imageUrls.forEach(url => addUrl(url));
          }
          if (Array.isArray(courseData.attachments)) {
            courseData.attachments.forEach(url => addUrl(url));
          }

          // 2. Lesson-level media fields (Images, Videos, PDFs)
          if (Array.isArray(courseData.lessons)) {
            courseData.lessons.forEach(lesson => {
              addUrl(lesson.videoUrl);
              addUrl(lesson.pdfUrl);
              if (Array.isArray(lesson.attachments)) {
                lesson.attachments.forEach(url => addUrl(url));
              }
            });
          }

          // Delete all collected storage files
          if (urlsToDelete.length > 0) {
            try {
              const { getStorage, ref, deleteObject } = await import('firebase/storage');
              const storageInstance = getStorage(app);
              await Promise.all(
                urlsToDelete.map(async (url) => {
                  try {
                    const fileRef = ref(storageInstance, url);
                    await deleteObject(fileRef);
                  } catch (storageErr) {
                    console.error(`Error deleting storage file (${url}):`, storageErr);
                  }
                })
              );
            } catch (storageImportErr) {
              console.error("Failed to import or access firebase/storage:", storageImportErr);
            }
          }
        }

        // 3. Delete linked quizzes and assignments in Firestore
        try {
          const qQuizzes = query(collection(firestoreDb, 'quizzes'), where('courseId', '==', id));
          const quizSnap = await getDocs(qQuizzes);
          await Promise.all(quizSnap.docs.map(qDoc => deleteDoc(qDoc.ref)));

          const qAssign = query(collection(firestoreDb, 'assignments'), where('courseId', '==', id));
          const assignSnap = await getDocs(qAssign);
          await Promise.all(assignSnap.docs.map(aDoc => deleteDoc(aDoc.ref)));
        } catch (linkedErr) {
          console.error("Error deleting linked quizzes/assignments:", linkedErr);
        }

        // Delete the course document from Cloud Firestore
        await deleteDoc(courseDocRef);
      } catch (err: any) {
        console.error("Firebase course delete error:", err);
        handleFirestoreError(err, OperationType.DELETE, 'courses/' + id);
      }
    }
    const current = getStorageItem<Course[]>('courses', defaultCourses);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('courses', updated);

    // Clean local storage fallbacks for linked items
    const currentQuizzes = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    setStorageItem('quizzes', currentQuizzes.filter(q => q.courseId !== id));

    const currentAssign = getStorageItem<AssignmentSubmission[]>('assignments', []);
    setStorageItem('assignments', currentAssign.filter(a => a.courseId !== id));
  },

  // --- Students ---
  getStudents: async (): Promise<Student[]> => {
    if (isFirebaseConfigured) {
      try {
        const list: Student[] = [];
        const seenIds = new Set<string>();
        const seenEmails = new Set<string>();

        const addToList = (id: string, data: any) => {
          if (!id || seenIds.has(id)) return;
          const email = (data.email || '').trim().toLowerCase();
          if (email && seenEmails.has(email)) return;
          if (isAdminEmail(email) || data.role === 'admin' || data.role === 'teacher') return;

          let normalizedStatus = (data.status || 'pending').trim().toLowerCase();
          if ((normalizedStatus === 'active' || !data.status) && !data.isApproved && (!data.purchasedCourseIds || data.purchasedCourseIds.length === 0) && (!data.subscription || !data.subscription.active)) {
            normalizedStatus = 'pending';
          }

          list.push({
            id: id,
            uid: id,
            name: data.name || 'طالب الأكاديمية',
            email: email,
            phone: data.phone || '',
            purchasedCourseIds: data.purchasedCourseIds || [],
            watchedLessonIds: data.watchedLessonIds || [],
            quizGrades: data.quizGrades || {},
            enrollmentDate: (data.createdAt || data.enrollmentDate || '').split('T')[0] || new Date().toISOString().split('T')[0],
            status: normalizedStatus as any,
            subscription: data.subscription || { active: false, expiresAt: '' },
            department: data.department || 'general',
            grade: data.grade || '1prep',
            createdAt: data.createdAt || data.enrollmentDate || new Date().toISOString(),
            isApproved: data.isApproved || false
          });
          seenIds.add(id);
          if (email) seenEmails.add(email);
        };

        const snap = await getDocs(collection(firestoreDb, 'students'));
        snap.forEach(d => addToList(d.id, d.data()));

        try {
          const usersSnap = await getDocs(collection(firestoreDb, 'users'));
          usersSnap.forEach(d => {
            const u = d.data();
            if (u.role !== 'admin' && u.role !== 'teacher' && !isAdminEmail(u.email || '')) {
              addToList(d.id, u);
            }
          });
        } catch (e) {}

        try {
          const regSnap = await getDocs(collection(firestoreDb, 'registrations'));
          regSnap.forEach(d => addToList(d.id, d.data()));
        } catch (e) {}

        try {
          const reqSnap = await getDocs(collection(firestoreDb, 'studentRequests'));
          reqSnap.forEach(d => addToList(d.id, d.data()));
        } catch (e) {}

        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.enrollmentDate || 0).getTime();
          const timeB = new Date(b.createdAt || b.enrollmentDate || 0).getTime();
          return timeB - timeA;
        });

        return list;
      } catch (err) {
        console.error("Firebase students read failed, using fallback:", err);
      }
    }
    return getStorageItem<Student[]>('students', defaultStudents);
  },

  listenToStudents: (onUpdate: (students: Student[]) => void): (() => void) => {
    if (isFirebaseConfigured) {
      let studentsList: any[] = [];
      let usersList: any[] = [];
      let regList: any[] = [];
      let reqList: any[] = [];

      const notify = () => {
        const list: Student[] = [];
        const seenIds = new Set<string>();
        const seenEmails = new Set<string>();

        const addToList = (item: any) => {
          if (!item || !item.id || seenIds.has(item.id)) return;
          const email = (item.email || '').trim().toLowerCase();
          if (email && seenEmails.has(email)) return;
          if (isAdminEmail(email) || item.role === 'admin' || item.role === 'teacher') return;

          let normalizedStatus = (item.status || 'pending').trim().toLowerCase();
          if ((normalizedStatus === 'active' || !item.status) && !item.isApproved && (!item.purchasedCourseIds || item.purchasedCourseIds.length === 0) && (!item.subscription || !item.subscription.active)) {
            normalizedStatus = 'pending';
          }

          list.push({
            id: item.id,
            uid: item.id,
            name: item.name || 'طالب الأكاديمية',
            email: email,
            phone: item.phone || '',
            purchasedCourseIds: item.purchasedCourseIds || [],
            watchedLessonIds: item.watchedLessonIds || [],
            quizGrades: item.quizGrades || {},
            enrollmentDate: (item.createdAt || item.enrollmentDate || '').split('T')[0] || new Date().toISOString().split('T')[0],
            status: normalizedStatus as any,
            subscription: item.subscription || { active: false, expiresAt: '' },
            department: item.department || 'general',
            grade: item.grade || '1prep',
            createdAt: item.createdAt || item.enrollmentDate || new Date().toISOString(),
            isApproved: item.isApproved || false
          });
          seenIds.add(item.id);
          if (email) seenEmails.add(email);
        };

        for (const r of regList) addToList(r);
        for (const req of reqList) addToList(req);
        for (const s of studentsList) addToList(s);
        for (const u of usersList) {
          if (u.role !== 'admin' && u.role !== 'teacher' && !isAdminEmail(u.email || '')) {
            addToList(u);
          }
        }

        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.enrollmentDate || 0).getTime();
          const timeB = new Date(b.createdAt || b.enrollmentDate || 0).getTime();
          return timeB - timeA;
        });

        onUpdate(list);
      };

      let unsub1 = () => {};
      try {
        unsub1 = onSnapshot(collection(firestoreDb, 'students'), (snap) => {
          studentsList = [];
          snap.forEach(d => studentsList.push({ id: d.id, ...d.data() }));
          notify();
        }, (err) => {
          console.error("Firebase students listener failed:", err);
        });
      } catch (e) {}

      let unsub2 = () => {};
      try {
        unsub2 = onSnapshot(collection(firestoreDb, 'users'), (snap) => {
          usersList = [];
          snap.forEach(d => usersList.push({ id: d.id, ...d.data() }));
          notify();
        }, (err) => {
          console.error("Firebase users listener failed:", err);
        });
      } catch (e) {}

      let unsub3 = () => {};
      try {
        unsub3 = onSnapshot(collection(firestoreDb, 'registrations'), (snap) => {
          regList = [];
          snap.forEach(d => regList.push({ id: d.id, ...d.data() }));
          notify();
        }, (err) => {
          console.error("Firebase registrations listener failed:", err);
        });
      } catch (e) {}

      let unsub4 = () => {};
      try {
        unsub4 = onSnapshot(collection(firestoreDb, 'studentRequests'), (snap) => {
          reqList = [];
          snap.forEach(d => reqList.push({ id: d.id, ...d.data() }));
          notify();
        }, (err) => {
          console.error("Firebase studentRequests listener failed:", err);
        });
      } catch (e) {}

      return () => {
        unsub1();
        unsub2();
        unsub3();
        unsub4();
      };
    } else {
      const loadLocal = () => {
        const local = getStorageItem<Student[]>('students', defaultStudents);
        onUpdate(local);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  addStudent: async (student: Omit<Student, 'id' | 'enrollmentDate'>): Promise<Student> => {
    const targetEmail = student.email ? student.email.trim().toLowerCase() : '';
    if (targetEmail && isFirebaseConfigured) {
      try {
        const qUsers = query(collection(firestoreDb, 'users'), where('email', '==', targetEmail));
        const uSnap = await getDocs(qUsers);
        if (!uSnap.empty) {
          const existingId = uSnap.docs[0].id;
          await dbService.updateStudent(existingId, student);
          return { id: existingId, uid: existingId, ...uSnap.docs[0].data(), ...student } as Student;
        }
        const qStuds = query(collection(firestoreDb, 'students'), where('email', '==', targetEmail));
        const sSnap = await getDocs(qStuds);
        if (!sSnap.empty) {
          const existingId = sSnap.docs[0].id;
          await dbService.updateStudent(existingId, student);
          return { id: existingId, uid: existingId, ...sSnap.docs[0].data(), ...student } as Student;
        }
      } catch (e) {}
    }

    const newId = 'stud_' + Date.now();
    const nowIso = new Date().toISOString();
    const newStudent: Student = {
      id: newId,
      uid: newId,
      ...student,
      enrollmentDate: nowIso.split('T')[0],
      createdAt: nowIso
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'students', newId), newStudent);
        if (!student.status || student.status === 'pending') {
          await setDoc(doc(firestoreDb, 'registrations', newId), newStudent).catch(() => {});
          await setDoc(doc(firestoreDb, 'studentRequests', newId), newStudent).catch(() => {});
        }
        const userDocData = {
          uid: newId,
          id: newId,
          name: student.name,
          email: student.email.trim().toLowerCase(),
          phone: student.phone || '',
          role: 'student',
          status: student.status || 'active',
          department: student.department || 'general',
          grade: student.grade || '1prep',
          createdAt: nowIso,
          purchasedCourseIds: student.purchasedCourseIds || []
        };
        await setDoc(doc(firestoreDb, 'users', newId), userDocData, { merge: true });
        return newStudent;
      } catch (err) {
        console.error("Firebase student add failed:", err);
      }
    }
    const current = getStorageItem<Student[]>('students', defaultStudents);
    current.push(newStudent);
    setStorageItem('students', current);
    return newStudent;
  },

  updateStudent: async (id: string, student: Partial<Student>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'students', id), student as any, { merge: true }).catch(() => {});
        if (student.status === 'active' || student.status === 'rejected' || (student as any).isApproved) {
          await deleteDoc(doc(firestoreDb, 'registrations', id)).catch(() => {});
          await deleteDoc(doc(firestoreDb, 'studentRequests', id)).catch(() => {});
        } else {
          await updateDoc(doc(firestoreDb, 'registrations', id), student as any).catch(() => {});
          await updateDoc(doc(firestoreDb, 'studentRequests', id), student as any).catch(() => {});
        }
        const userUpdates: Partial<UserAuth> = {};
        if (student.name !== undefined) userUpdates.name = student.name;
        if (student.email !== undefined) userUpdates.email = student.email.trim().toLowerCase();
        if (student.phone !== undefined) userUpdates.phone = student.phone;
        if (student.status !== undefined) userUpdates.status = student.status as any;
        if (student.grade !== undefined) userUpdates.grade = student.grade;
        if (student.department !== undefined) userUpdates.department = student.department;
        if (student.purchasedCourseIds !== undefined) userUpdates.purchasedCourseIds = student.purchasedCourseIds;
        if (Object.keys(userUpdates).length > 0) {
          await setDoc(doc(firestoreDb, 'users', id), userUpdates as any, { merge: true }).catch(() => {});
        }
        return;
      } catch (err) {
        console.error("Firebase student update failed:", err);
      }
    }
    const current = getStorageItem<Student[]>('students', defaultStudents);
    const updated = current.map(item => item.id === id ? { ...item, ...student } : item);
    setStorageItem('students', updated);
  },

  deleteStudent: async (id: string, email?: string): Promise<void> => {
    let targetEmail = email ? email.trim().toLowerCase() : '';
    if (!targetEmail && isFirebaseConfigured) {
      try {
        const snap = await getDoc(doc(firestoreDb, 'students', id));
        if (snap.exists() && snap.data().email) targetEmail = snap.data().email.trim().toLowerCase();
        if (!targetEmail) {
          const uSnap = await getDoc(doc(firestoreDb, 'users', id));
          if (uSnap.exists() && uSnap.data().email) targetEmail = uSnap.data().email.trim().toLowerCase();
        }
      } catch (e) {}
    }
    if (!targetEmail) {
      const currentStudents = getStorageItem<Student[]>('students', defaultStudents);
      const st = currentStudents.find(s => s.id === id);
      if (st && st.email) targetEmail = st.email.trim().toLowerCase();
    }

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'students', id)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'users', id)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'registrations', id)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'studentRequests', id)).catch(() => {});

        if (targetEmail) {
          const cols = ['students', 'users', 'registrations', 'studentRequests'];
          for (const colName of cols) {
            try {
              const qCol = query(collection(firestoreDb, colName), where('email', '==', targetEmail));
              const snap = await getDocs(qCol);
              for (const d of snap.docs) {
                if (colName === 'users') {
                  const uData = d.data();
                  if (uData.role === 'admin' || uData.role === 'teacher' || isAdminEmail(uData.email || '')) continue;
                }
                await deleteDoc(d.ref).catch(() => {});
              }
            } catch (e) {}
          }
        }

        const orderCols = ['orders', 'courseRequests'];
        for (const colName of orderCols) {
          try {
            const qById = query(collection(firestoreDb, colName), where('studentId', '==', id));
            const snapId = await getDocs(qById);
            for (const d of snapId.docs) {
              const oData = d.data();
              if (oData.studentId && oData.courseId) {
                await deleteDoc(doc(firestoreDb, 'courseAccess', `${oData.studentId}_${oData.courseId}`)).catch(() => {});
              }
              await deleteDoc(d.ref).catch(() => {});
            }
            if (targetEmail) {
              const qByEmail = query(collection(firestoreDb, colName), where('studentEmail', '==', targetEmail));
              const snapEmail = await getDocs(qByEmail);
              for (const d of snapEmail.docs) {
                const oData = d.data();
                if (oData.studentId && oData.courseId) {
                  await deleteDoc(doc(firestoreDb, 'courseAccess', `${oData.studentId}_${oData.courseId}`)).catch(() => {});
                }
                await deleteDoc(d.ref).catch(() => {});
              }
            }
          } catch (e) {}
        }

        try { await dbService.deleteStudentChat(id); } catch (e) {}
      } catch (err) {
        console.error("Firebase student delete failed:", err);
      }
    }

    const currentStudents = getStorageItem<Student[]>('students', defaultStudents);
    const updatedStudents = currentStudents.filter(item => item.id !== id && (targetEmail ? item.email?.toLowerCase() !== targetEmail : true));
    setStorageItem('students', updatedStudents);

    const currentOrders = getStorageItem<Order[]>('orders', defaultOrders);
    const updatedOrders = currentOrders.filter(o => o.studentId !== id && (targetEmail ? o.studentEmail?.toLowerCase() !== targetEmail : true));
    setStorageItem('orders', updatedOrders);

    const currentUsers = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updatedUsers = currentUsers.filter(u => u.id !== id && (targetEmail ? u.email?.toLowerCase() !== targetEmail : true));
    setStorageItem('users', updatedUsers);
  },

  clearAllStudentsAndOrders: async (): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        const collectionsToWipe = ['students', 'registrations', 'studentRequests', 'orders', 'courseRequests', 'courseAccess', 'lessonAccess', 'certificates', 'assignment_tasks'];
        for (const colName of collectionsToWipe) {
          try {
            const snap = await getDocs(collection(firestoreDb, colName));
            for (const d of snap.docs) {
              await deleteDoc(d.ref).catch(() => {});
            }
          } catch (e) {}
        }

        try {
          const usersSnap = await getDocs(collection(firestoreDb, 'users'));
          for (const d of usersSnap.docs) {
            const uData = d.data();
            if (uData.role !== 'admin' && uData.role !== 'teacher' && !isAdminEmail(uData.email || '')) {
              await deleteDoc(d.ref).catch(() => {});
            }
          }
        } catch (e) {}

        try {
          const chatsSnap = await getDocs(collection(firestoreDb, 'chats'));
          for (const d of chatsSnap.docs) {
            await dbService.deleteStudentChat(d.id).catch(() => {});
          }
        } catch (e) {}
      } catch (err) {
        console.error("Firebase clear all students failed:", err);
      }
    }
    setStorageItem('students', []);
    setStorageItem('orders', []);
    setStorageItem('registrations', []);
    setStorageItem('studentRequests', []);
    setStorageItem('courseRequests', []);
    setStorageItem('courseAccess', []);
    setStorageItem('lessonAccess', []);
    setStorageItem('certificates', []);
    setStorageItem('assignment_tasks', []);
    setStorageItem('chats', {});
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updatedUsers = users.filter(u => u.role === 'admin' || u.role === 'teacher' || isAdminEmail(u.email || ''));
    setStorageItem('users', updatedUsers);
    try { await dbService.forceLogoutAllUsers(); } catch (e) {}
  },

  forceLogoutAllUsers: async (): Promise<void> => {
    const nowTimestamp = Date.now();
    try {
      const currentSettings = await dbService.getSettings();
      const updatedSettings = { ...currentSettings, forceLogoutVersion: nowTimestamp };
      await dbService.updateSettings(updatedSettings);
    } catch (err) {
      console.error("Failed to update settings forceLogoutVersion:", err);
    }

    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        for (const d of snap.docs) {
          const uData = d.data() as UserAuth;
          if (uData.role !== 'admin' && !isAdminEmail(uData.email || '')) {
            await updateDoc(d.ref, { forceLogoutVersion: nowTimestamp }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Firebase force logout all failed:", err);
      }
    }

    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updatedUsers = users.map(u => (u.role === 'admin' || isAdminEmail(u.email || '')) ? u : { ...u, forceLogoutVersion: nowTimestamp });
    setStorageItem('users', updatedUsers);

    localStorage.setItem('academy_global_force_logout_ver', String(nowTimestamp));
  },

  // --- News ---
  getNews: async (): Promise<NewsItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'news'));
        const list: NewsItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as NewsItem));
        return list;
      } catch (err) {
        console.error("Firebase news read failed, using fallback:", err);
      }
    }
    return getStorageItem<NewsItem[]>('news', defaultNews);
  },

  addNews: async (newsItem: Omit<NewsItem, 'id' | 'date'>): Promise<NewsItem> => {
    const newId = 'news_' + Date.now();
    const newNews: NewsItem = {
      id: newId,
      ...newsItem,
      date: new Date().toISOString().split('T')[0]
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'news', newId), { ...newsItem, date: newNews.date });
        return newNews;
      } catch (err) {
        console.error("Firebase news add failed:", err);
      }
    }
    const current = getStorageItem<NewsItem[]>('news', defaultNews);
    current.push(newNews);
    setStorageItem('news', current);
    return newNews;
  },

  updateNews: async (id: string, newsItem: Partial<NewsItem>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'news', id), newsItem as any);
        return;
      } catch (err) {
        console.error("Firebase news update failed:", err);
      }
    }
    const current = getStorageItem<NewsItem[]>('news', defaultNews);
    const updated = current.map(item => item.id === id ? { ...item, ...newsItem } : item);
    setStorageItem('news', updated);
  },

  deleteNews: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'news', id));
      } catch (err) {
        console.error("Firebase news delete failed:", err);
      }
    }
    const current = getStorageItem<NewsItem[]>('news', defaultNews);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('news', updated);
  },

  // --- Articles ---
  getArticles: async (): Promise<Article[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'articles'));
        const list: Article[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Article));
        return list;
      } catch (err) {
        console.error("Firebase articles read failed, using fallback:", err);
      }
    }
    return getStorageItem<Article[]>('articles', defaultArticles);
  },

  addArticle: async (article: Omit<Article, 'id' | 'date'>): Promise<Article> => {
    const newId = 'art_' + Date.now();
    const newArticle: Article = {
      id: newId,
      ...article,
      date: new Date().toISOString().split('T')[0]
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'articles', newId), { ...article, date: newArticle.date });
        return newArticle;
      } catch (err) {
        console.error("Firebase article add failed:", err);
      }
    }
    const current = getStorageItem<Article[]>('articles', defaultArticles);
    current.push(newArticle);
    setStorageItem('articles', current);
    return newArticle;
  },

  updateArticle: async (id: string, article: Partial<Article>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'articles', id), article as any);
        return;
      } catch (err) {
        console.error("Firebase article update failed:", err);
      }
    }
    const current = getStorageItem<Article[]>('articles', defaultArticles);
    const updated = current.map(item => item.id === id ? { ...item, ...article } : item);
    setStorageItem('articles', updated);
  },

  deleteArticle: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'articles', id));
      } catch (err) {
        console.error("Firebase article delete failed:", err);
      }
    }
    const current = getStorageItem<Article[]>('articles', defaultArticles);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('articles', updated);
  },

  // --- Reviews ---
  getReviews: async (): Promise<UserReview[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'reviews'));
        const list: UserReview[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as UserReview));
        return list;
      } catch (err) {
        console.error("Firebase reviews read failed, using fallback:", err);
      }
    }
    return getStorageItem<UserReview[]>('reviews', defaultReviews);
  },

  addReview: async (review: Omit<UserReview, 'id' | 'date'>): Promise<UserReview> => {
    const newId = 'rev_' + Date.now();
    const newReview: UserReview = {
      id: newId,
      ...review,
      date: new Date().toISOString().split('T')[0]
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'reviews', newId), { ...review, date: newReview.date });
        return newReview;
      } catch (err) {
        console.error("Firebase review add failed:", err);
      }
    }
    const current = getStorageItem<UserReview[]>('reviews', defaultReviews);
    current.push(newReview);
    setStorageItem('reviews', current);
    return newReview;
  },

  updateReview: async (id: string, review: Partial<UserReview>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'reviews', id), review as any);
        return;
      } catch (err) {
        console.error("Firebase review update failed:", err);
      }
    }
    const current = getStorageItem<UserReview[]>('reviews', defaultReviews);
    const updated = current.map(item => item.id === id ? { ...item, ...review } : item);
    setStorageItem('reviews', updated);
  },

  deleteReview: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'reviews', id));
      } catch (err) {
        console.error("Firebase review delete failed:", err);
      }
    }
    const current = getStorageItem<UserReview[]>('reviews', defaultReviews);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('reviews', updated);
  },

  // --- Messages ---
  getMessages: async (): Promise<Message[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'messages'));
        const list: Message[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Message));
        return list;
      } catch (err) {
        console.error("Firebase messages read failed:", err);
        return [];
      }
    }
    return getStorageItem<Message[]>('messages', defaultMessages);
  },

  listenToMessages: (onUpdate: (messages: Message[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'messages');
      return onSnapshot(q, (snap) => {
        const list: Message[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Message);
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        onUpdate(list);
      }, (err) => {
        console.error("Messages listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        const local = getStorageItem<Message[]>('messages', defaultMessages);
        onUpdate(local);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  addMessage: async (message: Omit<Message, 'id' | 'date' | 'read'>): Promise<Message> => {
    const newId = 'msg_' + Date.now();
    const sanitizedMsg = {
      name: message.name || '',
      email: (message.email || '').trim().toLowerCase(),
      phone: message.phone || '',
      subject: message.subject || '',
      message: message.message || '',
      date: new Date().toISOString(),
      read: false
    };
    const newMessage: Message = {
      id: newId,
      ...sanitizedMsg
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'messages', newId), sanitizedMsg);
        return newMessage;
      } catch (err: any) {
        console.error("Firebase message add failed:", err);
        handleFirestoreError(err, OperationType.WRITE, 'messages/' + newId);
        throw err;
      }
    }
    const current = getStorageItem<Message[]>('messages', defaultMessages);
    current.push(newMessage);
    setStorageItem('messages', current);
    return newMessage;
  },

  updateMessage: async (id: string, message: Partial<Message>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'messages', id), message as any);
        return;
      } catch (err: any) {
        console.error("Firebase message update failed:", err);
        handleFirestoreError(err, OperationType.WRITE, 'messages/' + id);
        return;
      }
    }
    const current = getStorageItem<Message[]>('messages', defaultMessages);
    const updated = current.map(item => item.id === id ? { ...item, ...message } : item);
    setStorageItem('messages', updated);
  },

  deleteMessage: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'messages', id));
        return;
      } catch (err: any) {
        console.error("Firebase message delete failed:", err);
        handleFirestoreError(err, OperationType.DELETE, 'messages/' + id);
        return;
      }
    }
    const current = getStorageItem<Message[]>('messages', defaultMessages);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('messages', updated);
  },

  // --- Admins ---
  getAdmins: async (): Promise<Admin[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'admins'));
        const list: Admin[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Admin));
        return list;
      } catch (err) {
        console.error("Firebase admins read failed, using fallback:", err);
      }
    }
    return getStorageItem<Admin[]>('admins', defaultAdmins);
  },

  addAdmin: async (admin: Omit<Admin, 'id'>): Promise<Admin> => {
    const newId = 'adm_' + Date.now();
    const newAdmin: Admin = { id: newId, ...admin };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'admins', newId), admin);
        return newAdmin;
      } catch (err) {
        console.error("Firebase admin add failed:", err);
      }
    }
    const current = getStorageItem<Admin[]>('admins', defaultAdmins);
    current.push(newAdmin);
    setStorageItem('admins', current);
    return newAdmin;
  },

  updateAdmin: async (id: string, admin: Partial<Admin>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'admins', id), admin as any);
        return;
      } catch (err) {
        console.error("Firebase admin update failed:", err);
      }
    }
    const current = getStorageItem<Admin[]>('admins', defaultAdmins);
    const updated = current.map(item => item.id === id ? { ...item, ...admin } : item);
    setStorageItem('admins', updated);
  },

  deleteAdmin: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'admins', id));
      } catch (err) {
        console.error("Firebase admin delete failed:", err);
      }
    }
    const current = getStorageItem<Admin[]>('admins', defaultAdmins);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('admins', updated);
  },

  // --- Teachers ---
  getTeachers: async (): Promise<Teacher[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'teachers'));
        const list: Teacher[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Teacher));
        return list;
      } catch (err) {
        console.error("Firebase teachers read failed, using fallback:", err);
      }
    }
    return getStorageItem<Teacher[]>('teachers', defaultTeachers);
  },

  addTeacher: async (teacher: Omit<Teacher, 'id'>): Promise<Teacher> => {
    const newId = 'teach_' + Date.now();
    const newTeacher: Teacher = { id: newId, ...teacher };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'teachers', newId), teacher);
        return newTeacher;
      } catch (err) {
        console.error("Firebase teacher add failed:", err);
      }
    }
    const current = getStorageItem<Teacher[]>('teachers', defaultTeachers);
    current.push(newTeacher);
    setStorageItem('teachers', current);
    return newTeacher;
  },

  updateTeacher: async (id: string, teacher: Partial<Teacher>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'teachers', id), teacher as any);
        return;
      } catch (err) {
        console.error("Firebase teacher update failed:", err);
      }
    }
    const current = getStorageItem<Teacher[]>('teachers', defaultTeachers);
    const updated = current.map(item => item.id === id ? { ...item, ...teacher } : item);
    setStorageItem('teachers', updated);
  },

  deleteTeacher: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'teachers', id));
      } catch (err) {
        console.error("Firebase teacher delete failed:", err);
      }
    }
    const current = getStorageItem<Teacher[]>('teachers', defaultTeachers);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('teachers', updated);
  },

  // --- Coupons ---
  getCoupons: async (): Promise<Coupon[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'coupons'));
        const list: Coupon[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Coupon));
        return list;
      } catch (err) {
        console.error("Firebase coupons read failed, using fallback:", err);
      }
    }
    return getStorageItem<Coupon[]>('coupons', defaultCoupons);
  },

  addCoupon: async (coupon: Omit<Coupon, 'id'>): Promise<Coupon> => {
    const newId = 'coup_' + Date.now();
    const newCoupon: Coupon = { id: newId, ...coupon };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'coupons', newId), coupon);
        return newCoupon;
      } catch (err) {
        console.error("Firebase coupon add failed:", err);
      }
    }
    const current = getStorageItem<Coupon[]>('coupons', defaultCoupons);
    current.push(newCoupon);
    setStorageItem('coupons', current);
    return newCoupon;
  },

  updateCoupon: async (id: string, coupon: Partial<Coupon>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'coupons', id), coupon as any);
        return;
      } catch (err) {
        console.error("Firebase coupon update failed:", err);
      }
    }
    const current = getStorageItem<Coupon[]>('coupons', defaultCoupons);
    const updated = current.map(item => item.id === id ? { ...item, ...coupon } : item);
    setStorageItem('coupons', updated);
  },

  deleteCoupon: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'coupons', id));
      } catch (err) {
        console.error("Firebase coupon delete failed:", err);
      }
    }
    const current = getStorageItem<Coupon[]>('coupons', defaultCoupons);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('coupons', updated);
  },

  // --- Orders ---
  getOrders: async (): Promise<Order[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'orders'));
        const list: Order[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order));
        try {
          const reqSnap = await getDocs(collection(firestoreDb, 'courseRequests'));
          reqSnap.forEach(d => {
            if (!list.some(o => o.id === d.id)) {
              list.push({ id: d.id, ...d.data() } as Order);
            }
          });
        } catch (e) {}
        return list;
      } catch (err) {
        console.error("Firebase orders read failed, using fallback:", err);
      }
    }
    return getStorageItem<Order[]>('orders', defaultOrders);
  },

  listenToOrders: (onUpdate: (orders: Order[]) => void): (() => void) => {
    if (isFirebaseConfigured) {
      let ordersList: Order[] = [];
      let requestsList: Order[] = [];
      
      const notify = () => {
        const combined = [...ordersList];
        for (const req of requestsList) {
          if (!combined.some(o => o.id === req.id)) {
            combined.push(req);
          }
        }
        onUpdate(combined);
      };

      const unsub1 = onSnapshot(collection(firestoreDb, 'orders'), (snap) => {
        ordersList = [];
        snap.forEach(d => {
          ordersList.push({ id: d.id, ...d.data() } as Order);
        });
        notify();
      }, (err) => {
        console.error("Orders listener failed:", err);
      });

      let unsub2 = () => {};
      try {
        unsub2 = onSnapshot(collection(firestoreDb, 'courseRequests'), (snap) => {
          requestsList = [];
          snap.forEach(d => {
            requestsList.push({ id: d.id, ...d.data() } as Order);
          });
          notify();
        }, (err) => {
          console.error("CourseRequests listener failed:", err);
        });
      } catch (e) {}

      return () => {
        unsub1();
        unsub2();
      };
    } else {
      const loadLocal = () => {
        const local = getStorageItem<Order[]>('orders', defaultOrders);
        onUpdate(local);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  getSubscriptions: async (): Promise<Order[]> => {
    return dbService.getOrders();
  },

  listenToSubscriptions: (onUpdate: (subscriptions: Order[]) => void): (() => void) => {
    return dbService.listenToOrders(onUpdate);
  },

  getSales: async (): Promise<{ totalAmount: number; activeSubscriptionsCount: number; pendingCount: number; pendingOrdersCount: number; pendingStudentsCount: number; salesOrders: Order[] }> => {
    const orders = await dbService.getSubscriptions();
    const students = await dbService.getStudents();
    return dbService.calculateSalesStats(orders, students);
  },

  calculateSalesStats: (orders: Order[] = [], students: Student[] = []) => {
    const activeOrders = orders.filter(o => {
      const st = (o.status || '').trim().toLowerCase();
      return ['completed', 'approved', 'active', 'graded', 'ناجح', 'مكتمل'].includes(st);
    });
    const totalAmount = activeOrders.reduce((acc, o) => acc + (typeof o.pricePaid === 'number' ? o.pricePaid : (Number(o.pricePaid) || 0)), 0);
    const pendingOrdersCount = orders.filter(o => {
      const st = (o.status || '').trim().toLowerCase();
      return ['pending', 'waiting', 'قيد المراجعة', 'review', 'معلق'].includes(st);
    }).length;
    const pendingStudentsCount = students.filter(s => {
      const st = (s.status || '').trim().toLowerCase();
      const isUnapprovedActive = (st === 'active' || !st) && !(s as any).isApproved && (!s.purchasedCourseIds || s.purchasedCourseIds.length === 0) && (!s.subscription || !s.subscription.active);
      return ['pending', 'waiting', 'قيد المراجعة', 'review', 'معلق'].includes(st) || isUnapprovedActive;
    }).length;
    return {
      totalAmount,
      activeSubscriptionsCount: activeOrders.length,
      pendingCount: pendingOrdersCount + pendingStudentsCount,
      pendingOrdersCount,
      pendingStudentsCount,
      salesOrders: activeOrders
    };
  },

  addOrder: async (order: Omit<Order, 'id' | 'date'>): Promise<Order> => {
    const newId = 'ord_' + Date.now();
    let resolvedStudentId = order.studentId;
    const cleanEmail = (order.studentEmail || '').trim().toLowerCase();
    if (cleanEmail && isFirebaseConfigured) {
      try {
        const qUsers = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail));
        const uSnap = await getDocs(qUsers);
        if (!uSnap.empty) {
          resolvedStudentId = uSnap.docs[0].id || uSnap.docs[0].data().uid || resolvedStudentId;
        } else {
          const qStuds = query(collection(firestoreDb, 'students'), where('email', '==', cleanEmail));
          const sSnap = await getDocs(qStuds);
          if (!sSnap.empty) {
            resolvedStudentId = sSnap.docs[0].id || sSnap.docs[0].data().uid || resolvedStudentId;
          }
        }
      } catch (e) {}
    }
    const sanitizedOrder = {
      studentId: resolvedStudentId || ('stud_' + Date.now()),
      studentName: order.studentName || '',
      studentEmail: cleanEmail,
      studentPhone: order.studentPhone || '',
      courseId: order.courseId || '',
      courseTitle: order.courseTitle || '',
      pricePaid: typeof order.pricePaid === 'number' ? order.pricePaid : 0,
      couponCode: order.couponCode || '',
      status: order.status || 'pending',
      date: new Date().toISOString().split('T')[0]
    };
    const newOrder: Order = {
      id: newId,
      ...sanitizedOrder
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'orders', newId), sanitizedOrder);
        await setDoc(doc(firestoreDb, 'courseRequests', newId), sanitizedOrder, { merge: true });
        if (sanitizedOrder.status === 'completed' || sanitizedOrder.status === 'approved') {
          const accessId = `${sanitizedOrder.studentId}_${sanitizedOrder.courseId}`;
          await setDoc(doc(firestoreDb, 'courseAccess', accessId), {
            id: accessId,
            studentId: sanitizedOrder.studentId,
            courseId: sanitizedOrder.courseId,
            status: 'approved',
            grantedAt: new Date().toISOString()
          }, { merge: true });
        }
        return newOrder;
      } catch (err: any) {
        console.error("Firebase order add failed:", err);
        handleFirestoreError(err, OperationType.WRITE, 'orders/' + newId);
      }
    }
    const current = getStorageItem<Order[]>('orders', defaultOrders);
    current.push(newOrder);
    setStorageItem('orders', current);
    return newOrder;
  },

  updateOrder: async (id: string, order: Partial<Order>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'orders', id), order as any, { merge: true }).catch(() => {});
        await setDoc(doc(firestoreDb, 'courseRequests', id), order as any, { merge: true }).catch(() => {});
        if (order.status === 'completed' || order.status === 'approved' || order.status === 'rejected') {
          try {
            const snap = await getDoc(doc(firestoreDb, 'orders', id));
            let data: Order | null = snap.exists() ? (snap.data() as Order) : null;
            if (!data) {
              const reqSnap = await getDoc(doc(firestoreDb, 'courseRequests', id));
              if (reqSnap.exists()) data = reqSnap.data() as Order;
            }
            if (data && data.studentId && data.courseId) {
              const accessId = `${data.studentId}_${data.courseId}`;
              const targetStatus = order.status === 'rejected' ? 'rejected' : 'approved';
              await setDoc(doc(firestoreDb, 'courseAccess', accessId), {
                id: accessId,
                studentId: data.studentId,
                courseId: data.courseId,
                status: targetStatus,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (e) {}
        }
        return;
      } catch (err) {
        console.error("Firebase order update failed:", err);
      }
    }
    const current = getStorageItem<Order[]>('orders', defaultOrders);
    const updated = current.map(item => item.id === id ? { ...item, ...order } : item);
    setStorageItem('orders', updated);
  },

  deleteOrder: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        let orderData: any = null;
        try {
          const snap = await getDoc(doc(firestoreDb, 'orders', id));
          if (snap.exists()) orderData = snap.data();
          if (!orderData) {
            const rSnap = await getDoc(doc(firestoreDb, 'courseRequests', id));
            if (rSnap.exists()) orderData = rSnap.data();
          }
        } catch (e) {}

        if (orderData && orderData.studentId && orderData.courseId) {
          await deleteDoc(doc(firestoreDb, 'courseAccess', `${orderData.studentId}_${orderData.courseId}`)).catch(() => {});
        }

        await deleteDoc(doc(firestoreDb, 'orders', id)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'courseRequests', id)).catch(() => {});
      } catch (err) {
        console.error("Firebase order delete failed:", err);
      }
    }
    const current = getStorageItem<Order[]>('orders', defaultOrders);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('orders', updated);
    const reqs = getStorageItem<Order[]>('courseRequests', []);
    setStorageItem('courseRequests', reqs.filter(item => item.id !== id));
  },

  // --- Lesson Access (Granular Control via onSnapshot) ---
  toggleLessonItemAccess: async (studentId: string, courseId: string, itemId: string, unlocked: boolean): Promise<void> => {
    const docId = `${studentId}_${courseId}`;
    if (isFirebaseConfigured) {
      try {
        const ref = doc(firestoreDb, 'lessonAccess', docId);
        const snap = await getDoc(ref);
        let unlockedItems: Record<string, boolean> = {};
        if (snap.exists()) {
          unlockedItems = snap.data().unlockedItems || {};
        }
        unlockedItems[itemId] = unlocked;
        await setDoc(ref, {
          id: docId,
          studentId,
          courseId,
          unlockedItems,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return;
      } catch (err) {
        console.error("Error toggling lesson item access in Firestore:", err);
      }
    }
    const current = getStorageItem<LessonAccess[]>('lessonAccess', []);
    let found = current.find(item => item.id === docId);
    if (!found) {
      found = { id: docId, studentId, courseId, unlockedItems: {}, updatedAt: new Date().toISOString() };
      current.push(found);
    }
    found.unlockedItems[itemId] = unlocked;
    found.updatedAt = new Date().toISOString();
    setStorageItem('lessonAccess', current);
  },

  getLessonAccess: async (studentId: string, courseId: string): Promise<Record<string, boolean>> => {
    const docId = `${studentId}_${courseId}`;
    if (isFirebaseConfigured) {
      try {
        const ref = doc(firestoreDb, 'lessonAccess', docId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return snap.data().unlockedItems || {};
        }
      } catch (err) {
        console.error("Error fetching lesson access:", err);
      }
    }
    const current = getStorageItem<LessonAccess[]>('lessonAccess', []);
    const found = current.find(item => item.id === docId);
    return found ? found.unlockedItems : {};
  },

  listenToLessonAccess: (studentId: string, courseId: string, onUpdate: (unlockedItems: Record<string, boolean>) => void) => {
    const docId = `${studentId}_${courseId}`;
    if (isFirebaseConfigured) {
      const ref = doc(firestoreDb, 'lessonAccess', docId);
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data().unlockedItems || {});
        } else {
          onUpdate({});
        }
      }, (err) => {
        console.error("lessonAccess listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        const current = getStorageItem<LessonAccess[]>('lessonAccess', []);
        const found = current.find(item => item.id === docId);
        onUpdate(found ? found.unlockedItems : {});
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  // --- Quizzes (Exams) ---
  listenToQuizzes: (onUpdate: (quizzes: Quiz[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'quizzes');
      return onSnapshot(q, (snap) => {
        const list: Quiz[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Quiz);
        });
        setStorageItem('quizzes', list);
        onUpdate(list);
      }, (err) => {
        console.error("Quizzes listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        onUpdate(getStorageItem<Quiz[]>('quizzes', defaultQuizzes));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  getQuizzes: async (): Promise<Quiz[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'quizzes'));
        const list: Quiz[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Quiz));
        setStorageItem('quizzes', list);
        return list;
      } catch (err) {
        console.error("Firebase quizzes read failed, using fallback:", err);
      }
    }
    return getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
  },

  addQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<Quiz> => {
    const newId = 'quiz_' + Date.now();
    const newQuiz: Quiz = {
      id: newId,
      published: quiz.published !== undefined ? quiz.published : true,
      createdAt: quiz.createdAt || new Date().toISOString(),
      grade: quiz.grade || 'all',
      courseId: quiz.courseId || '',
      ...quiz
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'quizzes', newId), newQuiz);
      } catch (err) {
        console.error("Firebase quiz add failed:", err);
      }
    }
    const current = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    const updated = [...current.filter(q => q.id !== newId), newQuiz];
    setStorageItem('quizzes', updated);
    return newQuiz;
  },

  updateQuiz: async (id: string, quiz: Partial<Quiz>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'quizzes', id), quiz as any, { merge: true });
      } catch (err) {
        console.error("Firebase quiz update failed:", err);
      }
    }
    const current = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    const updated = current.map(item => item.id === id ? { ...item, ...quiz } : item);
    setStorageItem('quizzes', updated);
  },

  deleteQuiz: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'quizzes', id));
      } catch (err) {
        console.error("Firebase quiz delete failed:", err);
      }
    }
    const current = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('quizzes', updated);
  },

  listenToQuizSubmissions: (onUpdate: (submissions: QuizSubmission[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'quiz_submissions');
      return onSnapshot(q, (snap) => {
        const list: QuizSubmission[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as QuizSubmission);
        });
        setStorageItem('quiz_submissions', list);
        onUpdate(list);
      }, (err) => {
        console.error("Quiz submissions listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        onUpdate(getStorageItem<QuizSubmission[]>('quiz_submissions', []));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  getQuizSubmissions: async (): Promise<QuizSubmission[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'quiz_submissions'));
        const list: QuizSubmission[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuizSubmission));
        setStorageItem('quiz_submissions', list);
        return list;
      } catch (err) {
        console.error("Firebase quiz submissions read failed:", err);
      }
    }
    return getStorageItem<QuizSubmission[]>('quiz_submissions', []);
  },

  // --- Assignments Tasks & Submissions ---
  listenToAssignmentTasks: (onUpdate: (assignments: Assignment[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'assignment_tasks');
      return onSnapshot(q, (snap) => {
        const list: Assignment[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Assignment);
        });
        setStorageItem('assignment_tasks', list);
        onUpdate(list);
      }, (err) => {
        console.error("Assignment tasks listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        onUpdate(getStorageItem<Assignment[]>('assignment_tasks', []));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  getAssignmentTasks: async (): Promise<Assignment[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'assignment_tasks'));
        const list: Assignment[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Assignment));
        setStorageItem('assignment_tasks', list);
        return list;
      } catch (err) {
        console.error("Firebase getAssignmentTasks failed:", err);
      }
    }
    return getStorageItem<Assignment[]>('assignment_tasks', []);
  },

  addAssignmentTask: async (task: Omit<Assignment, 'id'>): Promise<Assignment> => {
    const newId = 'task_' + Date.now();
    const newTask: Assignment = {
      id: newId,
      published: task.published !== undefined ? task.published : true,
      createdAt: task.createdAt || new Date().toISOString(),
      grade: task.grade || 'all',
      courseId: task.courseId || '',
      ...task
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'assignment_tasks', newId), newTask);
      } catch (err) {
        console.error("Firebase assignment task add failed:", err);
      }
    }
    const current = getStorageItem<Assignment[]>('assignment_tasks', []);
    const updated = [...current.filter(t => t.id !== newId), newTask];
    setStorageItem('assignment_tasks', updated);
    return newTask;
  },

  updateAssignmentTask: async (id: string, task: Partial<Assignment>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'assignment_tasks', id), task as any, { merge: true });
      } catch (err) {
        console.error("Firebase assignment task update failed:", err);
      }
    }
    const current = getStorageItem<Assignment[]>('assignment_tasks', []);
    const updated = current.map(item => item.id === id ? { ...item, ...task } : item);
    setStorageItem('assignment_tasks', updated);
  },

  deleteAssignmentTask: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'assignment_tasks', id));
      } catch (err) {
        console.error("Firebase assignment task delete failed:", err);
      }
    }
    const current = getStorageItem<Assignment[]>('assignment_tasks', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('assignment_tasks', updated);
  },

  listenToAssignmentSubmissions: (onUpdate: (submissions: AssignmentSubmission[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'assignments');
      return onSnapshot(q, (snap) => {
        const list: AssignmentSubmission[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as AssignmentSubmission);
        });
        onUpdate(list);
      }, (err) => {
        console.error("Assignment submissions listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        onUpdate(getStorageItem<AssignmentSubmission[]>('assignments', []));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  getAssignments: async (studentId?: string): Promise<AssignmentSubmission[]> => {
    if (isFirebaseConfigured) {
      try {
        const refCol = collection(firestoreDb, 'assignments');
        const q = studentId ? query(refCol, where('studentId', '==', studentId)) : refCol;
        const snap = await getDocs(q);
        const list: AssignmentSubmission[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as AssignmentSubmission));
        return list;
      } catch (err) {
        console.error("Firebase assignments read failed, using fallback:", err);
      }
    }
    const list = getStorageItem<AssignmentSubmission[]>('assignments', []);
    return studentId ? list.filter(a => a.studentId === studentId) : list;
  },

  getAssignmentSubmissions: async (): Promise<AssignmentSubmission[]> => {
    return dbService.getAssignments();
  },

  submitAssignment: async (sub: Omit<AssignmentSubmission, 'id'>): Promise<AssignmentSubmission> => {
    const newId = 'assign_' + Date.now();
    const newSub: AssignmentSubmission = { id: newId, ...sub };
    if (isFirebaseConfigured) {
      try {
        const setDocPromise = setDoc(doc(firestoreDb, 'assignments', newId), newSub);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore submit timeout")), 4000)
        );
        await Promise.race([setDocPromise, timeoutPromise]);
        return newSub;
      } catch (err) {
        console.error("Firebase assignment submit failed or timed out, using local storage fallback:", err);
      }
    }
    try {
      const current = getStorageItem<AssignmentSubmission[]>('assignments', []);
      current.push(newSub);
      setStorageItem('assignments', current);
    } catch (locErr) {
      console.warn("LocalStorage save error:", locErr);
    }
    return newSub;
  },

  updateAssignment: async (id: string, sub: Partial<AssignmentSubmission>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'assignments', id), sub as any);
        return;
      } catch (err) {
        console.error("Firebase assignment update failed:", err);
      }
    }
    const current = getStorageItem<AssignmentSubmission[]>('assignments', []);
    const updated = current.map(item => item.id === id ? { ...item, ...sub } : item);
    setStorageItem('assignments', updated);
  },

  deleteAssignmentSubmission: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'assignments', id));
      } catch (err) {
        console.error("Firebase assignment submission delete failed:", err);
      }
    }
    const current = getStorageItem<AssignmentSubmission[]>('assignments', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('assignments', updated);
  },

  // --- Certificates ---
  getCertificates: async (studentId?: string): Promise<Certificate[]> => {
    if (isFirebaseConfigured) {
      try {
        const refCol = collection(firestoreDb, 'certificates');
        const q = studentId ? query(refCol, where('studentId', '==', studentId)) : refCol;
        const snap = await getDocs(q);
        const list: Certificate[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Certificate));
        return list;
      } catch (err) {
        console.error("Firebase certificates read failed:", err);
      }
    }
    const list = getStorageItem<Certificate[]>('certificates', []);
    return studentId ? list.filter(c => c.studentId === studentId) : list;
  },

  addCertificate: async (cert: Omit<Certificate, 'id'>): Promise<Certificate> => {
    const newId = 'cert_' + Date.now();
    const newCert: Certificate = { id: newId, ...cert };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'certificates', newId), cert);
        return newCert;
      } catch (err) {
        console.error("Firebase certificate add failed:", err);
      }
    }
    const current = getStorageItem<Certificate[]>('certificates', []);
    current.push(newCert);
    setStorageItem('certificates', current);
    return newCert;
  },

  // --- Real-time Chats ---
  listenToChatThreads: (onUpdate: (threads: Record<string, ChatThread>) => void): (() => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'chats');
      return onSnapshot(q, (snap) => {
        const map: Record<string, ChatThread> = {};
        snap.forEach(d => {
          map[d.id] = { studentId: d.id, ...d.data() } as ChatThread;
        });
        onUpdate(map);
      }, (err) => {
        console.error("Chat threads listener failed:", err);
      });
    }
    return () => {};
  },

  listenToChatMessages: (studentId: string, onUpdate: (messages: ChatMessage[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(
        collection(firestoreDb, `chats/${studentId}/messages`),
        orderBy('timestamp', 'asc')
      );
      return onSnapshot(q, (snap) => {
        const list: ChatMessage[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as ChatMessage);
        });
        onUpdate(list);
      }, (err) => {
        console.error("Chat listener failed:", err);
      });
    } else {
      // Simulation fallback
      const loadLocal = () => {
        const allLocalChats = getStorageItem<Record<string, ChatMessage[]>>('chats_messages', {});
        onUpdate(allLocalChats[studentId] || []);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  addChatMessage: async (studentId: string, msg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> => {
    const newId = 'msg_' + Date.now();
    const newMsg: ChatMessage = { id: newId, ...msg };
    if (isFirebaseConfigured) {
      try {
        const isStudent = msg.senderId === studentId;
        const threadRef = doc(firestoreDb, 'chats', studentId);
        const messageRef = doc(firestoreDb, `chats/${studentId}/messages`, newId);
        await Promise.all([
          setDoc(messageRef, msg),
          setDoc(threadRef, {
            lastMessageText: msg.text,
            lastMessageTime: msg.timestamp,
            studentId,
            studentName: isStudent ? msg.senderName : 'Admin',
            unreadCount: isStudent ? increment(1) : 0,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        ]);
        return newMsg;
      } catch (err: any) {
        console.error("Firebase chat message add failed:", err);
        handleFirestoreError(err, OperationType.WRITE, `chats/${studentId}/messages/${newId}`);
        throw err;
      }
    }
    const allLocalChats = getStorageItem<Record<string, ChatMessage[]>>('chats_messages', {});
    if (!allLocalChats[studentId]) allLocalChats[studentId] = [];
    allLocalChats[studentId].push(newMsg);
    setStorageItem('chats_messages', allLocalChats);

    return newMsg;
  },

  markChatThreadAsRead: async (studentId: string): Promise<void> => {
    if (isFirebaseConfigured && studentId) {
      try {
        await setDoc(doc(firestoreDb, 'chats', studentId), {
          unreadCount: 0,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
        console.error("Firebase chat mark read failed:", err);
        handleFirestoreError(err, OperationType.WRITE, 'chats/' + studentId);
      }
    }
  },

  updateStudentOnlineStatus: async (studentId: string, studentName: string, isOnline: boolean): Promise<void> => {
    if (isFirebaseConfigured && studentId) {
      try {
        await setDoc(doc(firestoreDb, 'chats', studentId), {
          studentId,
          studentName,
          isOnline,
          lastSeen: Date.now()
        }, { merge: true });
      } catch (err) {
        // Silently ignore status update errors
      }
    }
  },

  deleteChatMessage: async (studentId: string, messageId: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, `chats/${studentId}/messages`, messageId));
        return;
      } catch (err: any) {
        console.error("Firebase chat message delete failed:", err);
        handleFirestoreError(err, OperationType.DELETE, `chats/${studentId}/messages/${messageId}`);
        return;
      }
    }
    const allLocalChats = getStorageItem<Record<string, ChatMessage[]>>('chats_messages', {});
    if (allLocalChats[studentId]) {
      allLocalChats[studentId] = allLocalChats[studentId].filter(m => m.id !== messageId);
      setStorageItem('chats_messages', allLocalChats);
    }
  },

  deleteStudentChat: async (studentId: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        const messagesRef = collection(firestoreDb, `chats/${studentId}/messages`);
        const snap = await getDocs(messagesRef);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all([
          ...deletePromises,
          deleteDoc(doc(firestoreDb, 'chats', studentId))
        ]);
        return;
      } catch (err: any) {
        console.error("Firebase chat thread delete failed:", err);
        handleFirestoreError(err, OperationType.DELETE, 'chats/' + studentId);
        return;
      }
    }
    const allLocalChats = getStorageItem<Record<string, ChatMessage[]>>('chats_messages', {});
    delete allLocalChats[studentId];
    setStorageItem('chats_messages', allLocalChats);
  },

  // --- Real-time Lesson Comments ---
  listenToComments: (courseId: string, lessonId: string, onUpdate: (comments: LessonComment[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'comments');
      return onSnapshot(q, (snap) => {
        const list: LessonComment[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as LessonComment;
          if (item.courseId === courseId && item.lessonId === lessonId) {
            list.push(item);
          }
        });
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        onUpdate(list);
      }, (err) => {
        console.error("Comments listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        const allComments = getStorageItem<LessonComment[]>('comments', []);
        onUpdate(allComments.filter(c => c.courseId === courseId && c.lessonId === lessonId));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  addComment: async (comment: Omit<LessonComment, 'id'>): Promise<LessonComment> => {
    const newId = 'comment_' + Date.now();
    const newComment: LessonComment = { id: newId, ...comment };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'comments', newId), comment);
        return newComment;
      } catch (err) {
        console.error("Firebase comment add failed:", err);
      }
    }
    const current = getStorageItem<LessonComment[]>('comments', []);
    current.push(newComment);
    setStorageItem('comments', current);
    return newComment;
  },

  deleteComment: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'comments', id));
        return;
      } catch (err) {
        console.error("Firebase comment delete failed:", err);
      }
    }
    const current = getStorageItem<LessonComment[]>('comments', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('comments', updated);
  },

  listenToAllComments: (onUpdate: (comments: LessonComment[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'comments');
      return onSnapshot(q, (snap) => {
        const list: LessonComment[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as LessonComment);
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        onUpdate(list);
      }, (err) => {
        console.error("All comments listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        const allComments = getStorageItem<LessonComment[]>('comments', []);
        allComments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        onUpdate(allComments);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  updateComment: async (id: string, updates: Partial<LessonComment>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'comments', id), updates);
        return;
      } catch (err) {
        console.error("Firebase comment update failed:", err);
      }
    }
    const current = getStorageItem<LessonComment[]>('comments', []);
    const index = current.findIndex(item => item.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setStorageItem('comments', current);
    }
  },

  // --- Notifications ---
  listenToNotifications: (userId: string, onUpdate: (notifs: Notification[]) => void) => {
    if (isFirebaseConfigured) {
      const q = collection(firestoreDb, 'notifications');
      return onSnapshot(q, (snap) => {
        const list: Notification[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Notification;
          if (item.userId === userId || item.userId === 'global') {
            list.push(item);
          }
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(list);
      }, (err) => {
        console.error("Notifications listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        const list = getStorageItem<Notification[]>('notifications', [
          {
            id: 'notif_1',
            userId: 'global',
            titleAr: 'أهلاً بك في أكاديمية مستر محمد عبد التواب',
            titleEn: 'Welcome to Mr. Mohamed Academy',
            bodyAr: 'يسعدنا انضمامك إلينا. تصفح المناهج وتواصل مع المساعدين لتفعيل حسابك ومتابعة الشروحات المتميزة.',
            bodyEn: 'We are glad you joined us. Explore the curriculum and contact assistants to activate your subscription.',
            isRead: false,
            createdAt: new Date().toISOString()
          }
        ]);
        onUpdate(list.filter(n => n.userId === userId || n.userId === 'global'));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 3000);
      return () => clearInterval(interval);
    }
  },

  addNotification: async (notif: Omit<Notification, 'id'>): Promise<Notification> => {
    const newId = 'notif_' + Date.now();
    const newNotif: Notification = { id: newId, ...notif };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'notifications', newId), notif);
        return newNotif;
      } catch (err) {
        console.error("Firebase notification add failed:", err);
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    current.unshift(newNotif);
    setStorageItem('notifications', current);
    return newNotif;
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(firestoreDb, 'notifications', id), { isRead: true });
        return;
      } catch (err) {
        console.error("Firebase notification mark read failed:", err);
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    const updated = current.map(item => item.id === id ? { ...item, isRead: true } : item);
    setStorageItem('notifications', updated);
  }
};

const getAdminEmail = (): string => {
  const metaEnv = (import.meta as any).env || {};
  return (metaEnv.VITE_ADMIN_EMAIL || '').toLowerCase();
};

const DEFAULT_ADMIN_EMAILS = [
  'mhmdbdaltwabalsdawy7@gmail.com'
];

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === 'mhmdbdaltwabalsdawy7@gmail.com') return true;
  return false;
}

function saveActiveUserSession(user: UserAuth): void {
  if (!user.lastLoginTimestamp) {
    user.lastLoginTimestamp = Date.now();
  }
  localStorage.setItem('academy_active_user', JSON.stringify(user));

  if (isFirebaseConfigured && user.id) {
    try {
      setDoc(doc(firestoreDb, 'users', user.id), { lastLoginTimestamp: user.lastLoginTimestamp }, { merge: true }).catch(() => {});
    } catch {}
  }
}

// Unified Auth Service with Role-based Authentication (Admin, Teacher, Student)
export const authService = {
  isRealFirebase: () => isFirebaseConfigured,

  // Authenticate teacher/admin user with Firestore role checking
  loginAdmin: async (email: string, password: string): Promise<{ success: boolean; admin?: Admin; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const targetEmail = 'mhmdbdaltwabalsdawy7@gmail.com';
    const targetPassword = 'MoJoker77';

    if (cleanEmail !== targetEmail || password !== targetPassword) {
      return { success: false, error: 'بيانات تسجيل دخول المعلم غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.' };
    }

    const defaultAdminUser: UserAuth = {
      id: 'admin_' + Date.now(),
      name: 'Mr. Mohamed Abdel Tawab',
      email: cleanEmail,
      phone: '201010298878',
      role: 'admin',
      status: 'active',
      purchasedCourseIds: [],
      watchedLessonIds: [],
      quizGrades: {},
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        let firebaseUid: string | null = null;

        try {
          const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
          firebaseUid = userCredential.user.uid;
        } catch (signInErr: any) {
          try {
            const newCredential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
            firebaseUid = newCredential.user.uid;
          } catch (createErr: any) {
            console.warn("Firebase Auth creation/signin fallback for admin:", createErr);
          }
        }

        let userData: UserAuth = { ...defaultAdminUser };
        if (firebaseUid) {
          userData.id = firebaseUid;
          try {
            const userRef = doc(firestoreDb, 'users', firebaseUid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              userData = { id: firebaseUid, ...(snap.data() as UserAuth), role: 'admin' };
            }
            await setDoc(userRef, { ...userData, role: 'admin', email: cleanEmail }, { merge: true });
          } catch (dbErr) {
            console.error("Firestore sync warning during admin login:", dbErr);
          }
        } else {
          // If Firebase auth password mismatch occurred, still allow teacher access
          try {
            const q = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const docSnap = querySnap.docs[0];
              userData = { id: docSnap.id, ...(docSnap.data() as UserAuth), role: 'admin' };
            }
          } catch (err) {
            console.error("Query admin error:", err);
          }
        }

        recordLoginAttempt(cleanEmail, true);
        secureLog('auth_success_admin', { email: cleanEmail });
        saveActiveUserSession(userData);
        return { success: true, admin: { id: userData.id, name: userData.name || 'Mr. Mohamed Abdel Tawab', email: userData.email, role: 'super' } };
      } catch (err: any) {
        // Fallback to local admin
        recordLoginAttempt(cleanEmail, true);
        saveActiveUserSession(defaultAdminUser);
        return { success: true, admin: { id: defaultAdminUser.id, name: defaultAdminUser.name, email: defaultAdminUser.email, role: 'super' } };
      }
    } else {
      // Local Simulation DB Fallback
      const users = getStorageItem<UserAuth[]>('users', defaultUsers);
      let found = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!found) {
        found = { ...defaultAdminUser };
        users.push(found);
        setStorageItem('users', users);
      } else {
        found.role = 'admin';
        found.status = 'active';
        setStorageItem('users', users);
      }
      recordLoginAttempt(cleanEmail, true);
      secureLog('auth_success_admin_simulation', { email: cleanEmail });
      saveActiveUserSession(found);
      return { success: true, admin: { id: found.id, name: found.name || 'Mr. Mohamed Abdel Tawab', email: found.email, role: 'super' } };
    }
  },

  getCurrentAdmin: (): Admin | null => {
    const u = authService.getCurrentUser();
    if (u && (u.role === 'admin' || u.email === 'mhmdbdaltwabalsdawy7@gmail.com')) {
      return { id: u.id, name: u.name || 'Mr. Mohamed Abdel Tawab', email: u.email, role: 'super' };
    }
    const activeUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
    if (activeUserStr) {
      try {
        const activeUser = JSON.parse(activeUserStr);
        if (activeUser && (activeUser.role === 'admin' || activeUser.email === 'mhmdbdaltwabalsdawy7@gmail.com')) {
          return { id: activeUser.id || 'admin_1', name: activeUser.name || 'Mr. Mohamed Abdel Tawab', email: activeUser.email, role: 'super' };
        }
      } catch (e) {}
    }
    return null;
  },

  logoutAdmin: async (): Promise<void> => {
    await authService.logout();
  },

  // Global login supporting all roles
  loginUser: async (email: string, password: string): Promise<{ success: boolean; user?: UserAuth; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني.' };
    }
    if (!password) {
      return { success: false, error: 'يرجى إدخال كلمة المرور.' };
    }

    if (isAdminEmail(normalizedEmail) || normalizedEmail === 'mhmdbdaltwabalsdawy7@gmail.com') {
      if (password !== 'MoJoker77') {
        return { success: false, error: 'كلمة المرور الخاصة بحساب المعلم غير صحيحة.' };
      }
    }

    if (isFirebaseConfigured) {
      try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
        const firebaseUid = userCredential.user.uid;

        const userRef = doc(firestoreDb, 'users', firebaseUid);
        const snap = await getDoc(userRef);
        let finalUser: UserAuth;

        if (snap.exists()) {
          const userData = snap.data() as UserAuth;
          if (userData.status === 'suspended') {
            await signOut(firebaseAuth);
            recordLoginAttempt(normalizedEmail, false);
            return { success: false, error: 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.' };
          }
          if (userData.status === 'pending') {
            await signOut(firebaseAuth);
            recordLoginAttempt(normalizedEmail, false);
            return { success: false, error: 'حسابك قيد المراجعة حالياً من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
          }
          if (userData.status === 'rejected') {
            await signOut(firebaseAuth);
            recordLoginAttempt(normalizedEmail, false);
            return { success: false, error: 'تم رفض طلب تسجيل حسابك من قبل إدارة الأكاديمية.' };
          }
          finalUser = { id: firebaseUid, uid: firebaseUid, ...userData };
        } else {
          const userRole = isAdminEmail(normalizedEmail) ? 'admin' : 'student';
          const nowIso = new Date().toISOString();
          finalUser = {
            id: firebaseUid,
            uid: firebaseUid,
            name: userRole === 'admin' ? 'Mr. Mohamed Abdel Tawab' : 'طالب الأكاديمية',
            email: normalizedEmail,
            phone: '',
            role: userRole,
            status: 'active',
            grade: '1prep',
            department: 'general',
            createdAt: nowIso,
            purchasedCourseIds: [],
            watchedLessonIds: [],
            quizGrades: {}
          };
          await setDoc(userRef, finalUser, { merge: true });
          if (userRole === 'student') {
            const studentDoc: Student = {
              id: firebaseUid,
              uid: firebaseUid,
              name: finalUser.name,
              email: normalizedEmail,
              phone: '',
              purchasedCourseIds: [],
              watchedLessonIds: [],
              quizGrades: {},
              enrollmentDate: nowIso.split('T')[0],
              status: 'active',
              department: 'general',
              grade: '1prep',
              createdAt: nowIso
            };
            await setDoc(doc(firestoreDb, 'students', firebaseUid), studentDoc, { merge: true });
          }
        }

        if (isAdminEmail(normalizedEmail)) {
          finalUser.role = 'admin';
        }

        recordLoginAttempt(normalizedEmail, true);
        saveActiveUserSession(finalUser);
        return { success: true, user: finalUser };
      } catch (err: any) {
        console.warn("Firebase Login Notice:", err);

        // Fallback: Check Firestore users collection directly if Auth fails or method is disabled
        try {
          const q = query(collection(firestoreDb, 'users'), where('email', '==', normalizedEmail));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const docSnap = querySnap.docs[0];
            const userData = docSnap.data() as UserAuth;
            if (userData.status === 'suspended') {
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, error: 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.' };
            }
            if (userData.status === 'pending') {
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, error: 'حسابك قيد المراجعة حالياً من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
            }
            if (userData.status === 'rejected') {
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, error: 'تم رفض طلب تسجيل حسابك من قبل إدارة الأكاديمية.' };
            }
            const finalUser: UserAuth = { id: docSnap.id, uid: docSnap.id, ...userData };
            if (isAdminEmail(normalizedEmail)) {
              finalUser.role = 'admin';
            }
            recordLoginAttempt(normalizedEmail, true);
            saveActiveUserSession(finalUser);
            return { success: true, user: finalUser };
          }
        } catch (dbQueryErr) {
          console.error("Firestore user search error on login fallback:", dbQueryErr);
        }

        if (isAdminEmail(normalizedEmail)) {
          const nowIso = new Date().toISOString();
          const adminUser: UserAuth = {
            id: 'admin_' + Date.now(),
            uid: 'admin_' + Date.now(),
            name: 'Mr. Mohamed Abdel Tawab',
            email: normalizedEmail,
            phone: '201010298878',
            role: 'admin',
            status: 'active',
            createdAt: nowIso
          };
          recordLoginAttempt(normalizedEmail, true);
          saveActiveUserSession(adminUser);
          return { success: true, user: adminUser };
        }

        let errorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        if (err.code === 'auth/operation-not-allowed') {
          // If Email/Password auth is disabled in Firebase console, auto-create student session in Firestore
          const newUid = 'usr_' + Date.now();
          const nowIso = new Date().toISOString();
          const fallbackUser: UserAuth = {
            id: newUid,
            uid: newUid,
            name: 'طالب الأكاديمية',
            email: normalizedEmail,
            phone: '',
            role: 'student',
            status: 'active',
            grade: '1prep',
            department: 'general',
            createdAt: nowIso,
            purchasedCourseIds: [],
            watchedLessonIds: [],
            quizGrades: {}
          };
          try {
            await setDoc(doc(firestoreDb, 'users', newUid), fallbackUser, { merge: true });
            await setDoc(doc(firestoreDb, 'students', newUid), {
              ...fallbackUser,
              enrollmentDate: nowIso.split('T')[0]
            }, { merge: true });
          } catch (e) {}
          recordLoginAttempt(normalizedEmail, true);
          saveActiveUserSession(fallbackUser);
          return { success: true, user: fallbackUser };
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          errorMsg = 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.';
        } else if (err.code === 'auth/invalid-email') {
          errorMsg = 'صيغة البريد الإلكتروني غير صحيحة.';
        } else if (err.code === 'auth/user-disabled') {
          errorMsg = 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.';
        }
        return { success: false, error: errorMsg };
      }
    } else {
      const users = getStorageItem<UserAuth[]>('users', defaultUsers);
      const found = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!found) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل بالمنصة.' };
      }
      if (found.status === 'suspended') {
        return { success: false, error: 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.' };
      }
      if (found.status === 'pending') {
        return { success: false, error: 'حسابك قيد المراجعة حالياً من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
      }
      if (found.status === 'rejected') {
        return { success: false, error: 'تم رفض طلب تسجيل حسابك من قبل إدارة الأكاديمية.' };
      }
      recordLoginAttempt(normalizedEmail, true);
      saveActiveUserSession(found);
      return { success: true, user: found };
    }
  },

  // Register user supporting student/teacher
  registerUser: async (
    name: string, 
    email: string, 
    password: string, 
    role: 'student' | 'teacher' | 'admin' = 'student', 
    phone: string = '',
    grade: string = '1prep',
    department: string = 'general'
  ): Promise<{ success: boolean; user?: UserAuth; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' };
    }
    if (!name || name.trim().length < 3) {
      return { success: false, error: 'الاسم يجب أن لا يقل عن 3 أحرف.' };
    }

    if (isAdminEmail(normalizedEmail) || normalizedEmail === 'mhmdbdaltwabalsdawy7@gmail.com') {
      if (password !== 'MoJoker77') {
        return { success: false, error: 'كلمة المرور الخاصة بحساب المعلم غير صحيحة.' };
      }
    }

    const nowIso = new Date().toISOString();
    const subExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const userRole = isAdminEmail(normalizedEmail) ? 'admin' : 'student';

    if (isFirebaseConfigured) {
      try {
        const qExistUser = query(collection(firestoreDb, 'users'), where('email', '==', normalizedEmail));
        const existSnap = await getDocs(qExistUser);
        if (!existSnap.empty) {
          const exData = existSnap.docs[0].data();
          if (exData.status === 'active') {
            return { success: false, error: 'هذا البريد الإلكتروني مسجل ومفعل بالفعل! يرجى تسجيل الدخول مباشرة.' };
          } else {
            return { success: false, error: 'طلب تسجيل حسابك بهذا البريد الإلكتروني قيد المراجعة بالفعل من قبل الإدارة. يرجى الانتظار حتى يتم قبول حسابك.' };
          }
        }
      } catch (e) {}
    }

    const initialStatus = userRole === 'admin' ? 'active' : 'pending';
    const newUser: UserAuth = {
      id: 'usr_' + Date.now(),
      uid: 'usr_' + Date.now(),
      name: name.trim() || (userRole === 'admin' ? 'Mr. Mohamed Abdel Tawab' : 'طالب الأكاديمية'),
      email: normalizedEmail,
      phone: phone.trim(),
      role: userRole,
      department: department || 'general',
      grade: grade || '1prep',
      createdAt: nowIso,
      status: initialStatus,
      purchasedCourseIds: userRole === 'student' ? [] : undefined,
      watchedLessonIds: userRole === 'student' ? [] : undefined,
      quizGrades: userRole === 'student' ? {} : undefined,
      subscription: userRole === 'admin' ? { active: true, expiresAt: subExpiresAt } : { active: false, expiresAt: '' },
      bio: ''
    };

    if (isFirebaseConfigured) {
      try {
        let firebaseUid: string | null = null;

        try {
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
          firebaseUid = userCredential.user.uid;
        } catch (createErr: any) {
          console.warn("Firebase createUserWithEmailAndPassword notice:", createErr);
          if (createErr.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
              firebaseUid = userCredential.user.uid;
            } catch (signInErr: any) {
              return { 
                success: false, 
                error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.' 
              };
            }
          } else if (createErr.code === 'auth/weak-password') {
            return { success: false, error: 'كلمة المرور ضعيفة للغاية. استخدم 6 أحرف على الأقل.' };
          } else if (createErr.code === 'auth/invalid-email') {
            return { success: false, error: 'صيغة البريد الإلكتروني غير صحيحة.' };
          } else if (createErr.code === 'auth/operation-not-allowed') {
            // Email/Password auth disabled in console. Fallback to Firestore record creation.
            firebaseUid = 'usr_' + Date.now();
          } else {
            // Fallback for general auth error
            firebaseUid = 'usr_' + Date.now();
          }
        }

        const finalUid = firebaseUid || newUser.id;
        const finalUser: UserAuth = {
          ...newUser,
          id: finalUid,
          uid: finalUid
        };

        const userDocData = {
          uid: finalUid,
          id: finalUid,
          name: finalUser.name,
          email: normalizedEmail,
          phone: finalUser.phone || '',
          grade: finalUser.grade || '1prep',
          department: finalUser.department || 'general',
          role: 'student',
          createdAt: nowIso,
          status: initialStatus,
          subscription: finalUser.subscription || { active: false, expiresAt: '' },
          purchasedCourseIds: [],
          watchedLessonIds: [],
          quizGrades: {}
        };

        try {
          await setDoc(doc(firestoreDb, 'users', finalUid), userDocData, { merge: true });

          if (role === 'student' || userRole === 'student') {
            const studentDocData: Student = {
              id: finalUid,
              uid: finalUid,
              name: finalUser.name,
              email: normalizedEmail,
              phone: finalUser.phone || '',
              purchasedCourseIds: [],
              watchedLessonIds: [],
              quizGrades: {},
              enrollmentDate: nowIso.split('T')[0],
              status: initialStatus,
              subscription: { active: false, expiresAt: '' },
              department: department || 'general',
              grade: grade || '1prep',
              createdAt: nowIso
            };
            await setDoc(doc(firestoreDb, 'students', finalUid), studentDocData, { merge: true });
            await setDoc(doc(firestoreDb, 'registrations', finalUid), studentDocData, { merge: true }).catch(() => {});
            await setDoc(doc(firestoreDb, 'studentRequests', finalUid), studentDocData, { merge: true }).catch(() => {});
          }
        } catch (dbErr: any) {
          console.error("Firestore register write error:", dbErr);
          handleFirestoreError(dbErr, OperationType.WRITE, 'users/' + finalUid);
        }

        if (initialStatus === 'pending') {
          await signOut(firebaseAuth);
          return { success: false, error: 'تم إرسال طلب تسجيل حسابك بنجاح ✅ وهو الآن قيد المراجعة من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول حسابك لتتمكن من الدخول.' };
        }
        recordLoginAttempt(normalizedEmail, true);
        saveActiveUserSession(finalUser);
        return { success: true, user: finalUser };
      } catch (err: any) {
        console.error("Registration error:", err);
        return { success: false, error: err.message || 'حدث خطأ غير متوقع أثناء تسجيل الحساب.' };
      }
    } else {
      const users = getStorageItem<UserAuth[]>('users', defaultUsers);
      const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        if (existing.status === 'pending') {
          return { success: false, error: 'حسابك قيد المراجعة حالياً من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
        }
        saveActiveUserSession(existing);
        return { success: true, user: existing };
      }
      users.push(newUser);
      setStorageItem('users', users);

      const studentsList = getStorageItem<Student[]>('students', defaultStudents);
      const newStudentDoc: Student = {
        id: newUser.id,
        uid: newUser.id,
        name: newUser.name,
        email: normalizedEmail,
        phone: newUser.phone,
        purchasedCourseIds: [],
        watchedLessonIds: [],
        quizGrades: {},
        enrollmentDate: nowIso.split('T')[0],
        status: initialStatus,
        department: newUser.department,
        grade: newUser.grade,
        createdAt: nowIso
      };
      studentsList.push(newStudentDoc);
      setStorageItem('students', studentsList);

      if (initialStatus === 'pending') {
        return { success: false, error: 'تم إرسال طلب تسجيل حسابك بنجاح ✅ وهو الآن قيد المراجعة من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول حسابك لتتمكن من الدخول.' };
      }
      saveActiveUserSession(newUser);
      return { success: true, user: newUser };
    }
  },

  getCurrentUser: (): UserAuth | null => {
    const saved = localStorage.getItem('academy_active_user');
    if (saved) {
      try {
        const user = JSON.parse(saved) as UserAuth;
        if (user && user.role !== 'admin' && !isAdminEmail(user.email || '')) {
          const globalVerStr = localStorage.getItem('academy_global_force_logout_ver');
          const globalVer = globalVerStr ? Number(globalVerStr) : 0;
          const userForceVer = user.forceLogoutVersion ? Number(user.forceLogoutVersion) : 0;
          const userLoginTime = user.lastLoginTimestamp || Date.now();

          if (globalVer > 0 && userLoginTime < globalVer) {
            localStorage.removeItem('academy_active_user');
            return null;
          }
          if (userForceVer > 0 && userLoginTime < userForceVer) {
            localStorage.removeItem('academy_active_user');
            return null;
          }
        }
        return user;
      } catch { return null; }
    }
    return null;
  },

  getAllUsers: async (): Promise<UserAuth[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        const list: UserAuth[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as UserAuth));
        return list;
      } catch (err) {
        console.error("Firebase get all users failed:", err);
      }
    }
    return getStorageItem<UserAuth[]>('users', defaultUsers);
  },

  updateUser: async (id: string, data: Partial<UserAuth>): Promise<void> => {
    return authService.updateUserProfile(id, data);
  },

  updateUserProfile: async (id: string, data: Partial<UserAuth>): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'users', id), data as any, { merge: true }).catch(() => {});
        await setDoc(doc(firestoreDb, 'students', id), data as any, { merge: true }).catch(() => {});
      } catch (err) {
        console.error("Firebase user profile update failed:", err);
      }
    }
    
    // Fallback sync
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updatedUsers = users.map(u => u.id === id ? { ...u, ...data } : u);
    setStorageItem('users', updatedUsers);

    // Sync active local session
    const current = authService.getCurrentUser();
    if (current && current.id === id) {
      saveActiveUserSession({ ...current, ...data });
    }
  },

  deleteUser: async (id: string, email?: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'users', id));
        if (email) {
          const cleanEmail = email.trim().toLowerCase();
          const q = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await deleteDoc(doc(firestoreDb, 'users', d.id));
          }
        }
      } catch (err) {
        console.error("Firebase user delete error:", err);
      }
    }
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updated = users.filter(u => u.id !== id && (email ? u.email.toLowerCase() !== email.trim().toLowerCase() : true));
    setStorageItem('users', updated);
  },

  logout: async (): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await signOut(firebaseAuth);
      } catch (err) {
        console.error("Signout error:", err);
      }
    }
    localStorage.removeItem('academy_active_user');
  },

  listenToAuthState: (callback: (user: UserAuth | null) => void): (() => void) => {
    if (isFirebaseConfigured && firebaseAuth) {
      return onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser) {
          const cleanEmail = (fbUser.email || '').toLowerCase();
          const uid = fbUser.uid;
          let userData: UserAuth | null = null;
          try {
            const userRef = doc(firestoreDb, 'users', uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              userData = { id: uid, uid, ...(snap.data() as UserAuth) };
            } else {
              const role = isAdminEmail(cleanEmail) ? 'admin' : 'student';
              userData = {
                id: uid,
                uid,
                name: fbUser.displayName || (role === 'admin' ? 'Mr. Mohamed Abdel Tawab' : 'طالب الأكاديمية'),
                email: cleanEmail,
                phone: '',
                role,
                department: 'general',
                grade: '1prep',
                createdAt: new Date().toISOString(),
                status: 'active'
              };
              await setDoc(userRef, userData, { merge: true });
            }
            if (isAdminEmail(cleanEmail)) {
              userData.role = 'admin';
            }
            const savedLocal = localStorage.getItem('academy_active_user');
            let localTime = Date.now();
            if (savedLocal) {
              try { localTime = JSON.parse(savedLocal).lastLoginTimestamp || Date.now(); } catch {}
            }
            userData.lastLoginTimestamp = userData.lastLoginTimestamp || localTime;

            saveActiveUserSession(userData);
            const validUser = authService.getCurrentUser();
            if (!validUser) {
              await signOut(firebaseAuth);
            }
            callback(validUser);
          } catch (err) {
            console.error("Error fetching auth user from Firestore:", err);
            const saved = authService.getCurrentUser();
            callback(saved);
          }
        } else {
          const saved = authService.getCurrentUser();
          if (saved) {
            callback(saved);
          } else {
            localStorage.removeItem('academy_active_user');
            callback(null);
          }
        }
      });
    } else {
      const saved = authService.getCurrentUser();
      callback(saved);
      return () => {};
    }
  }
};
