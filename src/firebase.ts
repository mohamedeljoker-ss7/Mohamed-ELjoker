import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, doc, getDocs, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, onSnapshot, deleteField, increment, arrayUnion } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, User } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';
import { Course, Category, Student, NewsItem, Article, UserReview, Message, Admin, WebsiteSettings, Teacher, Coupon, Order, Quiz, QuizSubmission, UserAuth, Assignment, AssignmentSubmission, Certificate, ChatMessage, ChatThread, LessonComment, Notification, LessonAccess, CourseAccess, CourseRequest, LectureItem, SectionItem, ExamItem, SheetItem, SheetSubmission, QuestionBankItem, OnlineExamQuestion, ExamSubmission, ScheduleItem, StudentInquiry, ActivityLogItem, SheetAnswerKeyDoc, ExamPrivateKeyDoc, ExamPrivateKeyEntry } from './types';
import { normalizeCourseLessons } from './utils/authAccess';
import { saveVideoToIndexedDB, deleteVideoFromIndexedDB } from './utils/videoStorage';
import { deleteFileFromFirestoreChunks } from './utils/firestoreMediaStorage';
import { uploadFileToFirebaseStorage } from './utils/firebaseUploadService';
import {
  HERO_IT_UNIVERSITY_IMG,
  COURSE_PROGRAMMING_CYBER_IMG,
  COURSE_HARDWARE_PHYSICS_IMG
} from './utils/platformAssets';

// Pre-seeded Technological University IT Categories
const defaultCategories: Category[] = [
  {
    id: 'year1',
    nameAr: 'الفرقة الأولى - تكنولوجيا المعلومات',
    nameEn: '1st Year - IT Department',
    imageUrl: COURSE_HARDWARE_PHYSICS_IMG,
    color: 'cyan'
  },
  {
    id: 'year2',
    nameAr: 'الفرقة الثانية - تكنولوجيا المعلومات',
    nameEn: '2nd Year - IT Department',
    imageUrl: COURSE_PROGRAMMING_CYBER_IMG,
    color: 'blue'
  },
  {
    id: 'year3',
    nameAr: 'الفرقة الثالثة - تكنولوجيا المعلومات',
    nameEn: '3rd Year - IT Department',
    imageUrl: HERO_IT_UNIVERSITY_IMG,
    color: 'emerald'
  },
  {
    id: 'year4',
    nameAr: 'الفرقة الرابعة - تكنولوجيا المعلومات',
    nameEn: '4th Year - IT Department',
    imageUrl: COURSE_PROGRAMMING_CYBER_IMG,
    color: 'purple'
  },
  {
    id: 'it_sections',
    nameAr: 'السكاشن والمعامل العملية (Word & Lab Sheets)',
    nameEn: 'Practical Sections & Lab Sheets',
    imageUrl: COURSE_HARDWARE_PHYSICS_IMG,
    color: 'amber'
  },
  {
    id: 'it_lectures',
    nameAr: 'المحاضرات الجامعية المعتمدة (PDF & Slides)',
    nameEn: 'Accredited Lectures & PDFs',
    imageUrl: HERO_IT_UNIVERSITY_IMG,
    color: 'rose'
  }
];

export const IT_UNIVERSITY_COURSES: Course[] = [];

const defaultCourses: Course[] = [];

const defaultStudents: Student[] = [];

const defaultNews: NewsItem[] = [];

const defaultArticles: Article[] = [];

const defaultReviews: UserReview[] = [];

// One-time migration to clear out all demo/sample data and previously added courses
try {
  const clearedKey = 'purge_all_courses_v3';
  if (typeof window !== 'undefined' && window.localStorage && localStorage.getItem(clearedKey) !== 'true') {
    const keysToRemove = [
      'academy_courses',
      'courses',
      'academy_lectures',
      'lectures',
      'academy_sections',
      'sections',
      'academy_exams',
      'exams',
      'academy_sheets',
      'sheets',
      'academy_question_bank',
      'question_bank',
      'academy_schedule',
      'schedule',
      'academy_inquiries',
      'inquiries',
      'academy_exam_submissions',
      'exam_submissions',
      'academy_activity_logs',
      'activity_logs',
      'academy_quizzes',
      'academy_assignment_tasks',
      'academy_lessonAccess',
      'academy_orders',
      'academy_courseRequests'
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('academy_courses', JSON.stringify([]));
    localStorage.setItem(clearedKey, 'true');
  }
} catch (e) {
  console.error("Failed to execute one-time local storage courses purge:", e);
}

const defaultMessages: Message[] = [];

const defaultSettings: WebsiteSettings = {
  websiteNameAr: 'منصة MOHAMED ELJOKER التعليمية',
  websiteNameEn: 'MOHAMED ELJOKER Educational Platform',
  logoUrl: '🎓',
  faviconUrl: '🎓',
  whatsapp: 'https://wa.me/201010298878',
  telegram: 'https://t.me/mohamed_eljoker',
  facebook: '',
  youtube: '',
  instagram: '',
  email: 'info@eljoker-it.edu.eg',
  footerAr: 'جميع الحقوق محفوظة © ٢٠٢٦ منصة MOHAMED ELJOKER التعليمية - قسم تكنولوجيا المعلومات IT.',
  footerEn: 'All Rights Reserved © 2026 MOHAMED ELJOKER Educational Platform - IT Department.',
  seoDescription: 'منصة MOHAMED ELJOKER التعليمية المجانية بالكامل لتنظيم ونشر المحاضرات والسكاشن والامتحانات وشيتات قسم تكنولوجيا المعلومات IT.',
  seoKeywords: 'منصة MOHAMED ELJOKER, محمد الجوكر, قسم IT, تكنولوجيا المعلومات, Physics, Python Programming, IT Essentials, Mathematics, Cyber Security, English, محاضرات, سكاشن, امتحانات, شيتات, PDF, Word',
  forceLogoutVersion: 0
};

export const defaultLectures: LectureItem[] = [];

export const defaultSections: SectionItem[] = [];

export const defaultExams: ExamItem[] = [];

export const defaultSheets: SheetItem[] = [];

const defaultAdmins: Admin[] = [];

const defaultTeachers: Teacher[] = [];

const defaultCoupons: Coupon[] = [];

const defaultOrders: Order[] = [];

const defaultQuizzes: Quiz[] = [];

export const defaultQuestionBank: QuestionBankItem[] = [];

export const defaultSchedule: ScheduleItem[] = [];

export const defaultInquiries: StudentInquiry[] = [];

export const defaultExamSubmissions: ExamSubmission[] = [];

export const defaultActivityLogs: ActivityLogItem[] = [];

const defaultUsers: UserAuth[] = [];

// Firebase Configuration Verification
const metaEnv = (import.meta as any).env || {};
const appletCfg: any = firebaseAppletConfig || {};

const hasCompleteEnvConfig = Boolean(
  metaEnv.VITE_FIREBASE_API_KEY &&
  metaEnv.VITE_FIREBASE_PROJECT_ID &&
  metaEnv.VITE_FIREBASE_APP_ID
);

const firebaseConfig = hasCompleteEnvConfig
  ? {
      apiKey: String(metaEnv.VITE_FIREBASE_API_KEY).trim(),
      authDomain: String(metaEnv.VITE_FIREBASE_AUTH_DOMAIN || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`).trim(),
      projectId: String(metaEnv.VITE_FIREBASE_PROJECT_ID).trim(),
      storageBucket: String(metaEnv.VITE_FIREBASE_STORAGE_BUCKET || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`).trim(),
      messagingSenderId: String(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
      appId: String(metaEnv.VITE_FIREBASE_APP_ID).trim()
    }
  : {
      apiKey: appletCfg.apiKey || "",
      authDomain: appletCfg.authDomain || "",
      projectId: appletCfg.projectId || "",
      storageBucket: appletCfg.storageBucket || "",
      messagingSenderId: appletCfg.messagingSenderId || "",
      appId: appletCfg.appId || ""
    };

const resolvedDatabaseId: string = hasCompleteEnvConfig
  ? String(
      metaEnv.VITE_FIREBASE_DATABASE_ID ||
      (metaEnv.VITE_FIREBASE_PROJECT_ID === appletCfg.projectId ? appletCfg.firestoreDatabaseId : '') ||
      '(default)'
    ).trim()
  : String(appletCfg.firestoreDatabaseId || '(default)').trim();

let isFirebaseConfigured = false;
export let app: any = null;
export let firestoreDb: any = null;
export let firebaseAuth: any = null;

function isEnglishUi(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('academy_lang') === 'en';
  } catch {
    return false;
  }
}

function decodeFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const items = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return items.map((item: any) => decodeFirestoreRestValue(item));
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

async function fetchPublicFirestoreDocViaRestWithStatus(
  collectionName: string,
  docId: string
): Promise<{ status: 'ok'; data: Record<string, any> } | { status: 'not_found' } | { status: 'config_error'; httpStatus: number } | { status: 'network_error'; detail: string }> {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey || typeof fetch === 'undefined') {
    return { status: 'config_error', httpStatus: 0 };
  }
  const dbName = resolvedDatabaseId && resolvedDatabaseId !== '(default)'
    ? resolvedDatabaseId
    : '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbName)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {})
    });
    if (res.status === 404) {
      return { status: 'not_found' };
    }
    if (!res.ok) {
      return { status: 'config_error', httpStatus: res.status };
    }
    const json = await res.json();
    if (!json || typeof json !== 'object' || !json.fields) {
      return { status: 'not_found' };
    }
    const parsed: Record<string, any> = {};
    for (const [k, v] of Object.entries(json.fields)) {
      parsed[k] = decodeFirestoreRestValue(v);
    }
    return { status: 'ok', data: parsed };
  } catch (err: any) {
    return { status: 'network_error', detail: err?.message || String(err) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchPublicFirestoreDocViaRest(collectionName: string, docId: string): Promise<Record<string, any> | null> {
  const result = await fetchPublicFirestoreDocViaRestWithStatus(collectionName, docId);
  return result.status === 'ok' ? result.data : null;
}

async function fetchAuthenticatedFirestoreDocWithStatus(
  collectionName: string,
  docId: string,
  fbUser: User | null
): Promise<{ exists: boolean; data?: Record<string, any>; unreachable?: boolean }> {
  try {
    const snap = await withFirestoreReadTimeout(
      getDoc(doc(firestoreDb, collectionName, docId)),
      4500,
      `getDoc(${collectionName}/${docId})`
    );
    return snap.exists() ? { exists: true, data: snap.data() as Record<string, any> } : { exists: false };
  } catch {
    if (fbUser && firebaseConfig.projectId && firebaseConfig.apiKey && typeof fetch !== 'undefined') {
      try {
        const idToken = await fbUser.getIdToken();
        const dbName = resolvedDatabaseId && resolvedDatabaseId !== '(default)'
          ? resolvedDatabaseId
          : '(default)';
        const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbName)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 7000) : null;
        try {
          const res = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              Authorization: `Bearer ${idToken}`
            },
            ...(controller ? { signal: controller.signal } : {})
          });
          if (res.status === 404) {
            return { exists: false };
          }
          if (res.ok) {
            const json = await res.json();
            if (!json || typeof json !== 'object' || !json.fields) {
              return { exists: false };
            }
            const parsed: Record<string, any> = {};
            for (const [k, v] of Object.entries(json.fields)) {
              parsed[k] = decodeFirestoreRestValue(v);
            }
            return { exists: true, data: parsed };
          }
        } finally {
          if (timer) clearTimeout(timer);
        }
      } catch (restErr) {
        console.warn(`Authenticated REST fallback failed for ${collectionName}/${docId}:`, restErr);
      }
    }
    return { exists: false, unreachable: true };
  }
}

async function runPublicCollectionQueryViaRest<T = Record<string, any>>(collectionName: string): Promise<(T & { id: string })[] | null> {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey || typeof fetch === 'undefined') {
    return null;
  }
  const dbName = resolvedDatabaseId && resolvedDatabaseId !== '(default)'
    ? resolvedDatabaseId
    : '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbName)}/documents:runQuery?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 7000) : null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }]
        }
      }),
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const out: (T & { id: string })[] = [];
    for (const row of rows) {
      const docObj = row?.document;
      if (!docObj?.name) continue;
      const docId = String(docObj.name).split('/').pop() || '';
      const fields = docObj.fields || {};
      const parsed: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = decodeFirestoreRestValue(v);
      }
      out.push({ id: docId, ...parsed } as T & { id: string });
    }
    return out;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function withFirestoreReadTimeout<T>(promise: Promise<T>, timeoutMs = 4500, label = 'firestore_read'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms (client is offline or WebChannel delayed)`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let firestoreStreamReady = false;
const firestoreStreamListeners = new Set<() => void>();

export const isFirestoreStreamReady = (): boolean => firestoreStreamReady;

export const onFirestoreStreamReady = (cb: () => void): (() => void) => {
  if (firestoreStreamReady) {
    cb();
    return () => {};
  }
  firestoreStreamListeners.add(cb);
  return () => {
    firestoreStreamListeners.delete(cb);
  };
};

const markFirestoreStreamReady = () => {
  if (firestoreStreamReady) return;
  firestoreStreamReady = true;
  firestoreStreamListeners.forEach((cb) => {
    try { cb(); } catch {}
  });
  firestoreStreamListeners.clear();
};

let cachedAuthorizedDomains: string[] | null = null;
let cachedAuthorizedDomainsFetchedAt = 0;

function isHostMatchedInAuthorizedDomains(hostname: string, domains: string[]): boolean {
  const cleanHost = (hostname || '').trim().toLowerCase();
  if (!cleanHost) return true;
  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '[::1]') {
    return true;
  }
  return domains.some((d) => {
    const cleanDomain = String(d || '').trim().toLowerCase();
    return cleanDomain && (cleanHost === cleanDomain || cleanHost.endsWith('.' + cleanDomain));
  });
}

async function fetchFirebaseAuthorizedDomains(forceRefresh = false): Promise<string[] | null> {
  if (!firebaseConfig.apiKey || typeof fetch === 'undefined') return null;
  const now = Date.now();
  if (!forceRefresh && cachedAuthorizedDomains && (now - cachedAuthorizedDomainsFetchedAt) < 30000) {
    return cachedAuthorizedDomains;
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'GET',
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {})
      }
    );
    if (!res.ok) return cachedAuthorizedDomains;
    const json = await res.json();
    if (Array.isArray(json?.authorizedDomains)) {
      cachedAuthorizedDomains = json.authorizedDomains.map((d: any) => String(d || '').trim().toLowerCase()).filter(Boolean);
      cachedAuthorizedDomainsFetchedAt = Date.now();
      return cachedAuthorizedDomains;
    }
    return cachedAuthorizedDomains;
  } catch {
    return cachedAuthorizedDomains;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let cachedEmailPasswordEnabled: boolean | null = null;
let cachedEmailPasswordCheckedAt = 0;

async function checkEmailPasswordProviderEnabled(forceRefresh = false): Promise<boolean | null> {
  if (!firebaseConfig.apiKey || typeof fetch === 'undefined') return null;
  const now = Date.now();
  if (!forceRefresh && cachedEmailPasswordEnabled !== null && (now - cachedEmailPasswordCheckedAt) < 30000) {
    return cachedEmailPasswordEnabled;
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'provider-check@example.invalid',
          password: 'ProviderCheck!2026',
          returnSecureToken: false
        }),
        ...(controller ? { signal: controller.signal } : {})
      }
    );
    const json = await res.json().catch(() => null);
    const errMsg = String(json?.error?.message || '');
    if (errMsg.includes('PASSWORD_LOGIN_DISABLED') || errMsg.includes('OPERATION_NOT_ALLOWED')) {
      cachedEmailPasswordEnabled = false;
      cachedEmailPasswordCheckedAt = Date.now();
      return false;
    }
    if (errMsg) {
      cachedEmailPasswordEnabled = true;
      cachedEmailPasswordCheckedAt = Date.now();
      return true;
    }
    return cachedEmailPasswordEnabled;
  } catch {
    return cachedEmailPasswordEnabled;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clearRejectedOriginValidationCache(authInstance: any): void {
  try {
    const resolver = authInstance?._popupRedirectResolver;
    const key = typeof authInstance?._key === 'function' ? authInstance._key() : null;
    if (resolver?.originValidationPromises && key && resolver.originValidationPromises[key]) {
      Promise.resolve(resolver.originValidationPromises[key]).catch(() => {
        try {
          delete resolver.originValidationPromises[key];
        } catch {}
      });
    }
  } catch {}
}

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    const dbId = resolvedDatabaseId;
    const firestoreSettings: any = {
      experimentalAutoDetectLongPolling: true,
      experimentalLongPollingOptions: { timeoutSeconds: 8 },
      ignoreUndefinedProperties: true
    };
    try {
      if (dbId && dbId !== '(default)') {
        firestoreDb = initializeFirestore(app, firestoreSettings, dbId);
      } else {
        firestoreDb = initializeFirestore(app, firestoreSettings);
      }
    } catch (initErr: any) {
      if (initErr?.code !== 'failed-precondition') {
        console.warn("initializeFirestore notice, falling back to getFirestore:", initErr);
      }
      if (dbId && dbId !== '(default)') {
        firestoreDb = getFirestore(app, dbId);
      } else {
        firestoreDb = getFirestore(app);
      }
    }
    firebaseAuth = getAuth(app);
    isFirebaseConfigured = true;
    console.log("Firebase initialized successfully inside MOHAMED ELJOKER IT University Platform with database ID:", dbId || "(default)");

    // Pre-fetch authorized domains immediately so click handlers know host status synchronously without delaying signInWithPopup
    fetchFirebaseAuthorizedDomains(true).then((domains) => {
      if (domains && typeof window !== 'undefined' && isHostMatchedInAuthorizedDomains(window.location.hostname, domains)) {
        const resolver = (firebaseAuth as any)?._popupRedirectResolver;
        if (resolver && typeof resolver._originValidation === 'function') {
          Promise.resolve(resolver._originValidation(firebaseAuth)).catch(() => {
            clearRejectedOriginValidationCache(firebaseAuth);
          });
        }
      }
    }).catch(() => {});

    // Validate Firestore connection on boot (non-blocking)
    setTimeout(() => {
      (async () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          console.warn("Browser reports offline status; skipping live Firestore boot probe and using cached fallback.");
          return;
        }

        try {
          await getDocFromServer(doc(firestoreDb, 'settings', 'global'));
          markFirestoreStreamReady();
        } catch (err) {
          if (err instanceof Error && err.message.includes('the client is offline')) {
            const restDiag = await fetchPublicFirestoreDocViaRestWithStatus('settings', 'global');
            if (restDiag.status === 'config_error') {
              console.error("Please check your Firebase configuration.");
            } else if (restDiag.status === 'ok' || restDiag.status === 'not_found') {
              console.warn("Firestore WebChannel warm-up delayed; REST endpoint is reachable.");
            } else {
              console.warn("Unable to reach firestore.googleapis.com from this network; running with local fallback until connectivity resumes.", restDiag.detail);
            }
          }
        }
      })();
    }, 250);
  } catch (error) {
    console.warn("Firebase initialization failed, falling back to local simulation:", error);
  }
} else {
  console.log("No Firebase config variables found. Running MOHAMED ELJOKER IT University Platform in offline-first localStorage simulated database.");
}

export const waitForFirebaseAuth = async (): Promise<void> => {
  if (isFirebaseConfigured && firebaseAuth) {
    try {
      await firebaseAuth.authStateReady();
    } catch {}
  }
};

const verifiedAdminCheckCache: { key: string; allowed: boolean; ts: number } = { key: '', allowed: false, ts: 0 };

const isFirebaseSignedInAdmin = (): boolean => {
  return Boolean(firebaseAuth?.currentUser && isAdminEmail(firebaseAuth.currentUser.email || ''));
};

async function isVerifiedFirebaseAdmin(): Promise<boolean> {
  if (!isFirebaseConfigured || !firebaseAuth) return false;
  await waitForFirebaseAuth();
  const user = firebaseAuth.currentUser;
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return false;
  if (isSuperAdminEmail(email)) return true;

  const cacheKey = `${user.uid}:${email}`;
  const now = Date.now();
  if (verifiedAdminCheckCache.key === cacheKey && (now - verifiedAdminCheckCache.ts) < 60000) {
    return verifiedAdminCheckCache.allowed;
  }
  const level = await resolveAdminAccessLevel(email, user);
  const allowed = level !== null;
  verifiedAdminCheckCache.key = cacheKey;
  verifiedAdminCheckCache.allowed = allowed;
  verifiedAdminCheckCache.ts = now;
  return allowed;
}

const canReadApprovedContentFromFirestore = (): boolean => {
  if (!firebaseAuth?.currentUser) return false;
  if (isAdminEmail(firebaseAuth.currentUser.email || '')) return true;
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (isAdminEmail(parsed?.email || '')) return true;
      if (parsed?.status && parsed.status !== 'active') return false;
      if (parsed?.isApproved === false) return false;
      return parsed?.status === 'active' && parsed?.isApproved === true;
    }
  } catch {}
  return false;
};

function formatCloudErrorMessage(err: any, fallbackMsg: string): string {
  const raw = err?.message || String(err || '');
  if (raw.includes('permission') || raw.includes('Missing or insufficient permissions') || err?.code === 'permission-denied') {
    return 'خطأ في الصلاحيات السحابية (Missing or insufficient permissions). تأكد من تفعيل المزامنة السحابية وتسجيل الدخول بالحساب الصحيح.';
  }
  if (raw.includes('offline') || err?.code === 'unavailable') {
    return 'تعذر الاتصال بخادم قاعدة البيانات. تأكد من الاتصال بالإنترنت ثم أعد المحاولة.';
  }
  return raw || fallbackMsg;
}

async function requireCloudWriteAuth(requireAdminRole: boolean): Promise<void> {
  if (!isFirebaseConfigured) return;
  await waitForFirebaseAuth();
  if (!firebaseAuth?.currentUser) {
    throw new Error('يجب تفعيل المزامنة السحابية وتسجيل الدخول أولاً لحفظ التعديلات في قاعدة البيانات.');
  }
  if (requireAdminRole && !isFirebaseSignedInAdmin()) {
    throw new Error('يلزم تسجيل الدخول بحساب المدير العام (Admin) في المزامنة السحابية لتنفيذ هذه العملية.');
  }
}

export function extractMediaUrlsFromItem(record: any): string[] {
  if (!record || typeof record !== 'object') return [];
  const urls: string[] = [];
  const push = (val?: unknown) => {
    if (typeof val === 'string') {
      const clean = val.trim();
      if (clean && (clean.startsWith('firestore://') || clean.startsWith('indexeddb://') || clean.includes('firebasestorage'))) {
        urls.push(clean);
      }
    }
  };
  push(record.pdfUrl);
  push(record.pptxUrl);
  push(record.fileUrl);
  push(record.archiveUrl);
  push(record.videoUrl);
  push(record.youtubeUrl);
  push(record.questionsFileUrl);
  push(record.questionsPdfUrl);
  push(record.answersFileUrl);
  push(record.modelAnswerUrl);
  push(record.thumbnailUrl);
  push(record.bannerUrl);
  if (Array.isArray(record.imageUrls)) {
    record.imageUrls.forEach(push);
  }
  if (Array.isArray(record.attachments)) {
    record.attachments.forEach((att: any) => push(att?.url));
  }
  if (Array.isArray(record.codeFiles)) {
    record.codeFiles.forEach((cf: any) => push(cf?.url));
  }
  return Array.from(new Set(urls));
}

async function cleanupUnreferencedMedia(candidateUrls: string[], excludeDocId?: string): Promise<void> {
  const targets = Array.from(new Set(candidateUrls.filter(Boolean)));
  if (targets.length === 0) return;

  const referenced = new Set<string>();
  const collectFromList = (items: any[]) => {
    for (const item of items) {
      if (!item || (excludeDocId && item.id === excludeDocId)) continue;
      extractMediaUrlsFromItem(item).forEach((u) => referenced.add(u));
    }
  };

  // Scan localStorage caches first
  ['courses', 'lectures', 'sections', 'sheets', 'exams', 'sheet_answer_keys', 'exam_private_keys', 'sheet_submissions', 'assignments'].forEach((k) => {
    try {
      const raw = localStorage.getItem(`academy_${k}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) collectFromList(parsed);
      }
    } catch {}
  });

  // Also scan authoritative Firestore collections if admin is signed in
  if (isFirebaseConfigured && isFirebaseSignedInAdmin()) {
    const collectionsToScan = ['courses', 'lectures', 'sections', 'sheets', 'exams', 'sheet_answer_keys', 'exam_private_keys', 'sheet_submissions'];
    for (const colName of collectionsToScan) {
      try {
        const snap = await getDocs(collection(firestoreDb, colName));
        snap.forEach((d) => {
          if (excludeDocId && d.id === excludeDocId) return;
          extractMediaUrlsFromItem(d.data()).forEach((u) => referenced.add(u));
        });
      } catch {}
    }
  }

  for (const url of targets) {
    if (referenced.has(url)) continue;
    try {
      if (url.startsWith('firestore://')) {
        await deleteFileFromFirestoreChunks(url);
      } else if (url.startsWith('indexeddb://')) {
        await deleteVideoFromIndexedDB(url);
      } else if (app && (url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app'))) {
        const { getStorage, ref: storageRef, deleteObject } = await import('firebase/storage');
        const st = getStorage(app);
        await deleteObject(storageRef(st, url));
      }
    } catch (cleanupErr) {
      console.warn('[MediaCleanup] Non-fatal cleanup notice for', url, cleanupErr);
    }
  }
}

