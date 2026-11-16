import { Course, Student, UserAuth, Order, Lesson } from '../types';
import { parseVideoSource, extractYouTubeVideoId, buildYouTubeEmbedUrl, ParsedVideoInfo } from './videoUtils';

export { parseVideoSource, extractYouTubeVideoId, buildYouTubeEmbedUrl };
export type { ParsedVideoInfo };

/**
 * Checks if a course is Premium.
 * A course is Premium if course.isPremium is explicitly true,
 * or if course.isFree is false / undefined (default to Premium unless explicitly Free).
 */
export function isCoursePremium(course: Course | null | undefined): boolean {
  if (!course) return true;
  if (typeof course.isPremium === 'boolean') {
    return course.isPremium;
  }
  // If isFree is explicitly true, it is not premium
  if (course.isFree === true) {
    return false;
  }
  return true;
}

/**
 * Verifies access permission for educational content.
 * Platform is 100% Free. Access is granted solely based on Administration Account Approval.
 * Returns { allowed: true } or { allowed: false, reason: 'not_logged_in' | 'pending_approval' | 'rejected' | 'suspended' }
 */
export function verifyCourseAccess(
  user: UserAuth | Student | null | undefined,
  _course?: Course | null | undefined,
  _userOrders?: Order[]
): { allowed: boolean; reason?: 'not_logged_in' | 'subscription_required' | 'pending_approval' | 'rejected' | 'suspended' } {
  // 1. Not logged in
  if (!user || ('role' in user && (user.role as string) === 'guest')) {
    return { allowed: false, reason: 'not_logged_in' };
  }

  // 2. Admin and Teacher roles have full access
  const isAdminOrTeacher = ('role' in user && (user.role === 'admin' || user.role === 'teacher'));
  if (isAdminOrTeacher) {
    return { allowed: true };
  }

  // 3. Block if account is suspended
  if (user.status === 'suspended') {
    return { allowed: false, reason: 'suspended' };
  }

  // 4. Block if account was rejected
  if (user.status === 'rejected') {
    return { allowed: false, reason: 'rejected' };
  }

  // 5. Account is pending admin approval
  if (user.status === 'pending' || user.isApproved === false) {
    return { allowed: false, reason: 'pending_approval' };
  }

  // 6. Active / Approved student has 100% free access to all content!
  if (user.status === 'active' || user.isApproved === true) {
    return { allowed: true };
  }

  // Default fallback
  return { allowed: false, reason: 'pending_approval' };
}

/**
 * Universally formats a video URL into an embeddable format for iframes or videos.
 */
export function formatVideoEmbedUrl(url?: string | null): ParsedVideoInfo {
  return parseVideoSource(url);
}

/**
 * Universally formats a PDF or document URL for viewing in embedded players.
 */
export function formatPdfEmbedUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === '#') {
    return '';
  }
  const clean = url.trim();
  if (clean.startsWith('firestore://') || clean.startsWith('indexeddb://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  if (clean.includes('drive.google.com')) {
    const match = clean.match(/\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    if (clean.includes('/view') || clean.includes('/edit')) {
      return clean.replace(/\/(?:view|edit).*/, '/preview');
    }
  }
  return `https://docs.google.com/viewer?url=${encodeURIComponent(clean)}&embedded=true`;
}

/**
 * Normalizes course lessons from all possible sources (course.lessons, external lessons collection, or course.units).
 * Guarantees that any course will have a valid lessons array, generating a default introductory lesson if none exists.
 */
export function normalizeCourseLessons(course: Course | null | undefined, extLessons?: any[]): Course {
  if (!course) {
    return {} as Course;
  }
  let lessons: Lesson[] = course.lessons && Array.isArray(course.lessons) ? [...course.lessons] : [];

  if (extLessons && extLessons.length > 0) {
    const sortedExt = [...extLessons].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (lessons.length === 0 || sortedExt.length >= lessons.length) {
      lessons = sortedExt;
    }
  }

  // If lessons is still empty or if units contains lessons, extract from units
  if (course.units && Array.isArray(course.units) && course.units.length > 0) {
    const derivedFromUnits: any[] = [];
    course.units.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((u, uIdx) => {
      if (u.lessons && Array.isArray(u.lessons)) {
        u.lessons.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((lsn, lIdx) => {
          derivedFromUnits.push({
            id: lsn.id || `lsn_${course.id}_${uIdx}_${lIdx}`,
            titleAr: lsn.title || (lsn as any).titleAr || 'حصة دراسية',
            titleEn: lsn.title || (lsn as any).titleEn || (lsn as any).titleAr || 'Lesson',
            videoUrl: lsn.videoUrl || '',
            pdfUrl: lsn.pdfUrl || '',
            duration: lsn.duration || '15:00',
            attachments: (lsn as any).attachments || [],
            courseId: course.id,
            order: derivedFromUnits.length + 1
          });
        });
      }
    });
    if (derivedFromUnits.length > 0 && (lessons.length === 0 || derivedFromUnits.length >= lessons.length)) {
      lessons = derivedFromUnits;
    }
  }

  // Fallback: If after checking all sources lessons is still empty, create a default introductory lesson
  if (lessons.length === 0) {
    lessons = [{
      id: `lsn_init_${course.id}`,
      titleAr: 'المحاضرة التمهيدية وشرح المنهج',
      titleEn: 'Course Introduction & Syllabus Overview',
      videoUrl: course.videoUrl || '',
      pdfUrl: course.pdfUrl || '',
      duration: course.duration || '20:00',
      courseId: course.id,
      order: 1
    } as Lesson];
  }

  // Ensure every lesson has a fallback videoUrl and pdfUrl if lesson's own is empty
  const fallbackVideo = course.videoUrl || '';
  const fallbackPdf = course.pdfUrl || '';

  const mappedLessons = lessons.map(lsn => ({
    ...lsn,
    videoUrl: (lsn.videoUrl && lsn.videoUrl.trim() !== '') ? lsn.videoUrl : fallbackVideo,
    pdfUrl: (lsn.pdfUrl && lsn.pdfUrl.trim() !== '') ? lsn.pdfUrl : fallbackPdf
  }));

  return { ...course, lessons: mappedLessons };
}