export function stripSheetPublicFields(sheet: Partial<SheetItem>): Record<string, any> {
  const copy: Record<string, any> = { ...sheet };
  delete copy.modelAnswerUrl;
  delete copy.modelAnswerText;
  return copy;
}

export function extractSheetAnswerKeyDoc(sheetId: string, sheet: Partial<SheetItem>): SheetAnswerKeyDoc {
  return {
    sheetId,
    modelAnswerUrl: sheet.modelAnswerUrl || '',
    modelAnswerText: sheet.modelAnswerText || '',
    showAnswersToStudents: Boolean(sheet.showAnswersToStudents),
    updatedAt: new Date().toISOString()
  };
}

export function stripExamPublicFields(exam: Partial<ExamItem>): Record<string, any> {
  const copy: Record<string, any> = { ...exam };
  delete copy.modelAnswerUrl;
  delete copy.answersFileUrl;
  if (Array.isArray(copy.questions)) {
    copy.questions = copy.questions.map((q: OnlineExamQuestion) => ({
      id: q.id,
      questionText: q.questionText,
      question: q.question,
      type: q.type,
      options: Array.isArray(q.options) ? q.options : [],
      points: typeof q.points === 'number' ? q.points : 1,
      correctAnswerIndex: -1
    }));
  }
  return copy;
}

export function extractExamPrivateKeyDoc(examId: string, exam: Partial<ExamItem>): ExamPrivateKeyDoc {
  const questionKeys: Record<string, ExamPrivateKeyEntry> = {};
  if (Array.isArray(exam.questions)) {
    exam.questions.forEach((q) => {
      if (!q?.id) return;
      questionKeys[q.id] = {
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : (typeof q.correctAnswer === 'number' ? q.correctAnswer : 0),
        acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [],
        explanation: q.explanation || ''
      };
    });
  }
  return {
    examId,
    modelAnswerUrl: exam.modelAnswerUrl || '',
    answersFileUrl: exam.answersFileUrl || '',
    questionKeys,
    showAnswersToStudents: Boolean(exam.showAnswersToStudents),
    showResultsImmediately: exam.showResultsImmediately !== false,
    updatedAt: new Date().toISOString()
  };
}

export function mergeExamWithPrivateKey(exam: ExamItem, keyDoc?: ExamPrivateKeyDoc | null): ExamItem {
  if (!keyDoc) return exam;
  return {
    ...exam,
    modelAnswerUrl: keyDoc.modelAnswerUrl || exam.modelAnswerUrl || '',
    answersFileUrl: keyDoc.answersFileUrl || exam.answersFileUrl || '',
    questions: (exam.questions || []).map((q) => {
      const k = keyDoc.questionKeys?.[q.id];
      if (!k) return q;
      return {
        ...q,
        correctAnswerIndex: k.correctAnswerIndex,
        acceptedAnswers: k.acceptedAnswers || q.acceptedAnswers || [],
        explanation: k.explanation || q.explanation || ''
      };
    })
  };
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
  const fbEmail = firebaseAuth?.currentUser?.email || '';
  const isDirectAdmin = (admin && isAdminEmail(admin.email)) || isAdminEmail(fbEmail);

  if (!isDirectAdmin) {
    secureLog('unauthorized_admin_attempt', { action, details });
    console.warn("checkAdminWrite: Unauthorized admin write attempt blocked:", action);
    throw new Error("Access Denied: Only the primary platform administrator can perform this action.");
  }
  secureLog(action, { admin: admin?.email || 'super_admin', ...details });
}

export function requireAdmin() {
  const admin = authService.getCurrentAdmin();
  const fbEmail = firebaseAuth?.currentUser?.email || '';
  if (!admin && !isAdminEmail(fbEmail)) {
    throw new Error("Access Denied: Administrator privileges are required.");
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
          .replace(/الأستاذ/g, 'المهندس')
          .replace(/الاستاذ/g, 'المهندس')
          .replace(/أستاذ/g, 'المهندس')
          .replace(/استاذ/g, 'المهندس');
        changed = true;
      }
      if (parsed.footerAr && (parsed.footerAr.includes('الأستاذ') || parsed.footerAr.includes('الاستاذ') || parsed.footerAr.includes('أستاذ') || parsed.footerAr.includes('استاذ'))) {
        parsed.footerAr = parsed.footerAr
          .replace(/الأستاذ/g, 'المهندس')
          .replace(/الاستاذ/g, 'المهندس')
          .replace(/أستاذ/g, 'المهندس')
          .replace(/استاذ/g, 'المهندس');
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

// Track per-student read state locally for shared 'global' notifications and quick lookups
const knownGlobalNotifIds = new Set<string>();

const getLocalReadNotifIds = (uidKey: string): Set<string> => {
  const safeKey = (uidKey || 'local_student').replace(/[^a-zA-Z0-9_@.-]/g, '_');
  try {
    const raw = localStorage.getItem(`academy_read_notifs_${safeKey}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const addLocalReadNotifIds = (ids: string[], uidKey: string): void => {
  if (!ids.length) return;
  const safeKey = (uidKey || 'local_student').replace(/[^a-zA-Z0-9_@.-]/g, '_');
  try {
    const existing = getLocalReadNotifIds(safeKey);
    ids.forEach(id => {
      if (id) existing.add(id);
    });
    const trimmed = Array.from(existing).slice(-500);
    localStorage.setItem(`academy_read_notifs_${safeKey}`, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
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
  verifyAdminSession: (): Promise<boolean> => isVerifiedFirebaseAdmin(),

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
      const isAdmin = (admin !== null && isAdminEmail(admin.email)) || isFirebaseSignedInAdmin();

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
      const isAdmin = (admin !== null && isAdminEmail(admin.email)) || isFirebaseSignedInAdmin();

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
    let settings: WebsiteSettings | null = null;
    if (isFirebaseConfigured) {
      try {
        const snap = await withFirestoreReadTimeout(getDoc(doc(firestoreDb, 'settings', 'global')), 4500, 'getSettings');
        if (snap.exists()) {
          settings = snap.data() as WebsiteSettings;
          setStorageItem<WebsiteSettings>('settings', settings);
        }
      } catch (err: any) {
        const restData = await fetchPublicFirestoreDocViaRest('settings', 'global').catch(() => null);
        if (restData) {
          settings = restData as WebsiteSettings;
          setStorageItem<WebsiteSettings>('settings', settings);
        } else {
          console.warn("Firebase settings read notice, using cached fallback:", err?.message || err);
        }
      }
    }
    if (!settings) {
      settings = getStorageItem<WebsiteSettings>('settings', defaultSettings);
    }

    if (settings) {
      let changed = false;
      if (settings.websiteNameAr && (settings.websiteNameAr.includes('الأستاذ') || settings.websiteNameAr.includes('الاستاذ') || settings.websiteNameAr.includes('أستاذ') || settings.websiteNameAr.includes('استاذ'))) {
        settings.websiteNameAr = settings.websiteNameAr
          .replace(/الأستاذ/g, 'المهندس')
          .replace(/الاستاذ/g, 'المهندس')
          .replace(/أستاذ/g, 'المهندس')
          .replace(/استاذ/g, 'المهندس');
        changed = true;
      }
      if (settings.footerAr && (settings.footerAr.includes('الأستاذ') || settings.footerAr.includes('الاستاذ') || settings.footerAr.includes('أستاذ') || settings.footerAr.includes('استاذ'))) {
        settings.footerAr = settings.footerAr
          .replace(/الأستاذ/g, 'المهندس')
          .replace(/الاستاذ/g, 'المهندس')
          .replace(/أستاذ/g, 'المهندس')
          .replace(/استاذ/g, 'المهندس');
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
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'global'), sanitizeForFirestore(settings));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حفظ إعدادات المنصة في قاعدة البيانات السحابية.'));
      }
    }
    setStorageItem<WebsiteSettings>('settings', settings);
  },

  listenToSettings: (onUpdate: (settings: WebsiteSettings) => void): (() => void) => {
    if (isFirebaseConfigured) {
      const ref = doc(firestoreDb, 'settings', 'global');
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as WebsiteSettings;
          if (!snap.metadata?.fromCache) {
            setStorageItem<WebsiteSettings>('settings', data);
          }
          onUpdate(data);
        } else {
          onUpdate(getStorageItem<WebsiteSettings>('settings', defaultSettings));
        }
      }, (err) => {
        console.warn("Settings listener notice:", err?.message || err);
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
        const snap = await withFirestoreReadTimeout(getDocs(collection(firestoreDb, 'categories')), 4500, 'getCategories');
        snap.forEach(d => rawList.push({ id: d.id, ...d.data() } as Category));
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (msg.includes('permission') || err?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, 'categories');
        } else {
          const restCats = await runPublicCollectionQueryViaRest<Category>('categories').catch(() => null);
          if (restCats && restCats.length > 0) {
            rawList = restCats;
            setStorageItem('categories', rawList);
          } else {
            console.warn("Categories read notice, using cached fallback:", msg);
          }
        }
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
    await requireCloudWriteAuth(true);
    const newId = 'cat_' + Date.now();
    const newCategory: Category = { id: newId, ...category };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'categories', newId), sanitizeForFirestore(category));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إضافة الفرقة/القسم في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Category[]>('categories', defaultCategories);
    current.push(newCategory);
    setStorageItem('categories', current);
    return newCategory;
  },

  updateCategory: async (id: string, category: Partial<Category>): Promise<void> => {
    checkAdminWrite('update_category', { id, category });
    await requireCloudWriteAuth(true);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'categories', id), sanitizeForFirestore(category) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث الفرقة/القسم في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Category[]>('categories', defaultCategories);
    const updated = current.map(item => item.id === id ? { ...item, ...category } : item);
    setStorageItem('categories', updated);
  },

  deleteCategory: async (id: string): Promise<void> => {
    checkAdminWrite('delete_category', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'categories', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الفرقة/القسم من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Category[]>('categories', defaultCategories);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('categories', updated);
  },

  // --- Courses ---
  getCourses: async (): Promise<Course[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await withFirestoreReadTimeout(getDocs(collection(firestoreDb, 'courses')), 4500, 'getCourses');
        const list: Course[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Course));
        if (!(snap.metadata?.fromCache && list.length === 0)) {
          const normalized = list.map(c => normalizeCourseLessons(c));
          setStorageItem('courses', normalized);
          return normalized;
        }
      } catch (err: any) {
        const restCourses = await runPublicCollectionQueryViaRest<Course>('courses').catch(() => null);
        if (restCourses !== null) {
          const normalized = restCourses.map(c => normalizeCourseLessons(c));
          setStorageItem('courses', normalized);
          return normalized;
        }
        console.warn("Firestore getCourses notice:", err?.message || err);
      }
    }
    const localCourses = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
    return localCourses || [];
  },

  listenToCourses: (onUpdate: (courses: Course[]) => void) => {
    // Immediate initial local emit
    const initial = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
    onUpdate(initial);

    if (isFirebaseConfigured) {
      const unsubCourses = onSnapshot(collection(firestoreDb, 'courses'), (snap) => {
        const coursesList: Course[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Course;
          coursesList.push(item);
        });

        if (snap.metadata?.fromCache && coursesList.length === 0) {
          return;
        }
        const normalized = coursesList.map(c => normalizeCourseLessons(c));
        setStorageItem('courses', normalized);
        onUpdate(normalized);
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
    await requireCloudWriteAuth(true);
    const newId = 'course_' + Date.now();
    const isPublished = course.published !== false;
    const isPremium = typeof course.isPremium === 'boolean' ? course.isPremium : !course.isFree;
    
    const newCourse: Course = {
      id: newId,
      ...course,
      published: isPublished,
      status: isPublished ? 'published' : 'draft',
      grade: course.grade || course.categoryId || 'year1',
      department: (course as any).department || 'general',
      isPremium,
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (isFirebaseConfigured) {
      try {
        const firestoreData = sanitizeForFirestore(newCourse);
        await setDoc(doc(firestoreDb, 'courses', newId), firestoreData);
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حفظ المقرر في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<Course[]>('courses', defaultCourses);
    const updated = [...current.filter(c => c.id !== newId), newCourse];
    setStorageItem('courses', updated);

    return newCourse;
  },

  updateCourse: async (id: string, course: Partial<Course>): Promise<void> => {
    checkAdminWrite('update_course', { id, course });
    await requireCloudWriteAuth(true);
    const patch: any = { ...course };
    if (typeof course.published === 'boolean') {
      patch.status = course.published ? 'published' : 'draft';
    }
    if (typeof course.isFree === 'boolean' && typeof course.isPremium !== 'boolean') {
      patch.isPremium = !course.isFree;
    }

    if (isFirebaseConfigured) {
      try {
        const firestorePatch = sanitizeForFirestore(patch);
        await setDoc(doc(firestoreDb, 'courses', id), firestorePatch, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث المقرر في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<Course[]>('courses', defaultCourses);
    const updated = current.map(item => item.id === id ? { ...item, ...patch } : item);
    setStorageItem('courses', updated);
  },


  deleteCourse: async (id: string): Promise<void> => {
    checkAdminWrite('delete_course', { id });
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      const courseDocRef = doc(firestoreDb, 'courses', id);
      let courseSnap: any = null;
      try {
        courseSnap = await getDoc(courseDocRef);
      } catch (readErr: any) {
        console.warn("Firestore getDoc before delete notice:", readErr);
      }

      const existsInCloud = Boolean(courseSnap && courseSnap.exists());

      if (existsInCloud) {
        if (!isFirebaseSignedInAdmin()) {
          throw new Error('يلزم ربط المزامنة السحابية (Google) لحذف المقررات المحفوظة على السحابة. اضغط على زر «تفعيل المزامنة السحابية (Google)» بالأعلى ثم أعد المحاولة.');
        }

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

        // 2. Lesson/Unit-level media fields (Images, Videos, PDFs)
        if (Array.isArray(courseData.lessons)) {
          courseData.lessons.forEach(lesson => {
            addUrl(lesson.videoUrl);
            addUrl(lesson.pdfUrl);
            addUrl((lesson as any).wordUrl);
            if (Array.isArray(lesson.attachments)) {
              lesson.attachments.forEach(url => addUrl(url));
            }
          });
        }
        if (Array.isArray(courseData.units)) {
          courseData.units.forEach(unit => {
            if (Array.isArray(unit.lessons)) {
              unit.lessons.forEach(lesson => {
                addUrl(lesson.videoUrl);
                addUrl(lesson.pdfUrl);
                addUrl(lesson.wordUrl);
              });
            }
          });
        }

        // Delete collected storage files (best-effort)
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
                  console.warn(`Storage file cleanup notice (${url}):`, storageErr);
                }
              })
            );
          } catch (storageImportErr) {
            console.warn("Storage cleanup import notice:", storageImportErr);
          }
        }

        // 3. Delete linked quizzes, assignments, and course requests in Firestore (best-effort)
        try {
          const qQuizzes = query(collection(firestoreDb, 'quizzes'), where('courseId', '==', id));
          const quizSnap = await getDocs(qQuizzes);
          await Promise.all(quizSnap.docs.map(qDoc => deleteDoc(qDoc.ref).catch(() => {})));

          const qAssign = query(collection(firestoreDb, 'assignments'), where('courseId', '==', id));
          const assignSnap = await getDocs(qAssign);
          await Promise.all(assignSnap.docs.map(aDoc => deleteDoc(aDoc.ref).catch(() => {})));

          const qReqs = query(collection(firestoreDb, 'courseRequests'), where('courseId', '==', id));
          const reqSnap = await getDocs(qReqs);
          await Promise.all(reqSnap.docs.map(rDoc => deleteDoc(rDoc.ref).catch(() => {})));
        } catch (linkedErr) {
          console.warn("Linked records cleanup notice:", linkedErr);
        }

        // 4. Delete the course document from Cloud Firestore
        try {
          await deleteDoc(courseDocRef);
        } catch (err: any) {
          console.error("Firebase course delete error:", err);
          handleFirestoreError(err, OperationType.DELETE, 'courses/' + id);
        }
      }
    }

    // Always clean localStorage caches regardless of whether it was cloud or local-only
    const current = getStorageItem<Course[]>('courses', defaultCourses);
    setStorageItem('courses', current.filter(item => item.id !== id));

    const currentQuizzes = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    setStorageItem('quizzes', currentQuizzes.filter(q => q.courseId !== id));

    const currentAssign = getStorageItem<AssignmentSubmission[]>('assignments', []);
    setStorageItem('assignments', currentAssign.filter(a => a.courseId !== id));

    const currentOrders = getStorageItem<Order[]>('orders', []);
    setStorageItem('orders', currentOrders.filter(o => o.courseId !== id));

    const currentReqs = getStorageItem<any[]>('courseRequests', []);
    setStorageItem('courseRequests', currentReqs.filter(r => r.courseId !== id));
  },

  deleteAllCourses: async (): Promise<void> => {
    checkAdminWrite('delete_all_courses', {});
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      const snap = await getDocs(collection(firestoreDb, 'courses'));
      if (!snap.empty) {
        if (!isFirebaseSignedInAdmin()) {
          throw new Error('يلزم ربط المزامنة السحابية (Google) لحذف المقررات المحفوظة على السحابة. اضغط على زر «تفعيل المزامنة السحابية (Google)» بالأعلى ثم أعد المحاولة.');
        }
        const courseIds = snap.docs.map(d => d.id);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));

        // Best-effort cleanup for linked quizzes, assignments, and requests
        for (const cId of courseIds) {
          try {
            const qQuizzes = query(collection(firestoreDb, 'quizzes'), where('courseId', '==', cId));
            const quizSnap = await getDocs(qQuizzes);
            await Promise.all(quizSnap.docs.map(qDoc => deleteDoc(qDoc.ref).catch(() => {})));

            const qAssign = query(collection(firestoreDb, 'assignments'), where('courseId', '==', cId));
            const assignSnap = await getDocs(qAssign);
            await Promise.all(assignSnap.docs.map(aDoc => deleteDoc(aDoc.ref).catch(() => {})));

            const qReqs = query(collection(firestoreDb, 'courseRequests'), where('courseId', '==', cId));
            const reqSnap = await getDocs(qReqs);
            await Promise.all(reqSnap.docs.map(rDoc => deleteDoc(rDoc.ref).catch(() => {})));
          } catch {}
        }
      }
    }
    setStorageItem('courses', []);
    setStorageItem('courseRequests', []);
  },

  runOneTimeDemoAndCoursesPurge: async (): Promise<{ ran: boolean }> => {
    if (!isFirebaseConfigured || !isFirebaseSignedInAdmin()) {
      return { ran: false };
    }
    try {
      const settingsRef = doc(firestoreDb, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists() && settingsSnap.data()?.allCoursesClearedV3 === true) {
        return { ran: false };
      }

      // 1. Delete ALL existing course documents & linked docs
      const courseSnap = await getDocs(collection(firestoreDb, 'courses'));
      const courseIds = courseSnap.docs.map(d => d.id);
      await Promise.all(courseSnap.docs.map(d => deleteDoc(d.ref).catch(() => {})));

      for (const cId of courseIds) {
        try {
          const qQuizzes = query(collection(firestoreDb, 'quizzes'), where('courseId', '==', cId));
          const quizSnap = await getDocs(qQuizzes);
          await Promise.all(quizSnap.docs.map(qDoc => deleteDoc(qDoc.ref).catch(() => {})));

          const qAssign = query(collection(firestoreDb, 'assignments'), where('courseId', '==', cId));
          const assignSnap = await getDocs(qAssign);
          await Promise.all(assignSnap.docs.map(aDoc => deleteDoc(aDoc.ref).catch(() => {})));

          const qReqs = query(collection(firestoreDb, 'courseRequests'), where('courseId', '==', cId));
          const reqSnap = await getDocs(qReqs);
          await Promise.all(reqSnap.docs.map(rDoc => deleteDoc(rDoc.ref).catch(() => {})));
        } catch {}
      }

      // 2. Delete known seeded demo documents & docs referencing placeholder URLs
      const demoIdsByCollection: Record<string, string[]> = {
        lectures: ['lec_physics_1', 'lec_python_1', 'lec_it_1', 'lec_math_1', 'lec_cyber_1', 'lec_english_1'],
        sections: ['sec_physics_1', 'sec_python_1', 'sec_it_1', 'sec_math_1', 'sec_cyber_1', 'sec_english_1'],
        exams: ['exam_physics_midterm', 'exam_python_midterm', 'exam_it_final', 'exam_python_online_quiz', 'exam_cyber_sec_quiz'],
        sheets: ['sheet_lec_phys_1', 'sheet_sec_phys_1', 'sheet_lec_py_1', 'sheet_sec_py_1'],
        question_bank: ['qb_py_1', 'qb_py_2', 'qb_phys_1', 'qb_phys_2', 'qb_it_1', 'qb_cs_1', 'qb_math_1', 'qb_eng_1'],
        schedule: ['sch_1', 'sch_2', 'sch_3', 'sch_4', 'sch_5', 'sch_6', 'sch_7', 'sch_8'],
        inquiries: ['inq_1'],
        exam_submissions: ['sub_sample_1'],
        activity_logs: ['act_1', 'act_2']
      };

      const isDemoDocData = (data: any): boolean => {
        if (!data || typeof data !== 'object') return false;
        const serialized = JSON.stringify(data);
        return (
          serialized.includes('dummy.pdf') ||
          serialized.includes('demo.docx') ||
          serialized.includes('dQw4w9WgXcQ') ||
          serialized.includes('sample_student_1')
        );
      };

      for (const [colName, knownIds] of Object.entries(demoIdsByCollection)) {
        try {
          const snap = await getDocs(collection(firestoreDb, colName));
          await Promise.all(
            snap.docs
              .filter(d => knownIds.includes(d.id) || isDemoDocData(d.data()))
              .map(d => deleteDoc(d.ref).catch(() => {}))
          );
        } catch {}
      }

      // 3. Clear localStorage course caches
      ['courses', 'courseRequests', 'lessonAccess'].forEach(k => {
        setStorageItem(k, []);
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('purge_all_courses_v3', 'true');
      }

      // 4. Persist one-time completion marker in Firestore
      await setDoc(settingsRef, { demoAndCoursesClearedV2: true, allCoursesClearedV3: true }, { merge: true });
      return { ran: true };
    } catch (err) {
      console.warn("runOneTimeDemoAndCoursesPurge notice:", err);
      return { ran: false };
    }
  },

  // --- Lectures (المحاضرات) ---
  getLectures: async (courseId?: string): Promise<LectureItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (canReadApprovedContentFromFirestore()) {
        try {
          const isAdminSession = isFirebaseSignedInAdmin();
          const colRef = collection(firestoreDb, 'lectures');
          const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
          const snap = await getDocs(qRef);
          const list: LectureItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as LectureItem));
          list.sort((a, b) => a.number - b.number);
          if (isAdminSession) setStorageItem('lectures', list);
          return courseId ? list.filter(l => l.courseId === courseId) : list;
        } catch (err) {
          console.warn("Firestore getLectures notice:", err);
        }
      }
    }
    const local = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    return courseId ? local.filter(l => l.courseId === courseId) : local;
  },

  listenToLectures: (onUpdate: (lectures: LectureItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    if (!isFirebaseConfigured || isFirebaseSignedInAdmin()) {
      onUpdate(courseId ? initial.filter(l => l.courseId === courseId) : initial);
    }

    if (isFirebaseConfigured && canReadApprovedContentFromFirestore()) {
      const isAdminSession = isFirebaseSignedInAdmin();
      const colRef = collection(firestoreDb, 'lectures');
      const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
      const unsub = onSnapshot(qRef, (snap) => {
        const list: LectureItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as LectureItem));
        list.sort((a, b) => a.number - b.number);
        if (isAdminSession) setStorageItem('lectures', list);
        onUpdate(courseId ? list.filter(l => l.courseId === courseId) : list);
      }, (err) => {
        console.warn("Lectures listener notice:", err);
        const local = getStorageItem<LectureItem[]>('lectures', defaultLectures);
        onUpdate(courseId ? local.filter(l => l.courseId === courseId) : local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<LectureItem[]>('lectures', defaultLectures);
        onUpdate(courseId ? local.filter(l => l.courseId === courseId) : local);
      };
      load();
      const interval = setInterval(load, 1500);
      return () => clearInterval(interval);
    }
  },

  addLecture: async (lecture: Omit<LectureItem, 'id' | 'createdAt'>): Promise<LectureItem> => {
    checkAdminWrite('add_lecture', { lecture });
    await requireCloudWriteAuth(true);
    const newId = 'lec_' + Date.now();
    const status = lecture.status || (lecture.published === false ? 'draft' : 'published');
    const item: LectureItem = {
      id: newId,
      ...lecture,
      status,
      published: status === 'published',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'lectures', newId), sanitizeForFirestore(item));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ المحاضرة في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    const updated = [...current.filter(l => l.id !== newId), item];
    setStorageItem('lectures', updated);
    return item;
  },

  updateLecture: async (id: string, patch: Partial<LectureItem>): Promise<void> => {
    checkAdminWrite('update_lecture', { id, patch });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    const prev = current.find(l => l.id === id);

    const normalizedPatch: Partial<LectureItem> = { ...patch, updatedAt: new Date().toISOString() };
    if (normalizedPatch.status !== undefined) {
      normalizedPatch.published = normalizedPatch.status === 'published';
    } else if (normalizedPatch.published !== undefined) {
      normalizedPatch.status = normalizedPatch.published ? 'published' : 'draft';
    }

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'lectures', id), sanitizeForFirestore(normalizedPatch), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث المحاضرة في قاعدة البيانات السحابية.'));
      }
    }

    const updatedItem = prev ? { ...prev, ...normalizedPatch } : null;
    const updated = current.map(l => l.id === id ? { ...l, ...normalizedPatch } : l);
    setStorageItem('lectures', updated);

    if (prev && updatedItem) {
      const oldUrls = extractMediaUrlsFromItem(prev);
      const newUrls = new Set(extractMediaUrlsFromItem(updatedItem));
      const removed = oldUrls.filter(u => !newUrls.has(u));
      if (removed.length > 0) cleanupUnreferencedMedia(removed, id).catch(() => {});
    }
  },

  deleteLecture: async (id: string): Promise<void> => {
    checkAdminWrite('delete_lecture', { id });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    let target = current.find(l => l.id === id);

    if (isFirebaseConfigured) {
      try {
        if (!target) {
          const snap = await getDoc(doc(firestoreDb, 'lectures', id));
          if (snap.exists()) target = { id: snap.id, ...snap.data() } as LectureItem;
        }
        await deleteDoc(doc(firestoreDb, 'lectures', id));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف المحاضرة من قاعدة البيانات السحابية.'));
      }
    }

    setStorageItem('lectures', current.filter(l => l.id !== id));
    if (target) {
      cleanupUnreferencedMedia(extractMediaUrlsFromItem(target), id).catch(() => {});
    }
  },

  // --- Sections (السكاشن) ---
  getSections: async (courseId?: string): Promise<SectionItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (canReadApprovedContentFromFirestore()) {
        try {
          const isAdminSession = isFirebaseSignedInAdmin();
          const colRef = collection(firestoreDb, 'sections');
          const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
          const snap = await getDocs(qRef);
          const list: SectionItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as SectionItem));
          list.sort((a, b) => a.number - b.number);
          if (isAdminSession) setStorageItem('sections', list);
          return courseId ? list.filter(s => s.courseId === courseId) : list;
        } catch (err) {
          console.warn("Firestore getSections notice:", err);
        }
      }
    }
    const local = getStorageItem<SectionItem[]>('sections', defaultSections);
    return courseId ? local.filter(s => s.courseId === courseId) : local;
  },

  listenToSections: (onUpdate: (sections: SectionItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<SectionItem[]>('sections', defaultSections);
    if (!isFirebaseConfigured || isFirebaseSignedInAdmin()) {
      onUpdate(courseId ? initial.filter(s => s.courseId === courseId) : initial);
    }

    if (isFirebaseConfigured && canReadApprovedContentFromFirestore()) {
      const isAdminSession = isFirebaseSignedInAdmin();
      const colRef = collection(firestoreDb, 'sections');
      const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
      const unsub = onSnapshot(qRef, (snap) => {
        const list: SectionItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SectionItem));
        list.sort((a, b) => a.number - b.number);
        if (isAdminSession) setStorageItem('sections', list);
        onUpdate(courseId ? list.filter(s => s.courseId === courseId) : list);
      }, (err) => {
        console.warn("Sections listener notice:", err);
        const local = getStorageItem<SectionItem[]>('sections', defaultSections);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<SectionItem[]>('sections', defaultSections);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      };
      load();
      const interval = setInterval(load, 1500);
      return () => clearInterval(interval);
    }
  },

  addSection: async (section: Omit<SectionItem, 'id' | 'createdAt'>): Promise<SectionItem> => {
    checkAdminWrite('add_section', { section });
    await requireCloudWriteAuth(true);
    const newId = 'sec_' + Date.now();
    const status = section.status || (section.published === false ? 'draft' : 'published');
    const item: SectionItem = {
      id: newId,
      ...section,
      status,
      published: status === 'published',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sections', newId), sanitizeForFirestore(item));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ السكشن في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<SectionItem[]>('sections', defaultSections);
    const updated = [...current.filter(s => s.id !== newId), item];
    setStorageItem('sections', updated);
    return item;
  },

  updateSection: async (id: string, patch: Partial<SectionItem>): Promise<void> => {
    checkAdminWrite('update_section', { id, patch });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<SectionItem[]>('sections', defaultSections);
    const prev = current.find(s => s.id === id);

    const normalizedPatch: Partial<SectionItem> = { ...patch, updatedAt: new Date().toISOString() };
    if (normalizedPatch.status !== undefined) {
      normalizedPatch.published = normalizedPatch.status === 'published';
    } else if (normalizedPatch.published !== undefined) {
      normalizedPatch.status = normalizedPatch.published ? 'published' : 'draft';
    }

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sections', id), sanitizeForFirestore(normalizedPatch), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث السكشن في قاعدة البيانات السحابية.'));
      }
    }

    const updatedItem = prev ? { ...prev, ...normalizedPatch } : null;
    const updated = current.map(s => s.id === id ? { ...s, ...normalizedPatch } : s);
    setStorageItem('sections', updated);

    if (prev && updatedItem) {
      const oldUrls = extractMediaUrlsFromItem(prev);
      const newUrls = new Set(extractMediaUrlsFromItem(updatedItem));
      const removed = oldUrls.filter(u => !newUrls.has(u));
      if (removed.length > 0) cleanupUnreferencedMedia(removed, id).catch(() => {});
    }
  },

  deleteSection: async (id: string): Promise<void> => {
    checkAdminWrite('delete_section', { id });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<SectionItem[]>('sections', defaultSections);
    let target = current.find(s => s.id === id);

    if (isFirebaseConfigured) {
      try {
        if (!target) {
          const snap = await getDoc(doc(firestoreDb, 'sections', id));
          if (snap.exists()) target = { id: snap.id, ...snap.data() } as SectionItem;
        }
        await deleteDoc(doc(firestoreDb, 'sections', id));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف السكشن من قاعدة البيانات السحابية.'));
      }
    }

    setStorageItem('sections', current.filter(s => s.id !== id));
    if (target) {
      cleanupUnreferencedMedia(extractMediaUrlsFromItem(target), id).catch(() => {});
    }
  },

  // --- Exams (الامتحانات) ---
  getExams: async (courseId?: string): Promise<ExamItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (canReadApprovedContentFromFirestore()) {
        try {
          const isAdminSession = isFirebaseSignedInAdmin();
          const colRef = collection(firestoreDb, 'exams');
          const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
          const snap = await getDocs(qRef);
          const list: ExamItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExamItem));
          if (isAdminSession) setStorageItem('exams', list);
          return courseId ? list.filter(e => e.courseId === courseId) : list;
        } catch (err) {
          console.warn("Firestore getExams notice:", err);
        }
      }
    }
    const local = getStorageItem<ExamItem[]>('exams', defaultExams);
    return courseId ? local.filter(e => e.courseId === courseId) : local;
  },

  listenToExams: (onUpdate: (exams: ExamItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<ExamItem[]>('exams', defaultExams);
    if (!isFirebaseConfigured || isFirebaseSignedInAdmin()) {
      onUpdate(courseId ? initial.filter(e => e.courseId === courseId) : initial);
    }

    if (isFirebaseConfigured && canReadApprovedContentFromFirestore()) {
      const isAdminSession = isFirebaseSignedInAdmin();
      const colRef = collection(firestoreDb, 'exams');
      const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
      const unsub = onSnapshot(qRef, (snap) => {
        const list: ExamItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExamItem));
        if (isAdminSession) setStorageItem('exams', list);
        onUpdate(courseId ? list.filter(e => e.courseId === courseId) : list);
      }, (err) => {
        console.warn("Exams listener notice:", err);
        const local = getStorageItem<ExamItem[]>('exams', defaultExams);
        onUpdate(courseId ? local.filter(e => e.courseId === courseId) : local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<ExamItem[]>('exams', defaultExams);
        onUpdate(courseId ? local.filter(e => e.courseId === courseId) : local);
      };
      load();
      const interval = setInterval(load, 1500);
      return () => clearInterval(interval);
    }
  },

  getAllExamPrivateKeys: async (): Promise<Record<string, ExamPrivateKeyDoc>> => {
    const map: Record<string, ExamPrivateKeyDoc> = {};
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (isFirebaseSignedInAdmin()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'exam_private_keys'));
          const arr: ExamPrivateKeyDoc[] = [];
          snap.forEach(d => {
            const data = { examId: d.id, ...d.data() } as ExamPrivateKeyDoc;
            map[d.id] = data;
            arr.push(data);
          });
          setStorageItem('exam_private_keys', arr);
          return map;
        } catch (err) {
          console.warn('getAllExamPrivateKeys notice:', err);
        }
      }
    }
    const local = getStorageItem<ExamPrivateKeyDoc[]>('exam_private_keys', []);
    local.forEach(k => { map[k.examId] = k; });
    return map;
  },

  getExamPrivateKey: async (examId: string): Promise<ExamPrivateKeyDoc | null> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      try {
        const snap = await getDoc(doc(firestoreDb, 'exam_private_keys', examId));
        if (snap.exists()) {
          return { examId: snap.id, ...snap.data() } as ExamPrivateKeyDoc;
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied' || String(err?.message || '').includes('permission')) {
          throw new Error(formatCloudErrorMessage(err, 'غير مصرح بالوصول لمفاتيح إجابات الامتحان في الوقت الحالي.'));
        }
        console.warn('getExamPrivateKey notice:', err);
      }
    }
    const local = getStorageItem<ExamPrivateKeyDoc[]>('exam_private_keys', []);
    return local.find(k => k.examId === examId) || null;
  },

  createExamSubmissionReceipt: async (examId: string, studentId: string): Promise<void> => {
    const receiptId = `${examId}_${studentId}`;
    const receipt = {
      examId,
      studentId,
      createdAt: new Date().toISOString()
    };
    if (isFirebaseConfigured) {
      await requireCloudWriteAuth(false);
      try {
        await setDoc(doc(firestoreDb, 'exam_submission_receipts', receiptId), receipt);
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تسجيل إيصال تسليم الامتحان.'));
      }
    }
  },

  addExam: async (exam: Omit<ExamItem, 'id' | 'createdAt'>): Promise<ExamItem> => {
    checkAdminWrite('add_exam', { exam });
    await requireCloudWriteAuth(true);
    const newId = 'exam_' + Date.now();
    const status = exam.status || (exam.published === false ? 'draft' : 'published');
    const item: ExamItem = {
      id: newId,
      ...exam,
      status,
      published: status === 'published',
      createdAt: new Date().toISOString()
    };

    const publicPayload = stripExamPublicFields(item);
    const privateKeyDoc = extractExamPrivateKeyDoc(newId, item);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exams', newId), sanitizeForFirestore(publicPayload));
        await setDoc(doc(firestoreDb, 'exam_private_keys', newId), sanitizeForFirestore(privateKeyDoc));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ الامتحان في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<ExamItem[]>('exams', defaultExams);
    setStorageItem('exams', [...current.filter(e => e.id !== newId), item]);
    const localKeys = getStorageItem<ExamPrivateKeyDoc[]>('exam_private_keys', []);
    setStorageItem('exam_private_keys', [...localKeys.filter(k => k.examId !== newId), privateKeyDoc]);
    return item;
  },

  updateExam: async (id: string, patch: Partial<ExamItem>): Promise<void> => {
    checkAdminWrite('update_exam', { id, patch });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<ExamItem[]>('exams', defaultExams);
    const prev = current.find(e => e.id === id);

    const normalizedPatch: Partial<ExamItem> = { ...patch, updatedAt: new Date().toISOString() };
    if (normalizedPatch.status !== undefined) {
      normalizedPatch.published = normalizedPatch.status === 'published';
    } else if (normalizedPatch.published !== undefined) {
      normalizedPatch.status = normalizedPatch.published ? 'published' : 'draft';
    }

    const publicPatch = stripExamPublicFields(normalizedPatch);
    // Explicitly remove any legacy secret fields on public exams/{id}
    const firestorePublicPatch: Record<string, any> = {
      ...sanitizeForFirestore(publicPatch),
      modelAnswerUrl: deleteField(),
      answersFileUrl: deleteField()
    };

    // Build updated private key patch
    const localKeys = getStorageItem<ExamPrivateKeyDoc[]>('exam_private_keys', []);
    const existingKey = localKeys.find(k => k.examId === id);
    const mergedForKey: Partial<ExamItem> = {
      ...(prev || {}),
      ...(existingKey ? {
        modelAnswerUrl: existingKey.modelAnswerUrl,
        answersFileUrl: existingKey.answersFileUrl
      } : {}),
      ...normalizedPatch
    };
    const nextPrivateKey = extractExamPrivateKeyDoc(id, mergedForKey);
    if (!normalizedPatch.questions && existingKey?.questionKeys) {
      nextPrivateKey.questionKeys = existingKey.questionKeys;
    }

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exams', id), firestorePublicPatch, { merge: true });
        await setDoc(doc(firestoreDb, 'exam_private_keys', id), sanitizeForFirestore(nextPrivateKey), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث الامتحان في قاعدة البيانات السحابية.'));
      }
    }

    const updatedItem = prev ? { ...prev, ...normalizedPatch } : null;
    setStorageItem('exams', current.map(e => e.id === id ? { ...e, ...normalizedPatch } : e));
    setStorageItem('exam_private_keys', [...localKeys.filter(k => k.examId !== id), nextPrivateKey]);

    if (prev && updatedItem) {
      const oldUrls = extractMediaUrlsFromItem(prev);
      const newUrls = new Set(extractMediaUrlsFromItem(updatedItem));
      const removed = oldUrls.filter(u => !newUrls.has(u));
      if (removed.length > 0) cleanupUnreferencedMedia(removed, id).catch(() => {});
    }
  },

  deleteExam: async (id: string): Promise<void> => {
    checkAdminWrite('delete_exam', { id });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<ExamItem[]>('exams', defaultExams);
    const localKeys = getStorageItem<ExamPrivateKeyDoc[]>('exam_private_keys', []);
    let target = current.find(e => e.id === id);
    let targetKey = localKeys.find(k => k.examId === id);

    if (isFirebaseConfigured) {
      try {
        if (!target) {
          const snap = await getDoc(doc(firestoreDb, 'exams', id));
          if (snap.exists()) target = { id: snap.id, ...snap.data() } as ExamItem;
        }
        if (!targetKey) {
          const kSnap = await getDoc(doc(firestoreDb, 'exam_private_keys', id));
          if (kSnap.exists()) targetKey = kSnap.data() as ExamPrivateKeyDoc;
        }
        await deleteDoc(doc(firestoreDb, 'exams', id));
        await deleteDoc(doc(firestoreDb, 'exam_private_keys', id)).catch(() => {});
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف الامتحان من قاعدة البيانات السحابية.'));
      }
    }

    setStorageItem('exams', current.filter(e => e.id !== id));
    setStorageItem('exam_private_keys', localKeys.filter(k => k.examId !== id));
    const mediaToClean = [
      ...extractMediaUrlsFromItem(target),
      ...extractMediaUrlsFromItem(targetKey)
    ];
    if (mediaToClean.length > 0) {
      cleanupUnreferencedMedia(mediaToClean, id).catch(() => {});
    }
  },

  // --- Sheets (الشيتات) ---
  getSheets: async (courseId?: string, sheetType?: 'lecture_sheet' | 'section_sheet'): Promise<SheetItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (canReadApprovedContentFromFirestore()) {
        try {
          const isAdminSession = isFirebaseSignedInAdmin();
          const colRef = collection(firestoreDb, 'sheets');
          const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
          const snap = await getDocs(qRef);
          const list: SheetItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as SheetItem));
          list.sort((a, b) => a.referenceNumber - b.referenceNumber);
          if (isAdminSession) setStorageItem('sheets', list);
          let res = list;
          if (courseId) res = res.filter(s => s.courseId === courseId);
          if (sheetType) res = res.filter(s => s.sheetType === sheetType);
          return res;
        } catch (err) {
          console.warn("Firestore getSheets notice:", err);
        }
      }
    }
    let local = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    if (courseId) local = local.filter(s => s.courseId === courseId);
    if (sheetType) local = local.filter(s => s.sheetType === sheetType);
    return local;
  },

  listenToSheets: (onUpdate: (sheets: SheetItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    if (!isFirebaseConfigured || isFirebaseSignedInAdmin()) {
      onUpdate(courseId ? initial.filter(s => s.courseId === courseId) : initial);
    }

    if (isFirebaseConfigured && canReadApprovedContentFromFirestore()) {
      const isAdminSession = isFirebaseSignedInAdmin();
      const colRef = collection(firestoreDb, 'sheets');
      const qRef = isAdminSession ? colRef : query(colRef, where('published', '==', true));
      const unsub = onSnapshot(qRef, (snap) => {
        const list: SheetItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SheetItem));
        list.sort((a, b) => a.referenceNumber - b.referenceNumber);
        if (isAdminSession) setStorageItem('sheets', list);
        onUpdate(courseId ? list.filter(s => s.courseId === courseId) : list);
      }, (err) => {
        console.warn("Sheets listener notice:", err);
        const local = getStorageItem<SheetItem[]>('sheets', defaultSheets);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<SheetItem[]>('sheets', defaultSheets);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      };
      load();
      const interval = setInterval(load, 1500);
      return () => clearInterval(interval);
    }
  },

  getAllSheetAnswerKeys: async (): Promise<Record<string, SheetAnswerKeyDoc>> => {
    const map: Record<string, SheetAnswerKeyDoc> = {};
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (isFirebaseSignedInAdmin()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'sheet_answer_keys'));
          const arr: SheetAnswerKeyDoc[] = [];
          snap.forEach(d => {
            const data = { sheetId: d.id, ...d.data() } as SheetAnswerKeyDoc;
            map[d.id] = data;
            arr.push(data);
          });
          setStorageItem('sheet_answer_keys', arr);
          return map;
        } catch (err) {
          console.warn('getAllSheetAnswerKeys notice:', err);
        }
      }
    }
    const local = getStorageItem<SheetAnswerKeyDoc[]>('sheet_answer_keys', []);
    local.forEach(k => { map[k.sheetId] = k; });
    return map;
  },

  getSheetAnswerKey: async (sheetId: string): Promise<SheetAnswerKeyDoc | null> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      try {
        const snap = await getDoc(doc(firestoreDb, 'sheet_answer_keys', sheetId));
        if (snap.exists()) {
          return { sheetId: snap.id, ...snap.data() } as SheetAnswerKeyDoc;
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied' || String(err?.message || '').includes('permission')) {
          throw new Error(formatCloudErrorMessage(err, 'نموذج الإجابة مغلق حالياً من قبل الإدارة.'));
        }
        console.warn('getSheetAnswerKey notice:', err);
      }
    }
    const local = getStorageItem<SheetAnswerKeyDoc[]>('sheet_answer_keys', []);
    return local.find(k => k.sheetId === sheetId) || null;
  },

  addSheet: async (sheet: Omit<SheetItem, 'id' | 'createdAt'>): Promise<SheetItem> => {
    checkAdminWrite('add_sheet', { sheet });
    await requireCloudWriteAuth(true);
    const newId = 'sheet_' + Date.now();
    const status = sheet.status || (sheet.published === false ? 'draft' : 'published');
    const item: SheetItem = {
      id: newId,
      ...sheet,
      status,
      published: status === 'published',
      createdAt: new Date().toISOString()
    };

    const publicPayload = stripSheetPublicFields(item);
    const answerKeyDoc = extractSheetAnswerKeyDoc(newId, item);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sheets', newId), sanitizeForFirestore(publicPayload));
        await setDoc(doc(firestoreDb, 'sheet_answer_keys', newId), sanitizeForFirestore(answerKeyDoc));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ الشيت في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    setStorageItem('sheets', [...current.filter(s => s.id !== newId), item]);
    const localKeys = getStorageItem<SheetAnswerKeyDoc[]>('sheet_answer_keys', []);
    setStorageItem('sheet_answer_keys', [...localKeys.filter(k => k.sheetId !== newId), answerKeyDoc]);
    return item;
  },

  updateSheet: async (id: string, patch: Partial<SheetItem>): Promise<void> => {
    checkAdminWrite('update_sheet', { id, patch });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    const prev = current.find(s => s.id === id);

    const normalizedPatch: Partial<SheetItem> = { ...patch, updatedAt: new Date().toISOString() };
    if (normalizedPatch.status !== undefined) {
      normalizedPatch.published = normalizedPatch.status === 'published';
    } else if (normalizedPatch.published !== undefined) {
      normalizedPatch.status = normalizedPatch.published ? 'published' : 'draft';
    }

    const publicPatch = stripSheetPublicFields(normalizedPatch);
    const firestorePublicPatch: Record<string, any> = {
      ...sanitizeForFirestore(publicPatch),
      modelAnswerUrl: deleteField(),
      modelAnswerText: deleteField()
    };

    const localKeys = getStorageItem<SheetAnswerKeyDoc[]>('sheet_answer_keys', []);
    const existingKey = localKeys.find(k => k.sheetId === id);
    const nextAnswerKey: SheetAnswerKeyDoc = {
      sheetId: id,
      modelAnswerUrl: normalizedPatch.modelAnswerUrl !== undefined ? normalizedPatch.modelAnswerUrl : (existingKey?.modelAnswerUrl ?? prev?.modelAnswerUrl ?? ''),
      modelAnswerText: normalizedPatch.modelAnswerText !== undefined ? normalizedPatch.modelAnswerText : (existingKey?.modelAnswerText ?? prev?.modelAnswerText ?? ''),
      showAnswersToStudents: normalizedPatch.showAnswersToStudents !== undefined ? normalizedPatch.showAnswersToStudents : Boolean(existingKey?.showAnswersToStudents ?? prev?.showAnswersToStudents),
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sheets', id), firestorePublicPatch, { merge: true });
        await setDoc(doc(firestoreDb, 'sheet_answer_keys', id), sanitizeForFirestore(nextAnswerKey), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث الشيت في قاعدة البيانات السحابية.'));
      }
    }

    const updatedItem = prev ? { ...prev, ...normalizedPatch } : null;
    setStorageItem('sheets', current.map(s => s.id === id ? { ...s, ...normalizedPatch } : s));
    setStorageItem('sheet_answer_keys', [...localKeys.filter(k => k.sheetId !== id), nextAnswerKey]);

    if (prev && updatedItem) {
      const oldUrls = extractMediaUrlsFromItem(prev);
      const newUrls = new Set(extractMediaUrlsFromItem(updatedItem));
      const removed = oldUrls.filter(u => !newUrls.has(u));
      if (removed.length > 0) cleanupUnreferencedMedia(removed, id).catch(() => {});
    }
  },

  deleteSheet: async (id: string): Promise<void> => {
    checkAdminWrite('delete_sheet', { id });
    await requireCloudWriteAuth(true);
    const current = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    const localKeys = getStorageItem<SheetAnswerKeyDoc[]>('sheet_answer_keys', []);
    let target = current.find(s => s.id === id);
    let targetKey = localKeys.find(k => k.sheetId === id);

    if (isFirebaseConfigured) {
      try {
        if (!target) {
          const snap = await getDoc(doc(firestoreDb, 'sheets', id));
          if (snap.exists()) target = { id: snap.id, ...snap.data() } as SheetItem;
        }
        if (!targetKey) {
          const kSnap = await getDoc(doc(firestoreDb, 'sheet_answer_keys', id));
          if (kSnap.exists()) targetKey = kSnap.data() as SheetAnswerKeyDoc;
        }
        await deleteDoc(doc(firestoreDb, 'sheets', id));
        await deleteDoc(doc(firestoreDb, 'sheet_answer_keys', id)).catch(() => {});
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف الشيت من قاعدة البيانات السحابية.'));
      }
    }

    setStorageItem('sheets', current.filter(s => s.id !== id));
    setStorageItem('sheet_answer_keys', localKeys.filter(k => k.sheetId !== id));
    const mediaToClean = [
      ...extractMediaUrlsFromItem(target),
      ...extractMediaUrlsFromItem(targetKey)
    ];
    if (mediaToClean.length > 0) {
      cleanupUnreferencedMedia(mediaToClean, id).catch(() => {});
    }
  },

  // --- Question Bank (بنك الأسئلة) ---
  getQuestionBank: async (courseId?: string): Promise<QuestionBankItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (canReadApprovedContentFromFirestore()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'question_bank'));
          const list: QuestionBankItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuestionBankItem));
          setStorageItem('question_bank', list);
          return courseId ? list.filter(q => q.courseId === courseId) : list;
        } catch (err) {
          console.warn("Firestore getQuestionBank notice:", err);
        }
      }
    }
    const local = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    return courseId ? local.filter(q => q.courseId === courseId) : local;
  },

  listenToQuestionBank: (onUpdate: (items: QuestionBankItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    onUpdate(courseId ? initial.filter(q => q.courseId === courseId) : initial);

    if (isFirebaseConfigured && canReadApprovedContentFromFirestore()) {
      const unsub = onSnapshot(collection(firestoreDb, 'question_bank'), (snap) => {
        const list: QuestionBankItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuestionBankItem));
        setStorageItem('question_bank', list);
        onUpdate(courseId ? list.filter(q => q.courseId === courseId) : list);
      }, (err) => {
        console.warn("QuestionBank listener notice:", err);
        const local = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
        onUpdate(courseId ? local.filter(q => q.courseId === courseId) : local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
        onUpdate(courseId ? local.filter(q => q.courseId === courseId) : local);
      };
      load();
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  },

  addQuestionBankItem: async (item: Omit<QuestionBankItem, 'id' | 'createdAt'>): Promise<QuestionBankItem> => {
    checkAdminWrite('add_question_bank', { item });
    await requireCloudWriteAuth(true);
    const newId = 'qb_' + Date.now();
    const fullItem: QuestionBankItem = {
      id: newId,
      ...item,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'question_bank', newId), sanitizeForFirestore(fullItem));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ السؤال في بنك الأسئلة.'));
      }
    }

    const current = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    const updated = [...current.filter(q => q.id !== newId), fullItem];
    setStorageItem('question_bank', updated);
    return fullItem;
  },

  updateQuestionBankItem: async (id: string, patch: Partial<QuestionBankItem>): Promise<void> => {
    checkAdminWrite('update_question_bank', { id, patch });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'question_bank', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث السؤال في بنك الأسئلة.'));
      }
    }
    const current = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    const updated = current.map(q => q.id === id ? { ...q, ...patch } : q);
    setStorageItem('question_bank', updated);
  },

  deleteQuestionBankItem: async (id: string): Promise<void> => {
    checkAdminWrite('delete_question_bank', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'question_bank', id));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف السؤال من بنك الأسئلة.'));
      }
    }
    const current = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    setStorageItem('question_bank', current.filter(q => q.id !== id));
  },

  // --- Online Exam Submissions (تسليمات الامتحانات ونتائج الطلاب) ---
  submitExamResult: async (submission: Omit<ExamSubmission, 'id' | 'submittedAt'>): Promise<ExamSubmission> => {
    await requireCloudWriteAuth(false);
    const newId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const item: ExamSubmission = {
      id: newId,
      ...submission,
      submittedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exam_submissions', newId), sanitizeForFirestore(item));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ إجابات الامتحان في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
    const updated = [item, ...current.filter(s => s.id !== newId)];
    setStorageItem('exam_submissions', updated);
    return item;
  },

  getExamSubmissions: async (examId?: string, studentId?: string): Promise<ExamSubmission[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (firebaseAuth?.currentUser) {
        try {
          const effectiveStudentId = isAdminEmail(firebaseAuth.currentUser.email || '')
            ? studentId
            : (studentId || firebaseAuth.currentUser.uid);
          const colRef = collection(firestoreDb, 'exam_submissions');
          const qRef = effectiveStudentId
            ? query(colRef, where('studentId', '==', effectiveStudentId))
            : colRef;
          const snap = await getDocs(qRef);
          const list: ExamSubmission[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExamSubmission));
          list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          if (!effectiveStudentId) setStorageItem('exam_submissions', list);
          let res = list;
          if (examId) res = res.filter(s => s.examId === examId);
          if (effectiveStudentId) res = res.filter(s => s.studentId === effectiveStudentId);
          return res;
        } catch (err) {
          console.warn("Firestore getExamSubmissions notice:", err);
        }
      }
    }
    let local = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
    if (examId) local = local.filter(s => s.examId === examId);
    if (studentId) local = local.filter(s => s.studentId === studentId);
    return local;
  },

  listenToExamSubmissions: (onUpdate: (subs: ExamSubmission[]) => void, examId?: string, studentId?: string) => {
    const filterList = (items: ExamSubmission[]) => {
      let res = items;
      if (examId) res = res.filter(s => s.examId === examId);
      if (studentId) res = res.filter(s => s.studentId === studentId);
      return res;
    };
    const initial = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
    onUpdate(filterList(initial));

    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      const effectiveStudentId = isAdminEmail(firebaseAuth.currentUser.email || '')
        ? studentId
        : (studentId || firebaseAuth.currentUser.uid);
      const colRef = collection(firestoreDb, 'exam_submissions');
      const qRef = effectiveStudentId
        ? query(colRef, where('studentId', '==', effectiveStudentId))
        : colRef;
      const unsub = onSnapshot(qRef, (snap) => {
        const list: ExamSubmission[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExamSubmission));
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        if (!effectiveStudentId) setStorageItem('exam_submissions', list);
        onUpdate(filterList(list));
      }, (err) => {
        console.warn("ExamSubmissions listener notice:", err);
        const local = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
        onUpdate(filterList(local));
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
        onUpdate(filterList(local));
      };
      load();
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  },

  updateExamSubmission: async (id: string, patch: Partial<ExamSubmission>): Promise<void> => {
    checkAdminWrite('update_exam_submission', { id, patch });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exam_submissions', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث درجة الامتحان في قاعدة البيانات.'));
      }
    }
    const current = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
    const updated = current.map(s => s.id === id ? { ...s, ...patch } : s);
    setStorageItem('exam_submissions', updated);
  },

  // --- Sheet Submissions (تسليمات وتقييم الشيتات الجامعية) ---
  submitSheetSolution: async (submission: Omit<SheetSubmission, 'id' | 'submittedAt'>): Promise<SheetSubmission> => {
    await requireCloudWriteAuth(false);
    const newId = 'sheetsub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const item: SheetSubmission = {
      id: newId,
      ...submission,
      submittedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sheet_submissions', newId), sanitizeForFirestore(item));
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تسليم حل الشيت إلى قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<SheetSubmission[]>('sheet_submissions', []);
    setStorageItem('sheet_submissions', [item, ...current.filter(s => s.id !== newId)]);
    return item;
  },

  gradeSheetSubmission: async (id: string, score: number | undefined, feedback: string, gradedBy: string): Promise<void> => {
    checkAdminWrite('grade_sheet_submission', { id, score, feedback });
    await requireCloudWriteAuth(true);
    const patch: Partial<SheetSubmission> = {
      status: 'graded',
      score,
      feedback,
      gradedBy,
      gradedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sheet_submissions', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ تقييم الشيت في قاعدة البيانات السحابية.'));
      }
    }

    const current = getStorageItem<SheetSubmission[]>('sheet_submissions', []);
    setStorageItem('sheet_submissions', current.map(s => s.id === id ? { ...s, ...patch } : s));
  },

  listenToSheetSubmissions: (onUpdate: (subs: SheetSubmission[]) => void, sheetId?: string, studentId?: string) => {
    const filterList = (items: SheetSubmission[]) => {
      let res = items;
      if (sheetId) res = res.filter(s => s.sheetId === sheetId);
      if (studentId) res = res.filter(s => s.studentId === studentId);
      return res;
    };
    const initial = getStorageItem<SheetSubmission[]>('sheet_submissions', []);
    onUpdate(filterList(initial));

    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      const effectiveStudentId = isAdminEmail(firebaseAuth.currentUser.email || '')
        ? studentId
        : (studentId || firebaseAuth.currentUser.uid);
      const colRef = collection(firestoreDb, 'sheet_submissions');
      const qRef = effectiveStudentId
        ? query(colRef, where('studentId', '==', effectiveStudentId))
        : colRef;
      const unsub = onSnapshot(qRef, (snap) => {
        const list: SheetSubmission[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SheetSubmission));
        list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        if (!effectiveStudentId) setStorageItem('sheet_submissions', list);
        onUpdate(filterList(list));
      }, (err) => {
        console.warn("SheetSubmissions listener notice:", err);
        const local = getStorageItem<SheetSubmission[]>('sheet_submissions', []);
        onUpdate(filterList(local));
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<SheetSubmission[]>('sheet_submissions', []);
        onUpdate(filterList(local));
      };
      load();
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  },

  // --- Schedule (جدول المحاضرات والسكاشن) ---
  getSchedule: async (courseId?: string): Promise<ScheduleItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (canReadApprovedContentFromFirestore()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'schedule'));
          const list: ScheduleItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScheduleItem));
          setStorageItem('schedule', list);
          return courseId ? list.filter(s => s.courseId === courseId) : list;
        } catch (err) {
          console.warn("Firestore getSchedule notice:", err);
        }
      }
    }
    const local = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    return courseId ? local.filter(s => s.courseId === courseId) : local;
  },

  listenToSchedule: (onUpdate: (items: ScheduleItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    onUpdate(courseId ? initial.filter(s => s.courseId === courseId) : initial);

    if (isFirebaseConfigured && canReadApprovedContentFromFirestore()) {
      const unsub = onSnapshot(collection(firestoreDb, 'schedule'), (snap) => {
        const list: ScheduleItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScheduleItem));
        setStorageItem('schedule', list);
        onUpdate(courseId ? list.filter(s => s.courseId === courseId) : list);
      }, (err) => {
        console.warn("Schedule listener notice:", err);
        const local = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      };
      load();
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  },

  addScheduleItem: async (item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> => {
    checkAdminWrite('add_schedule', { item });
    await requireCloudWriteAuth(true);
    const newId = 'sch_' + Date.now();
    const fullItem: ScheduleItem = {
      id: newId,
      ...item
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'schedule', newId), sanitizeForFirestore(fullItem));
      } catch (e: any) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حفظ موعد الجدول في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    const updated = [...current.filter(s => s.id !== newId), fullItem];
    setStorageItem('schedule', updated);
    return fullItem;
  },

  updateScheduleItem: async (id: string, patch: Partial<ScheduleItem>): Promise<void> => {
    checkAdminWrite('update_schedule', { id, patch });
    await requireCloudWriteAuth(true);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'schedule', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e: any) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر تحديث موعد الجدول في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    const updated = current.map(s => s.id === id ? { ...s, ...patch } : s);
    setStorageItem('schedule', updated);
  },

  deleteScheduleItem: async (id: string): Promise<void> => {
    checkAdminWrite('delete_schedule', { id });
    await requireCloudWriteAuth(true);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'schedule', id));
      } catch (e: any) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف موعد الجدول من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    setStorageItem('schedule', current.filter(s => s.id !== id));
  },

  // --- Student Inquiries & Q&A (استفسارات وأسئلة الطلاب) ---
  getInquiries: async (studentId?: string): Promise<StudentInquiry[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (firebaseAuth?.currentUser) {
        try {
          const effectiveStudentId = isAdminEmail(firebaseAuth.currentUser.email || '')
            ? studentId
            : (studentId || firebaseAuth.currentUser.uid);
          const colRef = collection(firestoreDb, 'inquiries');
          const qRef = effectiveStudentId
            ? query(colRef, where('studentId', '==', effectiveStudentId))
            : colRef;
          const snap = await getDocs(qRef);
          const list: StudentInquiry[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as StudentInquiry));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (!effectiveStudentId) setStorageItem('inquiries', list);
          return effectiveStudentId ? list.filter(i => i.studentId === effectiveStudentId) : list;
        } catch (err) {
          console.warn("Firestore getInquiries notice:", err);
        }
      }
    }
    const local = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    return studentId ? local.filter(i => i.studentId === studentId) : local;
  },

  listenToInquiries: (onUpdate: (inquiries: StudentInquiry[]) => void, studentId?: string) => {
    const filterList = (items: StudentInquiry[]) => {
      let res = items;
      if (studentId) res = res.filter(i => i.studentId === studentId);
      return res;
    };
    const initial = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    onUpdate(filterList(initial));

    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      const effectiveStudentId = isAdminEmail(firebaseAuth.currentUser.email || '')
        ? studentId
        : (studentId || firebaseAuth.currentUser.uid);
      const colRef = collection(firestoreDb, 'inquiries');
      const qRef = effectiveStudentId
        ? query(colRef, where('studentId', '==', effectiveStudentId))
        : colRef;
      const unsub = onSnapshot(qRef, (snap) => {
        const list: StudentInquiry[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as StudentInquiry));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!effectiveStudentId) setStorageItem('inquiries', list);
        onUpdate(filterList(list));
      }, (err) => {
        console.warn("Inquiries listener notice:", err);
        const local = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
        onUpdate(filterList(local));
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
        onUpdate(filterList(local));
      };
      load();
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  },

  submitInquiry: async (inquiry: Omit<StudentInquiry, 'id' | 'createdAt' | 'status'>): Promise<StudentInquiry> => {
    await requireCloudWriteAuth(false);
    const newId = 'inq_' + Date.now();
    const effectiveStudentId = (isFirebaseConfigured && firebaseAuth?.currentUser?.uid)
      ? firebaseAuth.currentUser.uid
      : inquiry.studentId;
    const item: StudentInquiry = {
      id: newId,
      ...inquiry,
      studentId: effectiveStudentId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'inquiries', newId), sanitizeForFirestore(item));
      } catch (e: any) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر إرسال الاستفسار إلى قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    const updated = [item, ...current.filter(i => i.id !== newId)];
    setStorageItem('inquiries', updated);
    return item;
  },

  replyToInquiry: async (id: string, reply: string, adminName: string = 'Eng/Mohamed abdal tawab'): Promise<void> => {
    checkAdminWrite('reply_inquiry', { id, reply });
    await requireCloudWriteAuth(true);
    const patch: Partial<StudentInquiry> = {
      reply,
      repliedBy: adminName,
      repliedAt: new Date().toISOString(),
      status: 'answered'
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'inquiries', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e: any) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر إرسال الرد على الاستفسار في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    const updated = current.map(i => i.id === id ? { ...i, ...patch } : i);
    setStorageItem('inquiries', updated);
  },

  deleteInquiry: async (id: string): Promise<void> => {
    checkAdminWrite('delete_inquiry', { id });
    await requireCloudWriteAuth(true);

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'inquiries', id));
      } catch (e: any) {
        throw new Error(formatCloudErrorMessage(e, 'تعذر حذف الاستفسار من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    setStorageItem('inquiries', current.filter(i => i.id !== id));
  },

  // --- Activity Logs (سجل العمليات والتدقيق الإداري) ---
  getActivityLogs: async (): Promise<ActivityLogItem[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (isFirebaseSignedInAdmin()) {
        try {
          const snap = await getDocs(collection(firestoreDb, 'activity_logs'));
          const list: ActivityLogItem[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as ActivityLogItem));
          list.sort((a, b) => b.timestamp - a.timestamp);
          setStorageItem('activity_logs', list);
          return list;
        } catch (err) {
          console.warn("Firestore getActivityLogs notice:", err);
        }
      }
    }
    return getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
  },

  listenToActivityLogs: (onUpdate: (logs: ActivityLogItem[]) => void) => {
    const initial = getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
    onUpdate(initial);

    if (isFirebaseConfigured && isFirebaseSignedInAdmin()) {
      const unsub = onSnapshot(collection(firestoreDb, 'activity_logs'), (snap) => {
        const list: ActivityLogItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ActivityLogItem));
        list.sort((a, b) => b.timestamp - a.timestamp);
        setStorageItem('activity_logs', list);
        onUpdate(list);
      }, (err) => {
        console.warn("ActivityLogs listener notice:", err);
        const local = getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
        onUpdate(local);
      });
      return () => unsub();
    } else if (isFirebaseConfigured) {
      return () => {};
    } else {
      const load = () => {
        const local = getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
        onUpdate(local);
      };
      load();
      const interval = setInterval(load, 3000);
      return () => clearInterval(interval);
    }
  },

  logActivity: async (
    adminEmail: string,
    adminName: string,
    action: ActivityLogItem['action'],
    targetType: ActivityLogItem['targetType'],
    targetTitle: string,
    details?: string
  ): Promise<void> => {
    const newId = 'act_' + Date.now();
    const logItem: ActivityLogItem = {
      id: newId,
      adminEmail,
      adminName,
      action,
      targetType,
      targetTitle,
      details,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    const current = getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
    const updated = [logItem, ...current];
    setStorageItem('activity_logs', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'activity_logs', newId), sanitizeForFirestore(logItem));
      } catch (e) {
        console.warn("logActivity notice:", e);
      }
    }
  },

  // --- Student Progress & Bookmarks (تتبع التقدم والمفضلة) ---
  toggleBookmarkLecture: async (studentId: string, lectureId: string): Promise<string[]> => {
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const user = users.find(u => u.id === studentId || u.uid === studentId);
    let favorites: string[] = user?.favorites || user?.bookmarkedLectureIds || [];
    if (favorites.includes(lectureId)) {
      favorites = favorites.filter(id => id !== lectureId);
    } else {
      favorites = [...favorites, lectureId];
    }
    await authService.updateUserProfile(studentId, { favorites, bookmarkedLectureIds: favorites });
    return favorites;
  },

  toggleWatchedContent: async (studentId: string, contentId: string): Promise<string[]> => {
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const user = users.find(u => u.id === studentId || u.uid === studentId);
    let watched: string[] = user?.watchedLessonIds || [];
    if (watched.includes(contentId)) {
      watched = watched.filter(id => id !== contentId);
    } else {
      watched = [...watched, contentId];
    }
    await authService.updateUserProfile(studentId, { watchedLessonIds: watched });
    return watched;
  },

  // --- Students ---
  getStudents: async (): Promise<Student[]> => {
    if (isFirebaseConfigured) {
      const isAdm = await isVerifiedFirebaseAdmin();
      if (!isAdm) {
        return getStorageItem<Student[]>('students', defaultStudents);
      }
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
            name: data.name || 'طالب تكنولوجيا المعلومات',
            email: email,
            phone: data.phone || '',
            purchasedCourseIds: data.purchasedCourseIds || [],
            watchedLessonIds: data.watchedLessonIds || [],
            quizGrades: data.quizGrades || {},
            enrollmentDate: (data.createdAt || data.enrollmentDate || '').split('T')[0] || new Date().toISOString().split('T')[0],
            status: normalizedStatus as any,
            subscription: data.subscription || { active: false, expiresAt: '' },
            department: data.department || 'general',
            grade: data.grade || 'year1',
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
      if (!firebaseAuth?.currentUser || !isAdminEmail(firebaseAuth.currentUser.email || '')) {
        onUpdate(getStorageItem<Student[]>('students', defaultStudents));
        return () => {};
      }
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
            name: item.name || 'طالب تكنولوجيا المعلومات',
            email: email,
            phone: item.phone || '',
            purchasedCourseIds: item.purchasedCourseIds || [],
            watchedLessonIds: item.watchedLessonIds || [],
            quizGrades: item.quizGrades || {},
            enrollmentDate: (item.createdAt || item.enrollmentDate || '').split('T')[0] || new Date().toISOString().split('T')[0],
            status: normalizedStatus as any,
            subscription: item.subscription || { active: false, expiresAt: '' },
            department: item.department || 'general',
            grade: item.grade || 'year1',
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
    checkAdminWrite('add_student', { student });
    await requireCloudWriteAuth(true);
    const targetEmail = student.email ? student.email.trim().toLowerCase() : '';
    const resolvedStatus = student.status || 'active';
    const resolvedApproved = resolvedStatus === 'active';

    if (targetEmail && isFirebaseConfigured) {
      try {
        const qUsers = query(collection(firestoreDb, 'users'), where('email', '==', targetEmail));
        const uSnap = await getDocs(qUsers);
        if (!uSnap.empty) {
          const existingId = uSnap.docs[0].id;
          await dbService.updateStudent(existingId, { ...student, status: resolvedStatus, isApproved: resolvedApproved } as any);
          return { id: existingId, uid: existingId, ...uSnap.docs[0].data(), ...student, status: resolvedStatus, isApproved: resolvedApproved } as Student;
        }
        const qStuds = query(collection(firestoreDb, 'students'), where('email', '==', targetEmail));
        const sSnap = await getDocs(qStuds);
        if (!sSnap.empty) {
          const existingId = sSnap.docs[0].id;
          await dbService.updateStudent(existingId, { ...student, status: resolvedStatus, isApproved: resolvedApproved } as any);
          return { id: existingId, uid: existingId, ...sSnap.docs[0].data(), ...student, status: resolvedStatus, isApproved: resolvedApproved } as Student;
        }
      } catch (e) {
        console.warn("Existing student lookup notice:", e);
      }
    }

    const newId = 'stud_' + Date.now();
    const nowIso = new Date().toISOString();
    const newStudent: Student = {
      id: newId,
      uid: newId,
      ...student,
      email: targetEmail || student.email,
      status: resolvedStatus,
      isApproved: resolvedApproved,
      enrollmentDate: nowIso.split('T')[0],
      createdAt: nowIso
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'students', newId), sanitizeForFirestore(newStudent));
        if (resolvedStatus === 'pending') {
          await setDoc(doc(firestoreDb, 'registrations', newId), sanitizeForFirestore(newStudent)).catch(() => {});
          await setDoc(doc(firestoreDb, 'studentRequests', newId), sanitizeForFirestore(newStudent)).catch(() => {});
        }
        const userDocData = sanitizeForFirestore({
          uid: newId,
          id: newId,
          name: student.name,
          email: targetEmail || student.email,
          phone: student.phone || '',
          role: 'student',
          status: resolvedStatus,
          isApproved: resolvedApproved,
          department: student.department || 'general',
          grade: student.grade || 'year1',
          createdAt: nowIso,
          purchasedCourseIds: student.purchasedCourseIds || []
        });
        await setDoc(doc(firestoreDb, 'users', newId), userDocData, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إضافة الطالب في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Student[]>('students', defaultStudents);
    current.push(newStudent);
    setStorageItem('students', current);
    return newStudent;
  },

  updateStudent: async (id: string, student: Partial<Student>): Promise<void> => {
    checkAdminWrite('update_student', { id, student });
    await requireCloudWriteAuth(true);
    const normalizedStudent: Partial<Student> = { ...student };
    if (normalizedStudent.status === 'active') {
      normalizedStudent.isApproved = true;
    } else if (
      normalizedStudent.status === 'rejected' ||
      normalizedStudent.status === 'suspended' ||
      normalizedStudent.status === 'pending'
    ) {
      normalizedStudent.isApproved = false;
    }
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'students', id), sanitizeForFirestore(normalizedStudent) as any, { merge: true });
        if (normalizedStudent.status === 'active' || normalizedStudent.status === 'rejected' || normalizedStudent.isApproved) {
          await deleteDoc(doc(firestoreDb, 'registrations', id)).catch(() => {});
          await deleteDoc(doc(firestoreDb, 'studentRequests', id)).catch(() => {});
        } else {
          await updateDoc(doc(firestoreDb, 'registrations', id), sanitizeForFirestore(normalizedStudent) as any).catch(() => {});
          await updateDoc(doc(firestoreDb, 'studentRequests', id), sanitizeForFirestore(normalizedStudent) as any).catch(() => {});
        }
        const userUpdates: Partial<UserAuth> = {};
        if (normalizedStudent.name !== undefined) userUpdates.name = normalizedStudent.name;
        if (normalizedStudent.email !== undefined) userUpdates.email = normalizedStudent.email.trim().toLowerCase();
        if (normalizedStudent.phone !== undefined) userUpdates.phone = normalizedStudent.phone;
        if (normalizedStudent.status !== undefined) userUpdates.status = normalizedStudent.status as any;
        if (normalizedStudent.isApproved !== undefined) userUpdates.isApproved = normalizedStudent.isApproved;
        if (normalizedStudent.grade !== undefined) userUpdates.grade = normalizedStudent.grade;
        if (normalizedStudent.department !== undefined) userUpdates.department = normalizedStudent.department;
        if (normalizedStudent.purchasedCourseIds !== undefined) userUpdates.purchasedCourseIds = normalizedStudent.purchasedCourseIds;
        if (Object.keys(userUpdates).length > 0) {
          await setDoc(doc(firestoreDb, 'users', id), sanitizeForFirestore(userUpdates) as any, { merge: true });
        }
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث بيانات الطالب في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Student[]>('students', defaultStudents);
    const updated = current.map(item => item.id === id ? { ...item, ...normalizedStudent } : item);
    setStorageItem('students', updated);
  },

  deleteStudent: async (id: string, email?: string): Promise<void> => {
    checkAdminWrite('delete_student', { id, email });
    await requireCloudWriteAuth(true);
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
        await deleteDoc(doc(firestoreDb, 'students', id));
        try {
          const uSnap = await getDoc(doc(firestoreDb, 'users', id));
          const uData = uSnap.exists() ? uSnap.data() : null;
          if (!uData || (uData.role !== 'admin' && uData.role !== 'teacher' && !isAdminEmail(uData.email || ''))) {
            await deleteDoc(doc(firestoreDb, 'users', id));
          }
        } catch (userDelErr: any) {
          const code = String(userDelErr?.code || '');
          if (code === 'permission-denied' || code === 'unauthenticated') throw userDelErr;
        }
        await deleteDoc(doc(firestoreDb, 'registrations', id)).catch(() => {});
        await deleteDoc(doc(firestoreDb, 'studentRequests', id)).catch(() => {});

        if (targetEmail) {
          const cols = ['students', 'users', 'registrations', 'studentRequests'];
          for (const colName of cols) {
            const qCol = query(collection(firestoreDb, colName), where('email', '==', targetEmail));
            const snap = await getDocs(qCol);
            for (const d of snap.docs) {
              if (colName === 'users') {
                const uData = d.data();
                if (uData.role === 'admin' || uData.role === 'teacher' || isAdminEmail(uData.email || '')) continue;
              }
              await deleteDoc(d.ref);
            }
          }
        }

        const orderCols = ['orders', 'courseRequests'];
        for (const colName of orderCols) {
          const qById = query(collection(firestoreDb, colName), where('studentId', '==', id));
          const snapId = await getDocs(qById);
          for (const d of snapId.docs) {
            const oData = d.data();
            if (oData.studentId && oData.courseId) {
              await deleteDoc(doc(firestoreDb, 'courseAccess', `${oData.studentId}_${oData.courseId}`)).catch(() => {});
            }
            await deleteDoc(d.ref);
          }
          if (targetEmail) {
            const qByEmail = query(collection(firestoreDb, colName), where('studentEmail', '==', targetEmail));
            const snapEmail = await getDocs(qByEmail);
            for (const d of snapEmail.docs) {
              const oData = d.data();
              if (oData.studentId && oData.courseId) {
                await deleteDoc(doc(firestoreDb, 'courseAccess', `${oData.studentId}_${oData.courseId}`)).catch(() => {});
              }
              await deleteDoc(d.ref);
            }
          }
        }

        try { await dbService.deleteStudentChat(id); } catch (e) {}
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الطالب من قاعدة البيانات السحابية.'));
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
    checkAdminWrite('clear_all_students', {});
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        const collectionsToWipe = ['students', 'registrations', 'studentRequests', 'orders', 'courseRequests', 'courseAccess', 'lessonAccess', 'certificates'];
        for (const colName of collectionsToWipe) {
          const snap = await getDocs(collection(firestoreDb, colName));
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        }

        const usersSnap = await getDocs(collection(firestoreDb, 'users'));
        for (const d of usersSnap.docs) {
          const uData = d.data();
          if (uData.role !== 'admin' && uData.role !== 'teacher' && !isAdminEmail(uData.email || '')) {
            await deleteDoc(d.ref);
          }
        }

        try {
          const chatsSnap = await getDocs(collection(firestoreDb, 'chats'));
          for (const d of chatsSnap.docs) {
            await dbService.deleteStudentChat(d.id).catch(() => {});
          }
        } catch (e) {}
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تصفير حسابات الطلاب في قاعدة البيانات السحابية.'));
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
    setStorageItem('chats', {});
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updatedUsers = users.filter(u => u.role === 'admin' || u.role === 'teacher' || isAdminEmail(u.email || ''));
    setStorageItem('users', updatedUsers);
    await dbService.forceLogoutAllUsers();
  },

  forceLogoutAllUsers: async (): Promise<void> => {
    checkAdminWrite('force_logout_all', {});
    await requireCloudWriteAuth(true);
    const nowTimestamp = Date.now();
    const currentSettings = await dbService.getSettings();
    const updatedSettings = { ...currentSettings, forceLogoutVersion: nowTimestamp };
    await dbService.updateSettings(updatedSettings);

    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        for (const d of snap.docs) {
          const uData = d.data() as UserAuth;
          if (uData.role !== 'admin' && !isAdminEmail(uData.email || '')) {
            await updateDoc(d.ref, { forceLogoutVersion: nowTimestamp });
          }
        }
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث جلسات تسجيل الخروج الجماعي في السحابة.'));
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
        const snap = await withFirestoreReadTimeout(getDocs(collection(firestoreDb, 'news')), 4500, 'getNews');
        const list: NewsItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as NewsItem));
        setStorageItem('news', list);
        return list;
      } catch (err: any) {
        const restNews = await runPublicCollectionQueryViaRest<NewsItem>('news').catch(() => null);
        if (restNews !== null) {
          setStorageItem('news', restNews);
          return restNews;
        }
        console.warn("Firebase news read notice, using fallback:", err?.message || err);
      }
    }
    return getStorageItem<NewsItem[]>('news', defaultNews);
  },

  addNews: async (newsItem: Omit<NewsItem, 'id' | 'date'>): Promise<NewsItem> => {
    checkAdminWrite('add_news', { newsItem });
    await requireCloudWriteAuth(true);
    const newId = 'news_' + Date.now();
    const newNews: NewsItem = {
      id: newId,
      ...newsItem,
      date: new Date().toISOString().split('T')[0]
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'news', newId), sanitizeForFirestore({ ...newsItem, date: newNews.date }));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إضافة الخبر في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<NewsItem[]>('news', defaultNews);
    current.push(newNews);
    setStorageItem('news', current);
    return newNews;
  },

  updateNews: async (id: string, newsItem: Partial<NewsItem>): Promise<void> => {
    checkAdminWrite('update_news', { id, newsItem });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'news', id), sanitizeForFirestore(newsItem) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث الخبر في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<NewsItem[]>('news', defaultNews);
    const updated = current.map(item => item.id === id ? { ...item, ...newsItem } : item);
    setStorageItem('news', updated);
  },

  deleteNews: async (id: string): Promise<void> => {
    checkAdminWrite('delete_news', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'news', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الخبر من قاعدة البيانات السحابية.'));
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
        const snap = await withFirestoreReadTimeout(getDocs(collection(firestoreDb, 'articles')), 4500, 'getArticles');
        const list: Article[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Article));
        setStorageItem('articles', list);
        return list;
      } catch (err: any) {
        const restArticles = await runPublicCollectionQueryViaRest<Article>('articles').catch(() => null);
        if (restArticles !== null) {
          setStorageItem('articles', restArticles);
          return restArticles;
        }
        console.warn("Firebase articles read notice, using fallback:", err?.message || err);
      }
    }
    return getStorageItem<Article[]>('articles', defaultArticles);
  },

  addArticle: async (article: Omit<Article, 'id' | 'date'>): Promise<Article> => {
    checkAdminWrite('add_article', { article });
    await requireCloudWriteAuth(true);
    const newId = 'art_' + Date.now();
    const newArticle: Article = {
      id: newId,
      ...article,
      date: new Date().toISOString().split('T')[0]
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'articles', newId), sanitizeForFirestore({ ...article, date: newArticle.date }));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر نشر المقال في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Article[]>('articles', defaultArticles);
    current.push(newArticle);
    setStorageItem('articles', current);
    return newArticle;
  },

  updateArticle: async (id: string, article: Partial<Article>): Promise<void> => {
    checkAdminWrite('update_article', { id, article });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'articles', id), sanitizeForFirestore(article) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث المقال في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Article[]>('articles', defaultArticles);
    const updated = current.map(item => item.id === id ? { ...item, ...article } : item);
    setStorageItem('articles', updated);
  },

  deleteArticle: async (id: string): Promise<void> => {
    checkAdminWrite('delete_article', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'articles', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف المقال من قاعدة البيانات السحابية.'));
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
        const snap = await withFirestoreReadTimeout(getDocs(collection(firestoreDb, 'reviews')), 4500, 'getReviews');
        const list: UserReview[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as UserReview));
        setStorageItem('reviews', list);
        return list;
      } catch (err: any) {
        const restReviews = await runPublicCollectionQueryViaRest<UserReview>('reviews').catch(() => null);
        if (restReviews !== null) {
          setStorageItem('reviews', restReviews);
          return restReviews;
        }
        console.warn("Firebase reviews read notice, using fallback:", err?.message || err);
      }
    }
    return getStorageItem<UserReview[]>('reviews', defaultReviews);
  },

  addReview: async (review: Omit<UserReview, 'id' | 'date'>): Promise<UserReview> => {
    await requireCloudWriteAuth(false);
    const newId = 'rev_' + Date.now();
    const newReview: UserReview = {
      id: newId,
      ...review,
      date: new Date().toISOString().split('T')[0]
    };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'reviews', newId), sanitizeForFirestore({ ...review, date: newReview.date }));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إرسال التقييم إلى قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<UserReview[]>('reviews', defaultReviews);
    current.push(newReview);
    setStorageItem('reviews', current);
    return newReview;
  },

  updateReview: async (id: string, review: Partial<UserReview>): Promise<void> => {
    checkAdminWrite('update_review', { id, review });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'reviews', id), sanitizeForFirestore(review) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث التقييم في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<UserReview[]>('reviews', defaultReviews);
    const updated = current.map(item => item.id === id ? { ...item, ...review } : item);
    setStorageItem('reviews', updated);
  },

  deleteReview: async (id: string): Promise<void> => {
    checkAdminWrite('delete_review', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'reviews', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف التقييم من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<UserReview[]>('reviews', defaultReviews);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('reviews', updated);
  },

  // --- Messages ---
  getMessages: async (): Promise<Message[]> => {
    if (isFirebaseConfigured) {
      const isAdm = await isVerifiedFirebaseAdmin();
      if (!isAdm) {
        return getStorageItem<Message[]>('messages', defaultMessages);
      }
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
      if (!firebaseAuth?.currentUser || !isAdminEmail(firebaseAuth.currentUser.email || '')) {
        onUpdate(getStorageItem<Message[]>('messages', defaultMessages));
        return () => {};
      }
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
    checkAdminWrite('update_message', { id, message });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'messages', id), sanitizeForFirestore(message) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث حالة الرسالة في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Message[]>('messages', defaultMessages);
    const updated = current.map(item => item.id === id ? { ...item, ...message } : item);
    setStorageItem('messages', updated);
  },

  deleteMessage: async (id: string): Promise<void> => {
    checkAdminWrite('delete_message', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'messages', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الرسالة من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Message[]>('messages', defaultMessages);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('messages', updated);
  },

  // --- Admins ---
  getAdmins: async (): Promise<Admin[]> => {
    if (isFirebaseConfigured) {
      const isAdm = await isVerifiedFirebaseAdmin();
      if (!isAdm) {
        return getStorageItem<Admin[]>('admins', defaultAdmins);
      }
      try {
        const snap = await getDocs(collection(firestoreDb, 'admins'));
        const list: Admin[] = [];
        snap.forEach(d => {
          const data = d.data() as Omit<Admin, 'id'>;
          list.push({ id: d.id, ...data, email: (data.email || d.id).trim().toLowerCase() });
        });
        syncWhitelistedAdminEmails(list.map(a => a.email));
        setStorageItem('admins', list);
        return list;
      } catch (err) {
        console.warn("Firebase admins read fallback:", err);
      }
    }
    const localList = getStorageItem<Admin[]>('admins', defaultAdmins);
    syncWhitelistedAdminEmails(localList.map(a => a.email));
    return localList;
  },

  addAdmin: async (admin: Omit<Admin, 'id'>): Promise<Admin> => {
    const cleanEmail = (admin.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('يرجى إدخال البريد الإلكتروني للمسؤول.');
    }
    const resolvedRole: 'super' | 'editor' = isSuperAdminEmail(cleanEmail) ? 'super' : (admin.role || 'editor');
    const cleanName = (admin.name || '').trim() || cleanEmail.split('@')[0];
    const newAdmin: Admin = {
      id: cleanEmail,
      name: cleanName,
      email: cleanEmail,
      role: resolvedRole
    };
    if (isFirebaseConfigured) {
      await setDoc(doc(firestoreDb, 'admins', cleanEmail), {
        name: cleanName,
        email: cleanEmail,
        role: resolvedRole,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
    addWhitelistedAdminEmail(cleanEmail);
    const current = getStorageItem<Admin[]>('admins', defaultAdmins);
    const filtered = current.filter(item => item.email.trim().toLowerCase() !== cleanEmail && item.id !== cleanEmail);
    filtered.push(newAdmin);
    setStorageItem('admins', filtered);
    return newAdmin;
  },

  updateAdmin: async (id: string, admin: Partial<Admin>): Promise<void> => {
    checkAdminWrite('update_admin', { id, admin });
    await requireCloudWriteAuth(true);
    const cleanId = id.trim().toLowerCase();
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'admins', id), sanitizeForFirestore(admin) as any, { merge: true });
        if (cleanId !== id) {
          await setDoc(doc(firestoreDb, 'admins', cleanId), sanitizeForFirestore(admin) as any, { merge: true }).catch(() => {});
        }
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث بيانات المسؤول في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Admin[]>('admins', defaultAdmins);
    const updated = current.map(item => item.id === id ? { ...item, ...admin } : item);
    setStorageItem('admins', updated);
  },

  deleteAdmin: async (id: string, email?: string): Promise<void> => {
    const cleanEmail = (email || (id.includes('@') ? id : '')).trim().toLowerCase();
    if (isSuperAdminEmail(cleanEmail) || isSuperAdminEmail(id)) {
      throw new Error('لا يمكن حذف حساب المدير العام الرئيسي.');
    }
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'admins', id));
        if (cleanEmail && cleanEmail !== id) {
          await deleteDoc(doc(firestoreDb, 'admins', cleanEmail)).catch(() => {});
        }
      } catch (err) {
        console.error("Firebase admin delete failed:", err);
        throw err;
      }
    }
    if (cleanEmail) {
      removeWhitelistedAdminEmail(cleanEmail);
    }
    const current = getStorageItem<Admin[]>('admins', defaultAdmins);
    const updated = current.filter(item => item.id !== id && (!cleanEmail || item.email.trim().toLowerCase() !== cleanEmail));
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
    checkAdminWrite('add_teacher', { teacher });
    await requireCloudWriteAuth(true);
    const newId = 'teach_' + Date.now();
    const newTeacher: Teacher = { id: newId, ...teacher };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'teachers', newId), sanitizeForFirestore(teacher));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إضافة المشرف الأكاديمي في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Teacher[]>('teachers', defaultTeachers);
    current.push(newTeacher);
    setStorageItem('teachers', current);
    return newTeacher;
  },

  updateTeacher: async (id: string, teacher: Partial<Teacher>): Promise<void> => {
    checkAdminWrite('update_teacher', { id, teacher });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'teachers', id), sanitizeForFirestore(teacher) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث بيانات المشرف في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Teacher[]>('teachers', defaultTeachers);
    const updated = current.map(item => item.id === id ? { ...item, ...teacher } : item);
    setStorageItem('teachers', updated);
  },

  deleteTeacher: async (id: string): Promise<void> => {
    checkAdminWrite('delete_teacher', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'teachers', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف المشرف من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Teacher[]>('teachers', defaultTeachers);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('teachers', updated);
  },

  // --- Coupons ---
  getCoupons: async (): Promise<Coupon[]> => {
    if (isFirebaseConfigured) {
      const isAdm = await isVerifiedFirebaseAdmin();
      if (!isAdm) {
        return getStorageItem<Coupon[]>('coupons', defaultCoupons);
      }
      try {
        const snap = await getDocs(collection(firestoreDb, 'coupons'));
        const list: Coupon[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Coupon));
        return list;
      } catch (err) {
        console.warn("Firebase coupons read fallback:", err);
      }
    }
    return getStorageItem<Coupon[]>('coupons', defaultCoupons);
  },

  addCoupon: async (coupon: Omit<Coupon, 'id'>): Promise<Coupon> => {
    checkAdminWrite('add_coupon', { coupon });
    await requireCloudWriteAuth(true);
    const newId = 'coup_' + Date.now();
    const newCoupon: Coupon = { id: newId, ...coupon };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'coupons', newId), sanitizeForFirestore(coupon));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إضافة الكوبون في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Coupon[]>('coupons', defaultCoupons);
    current.push(newCoupon);
    setStorageItem('coupons', current);
    return newCoupon;
  },

  updateCoupon: async (id: string, coupon: Partial<Coupon>): Promise<void> => {
    checkAdminWrite('update_coupon', { id, coupon });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'coupons', id), sanitizeForFirestore(coupon) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث الكوبون في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Coupon[]>('coupons', defaultCoupons);
    const updated = current.map(item => item.id === id ? { ...item, ...coupon } : item);
    setStorageItem('coupons', updated);
  },

  deleteCoupon: async (id: string): Promise<void> => {
    checkAdminWrite('delete_coupon', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'coupons', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الكوبون من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Coupon[]>('coupons', defaultCoupons);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('coupons', updated);
  },

  // --- Orders ---
  getOrders: async (studentId?: string): Promise<Order[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<Order[]>('orders', defaultOrders);
        return studentId ? local.filter(o => o.studentId === studentId) : local;
      }
      try {
        const isAdm = await isVerifiedFirebaseAdmin();
        const effectiveStudentId = isAdm ? studentId : firebaseAuth.currentUser.uid;

        const ordersRef = collection(firestoreDb, 'orders');
        const ordersQuery = effectiveStudentId
          ? query(ordersRef, where('studentId', '==', effectiveStudentId))
          : ordersRef;
        const snap = await getDocs(ordersQuery);
        const list: Order[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order));
        try {
          const reqsRef = collection(firestoreDb, 'courseRequests');
          const reqsQuery = effectiveStudentId
            ? query(reqsRef, where('studentId', '==', effectiveStudentId))
            : reqsRef;
          const reqSnap = await getDocs(reqsQuery);
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
    const local = getStorageItem<Order[]>('orders', defaultOrders);
    return studentId ? local.filter(o => o.studentId === studentId) : local;
  },

  listenToOrders: (onUpdate: (orders: Order[]) => void, studentId?: string): (() => void) => {
    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<Order[]>('orders', defaultOrders);
        onUpdate(studentId ? local.filter(o => o.studentId === studentId) : local);
        return () => {};
      }
      const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
      const effectiveStudentId = isAdm ? studentId : firebaseAuth.currentUser.uid;

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

      const ordersRef = collection(firestoreDb, 'orders');
      const ordersQuery = effectiveStudentId
        ? query(ordersRef, where('studentId', '==', effectiveStudentId))
        : ordersRef;
      const unsub1 = onSnapshot(ordersQuery, (snap) => {
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
        const reqsRef = collection(firestoreDb, 'courseRequests');
        const reqsQuery = effectiveStudentId
          ? query(reqsRef, where('studentId', '==', effectiveStudentId))
          : reqsRef;
        unsub2 = onSnapshot(reqsQuery, (snap) => {
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
        onUpdate(studentId ? local.filter(o => o.studentId === studentId) : local);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 1500);
      return () => clearInterval(interval);
    }
  },

  getSubscriptions: async (studentId?: string): Promise<Order[]> => {
    return dbService.getOrders(studentId);
  },

  listenToSubscriptions: (onUpdate: (subscriptions: Order[]) => void, studentId?: string): (() => void) => {
    return dbService.listenToOrders(onUpdate, studentId);
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
    if (isFirebaseConfigured && firebaseAuth?.currentUser && !isAdminEmail(firebaseAuth.currentUser.email || '')) {
      resolvedStudentId = firebaseAuth.currentUser.uid;
    } else if (cleanEmail && isFirebaseConfigured && firebaseAuth?.currentUser && isAdminEmail(firebaseAuth.currentUser.email || '')) {
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
    checkAdminWrite('update_order', { id, order });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        const cleanOrder = sanitizeForFirestore(order);
        await setDoc(doc(firestoreDb, 'orders', id), cleanOrder as any, { merge: true });
        await setDoc(doc(firestoreDb, 'courseRequests', id), cleanOrder as any, { merge: true }).catch(() => {});
        if (order.status === 'completed' || order.status === 'approved' || order.status === 'rejected') {
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
        }
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث حالة الاشتراك في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Order[]>('orders', defaultOrders);
    const updated = current.map(item => item.id === id ? { ...item, ...order } : item);
    setStorageItem('orders', updated);
  },

  deleteOrder: async (id: string): Promise<void> => {
    checkAdminWrite('delete_order', { id });
    await requireCloudWriteAuth(true);
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

        await deleteDoc(doc(firestoreDb, 'orders', id));
        await deleteDoc(doc(firestoreDb, 'courseRequests', id)).catch(() => {});
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الاشتراك من قاعدة البيانات السحابية.'));
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
    checkAdminWrite('toggle_lesson_access', { studentId, courseId, itemId, unlocked });
    await requireCloudWriteAuth(true);
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
        await setDoc(ref, sanitizeForFirestore({
          id: docId,
          studentId,
          courseId,
          unlockedItems,
          updatedAt: new Date().toISOString()
        }), { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث صلاحية فتح العنصر في قاعدة البيانات السحابية.'));
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
      await waitForFirebaseAuth();
      if (firebaseAuth?.currentUser && (isFirebaseSignedInAdmin() || firebaseAuth.currentUser.uid === studentId)) {
        try {
          const ref = doc(firestoreDb, 'lessonAccess', docId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            return snap.data().unlockedItems || {};
          }
        } catch (err) {
          console.warn("Notice fetching lesson access:", err);
        }
      }
    }
    const current = getStorageItem<LessonAccess[]>('lessonAccess', []);
    const found = current.find(item => item.id === docId);
    return found ? found.unlockedItems : {};
  },

  listenToLessonAccess: (studentId: string, courseId: string, onUpdate: (unlockedItems: Record<string, boolean>) => void) => {
    const docId = `${studentId}_${courseId}`;
    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser || (!isFirebaseSignedInAdmin() && firebaseAuth.currentUser.uid !== studentId)) {
        const current = getStorageItem<LessonAccess[]>('lessonAccess', []);
        const found = current.find(item => item.id === docId);
        onUpdate(found ? found.unlockedItems : {});
        return () => {};
      }
      const ref = doc(firestoreDb, 'lessonAccess', docId);
      return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data().unlockedItems || {});
        } else {
          onUpdate({});
        }
      }, (err) => {
        console.warn("lessonAccess listener notice:", err);
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
      if (!canReadApprovedContentFromFirestore()) {
        onUpdate(getStorageItem<Quiz[]>('quizzes', defaultQuizzes));
        return () => {};
      }
      const q = collection(firestoreDb, 'quizzes');
      return onSnapshot(q, (snap) => {
        const list: Quiz[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Quiz);
        });
        setStorageItem('quizzes', list);
        onUpdate(list);
      }, (err) => {
        console.warn("Quizzes listener fallback:", err);
        onUpdate(getStorageItem<Quiz[]>('quizzes', defaultQuizzes));
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
      await waitForFirebaseAuth();
      if (!canReadApprovedContentFromFirestore()) {
        return getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
      }
      try {
        const snap = await getDocs(collection(firestoreDb, 'quizzes'));
        const list: Quiz[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Quiz));
        setStorageItem('quizzes', list);
        return list;
      } catch (err) {
        console.warn("Firebase quizzes read fallback:", err);
      }
    }
    return getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
  },

  addQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<Quiz> => {
    checkAdminWrite('add_quiz', { quiz });
    await requireCloudWriteAuth(true);
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
        await setDoc(doc(firestoreDb, 'quizzes', newId), sanitizeForFirestore(newQuiz));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حفظ الاختبار التدريبي في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    const updated = [...current.filter(q => q.id !== newId), newQuiz];
    setStorageItem('quizzes', updated);
    return newQuiz;
  },

  updateQuiz: async (id: string, quiz: Partial<Quiz>): Promise<void> => {
    checkAdminWrite('update_quiz', { id, quiz });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'quizzes', id), sanitizeForFirestore(quiz) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث الاختبار التدريبي في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    const updated = current.map(item => item.id === id ? { ...item, ...quiz } : item);
    setStorageItem('quizzes', updated);
  },

  deleteQuiz: async (id: string): Promise<void> => {
    checkAdminWrite('delete_quiz', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'quizzes', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الاختبار التدريبي من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Quiz[]>('quizzes', defaultQuizzes);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('quizzes', updated);
  },

  listenToQuizSubmissions: (onUpdate: (submissions: QuizSubmission[]) => void, studentId?: string) => {
    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<QuizSubmission[]>('quiz_submissions', []);
        onUpdate(studentId ? local.filter(s => s.studentId === studentId) : local);
        return () => {};
      }
      const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
      const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);
      if (!isAdm && effectiveStudentId !== firebaseAuth.currentUser.uid) {
        onUpdate([]);
        return () => {};
      }
      const colRef = collection(firestoreDb, 'quiz_submissions');
      const q = effectiveStudentId ? query(colRef, where('studentId', '==', effectiveStudentId)) : colRef;
      return onSnapshot(q, (snap) => {
        const list: QuizSubmission[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as QuizSubmission);
        });
        if (!effectiveStudentId) setStorageItem('quiz_submissions', list);
        onUpdate(list);
      }, (err) => {
        console.warn("Quiz submissions listener fallback:", err);
        const local = getStorageItem<QuizSubmission[]>('quiz_submissions', []);
        onUpdate(effectiveStudentId ? local.filter(s => s.studentId === effectiveStudentId) : local);
      });
    } else {
      const loadLocal = () => {
        const local = getStorageItem<QuizSubmission[]>('quiz_submissions', []);
        onUpdate(studentId ? local.filter(s => s.studentId === studentId) : local);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  getQuizSubmissions: async (studentId?: string): Promise<QuizSubmission[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<QuizSubmission[]>('quiz_submissions', []);
        return studentId ? local.filter(s => s.studentId === studentId) : local;
      }
      try {
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
        const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);
        if (!isAdm && effectiveStudentId !== firebaseAuth.currentUser.uid) {
          return [];
        }
        const colRef = collection(firestoreDb, 'quiz_submissions');
        const q = effectiveStudentId ? query(colRef, where('studentId', '==', effectiveStudentId)) : colRef;
        const snap = await getDocs(q);
        const list: QuizSubmission[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuizSubmission));
        if (!effectiveStudentId) setStorageItem('quiz_submissions', list);
        return list;
      } catch (err) {
        console.warn("Firebase quiz submissions read fallback:", err);
      }
    }
    const local = getStorageItem<QuizSubmission[]>('quiz_submissions', []);
    return studentId ? local.filter(s => s.studentId === studentId) : local;
  },

  // --- Assignments Tasks & Submissions ---
  listenToAssignmentTasks: (onUpdate: (assignments: Assignment[]) => void) => {
    if (isFirebaseConfigured) {
      if (!canReadApprovedContentFromFirestore()) {
        onUpdate(getStorageItem<Assignment[]>('assignment_tasks', []));
        return () => {};
      }
      const q = collection(firestoreDb, 'assignment_tasks');
      return onSnapshot(q, (snap) => {
        const list: Assignment[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Assignment);
        });
        setStorageItem('assignment_tasks', list);
        onUpdate(list);
      }, (err) => {
        console.warn("Assignment tasks listener fallback:", err);
        onUpdate(getStorageItem<Assignment[]>('assignment_tasks', []));
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
      await waitForFirebaseAuth();
      if (!canReadApprovedContentFromFirestore()) {
        return getStorageItem<Assignment[]>('assignment_tasks', []);
      }
      try {
        const snap = await getDocs(collection(firestoreDb, 'assignment_tasks'));
        const list: Assignment[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Assignment));
        setStorageItem('assignment_tasks', list);
        return list;
      } catch (err) {
        console.warn("Firebase getAssignmentTasks fallback:", err);
      }
    }
    return getStorageItem<Assignment[]>('assignment_tasks', []);
  },

  addAssignmentTask: async (task: Omit<Assignment, 'id'>): Promise<Assignment> => {
    checkAdminWrite('add_assignment_task', { task });
    await requireCloudWriteAuth(true);
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
        await setDoc(doc(firestoreDb, 'assignment_tasks', newId), sanitizeForFirestore(newTask));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حفظ تكليف الواجب في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Assignment[]>('assignment_tasks', []);
    const updated = [...current.filter(t => t.id !== newId), newTask];
    setStorageItem('assignment_tasks', updated);
    return newTask;
  },

  updateAssignmentTask: async (id: string, task: Partial<Assignment>): Promise<void> => {
    checkAdminWrite('update_assignment_task', { id, task });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'assignment_tasks', id), sanitizeForFirestore(task) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث تكليف الواجب في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Assignment[]>('assignment_tasks', []);
    const updated = current.map(item => item.id === id ? { ...item, ...task } : item);
    setStorageItem('assignment_tasks', updated);
  },

  deleteAssignmentTask: async (id: string): Promise<void> => {
    checkAdminWrite('delete_assignment_task', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'assignment_tasks', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف تكليف الواجب من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Assignment[]>('assignment_tasks', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('assignment_tasks', updated);
  },

  listenToAssignmentSubmissions: (onUpdate: (submissions: AssignmentSubmission[]) => void, studentId?: string) => {
    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<AssignmentSubmission[]>('assignments', []);
        onUpdate(studentId ? local.filter(a => a.studentId === studentId) : local);
        return () => {};
      }
      const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
      const effectiveStudentId = isAdm ? studentId : firebaseAuth.currentUser.uid;
      const colRef = collection(firestoreDb, 'assignments');
      const q = effectiveStudentId ? query(colRef, where('studentId', '==', effectiveStudentId)) : colRef;
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
        const local = getStorageItem<AssignmentSubmission[]>('assignments', []);
        onUpdate(studentId ? local.filter(a => a.studentId === studentId) : local);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 2000);
      return () => clearInterval(interval);
    }
  },

  getAssignments: async (studentId?: string): Promise<AssignmentSubmission[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser) {
        const list = getStorageItem<AssignmentSubmission[]>('assignments', []);
        return studentId ? list.filter(a => a.studentId === studentId) : list;
      }
      try {
        const isAdm = await isVerifiedFirebaseAdmin();
        const effectiveStudentId = isAdm ? studentId : firebaseAuth.currentUser.uid;
        const refCol = collection(firestoreDb, 'assignments');
        const q = effectiveStudentId ? query(refCol, where('studentId', '==', effectiveStudentId)) : refCol;
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
    await requireCloudWriteAuth(false);
    const newId = 'assign_' + Date.now();
    const effectiveStudentId = (isFirebaseConfigured && firebaseAuth?.currentUser?.uid)
      ? firebaseAuth.currentUser.uid
      : sub.studentId;
    const newSub: AssignmentSubmission = { id: newId, ...sub, studentId: effectiveStudentId };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'assignments', newId), sanitizeForFirestore(newSub));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر رفع تسليم الواجب إلى قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<AssignmentSubmission[]>('assignments', []);
    current.push(newSub);
    setStorageItem('assignments', current);
    return newSub;
  },

  updateAssignment: async (id: string, sub: Partial<AssignmentSubmission>): Promise<void> => {
    checkAdminWrite('update_assignment_submission', { id, sub });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'assignments', id), sanitizeForFirestore(sub) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حفظ تصحيح ودرجة الواجب في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<AssignmentSubmission[]>('assignments', []);
    const updated = current.map(item => item.id === id ? { ...item, ...sub } : item);
    setStorageItem('assignments', updated);
  },

  deleteAssignmentSubmission: async (id: string): Promise<void> => {
    checkAdminWrite('delete_assignment_submission', { id });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'assignments', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف تسليم الواجب من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<AssignmentSubmission[]>('assignments', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('assignments', updated);
  },

  // --- Certificates ---
  getCertificates: async (studentId?: string): Promise<Certificate[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser) {
        const list = getStorageItem<Certificate[]>('certificates', []);
        return studentId ? list.filter(c => c.studentId === studentId) : list;
      }
      try {
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
        const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);
        const refCol = collection(firestoreDb, 'certificates');
        const q = effectiveStudentId ? query(refCol, where('studentId', '==', effectiveStudentId)) : refCol;
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
    await requireCloudWriteAuth(false);
    const newId = 'cert_' + Date.now();
    const effectiveStudentId = (isFirebaseConfigured && firebaseAuth?.currentUser?.uid && !isAdminEmail(firebaseAuth.currentUser.email || ''))
      ? firebaseAuth.currentUser.uid
      : cert.studentId;
    const newCert: Certificate = { id: newId, ...cert, studentId: effectiveStudentId };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'certificates', newId), sanitizeForFirestore({ ...cert, studentId: effectiveStudentId }));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إصدار الشهادة في قاعدة البيانات السحابية.'));
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
      if (!isFirebaseSignedInAdmin()) {
        onUpdate({});
        return () => {};
      }
      const q = collection(firestoreDb, 'chats');
      return onSnapshot(q, (snap) => {
        const map: Record<string, ChatThread> = {};
        snap.forEach(d => {
          map[d.id] = { studentId: d.id, ...d.data() } as ChatThread;
        });
        onUpdate(map);
      }, (err) => {
        console.warn("Chat threads listener fallback:", err);
      });
    }
    return () => {};
  },

  listenToChatMessages: (studentId: string, onUpdate: (messages: ChatMessage[]) => void) => {
    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser || (!isFirebaseSignedInAdmin() && firebaseAuth.currentUser.uid !== studentId)) {
        const allLocalChats = getStorageItem<Record<string, ChatMessage[]>>('chats_messages', {});
        onUpdate(allLocalChats[studentId] || []);
        return () => {};
      }
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
        console.warn("Chat listener fallback:", err);
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
      if (!canReadApprovedContentFromFirestore()) {
        const allComments = getStorageItem<LessonComment[]>('comments', []);
        onUpdate(allComments.filter(c => c.courseId === courseId && c.lessonId === lessonId));
        return () => {};
      }
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
        console.warn("Comments listener fallback:", err);
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
    await requireCloudWriteAuth(false);
    const newId = 'comment_' + Date.now();
    const effectiveStudentId = (isFirebaseConfigured && firebaseAuth?.currentUser?.uid && !isAdminEmail(firebaseAuth.currentUser.email || ''))
      ? firebaseAuth.currentUser.uid
      : comment.studentId;
    const newComment: LessonComment = { id: newId, ...comment, studentId: effectiveStudentId };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'comments', newId), sanitizeForFirestore({ ...comment, studentId: effectiveStudentId }));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر نشر التعليق في قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<LessonComment[]>('comments', []);
    current.push(newComment);
    setStorageItem('comments', current);
    return newComment;
  },

  deleteComment: async (id: string): Promise<void> => {
    await requireCloudWriteAuth(false);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'comments', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف التعليق من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<LessonComment[]>('comments', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('comments', updated);
  },

  listenToAllComments: (onUpdate: (comments: LessonComment[]) => void) => {
    if (isFirebaseConfigured) {
      if (!isFirebaseSignedInAdmin()) {
        const allComments = getStorageItem<LessonComment[]>('comments', []);
        allComments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        onUpdate(allComments);
        return () => {};
      }
      const q = collection(firestoreDb, 'comments');
      return onSnapshot(q, (snap) => {
        const list: LessonComment[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as LessonComment);
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        onUpdate(list);
      }, (err) => {
        console.warn("All comments listener fallback:", err);
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
    checkAdminWrite('update_comment', { id, updates });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'comments', id), sanitizeForFirestore(updates) as any, { merge: true });
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث الرد على التعليق في قاعدة البيانات السحابية.'));
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
  listenToNotifications: (userId: string, userEmailOrOnUpdate: string | ((notifs: Notification[]) => void), maybeOnUpdate?: (notifs: Notification[]) => void) => {
    const userEmail = typeof userEmailOrOnUpdate === 'string' ? userEmailOrOnUpdate : '';
    const onUpdate = typeof userEmailOrOnUpdate === 'function' ? userEmailOrOnUpdate : (maybeOnUpdate || (() => {}));

    const cleanUser = (userId || '').trim().toLowerCase();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    const matchesTarget = (item: Notification, firebaseUid?: string) => {
      const target = (item.userId || '').trim().toLowerCase();
      if (!target || target === 'global') return true;
      if (firebaseUid && target === firebaseUid.toLowerCase()) return true;
      if (cleanUser && target === cleanUser) return true;
      if (cleanEmail && (target === cleanEmail || item.studentEmail?.toLowerCase() === cleanEmail)) return true;
      return false;
    };

    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser) {
        const localReadIds = getLocalReadNotifIds(cleanUser || cleanEmail);
        const list = getStorageItem<Notification[]>('notifications', [])
          .filter(item => matchesTarget(item))
          .map(item => ({
            ...item,
            isRead: Boolean(item.isRead || localReadIds.has(item.id))
          }));
        onUpdate(list);
        return () => {};
      }
      const fbUid = firebaseAuth.currentUser.uid;
      const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '') || isAdminEmail(cleanEmail);
      const colRef = collection(firestoreDb, 'notifications');
      // Strictly limit non-admin `in` query to ['global', fbUid] to satisfy Firestore security rules
      const targetIds = Array.from(new Set(['global', fbUid]));
      const q = isAdm ? colRef : query(colRef, where('userId', 'in', targetIds));
      return onSnapshot(q, (snap) => {
        const localReadIds = getLocalReadNotifIds(fbUid || cleanUser || cleanEmail);
        const list: Notification[] = [];
        snap.forEach(d => {
          const raw = { id: d.id, ...d.data() } as Notification;
          if ((raw.userId || '').trim().toLowerCase() === 'global') {
            knownGlobalNotifIds.add(d.id);
          }
          if (isAdm || matchesTarget(raw, fbUid)) {
            const isReadByStudent = Boolean(
              raw.isRead ||
              (fbUid && Array.isArray(raw.readBy) && raw.readBy.includes(fbUid)) ||
              localReadIds.has(d.id)
            );
            list.push({ ...raw, isRead: isReadByStudent });
          }
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(list);
      }, (err) => {
        console.error("Notifications listener failed:", err);
      });
    } else {
      const loadLocal = () => {
        const uidKey = cleanUser || cleanEmail || 'local_student';
        const localReadIds = getLocalReadNotifIds(uidKey);
        const list = getStorageItem<Notification[]>('notifications', [
          {
            id: 'notif_welcome',
            userId: 'global',
            titleAr: 'أهلاً بك في منصة MOHAMED ELJOKER الجامعية لقسم IT 🎓',
            titleEn: 'Welcome to MOHAMED ELJOKER University IT Platform 🎓',
            bodyAr: 'يسعدنا انضمامك لقسم تكنولوجيا المعلومات (IT) بكلية تكنولوجيا الصناعة والطاقة. يمكنك استعراض المحاضرات والسكاشن العملية والشيتات والامتحانات الإلكترونية حسب الفرقة والفصل الدراسي.',
            bodyEn: 'Welcome to Faculty of Industry & Energy Technology - IT Department. Access lectures, practical sections, sheets, and online exams by academic year and semester.',
            isRead: false,
            type: 'general',
            createdAt: new Date().toISOString()
          }
        ])
          .filter(item => matchesTarget(item))
          .map(item => ({
            ...item,
            isRead: Boolean(item.isRead || localReadIds.has(item.id))
          }));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onUpdate(list);
      };
      loadLocal();
      const interval = setInterval(loadLocal, 3000);
      return () => clearInterval(interval);
    }
  },

  addNotification: async (notif: Omit<Notification, 'id'>): Promise<Notification> => {
    await requireCloudWriteAuth(false);
    const newId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newNotif: Notification = { id: newId, ...notif };
    if ((newNotif.userId || '').trim().toLowerCase() === 'global') {
      knownGlobalNotifIds.add(newId);
    }
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'notifications', newId), sanitizeForFirestore(newNotif));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر إرسال الإشعار إلى قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    current.unshift(newNotif);
    setStorageItem('notifications', current);
    return newNotif;
  },

  markNotificationAsRead: async (id: string, isGlobalHint?: boolean): Promise<void> => {
    const fbUid = firebaseAuth?.currentUser?.uid || '';
    const activeAuth = getStorageItem<UserAuth | null>('active_user', null);
    const uidKey = fbUid || activeAuth?.id || activeAuth?.email || 'local_student';
    addLocalReadNotifIds([id], uidKey);

    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      try {
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
        const notifRef = doc(firestoreDb, 'notifications', id);
        let isGlobal = isGlobalHint ?? knownGlobalNotifIds.has(id);
        if (!isAdm && isGlobalHint === undefined && !knownGlobalNotifIds.has(id)) {
          const snap = await getDoc(notifRef);
          if (snap.exists() && (snap.data()?.userId || '').toString().trim().toLowerCase() === 'global') {
            isGlobal = true;
            knownGlobalNotifIds.add(id);
          }
        }
        if (!isAdm && isGlobal && fbUid) {
          await updateDoc(notifRef, { readBy: arrayUnion(fbUid) });
        } else {
          await updateDoc(notifRef, { isRead: true });
        }
      } catch (err) {
        console.error("Firebase notification mark read failed:", err);
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    const updated = current.map(item =>
      item.id === id && (item.userId || '').trim().toLowerCase() !== 'global'
        ? { ...item, isRead: true }
        : item
    );
    setStorageItem('notifications', updated);
  },

  markAllNotificationsAsRead: async (userId: string, userEmail: string = ''): Promise<void> => {
    const cleanUser = (userId || '').trim().toLowerCase();
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const fbUid = firebaseAuth?.currentUser?.uid || '';
    const uidKey = fbUid || cleanUser || cleanEmail || 'local_student';

    const matchesTarget = (item: Notification, uid?: string) => {
      const target = (item.userId || '').trim().toLowerCase();
      if (!target || target === 'global') return true;
      if (uid && target === uid.toLowerCase()) return true;
      if (cleanUser && target === cleanUser) return true;
      if (cleanEmail && (target === cleanEmail || item.studentEmail?.toLowerCase() === cleanEmail)) return true;
      return false;
    };

    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      try {
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '') || isAdminEmail(cleanEmail);
        const colRef = collection(firestoreDb, 'notifications');
        const targetIds = Array.from(new Set(['global', fbUid]));
        const q = isAdm ? colRef : query(colRef, where('userId', 'in', targetIds));
        const snap = await getDocs(q);
        const batchUpdates: Promise<void>[] = [];
        const markedIds: string[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Notification;
          const isGlobal = (item.userId || '').trim().toLowerCase() === 'global';
          if (isGlobal) knownGlobalNotifIds.add(d.id);
          const alreadyRead = Boolean(item.isRead || (fbUid && Array.isArray(item.readBy) && item.readBy.includes(fbUid)));
          if ((isAdm || matchesTarget(item, fbUid)) && !alreadyRead) {
            markedIds.push(d.id);
            if (!isAdm && isGlobal && fbUid) {
              batchUpdates.push(updateDoc(doc(firestoreDb, 'notifications', d.id), { readBy: arrayUnion(fbUid) }));
            } else {
              batchUpdates.push(updateDoc(doc(firestoreDb, 'notifications', d.id), { isRead: true }));
            }
          }
        });
        if (markedIds.length > 0) {
          addLocalReadNotifIds(markedIds, uidKey);
        }
        await Promise.all(batchUpdates);
      } catch (err) {
        console.error("Firebase markAllNotificationsAsRead failed:", err);
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    const localIdsToMark = current.filter(item => matchesTarget(item, fbUid)).map(item => item.id);
    if (localIdsToMark.length > 0) {
      addLocalReadNotifIds(localIdsToMark, uidKey);
    }
    const updated = current.map(item =>
      matchesTarget(item, fbUid) && (item.userId || '').trim().toLowerCase() !== 'global'
        ? { ...item, isRead: true }
        : item
    );
    setStorageItem('notifications', updated);
  },

  deleteNotification: async (id: string): Promise<void> => {
    await requireCloudWriteAuth(false);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'notifications', id));
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف الإشعار من قاعدة البيانات السحابية.'));
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    const updated = current.filter(item => item.id !== id);
    setStorageItem('notifications', updated);
  }
};

const getAdminEmail = (): string => {
  const metaEnv = (import.meta as any).env || {};
  return (metaEnv.VITE_ADMIN_EMAIL || '').toLowerCase();
};

const SUPER_ADMIN_EMAIL = 'mhmdbdaltwabalsdawy7@gmail.com';
const WHITELISTED_ADMINS_CACHE_KEY = 'academy_whitelisted_admins';

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

function getWhitelistedAdminEmails(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(WHITELISTED_ADMINS_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((e: any) => String(e || '').trim().toLowerCase()).filter(Boolean);
      }
    }
    const localAdmins = getStorageItem<Admin[]>('admins', defaultAdmins);
    if (Array.isArray(localAdmins) && localAdmins.length > 0) {
      return localAdmins.map(a => (a.email || '').trim().toLowerCase()).filter(Boolean);
    }
  } catch {}
  return [];
}

function syncWhitelistedAdminEmails(emails: string[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const cleanList = Array.from(new Set(emails.map(e => (e || '').trim().toLowerCase()).filter(Boolean)));
    localStorage.setItem(WHITELISTED_ADMINS_CACHE_KEY, JSON.stringify(cleanList));
  } catch {}
}

function addWhitelistedAdminEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean) return;
  const list = getWhitelistedAdminEmails();
  if (!list.includes(clean)) {
    syncWhitelistedAdminEmails([...list, clean]);
  }
}

function removeWhitelistedAdminEmail(email: string): void {
  const clean = email.trim().toLowerCase();
  if (!clean || clean === SUPER_ADMIN_EMAIL) return;
  const list = getWhitelistedAdminEmails().filter(e => e !== clean);
  syncWhitelistedAdminEmails(list);
}

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === SUPER_ADMIN_EMAIL) return true;
  return getWhitelistedAdminEmails().includes(clean);
}

async function resolveAdminAccessLevel(email: string, fbUser?: User | null): Promise<'super' | 'editor' | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  if (isSuperAdminEmail(clean)) return 'super';

  if (isFirebaseConfigured) {
    const authUser = fbUser !== undefined ? fbUser : (firebaseAuth?.currentUser || null);
    const res = await fetchAuthenticatedFirestoreDocWithStatus('admins', clean, authUser);
    if (res.exists && res.data) {
      const data = res.data as Partial<Admin>;
      addWhitelistedAdminEmail(clean);
      return data.role === 'super' ? 'super' : 'editor';
    }
    if (res.unreachable) {
      return getWhitelistedAdminEmails().includes(clean) ? 'editor' : null;
    }
    removeWhitelistedAdminEmail(clean);
    return null;
  }

  const localAdmins = getStorageItem<Admin[]>('admins', defaultAdmins);
  const found = localAdmins.find(a => (a.email || '').trim().toLowerCase() === clean);
  if (found) {
    addWhitelistedAdminEmail(clean);
    return found.role === 'super' ? 'super' : 'editor';
  }
  return null;
}

function saveActiveUserSession(user: UserAuth, markFreshLogin: boolean = false): void {
  if (markFreshLogin || !user.lastLoginTimestamp) {
    user.lastLoginTimestamp = Date.now();
  }
  localStorage.setItem('academy_active_user', JSON.stringify(user));

  if (isFirebaseConfigured && user.id) {
    try {
      setDoc(doc(firestoreDb, 'users', user.id), { lastLoginTimestamp: user.lastLoginTimestamp }, { merge: true }).catch(() => {});
    } catch {}
  }
}

let activeGooglePopupInFlight = false;

// Unified Auth Service with Role-based Authentication (Admin, Teacher, Student)
export const authService = {
  isRealFirebase: () => isFirebaseConfigured,

  recheckAuthorizedDomain: async (): Promise<{ authorized: boolean; host: string; projectId: string }> => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const projectId = firebaseConfig.projectId || '';
    const domains = await fetchFirebaseAuthorizedDomains(true);
    if (!domains) {
      return { authorized: true, host, projectId };
    }
    const authorized = isHostMatchedInAuthorizedDomains(host, domains);
    if (authorized && firebaseAuth) {
      clearRejectedOriginValidationCache(firebaseAuth);
    }
    return { authorized, host, projectId };
  },

  // Pick a Google account in an isolated temporary Firebase app so the active Super Admin stays logged in
  pickGoogleAccountForAdmin: async (): Promise<{ success: boolean; name?: string; email?: string; error?: string }> => {
    if (!isFirebaseConfigured) {
      return { success: false, error: 'ميزة اختيار حساب Google متاحة عند الاتصال بـ Firebase.' };
    }
    if (activeGooglePopupInFlight) {
      return { success: false, error: 'يوجد طلب تسجيل دخول مفتوح بالفعل. يرجى إتمامه أو إغلاقه أولاً.' };
    }
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (cachedAuthorizedDomains && !isHostMatchedInAuthorizedDomains(host, cachedAuthorizedDomains)) {
      const refreshed = await fetchFirebaseAuthorizedDomains(true);
      if (refreshed && !isHostMatchedInAuthorizedDomains(host, refreshed)) {
        return { success: false, error: `النطاق الحالي (${host}) غير مضاف في Authorized domains داخل Firebase Console.` };
      }
    }
    const appName = 'admin_picker_' + Date.now();
    let pickerApp: ReturnType<typeof initializeApp> | null = null;
    activeGooglePopupInFlight = true;
    try {
      pickerApp = initializeApp(firebaseConfig, appName);
      const pickerAuth = getAuth(pickerApp);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(pickerAuth, provider);
      const cleanEmail = (cred.user.email || '').trim().toLowerCase();
      const displayName = (cred.user.displayName || cleanEmail.split('@')[0] || 'مسؤول أكاديمي').trim();
      await signOut(pickerAuth).catch(() => {});
      if (!cleanEmail) {
        return { success: false, error: 'لم يتم العثور على بريد إلكتروني لهذا الحساب.' };
      }
      return { success: true, name: displayName, email: cleanEmail };
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'تم إغلاق نافذة اختيار حساب Google قبل الاختيار.' };
      }
      if (code === 'auth/popup-blocked') {
        return { success: false, error: 'قام المتصفح بحظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة أو اكتب البريد يدوياً.' };
      }
      if (code === 'auth/unauthorized-domain') {
        return { success: false, error: `النطاق الحالي (${host}) غير مضاف في Authorized domains داخل Firebase Console.` };
      }
      return { success: false, error: err?.message || 'تعذر قراءة بيانات الحساب من Google.' };
    } finally {
      activeGooglePopupInFlight = false;
      if (pickerApp) {
        await deleteApp(pickerApp).catch(() => {});
      }
    }
  },

  // Authenticate manager/admin user with real Firebase Email/Password or local fallback
  loginAdmin: async (email: string, password: string): Promise<{ success: boolean; admin?: Admin; error?: string; errorCode?: string; blockedDomain?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const isEn = isEnglishUi();

    if (!cleanEmail) {
      return { success: false, error: isEn ? 'Please enter the administrator email address.' : 'يرجى إدخال البريد الإلكتروني للمدير.' };
    }
    if (!cleanPassword) {
      return { success: false, error: isEn ? 'Please enter your password.' : 'يرجى إدخال كلمة المرور.' };
    }

    const defaultAdminUser: UserAuth = {
      id: 'admin_' + Date.now(),
      name: isSuperAdminEmail(cleanEmail) ? 'Eng/Mohamed abdal tawab' : cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: isSuperAdminEmail(cleanEmail) ? '201010298878' : '',
      role: 'admin',
      adminLevel: isSuperAdminEmail(cleanEmail) ? 'super' : 'editor',
      status: 'active',
      purchasedCourseIds: [],
      watchedLessonIds: [],
      quizGrades: {},
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && firebaseAuth) {
      try {
        let fbUser: User | null = null;
        let authErrCode = '';

        try {
          const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
          fbUser = userCredential.user;
          cachedEmailPasswordEnabled = true;
          cachedEmailPasswordCheckedAt = Date.now();
        } catch (signInErr: any) {
          authErrCode = String(signInErr?.code || '');
          if (authErrCode === 'auth/operation-not-allowed') {
            cachedEmailPasswordEnabled = false;
            cachedEmailPasswordCheckedAt = Date.now();
          } else if (authErrCode === 'auth/wrong-password' || authErrCode === 'auth/invalid-credential' || authErrCode === 'auth/user-not-found') {
            cachedEmailPasswordEnabled = true;
            cachedEmailPasswordCheckedAt = Date.now();
          }
        }

        if (!fbUser) {
          recordLoginAttempt(cleanEmail, false);
          if (authErrCode === 'auth/operation-not-allowed') {
            return {
              success: false,
              errorCode: authErrCode,
              error: isEn
                ? 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method). Sign in with Google (Manager) above or enable Email/Password in Firebase Console.'
                : 'مزود الدخول بالبريد الإلكتروني وكلمة المرور غير مفعّل بعد في Firebase Console (Authentication > Sign-in method). استخدم «الدخول بحساب Google (المدير)» بالأعلى أو فعّله من إعدادات Firebase.'
            };
          }
          if (authErrCode === 'auth/unauthorized-domain') {
            const host = typeof window !== 'undefined' ? window.location.hostname : '';
            return {
              success: false,
              errorCode: authErrCode,
              blockedDomain: host,
              error: isEn
                ? `Current domain (${host}) is not listed in Firebase Authentication Authorized domains.`
                : `النطاق الحالي (${host}) غير مضاف في Authorized domains داخل Firebase Console.`
            };
          }
          if (authErrCode === 'auth/too-many-requests') {
            return {
              success: false,
              errorCode: authErrCode,
              error: isEn
                ? 'Too many failed attempts. Please wait a moment or use "Set / Forgot Password?".'
                : 'تم إيقاف المحاولات مؤقتاً لكثرة المحاولات الخاطئة. انتظر قليلاً أو استخدم «تعيين / نسيت كلمة المرور؟».'
            };
          }
          if (authErrCode === 'auth/invalid-email') {
            return { success: false, errorCode: authErrCode, error: isEn ? 'Invalid email address format.' : 'صيغة البريد الإلكتروني غير صحيحة.' };
          }
          if (authErrCode === 'auth/user-disabled') {
            return { success: false, errorCode: authErrCode, error: isEn ? 'This Firebase account is disabled.' : 'تم تعطيل هذا الحساب في Firebase Authentication.' };
          }
          if (authErrCode === 'auth/network-request-failed') {
            return { success: false, errorCode: authErrCode, error: isEn ? 'Network error while contacting Firebase Authentication.' : 'تعذر الاتصال بخادم المصادقة. تحقق من اتصال الإنترنت.' };
          }
          return {
            success: false,
            errorCode: authErrCode,
            error: isEn
              ? 'Invalid email or password, or no password is linked to this Google account yet (you can sign in with Google or use "Set / Forgot Password?").'
              : 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو لم يتم ربط كلمة مرور بهذا الحساب بعد (يمكنك الدخول بحساب Google أو استخدام «تعيين / نسيت كلمة المرور؟»).'
          };
        }

        const firebaseUid = fbUser.uid;
        // Verify authorization against Super Admin email OR Firestore /admins/{email} whitelist
        const adminLevel = await resolveAdminAccessLevel(fbUser.email || cleanEmail, fbUser);
        const verifiedEmail = (fbUser.email || cleanEmail).trim().toLowerCase();
        if (!adminLevel) {
          await signOut(firebaseAuth).catch(() => {});
          localStorage.removeItem('academy_active_user');
          recordLoginAttempt(cleanEmail, false);
          return {
            success: false,
            error: isEn
              ? 'This account is not authorized with administrator privileges.'
              : 'هذا الحساب غير مصرح له بصلاحيات المدير.'
          };
        }

        let userData: UserAuth = { ...defaultAdminUser, id: firebaseUid, uid: firebaseUid, adminLevel };
        const profileRes = await fetchAuthenticatedFirestoreDocWithStatus('users', firebaseUid, fbUser);
        if (profileRes.exists && profileRes.data) {
          userData = { id: firebaseUid, uid: firebaseUid, ...(profileRes.data as UserAuth), adminLevel };
        }

        userData.role = 'admin';
        userData.adminLevel = adminLevel;
        userData.status = 'active';
        userData.isApproved = true;
        userData.lastLoginTimestamp = Date.now();
        try {
          await setDoc(doc(firestoreDb, 'users', firebaseUid), { ...userData, role: 'admin', adminLevel, email: verifiedEmail, status: 'active', isApproved: true, lastLoginTimestamp: userData.lastLoginTimestamp }, { merge: true });
        } catch (syncErr) {
          console.warn("Firestore user sync warning during manager login:", syncErr);
        }

        recordLoginAttempt(verifiedEmail, true);
        secureLog('auth_success_admin', { email: verifiedEmail, adminLevel });
        saveActiveUserSession(userData, true);
        return { success: true, admin: { id: userData.id, name: userData.name || (isSuperAdminEmail(verifiedEmail) ? 'Eng/Mohamed abdal tawab' : verifiedEmail.split('@')[0]), email: userData.email, role: adminLevel } };
      } catch (err: any) {
        console.error("Manager login error:", err?.code || err?.message || err);
        return { success: false, error: isEn ? 'Unable to sign in as administrator.' : 'تعذر تسجيل الدخول كمدير.' };
      }
    } else {
      // Local Simulation DB Fallback (only when Firebase config is absent)
      const adminLevel = await resolveAdminAccessLevel(cleanEmail);
      if (!adminLevel) {
        return { success: false, error: isEn ? 'This email is not authorized as administrator.' : 'هذا البريد الإلكتروني غير مصرح له بصلاحيات المدير.' };
      }
      const savedLocalPass = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_admin_local_pass') : null;
      if (savedLocalPass && savedLocalPass !== cleanPassword) {
        return { success: false, error: isEn ? 'Incorrect password.' : 'كلمة المرور غير صحيحة.' };
      }
      if (!savedLocalPass && typeof localStorage !== 'undefined') {
        localStorage.setItem('academy_admin_local_pass', cleanPassword);
      }
      const users = getStorageItem<UserAuth[]>('users', defaultUsers);
      let found = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!found) {
        found = { ...defaultAdminUser, adminLevel };
        users.push(found);
        setStorageItem('users', users);
      } else {
        found.role = 'admin';
        found.adminLevel = adminLevel;
        found.status = 'active';
        setStorageItem('users', users);
      }
      recordLoginAttempt(cleanEmail, true);
      secureLog('auth_success_admin_simulation', { email: cleanEmail });
      saveActiveUserSession(found);
      return { success: true, admin: { id: found.id, name: found.name || 'Eng/Mohamed abdal tawab', email: found.email, role: adminLevel } };
    }
  },

  sendPasswordReset: async (
    email: string,
    role: 'admin' | 'student' = 'student'
  ): Promise<{ success: boolean; error?: string; errorCode?: string; blockedDomain?: string; warningDomain?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const isEn = isEnglishUi();
    if (!cleanEmail) {
      return {
        success: false,
        error: isEn
          ? `Please enter your ${role === 'admin' ? 'administrator' : 'student'} email first.`
          : (role === 'admin' ? 'يرجى إدخال البريد الإلكتروني للمدير أولاً.' : 'يرجى إدخال البريد الإلكتروني للطالب أولاً.')
      };
    }
    if (!isFirebaseConfigured || !firebaseAuth) {
      return {
        success: false,
        error: isEn ? 'Password reset is only available when Firebase is configured.' : 'خدمة تعيين وإعادة تعيين كلمة المرور متاحة عند الاتصال بـ Firebase.'
      };
    }

    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const providerEnabled = await checkEmailPasswordProviderEnabled(true);
    if (providerEnabled === false) {
      return {
        success: false,
        errorCode: 'auth/operation-not-allowed',
        error: isEn
          ? 'Email/Password sign-in provider is currently disabled in Firebase Console (Authentication > Sign-in method). Enable Email/Password there first so password reset links can work, or sign in with Google above.'
          : 'مزود البريد الإلكتروني وكلمة المرور (Email/Password) معطل حالياً في Firebase Console. قم بتفعيله أولاً من Authentication > Sign-in method حتى يعمل رابط تعيين/استعادة كلمة المرور، أو سجل الدخول بحساب Google بالأعلى.'
      };
    }

    const domains = await fetchFirebaseAuthorizedDomains();
    const hostAuthorized = !host || !domains || isHostMatchedInAuthorizedDomains(host, domains);
    const currentAppUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

    try {
      if (hostAuthorized && currentAppUrl) {
        try {
          await sendPasswordResetEmail(firebaseAuth, cleanEmail, {
            url: currentAppUrl,
            handleCodeInApp: true
          });
          return { success: true };
        } catch (actionErr: any) {
          const actionCode = String(actionErr?.code || '');
          if (actionCode === 'auth/unauthorized-continue-uri' || actionCode === 'auth/invalid-continue-uri') {
            await sendPasswordResetEmail(firebaseAuth, cleanEmail);
            return { success: true, warningDomain: host || undefined };
          }
          throw actionErr;
        }
      } else {
        await sendPasswordResetEmail(firebaseAuth, cleanEmail);
        return { success: true, warningDomain: host && !hostAuthorized ? host : undefined };
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/operation-not-allowed') {
        cachedEmailPasswordEnabled = false;
        cachedEmailPasswordCheckedAt = Date.now();
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'Email/Password provider is not enabled in Firebase Authentication Console. Enable it under Authentication > Sign-in method first.'
            : 'مزود Email/Password غير مفعّل في Firebase Console. يرجى تفعيله من Authentication > Sign-in method أولاً.'
        };
      }
      if (code === 'auth/unauthorized-domain' || code === 'auth/unauthorized-continue-uri') {
        return {
          success: false,
          errorCode: 'auth/unauthorized-domain',
          blockedDomain: host,
          error: isEn
            ? `Domain (${host}) is not in Firebase Authorized domains.`
            : `النطاق الحالي (${host}) غير مضاف في Authorized domains داخل Firebase Console.`
        };
      }
      if (code === 'auth/invalid-email') {
        return { success: false, errorCode: code, error: isEn ? 'Invalid email address.' : 'صيغة البريد الإلكتروني غير صحيحة.' };
      }
      if (code === 'auth/user-not-found') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'No user account was found for this email address.'
            : 'لا يوجد حساب مسجل بهذا البريد الإلكتروني في Firebase Authentication.'
        };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, errorCode: code, error: isEn ? 'Too many requests. Please wait before trying again.' : 'طلبات كثيرة جداً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.' };
      }
      if (code === 'auth/network-request-failed') {
        return { success: false, errorCode: code, error: isEn ? 'Network error while contacting Firebase.' : 'تعذر الاتصال بخادم المصادقة. تحقق من اتصال الإنترنت.' };
      }
      return { success: false, errorCode: code, error: err?.message || (isEn ? 'Could not send password reset email.' : 'تعذر إرسال رابط تعيين كلمة المرور.') };
    }
  },

  sendAdminPasswordReset: async (email: string): Promise<{ success: boolean; error?: string; errorCode?: string; blockedDomain?: string; warningDomain?: string }> => {
    return authService.sendPasswordReset(email, 'admin');
  },

  verifyResetPasswordCode: async (oobCode: string): Promise<{ success: boolean; email?: string; error?: string; errorCode?: string }> => {
    const isEn = isEnglishUi();
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: isEn ? 'Firebase is not configured.' : 'إعدادات Firebase غير متوفرة.' };
    }
    const cleanCode = (oobCode || '').trim();
    if (!cleanCode) {
      return { success: false, error: isEn ? 'Invalid password reset link.' : 'رابط إعادة تعيين كلمة المرور غير صالح أو ناقص.' };
    }
    try {
      const email = await verifyPasswordResetCode(firebaseAuth, cleanCode);
      return { success: true, email: (email || '').trim().toLowerCase() };
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/expired-action-code') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'This password reset link has expired. Request a new link from the login page.'
            : 'انتهت صلاحية رابط تعيين كلمة المرور أو تم استخدامه بالفعل. يرجى طلب رابط جديد من صفحة الدخول.'
        };
      }
      if (code === 'auth/invalid-action-code') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'This password reset link is invalid or has already been used.'
            : 'رابط تعيين كلمة المرور غير صالح أو سبق استخدامه. اطلب رابطاً جديداً.'
        };
      }
      if (code === 'auth/user-disabled') {
        return { success: false, errorCode: code, error: isEn ? 'This account has been disabled.' : 'هذا الحساب معطل في Firebase.' };
      }
      return {
        success: false,
        errorCode: code,
        error: err?.message || (isEn ? 'Could not verify reset link.' : 'تعذر التحقق من رابط إعادة تعيين كلمة المرور.')
      };
    }
  },

  confirmResetPassword: async (oobCode: string, newPassword: string): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    const isEn = isEnglishUi();
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: isEn ? 'Firebase is not configured.' : 'إعدادات Firebase غير متوفرة.' };
    }
    const cleanCode = (oobCode || '').trim();
    if (!cleanCode) {
      return { success: false, error: isEn ? 'Invalid reset code.' : 'رمز إعادة التعيين غير صالح.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: isEn ? 'Password must be at least 6 characters.' : 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' };
    }
    try {
      await confirmPasswordReset(firebaseAuth, cleanCode, newPassword);
      cachedEmailPasswordEnabled = true;
      cachedEmailPasswordCheckedAt = Date.now();
      return { success: true };
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/operation-not-allowed') {
        cachedEmailPasswordEnabled = false;
        cachedEmailPasswordCheckedAt = Date.now();
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'Email/Password sign-in is disabled in Firebase Console. Enable Email/Password in Authentication > Sign-in method first.'
            : 'مزود Email/Password معطل حالياً في Firebase Console. فعّله أولاً من Authentication > Sign-in method.'
        };
      }
      if (code === 'auth/weak-password') {
        return { success: false, errorCode: code, error: isEn ? 'Password is too weak. Choose a stronger password (at least 6 characters).' : 'كلمة المرور ضعيفة جداً. اختر كلمة مرور أقوى (6 أحرف على الأقل).' };
      }
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'This reset link is expired or has already been used. Request a new link.'
            : 'انتهت صلاحية هذا الرابط أو سبق استخدامه. اطلب رابطاً جديداً.'
        };
      }
      if (code === 'auth/network-request-failed') {
        return { success: false, errorCode: code, error: isEn ? 'Network error while updating password.' : 'تعذر الاتصال بالخادم لحفظ كلمة المرور.' };
      }
      return { success: false, errorCode: code, error: err?.message || (isEn ? 'Failed to set new password.' : 'تعذر حفظ كلمة المرور الجديدة.') };
    }
  },

  getCurrentAdmin: (): Admin | null => {
    if (isFirebaseConfigured && firebaseAuth) {
      const fbUser = firebaseAuth.currentUser;
      const fbEmail = (fbUser?.email || '').trim().toLowerCase();
      if (!fbUser || !fbEmail || !isAdminEmail(fbEmail)) {
        return null;
      }
      const resolvedRole: 'super' | 'editor' = isSuperAdminEmail(fbEmail) ? 'super' : 'editor';
      const u = authService.getCurrentUser();
      if (u && (u.email || '').trim().toLowerCase() === fbEmail) {
        return {
          id: u.id || fbUser.uid,
          name: u.name || fbUser.displayName || (resolvedRole === 'super' ? 'Eng/Mohamed abdal tawab' : fbEmail.split('@')[0]),
          email: fbEmail,
          role: isSuperAdminEmail(fbEmail) ? 'super' : (u.adminLevel || 'editor')
        };
      }
      return {
        id: fbUser.uid,
        name: fbUser.displayName || (resolvedRole === 'super' ? 'Eng/Mohamed abdal tawab' : fbEmail.split('@')[0]),
        email: fbEmail,
        role: resolvedRole
      };
    }

    const u = authService.getCurrentUser();
    if (u && isAdminEmail(u.email || '')) {
      const resolvedRole: 'super' | 'editor' = isSuperAdminEmail(u.email) ? 'super' : (u.adminLevel || 'super');
      return { id: u.id, name: u.name || 'Eng/Mohamed abdal tawab', email: u.email, role: resolvedRole };
    }
    return null;
  },

  logoutAdmin: async (): Promise<void> => {
    await authService.logout();
  },

  // Global login supporting all roles
  loginUser: async (email: string, password: string): Promise<{ success: boolean; user?: UserAuth; accountStatus?: string; error?: string; errorCode?: string; blockedDomain?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    const isEn = isEnglishUi();

    if (!normalizedEmail) {
      return { success: false, error: isEn ? 'Please enter your email address.' : 'يرجى إدخال البريد الإلكتروني.' };
    }
    if (!password) {
      return { success: false, error: isEn ? 'Please enter your password.' : 'يرجى إدخال كلمة المرور.' };
    }

    if (isFirebaseConfigured) {
      let fbUser: User | null = null;
      try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
        fbUser = userCredential.user;
        cachedEmailPasswordEnabled = true;
        cachedEmailPasswordCheckedAt = Date.now();
      } catch (err: any) {
        console.warn("Firebase Login Notice:", err?.code || err?.message || err);
        const code = String(err?.code || '');
        if (code === 'auth/operation-not-allowed') {
          cachedEmailPasswordEnabled = false;
          cachedEmailPasswordCheckedAt = Date.now();
        } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
          cachedEmailPasswordEnabled = true;
          cachedEmailPasswordCheckedAt = Date.now();
        }
        let errorMsg = isEn ? 'Incorrect email or password.' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        let blockedDomain: string | undefined;
        if (code === 'auth/operation-not-allowed') {
          errorMsg = isEn
            ? 'Email/Password sign-in is not yet enabled in Firebase Authentication. Please sign in with Google or enable Email/Password in Firebase Console.'
            : 'مزود الدخول بالبريد الإلكتروني وكلمة المرور غير مفعّل بعد في Firebase Authentication. يمكنك المتابعة بحساب Google بالأعلى أو تفعيله من Firebase Console.';
        } else if (code === 'auth/unauthorized-domain') {
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          blockedDomain = host;
          errorMsg = isEn
            ? `Domain (${host}) is not in Firebase Authorized domains.`
            : `النطاق (${host}) غير مضاف في قائمة Authorized domains داخل Firebase Console.`;
        } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          errorMsg = isEn
            ? 'Invalid email or password.'
            : 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.';
        } else if (code === 'auth/invalid-email') {
          errorMsg = isEn ? 'Invalid email address format.' : 'صيغة البريد الإلكتروني غير صحيحة.';
        } else if (code === 'auth/user-disabled') {
          errorMsg = isEn ? 'This account has been suspended.' : 'تم إيقاف هذا الحساب من قبل إدارة المنصة الجامعية.';
        } else if (code === 'auth/too-many-requests') {
          errorMsg = isEn ? 'Too many failed attempts. Please try again shortly.' : 'محاولات دخول خاطئة متكررة. حاول بعد قليل.';
        } else if (code === 'auth/network-request-failed') {
          errorMsg = isEn ? 'Network error while contacting Firebase Authentication. Please check your internet connection.' : 'تعذر الاتصال بخادم المصادقة. تحقق من اتصال الإنترنت وحاول مرة أخرى.';
        }
        recordLoginAttempt(normalizedEmail, false);
        return { success: false, error: errorMsg, errorCode: code, blockedDomain };
      }

      try {
        const firebaseUid = fbUser.uid;
        const userRef = doc(firestoreDb, 'users', firebaseUid);
        const adminLevel = await resolveAdminAccessLevel(fbUser.email || normalizedEmail, fbUser);
        const profileRes = await fetchAuthenticatedFirestoreDocWithStatus('users', firebaseUid, fbUser);
        let finalUser: UserAuth;

        if (profileRes.unreachable && !adminLevel) {
          return {
            success: false,
            error: isEn
              ? 'Signed in, but could not reach the platform database. Please check your connection and try again.'
              : 'تم التحقق من الحساب، لكن تعذر تحميل ملف الطالب من قاعدة البيانات بسبب ضعف الشبكة. حاول مرة أخرى.'
          };
        }

        if (profileRes.exists && profileRes.data) {
          const userData = profileRes.data as UserAuth;
          if (!adminLevel) {
            if (userData.status === 'suspended') {
              await signOut(firebaseAuth);
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, accountStatus: 'suspended', error: 'تم إيقاف هذا الحساب من قبل إدارة المنصة الجامعية.' };
            }
            if (userData.status === 'pending' || (userData.role !== 'admin' && userData.isApproved === false && userData.status !== 'active')) {
              await signOut(firebaseAuth);
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, accountStatus: 'pending', error: 'حسابك قيد المراجعة حالياً (Pending) من قبل إدارة المنصة الجامعية. يرجى الانتظار حتى يتم قبول الحساب.' };
            }
            if (userData.status === 'rejected') {
              await signOut(firebaseAuth);
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, accountStatus: 'rejected', error: 'تم رفض طلب تسجيل حسابك (Rejected) من قبل إدارة المنصة الجامعية.' };
            }
          }
          finalUser = { id: firebaseUid, uid: firebaseUid, ...userData };
        } else {
          const isAdm = adminLevel !== null;
          const userRole = isAdm ? 'admin' : 'student';
          const nowIso = new Date().toISOString();
          finalUser = {
            id: firebaseUid,
            uid: firebaseUid,
            name: fbUser.displayName || (isAdm ? (isSuperAdminEmail(normalizedEmail) ? 'Eng/Mohamed abdal tawab' : normalizedEmail.split('@')[0]) : 'طالب تكنولوجيا المعلومات'),
            email: normalizedEmail,
            phone: '',
            role: userRole,
            adminLevel: isAdm && adminLevel ? adminLevel : undefined,
            status: isAdm ? 'active' : 'pending',
            isApproved: isAdm,
            grade: 'year1',
            department: 'IT',
            createdAt: nowIso,
            purchasedCourseIds: [],
            watchedLessonIds: [],
            quizGrades: {}
          };
          await setDoc(userRef, finalUser, { merge: true }).catch(() => {});
          if (!isAdm) {
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
              status: 'pending',
              isApproved: false,
              department: 'IT',
              grade: 'year1',
              createdAt: nowIso
            };
            await setDoc(doc(firestoreDb, 'students', firebaseUid), studentDoc, { merge: true }).catch(() => {});
            await signOut(firebaseAuth);
            return { success: false, accountStatus: 'pending', error: 'تم تسجيل حسابك وهو الآن في انتظار موافقة الإدارة (Pending).' };
          }
        }

        if (adminLevel) {
          finalUser.role = 'admin';
          finalUser.adminLevel = adminLevel;
          finalUser.status = 'active';
          finalUser.isApproved = true;
        } else if (finalUser.role === 'admin') {
          finalUser.role = 'student';
        }

        recordLoginAttempt(normalizedEmail, true);
        saveActiveUserSession(finalUser, true);
        return { success: true, user: finalUser };
      } catch (dbErr: any) {
        console.warn("Firebase post-login profile error:", dbErr);
        return {
          success: false,
          error: isEn ? 'Could not complete login with the database. Please try again.' : 'تعذر إكمال تسجيل الدخول مع قاعدة البيانات. يرجى المحاولة مرة أخرى.'
        };
      }
    } else {
      const users = getStorageItem<UserAuth[]>('users', defaultUsers);
      const found = users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!found) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل بالمنصة.' };
      }
      if (found.status === 'suspended') {
        return { success: false, accountStatus: 'suspended', error: 'تم إيقاف هذا الحساب من قبل إدارة المنصة الجامعية.' };
      }
      if (found.status === 'pending' || (found.role !== 'admin' && found.isApproved === false && found.status !== 'active')) {
        return { success: false, accountStatus: 'pending', error: 'حسابك قيد المراجعة حالياً (Pending) من قبل إدارة المنصة الجامعية. يرجى الانتظار حتى يتم قبول الحساب.' };
      }
      if (found.status === 'rejected') {
        return { success: false, accountStatus: 'rejected', error: 'تم رفض طلب تسجيل حسابك (Rejected) من قبل إدارة المنصة الجامعية.' };
      }
      recordLoginAttempt(normalizedEmail, true);
      saveActiveUserSession(found);
      return { success: true, user: found };
    }
  },

  // Register user supporting university student/administrator
  registerUser: async (
    name: string, 
    email: string, 
    password: string, 
    role: 'student' | 'teacher' | 'admin' = 'student', 
    phone: string = '',
    grade: string = 'year1',
    department: string = 'IT',
    semester: string = 'term1'
  ): Promise<{ success: boolean; user?: UserAuth; error?: string; errorCode?: string; blockedDomain?: string; accountStatus?: 'pending' | 'active' | 'rejected' | 'suspended' }> => {
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

    if (isAdminEmail(normalizedEmail)) {
      return { success: false, error: 'هذا البريد الإلكتروني مخصص لحساب المدير. يرجى تسجيل الدخول من تبويب «المدير».' };
    }

    const nowIso = new Date().toISOString();
    const subExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const userRole = isAdminEmail(normalizedEmail) ? 'admin' : 'student';

    if (isFirebaseConfigured) {
      try {
        const qExistUser = query(collection(firestoreDb, 'users'), where('email', '==', normalizedEmail));
        const existSnap = await withFirestoreReadTimeout(getDocs(qExistUser), 3500, 'registerUser:checkExisting');
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
    const initialApproved = userRole === 'admin';
    const newUser: UserAuth = {
      id: 'usr_' + Date.now(),
      uid: 'usr_' + Date.now(),
      name: name.trim() || (userRole === 'admin' ? 'Eng/Mohamed abdal tawab' : 'طالب تكنولوجيا المعلومات'),
      email: normalizedEmail,
      phone: phone.trim(),
      role: userRole,
      department: department || 'IT',
      grade: grade || 'year1',
      semester: semester || 'term1',
      createdAt: nowIso,
      status: initialStatus,
      isApproved: initialApproved,
      purchasedCourseIds: userRole === 'student' ? [] : undefined,
      watchedLessonIds: userRole === 'student' ? [] : undefined,
      quizGrades: userRole === 'student' ? {} : undefined,
      favorites: userRole === 'student' ? [] : undefined,
      bookmarkedLectureIds: userRole === 'student' ? [] : undefined,
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
          const code = String(createErr?.code || '');
          if (code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
              firebaseUid = userCredential.user.uid;
            } catch {
              return { 
                success: false, 
                errorCode: code,
                error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.' 
              };
            }
          } else if (code === 'auth/weak-password') {
            return { success: false, errorCode: code, error: 'كلمة المرور ضعيفة للغاية. استخدم 6 أحرف على الأقل.' };
          } else if (code === 'auth/invalid-email') {
            return { success: false, errorCode: code, error: 'صيغة البريد الإلكتروني غير صحيحة.' };
          } else if (code === 'auth/unauthorized-domain') {
            const host = typeof window !== 'undefined' ? window.location.hostname : '';
            return {
              success: false,
              errorCode: code,
              blockedDomain: host,
              error: isEnglishUi()
                ? `Current domain (${host}) is not in Firebase Authorized domains.`
                : `النطاق الحالي (${host}) غير مضاف في قائمة Authorized domains داخل Firebase Console.`
            };
          } else if (code === 'auth/network-request-failed') {
            return {
              success: false,
              errorCode: code,
              error: isEnglishUi()
                ? 'Network error while contacting Firebase Authentication.'
                : 'تعذر الاتصال بخادم المصادقة. تحقق من اتصال الإنترنت.'
            };
          } else if (code === 'auth/operation-not-allowed') {
            return {
              success: false,
              errorCode: code,
              error: isEnglishUi()
                ? 'Email/Password registration is disabled in Firebase Authentication. Please sign in with Google or enable Email/Password in Firebase Console.'
                : 'التسجيل بالبريد الإلكتروني وكلمة المرور غير مفعّل في Firebase Authentication. يمكنك التسجيل بحساب Google أو تفعيله من Firebase Console.'
            };
          } else {
            return {
              success: false,
              errorCode: code,
              error: createErr?.message || (isEnglishUi() ? 'Registration failed in Firebase Authentication.' : 'تعذر إنشاء الحساب في Firebase Authentication.')
            };
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
          grade: finalUser.grade || 'year1',
          semester: finalUser.semester || 'term1',
          department: finalUser.department || 'IT',
          role: userRole,
          createdAt: nowIso,
          status: initialStatus,
          isApproved: initialApproved,
          subscription: finalUser.subscription || { active: false, expiresAt: '' },
          purchasedCourseIds: [],
          watchedLessonIds: [],
          quizGrades: {},
          favorites: [],
          bookmarkedLectureIds: []
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
              favorites: [],
              bookmarkedLectureIds: [],
              enrollmentDate: nowIso.split('T')[0],
              status: initialStatus,
              isApproved: initialApproved,
              subscription: { active: false, expiresAt: '' },
              department: department || 'IT',
              grade: grade || 'year1',
              semester: semester || 'term1',
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
          return { success: false, accountStatus: 'pending', error: 'تم إرسال طلب تسجيل حسابك بنجاح ✅ وهو الآن قيد المراجعة (Pending) من قبل إدارة المنصة. يرجى الانتظار حتى يتم قبول حسابك لتتمكن من الدخول.' };
        }
        recordLoginAttempt(normalizedEmail, true);
        saveActiveUserSession(finalUser, true);
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
          return { success: false, error: 'حسابك قيد المراجعة حالياً من قبل إدارة المنصة الجامعية. يرجى الانتظار حتى يتم قبول الحساب.' };
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
        semester: newUser.semester,
        createdAt: nowIso
      };
      studentsList.push(newStudentDoc);
      setStorageItem('students', studentsList);

      if (initialStatus === 'pending') {
        return { success: false, error: 'تم إرسال طلب تسجيل حسابك بنجاح ✅ وهو الآن قيد المراجعة من قبل إدارة المنصة الجامعية. يرجى الانتظار حتى يتم قبول حسابك لتتمكن من الدخول.' };
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

  finalizeGoogleSignedInUser: async (
    fbUser: User,
    targetMode: 'admin' | 'student' = 'student'
  ): Promise<{ success: boolean; user?: UserAuth; admin?: Admin; accountStatus?: string; error?: string; errorCode?: string; blockedDomain?: string; canUseRedirect?: boolean }> => {
    const cleanEmail = (fbUser.email || '').trim().toLowerCase();
    const uid = fbUser.uid;
    const isEn = isEnglishUi();
    const adminLevel = await resolveAdminAccessLevel(cleanEmail, fbUser);
    const isAdm = adminLevel !== null;

    if (targetMode === 'admin' && !isAdm) {
      await signOut(firebaseAuth).catch(() => {});
      return { success: false, error: isEn ? 'This Google account is not authorized with manager privileges.' : 'هذا الحساب غير مصرح له بصلاحيات إدارة المنصة.' };
    }

    const nowIso = new Date().toISOString();
    const userRef = doc(firestoreDb, 'users', uid);
    let userData: UserAuth | null = null;
    let snapExists = false;

    const profileRes = await fetchAuthenticatedFirestoreDocWithStatus('users', uid, fbUser);
    if (profileRes.unreachable && !isAdm) {
      return {
        success: false,
        error: isEn
          ? 'Google sign-in succeeded, but the platform database could not be reached. Please check your connection and try again.'
          : 'تم التحقق عبر Google، لكن تعذر الاتصال بقاعدة البيانات لتحميل ملفك. تحقق من الإنترنت وحاول مرة أخرى.'
      };
    }

    if (profileRes.exists && profileRes.data) {
      snapExists = true;
      userData = { id: uid, uid, ...(profileRes.data as UserAuth) };
      if (isAdm && adminLevel) {
        userData.role = 'admin';
        userData.adminLevel = adminLevel;
        userData.status = 'active';
        userData.isApproved = true;
        await setDoc(userRef, { role: 'admin', adminLevel, status: 'active', isApproved: true }, { merge: true }).catch(() => {});
      } else if (userData.role === 'admin') {
        userData.role = 'student';
      }
    }

    if (!snapExists || !userData) {
      userData = {
        id: uid,
        uid,
        name: fbUser.displayName || (isAdm ? (isSuperAdminEmail(cleanEmail) ? 'Eng/Mohamed abdal tawab' : cleanEmail.split('@')[0]) : 'طالب تكنولوجيا المعلومات'),
        email: cleanEmail,
        phone: fbUser.phoneNumber || '',
        role: isAdm ? 'admin' : 'student',
        adminLevel: isAdm && adminLevel ? adminLevel : undefined,
        department: 'IT',
        grade: 'year1',
        semester: 'term1',
        createdAt: nowIso,
        status: isAdm ? 'active' : 'pending',
        isApproved: isAdm,
        purchasedCourseIds: [],
        watchedLessonIds: [],
        quizGrades: {}
      };
      if (isAdm) {
        await setDoc(userRef, userData, { merge: true }).catch(() => {});
      } else {
        try {
          await setDoc(userRef, userData, { merge: true });
          await setDoc(doc(firestoreDb, 'students', uid), {
            ...userData,
            enrollmentDate: nowIso.split('T')[0]
          }, { merge: true }).catch(() => {});
        } catch (writeErr) {
          console.warn("Firestore student creation warning during Google sign-in:", writeErr);
        }
      }
    }

    if (!isAdm) {
      if (userData.status === 'suspended') {
        await signOut(firebaseAuth).catch(() => {});
        return { success: false, accountStatus: 'suspended', error: 'تم إيقاف هذا الحساب من قبل إدارة المنصة الجامعية.' };
      }
      if (userData.status === 'rejected') {
        await signOut(firebaseAuth).catch(() => {});
        return { success: false, accountStatus: 'rejected', error: 'تم رفض طلب تسجيل حسابك (Rejected) من قبل إدارة المنصة الجامعية.' };
      }
      if (userData.status !== 'active' || userData.isApproved !== true) {
        await signOut(firebaseAuth).catch(() => {});
        return { success: false, accountStatus: 'pending', error: 'تم تسجيل طلب حسابك وهو الآن في انتظار موافقة الإدارة (Pending).' };
      }
    }

    recordLoginAttempt(cleanEmail, true);
    saveActiveUserSession(userData, true);
    if (isAdm && adminLevel) {
      return {
        success: true,
        user: userData,
        admin: { id: uid, name: userData.name || (isSuperAdminEmail(cleanEmail) ? 'Eng/Mohamed abdal tawab' : cleanEmail.split('@')[0]), email: cleanEmail, role: adminLevel }
      };
    }
    return { success: true, user: userData };
  },

  loginWithGoogle: async (targetMode: 'admin' | 'student' = 'student'): Promise<{ success: boolean; user?: UserAuth; admin?: Admin; accountStatus?: string; error?: string; errorCode?: string; blockedDomain?: string; canUseRedirect?: boolean }> => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: 'خدمة Google غير متاحة في وضع التخزين المحلي.' };
    }
    const isEn = isEnglishUi();
    if (activeGooglePopupInFlight) {
      return {
        success: false,
        errorCode: 'auth/cancelled-popup-request',
        error: isEn ? 'A Google sign-in window is already open. Please complete or close it first.' : 'نافذة تسجيل الدخول بحساب Google مفتوحة بالفعل. يرجى إتمامها أو إغلاقها أولاً.'
      };
    }

    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isTopLevelWindow = typeof window !== 'undefined' && (() => { try { return window.self === window.top; } catch { return false; } })();

    // Prevent doomed signInWithPopup race on known unauthorized domains (eliminates Firebase 12.16.0 _PopupOperation unhandled rejection)
    if (cachedAuthorizedDomains && !isHostMatchedInAuthorizedDomains(host, cachedAuthorizedDomains)) {
      const refreshed = await fetchFirebaseAuthorizedDomains(true);
      if (refreshed && !isHostMatchedInAuthorizedDomains(host, refreshed)) {
        return {
          success: false,
          errorCode: 'auth/unauthorized-domain',
          blockedDomain: host,
          error: isEn
            ? `Current domain (${host}) is not authorized in Firebase Console > Authentication > Settings > Authorized domains.`
            : `النطاق الحالي غير مضاف بعد في قائمة Authorized domains داخل Firebase Console > Authentication > Settings.`
        };
      }
      clearRejectedOriginValidationCache(firebaseAuth);
    }

    activeGooglePopupInFlight = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(firebaseAuth, provider);
      return await authService.finalizeGoogleSignedInUser(credential.user, targetMode);
    } catch (err: any) {
      clearRejectedOriginValidationCache(firebaseAuth);
      console.warn("Google sign-in notice:", err?.code || err?.message || err);
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { success: false, errorCode: code, error: isEn ? 'Google sign-in popup was closed before completion.' : 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.' };
      }
      if (code === 'auth/popup-blocked') {
        return {
          success: false,
          errorCode: code,
          canUseRedirect: isTopLevelWindow,
          error: isEn
            ? 'Popup was blocked by the browser. Allow popups or continue via full-page redirect.'
            : 'قام المتصفح بحظر نافذة تسجيل الدخول المنبثقة. اسمح بالنوافذ المنبثقة أو استخدم المتابعة بإعادة التوجيه.'
        };
      }
      if (code === 'auth/operation-not-allowed') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'Google Sign-In provider is not enabled in Firebase Authentication Console.'
            : 'مزود الدخول بحساب Google غير مفعّل في Firebase Console > Authentication > Sign-in method.'
        };
      }
      if (code === 'auth/unauthorized-domain') {
        cachedAuthorizedDomainsFetchedAt = 0;
        return {
          success: false,
          errorCode: code,
          blockedDomain: host,
          error: isEn
            ? `Current domain (${host}) is not authorized in Firebase Console > Authentication > Settings > Authorized domains.`
            : `النطاق الحالي غير مضاف بعد في قائمة Authorized domains داخل Firebase Console > Authentication > Settings.`
        };
      }
      if (code === 'auth/network-request-failed' || code === 'auth/internal-error') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'Network or browser popup error while contacting Google Authentication. Please try again.'
            : 'تعذر الاتصال بخدمة مصادقة Google أو تم مقاطعة النافذة. تحقق من اتصال الإنترنت وأعد المحاولة.'
        };
      }
      if (code === 'auth/account-exists-with-different-credential') {
        return {
          success: false,
          errorCode: code,
          error: isEn
            ? 'An account already exists with this email using a different sign-in method.'
            : 'يوجد حساب مسجل بهذا البريد بطريقة دخول أخرى.'
        };
      }
      return { success: false, errorCode: code, error: err?.message || (isEn ? 'Unable to sign in with Google.' : 'تعذر تسجيل الدخول عبر Google.') };
    } finally {
      activeGooglePopupInFlight = false;
    }
  },

  loginWithGoogleRedirect: async (targetMode: 'admin' | 'student' = 'student'): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: 'خدمة Google غير متاحة في وضع التخزين المحلي.' };
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('academy_pending_google_redirect_mode', targetMode);
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(firebaseAuth, provider);
      return { success: true };
    } catch (err: any) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('academy_pending_google_redirect_mode');
      }
      return { success: false, error: err?.message || 'تعذر فتح صفحة تسجيل الدخول عبر Google.' };
    }
  },

  consumeGoogleRedirectResult: async (): Promise<{
    handled: boolean;
    mode?: 'admin' | 'student';
    result?: { success: boolean; user?: UserAuth; admin?: Admin; accountStatus?: string; error?: string; errorCode?: string; blockedDomain?: string };
  }> => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { handled: false };
    }
    const savedMode = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('academy_pending_google_redirect_mode') as 'admin' | 'student' | null)
      : null;
    if (!savedMode) {
      return { handled: false };
    }
    try {
      const redirectResult = await getRedirectResult(firebaseAuth);
      if (!redirectResult || !redirectResult.user) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('academy_pending_google_redirect_mode');
        }
        return { handled: false };
      }
      const mode: 'admin' | 'student' = savedMode === 'admin' ? 'admin' : 'student';
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('academy_pending_google_redirect_mode');
      }
      const finalized = await authService.finalizeGoogleSignedInUser(redirectResult.user, mode);
      return { handled: true, mode, result: finalized };
    } catch (err: any) {
      const mode: 'admin' | 'student' = savedMode === 'admin' ? 'admin' : 'student';
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('academy_pending_google_redirect_mode');
      }
      const code = String(err?.code || '');
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      return {
        handled: Boolean(savedMode || code),
        mode,
        result: {
          success: false,
          errorCode: code,
          blockedDomain: code === 'auth/unauthorized-domain' ? host : undefined,
          error: err?.message || 'تعذر إتمام تسجيل الدخول عبر Google.'
        }
      };
    }
  },

  getAllUsers: async (): Promise<UserAuth[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (!isFirebaseSignedInAdmin()) {
        return getStorageItem<UserAuth[]>('users', defaultUsers);
      }
      try {
        const snap = await getDocs(collection(firestoreDb, 'users'));
        const list: UserAuth[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as UserAuth));
        return list;
      } catch (err) {
        console.warn("Firebase get all users fallback:", err);
      }
    }
    return getStorageItem<UserAuth[]>('users', defaultUsers);
  },

  updateUser: async (id: string, data: Partial<UserAuth>): Promise<void> => {
    return authService.updateUserProfile(id, data);
  },

  updateUserProfile: async (id: string, data: Partial<UserAuth>): Promise<void> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      try {
        const cleanData = sanitizeForFirestore(data) as any;
        await setDoc(doc(firestoreDb, 'users', id), cleanData, { merge: true });
        await setDoc(doc(firestoreDb, 'students', id), cleanData, { merge: true }).catch(() => {});
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر تحديث بيانات المستخدم في قاعدة البيانات السحابية.'));
      }
    }
    
    // Sync local storage cache
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
    checkAdminWrite('delete_user', { id, email });
    await requireCloudWriteAuth(true);
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'users', id));
        if (email) {
          const cleanEmail = email.trim().toLowerCase();
          const q = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            const uData = d.data();
            if (uData.role === 'admin' || isAdminEmail(uData.email || '')) continue;
            await deleteDoc(doc(firestoreDb, 'users', d.id));
          }
        }
      } catch (err: any) {
        throw new Error(formatCloudErrorMessage(err, 'تعذر حذف حساب المستخدم من قاعدة البيانات السحابية.'));
      }
    }
    const users = getStorageItem<UserAuth[]>('users', defaultUsers);
    const updated = users.filter(u => u.id !== id && (email ? u.email.toLowerCase() !== email.trim().toLowerCase() : true));
    setStorageItem('users', updated);
  },

  logout: async (): Promise<void> => {
    verifiedAdminCheckCache.key = '';
    verifiedAdminCheckCache.allowed = false;
    verifiedAdminCheckCache.ts = 0;
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
            const adminLevel = await resolveAdminAccessLevel(cleanEmail, fbUser);
            const userRef = doc(firestoreDb, 'users', uid);
            const profileRes = await fetchAuthenticatedFirestoreDocWithStatus('users', uid, fbUser);
            if (profileRes.exists && profileRes.data) {
              userData = { id: uid, uid, ...(profileRes.data as UserAuth) };
            } else if (!profileRes.unreachable) {
              const isAdm = adminLevel !== null;
              const role = isAdm ? 'admin' : 'student';
              userData = {
                id: uid,
                uid,
                name: fbUser.displayName || (isAdm ? (isSuperAdminEmail(cleanEmail) ? 'Eng/Mohamed abdal tawab' : cleanEmail.split('@')[0]) : 'طالب تكنولوجيا المعلومات'),
                email: cleanEmail,
                phone: '',
                role,
                adminLevel: isAdm && adminLevel ? adminLevel : undefined,
                department: 'IT',
                grade: 'year1',
                createdAt: new Date().toISOString(),
                status: isAdm ? 'active' : 'pending',
                isApproved: isAdm
              };
              await setDoc(userRef, userData, { merge: true }).catch(() => {});
            } else {
              const savedFallback = authService.getCurrentUser();
              if (savedFallback && (savedFallback.id === uid || savedFallback.email?.toLowerCase() === cleanEmail)) {
                callback(savedFallback);
                return;
              }
            }

            if (!userData) {
              if (adminLevel) {
                const fallbackAdmin: UserAuth = {
                  id: uid,
                  uid,
                  name: fbUser.displayName || (isSuperAdminEmail(cleanEmail) ? 'Eng/Mohamed abdal tawab' : cleanEmail.split('@')[0]),
                  email: cleanEmail,
                  phone: '',
                  role: 'admin',
                  adminLevel,
                  department: 'IT',
                  grade: 'year1',
                  createdAt: new Date().toISOString(),
                  status: 'active',
                  isApproved: true
                };
                saveActiveUserSession(fallbackAdmin);
                callback(fallbackAdmin);
                return;
              }
              callback(null);
              return;
            }

            if (adminLevel) {
              userData.role = 'admin';
              userData.adminLevel = adminLevel;
              userData.status = 'active';
              userData.isApproved = true;
            } else {
              if (userData.role === 'admin') {
                userData.role = 'student';
              }
              if (userData.status !== 'active' || userData.isApproved !== true) {
                localStorage.removeItem('academy_active_user');
                callback(null);
                return;
              }
            }

            const savedLocal = localStorage.getItem('academy_active_user');
            let localTime = 0;
            let savedUid = '';
            if (savedLocal) {
              try {
                const parsedLocal = JSON.parse(savedLocal);
                localTime = parsedLocal.lastLoginTimestamp || 0;
                savedUid = parsedLocal.id || parsedLocal.uid || '';
              } catch {}
            }
            userData.lastLoginTimestamp =
              (savedUid === uid && localTime > 0)
                ? Math.max(localTime, Number(userData.lastLoginTimestamp || 0))
                : (userData.lastLoginTimestamp || Date.now());

            saveActiveUserSession(userData);
            const validUser = authService.getCurrentUser();
            if (!validUser) {
              await signOut(firebaseAuth);
            }
            callback(validUser);
          } catch (err) {
            console.error("Error fetching auth user from Firestore:", err);
            if (isAdminEmail(cleanEmail)) {
              const fallbackAdmin: UserAuth = {
                id: uid,
                uid,
                name: fbUser.displayName || (isSuperAdminEmail(cleanEmail) ? 'Eng/Mohamed abdal tawab' : cleanEmail.split('@')[0]),
                email: cleanEmail,
                phone: '',
                role: 'admin',
                adminLevel: isSuperAdminEmail(cleanEmail) ? 'super' : 'editor',
                department: 'IT',
                grade: 'year1',
                createdAt: new Date().toISOString(),
                status: 'active',
                isApproved: true
              };
              saveActiveUserSession(fallbackAdmin);
              callback(fallbackAdmin);
              return;
            }
            const saved = authService.getCurrentUser();
            callback(saved);
          }
        } else {
          localStorage.removeItem('academy_active_user');
          callback(null);
        }
      });
    } else {
      const saved = authService.getCurrentUser();
      callback(saved);
      return () => {};
    }
  }
};
