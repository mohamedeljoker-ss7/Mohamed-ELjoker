import { Course, Category } from '../types';

export interface AcademicGrade {
  id: string; // e.g., 'prep1', 'sec1'
  nameAr: string;
  nameEn: string;
}

export interface AcademicSubject {
  id: string;
  nameAr: string;
  nameEn: string;
}

export const ACADEMIC_GRADES: AcademicGrade[] = [
  { id: 'year1', nameAr: 'الفرقة الأولى - IT', nameEn: '1st Year - IT' },
  { id: 'year2', nameAr: 'الفرقة الثانية - IT', nameEn: '2nd Year - IT' },
  { id: 'year3', nameAr: 'الفرقة الثالثة - IT', nameEn: '3rd Year - IT' },
  { id: 'year4', nameAr: 'الفرقة الرابعة - IT', nameEn: '4th Year - IT' },
  { id: 'general', nameAr: 'جميع الفرق الدراسية', nameEn: 'All Academic Years' }
];

export const ACADEMIC_SEMESTERS: AcademicGrade[] = [
  { id: 'term1', nameAr: 'الفصل الدراسي الأول (الترم الأول)', nameEn: 'First Semester (Term 1)' },
  { id: 'term2', nameAr: 'الفصل الدراسي الثاني (الترم الثاني)', nameEn: 'Second Semester (Term 2)' },
  { id: 'all', nameAr: 'كلا الفصلين الدراسيين', nameEn: 'Both Semesters' }
];

export const ACADEMIC_SUBJECTS: AcademicSubject[] = [
  { id: 'Physics', nameAr: 'الفيزياء – Physics', nameEn: 'Physics' },
  { id: 'Python Programming', nameAr: 'برمجة بايثون – Python Programming', nameEn: 'Python Programming' },
  { id: 'IT Essentials', nameAr: 'أساسيات تكنولوجيا المعلومات – IT Essentials', nameEn: 'IT Essentials' },
  { id: 'Mathematics', nameAr: 'الرياضيات – Mathematics', nameEn: 'Mathematics' },
  { id: 'Cyber Security', nameAr: 'الأمن السيبراني – Cyber Security', nameEn: 'Cyber Security' },
  { id: 'English', nameAr: 'اللغة الإنجليزية – English', nameEn: 'English' },
];

export function normalizeSemesterCode(code?: string): string {
  if (!code) return 'all';
  const c = code.toLowerCase().trim();
  if (c === 'term1' || c === 'sem1' || c === 'semester1' || c === '1' || c.includes('أول') || c.includes('اول') || c.includes('first')) return 'term1';
  if (c === 'term2' || c === 'sem2' || c === 'semester2' || c === '2' || c.includes('ثان') || c.includes('تاني') || c.includes('second')) return 'term2';
  return 'all';
}

export function getSemesterName(semCode?: string, lang: 'ar' | 'en' = 'ar'): string {
  const norm = normalizeSemesterCode(semCode);
  const found = ACADEMIC_SEMESTERS.find(s => s.id === norm);
  if (found) return lang === 'ar' ? found.nameAr : found.nameEn;
  return lang === 'ar' ? 'كلا الفصلين' : 'All Semesters';
}

export function isContentPublished(item: { status?: string; published?: boolean } | null | undefined): boolean {
  if (!item) return false;
  if (item.status === 'draft' || item.status === 'unpublished') return false;
  if (item.published === false) return false;
  return true;
}

export function normalizeSubjectKey(value?: string | null): string {
  if (!value) return '';
  return value.toLowerCase().replace(/[–—\-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function doesSubjectMatch(
  item: { subject?: string; courseTitle?: string; courseId?: string },
  subjectFilter: string,
  courses?: Course[]
): boolean {
  if (!subjectFilter || subjectFilter === 'all') return true;
  const target = normalizeSubjectKey(subjectFilter);
  const subjMeta = ACADEMIC_SUBJECTS.find(
    (s) => normalizeSubjectKey(s.id) === target || normalizeSubjectKey(s.nameAr) === target || normalizeSubjectKey(s.nameEn) === target
  );
  const candidateTargets = subjMeta
    ? [normalizeSubjectKey(subjMeta.id), normalizeSubjectKey(subjMeta.nameAr), normalizeSubjectKey(subjMeta.nameEn)]
    : [target];

  const itemSubj = normalizeSubjectKey(item.subject);
  if (itemSubj) {
    return candidateTargets.some((c) => itemSubj === c || itemSubj.includes(c));
  }

  if (item.courseId && courses) {
    const matchedCourse = courses.find((c) => c.id === item.courseId);
    const courseSubj = normalizeSubjectKey(matchedCourse?.subject || matchedCourse?.subjectEn || matchedCourse?.subjectAr);
    if (courseSubj) {
      return candidateTargets.some((c) => courseSubj === c || courseSubj.includes(c));
    }
  }

  const fallbackCourseTitle = normalizeSubjectKey(item.courseTitle);
  return candidateTargets.some((c) => fallbackCourseTitle.includes(c));
}

export function isValidMediaOrWebUrl(input?: string | null): boolean {
  if (!input || !input.trim()) return true; // optional empty field
  const clean = input.trim();
  if (/^\s*(javascript|vbscript):/i.test(clean)) return false;
  if (clean.startsWith('firestore://') || clean.startsWith('indexeddb://') || clean.startsWith('blob:')) {
    return clean.length > 12;
  }
  if (clean.startsWith('data:image/')) {
    return clean.length <= 512 * 1024;
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return true; // direct YouTube video ID
  }
  if (/<iframe\b[^>]*src=["']https?:\/\/[^"']+["']/i.test(clean)) {
    return true;
  }
  try {
    const parsed = new URL(clean);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function doesItemMatchYearAndSemester(
  item: { academicYear?: string; semester?: string; courseId?: string },
  yearFilter: string,
  semesterFilter: string,
  courses?: Course[]
): boolean {
  if (yearFilter && yearFilter !== 'all' && yearFilter !== 'general') {
    const targetYear = normalizeGradeCode(yearFilter);
    let itemYear = item.academicYear ? normalizeGradeCode(item.academicYear) : '';
    if ((!itemYear || itemYear === 'all') && item.courseId && courses) {
      const c = courses.find(cr => cr.id === item.courseId);
      if (c?.grade) itemYear = normalizeGradeCode(c.grade);
    }
    if (itemYear && itemYear !== 'all' && itemYear !== targetYear) return false;
  }

  if (semesterFilter && semesterFilter !== 'all') {
    const targetSem = normalizeSemesterCode(semesterFilter);
    const itemSem = normalizeSemesterCode(item.semester);
    if (itemSem !== 'all' && itemSem !== targetSem) return false;
  }

  return true;
}

export function getGradeName(gradeCode?: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!gradeCode) return lang === 'ar' ? 'جميع الفرق - قسم IT' : 'All Years - IT Dept';
  const norm = normalizeGradeCode(gradeCode);
  const found = ACADEMIC_GRADES.find(g => g.id === norm || g.nameAr === gradeCode || g.nameEn === gradeCode);
  if (found) {
    return lang === 'ar' ? found.nameAr : found.nameEn;
  }
  if (norm === 'all' || norm === 'general') {
    return lang === 'ar' ? 'جميع الفرق الدراسية' : 'All Academic Years';
  }
  return gradeCode;
}

export function getCourseDisplayTitle(course: Course, lang: 'ar' | 'en' = 'ar'): string {
  if (!course) return '';
  const gradeLabel = getGradeName(course.grade || course.categoryId, lang);
  const subjectName = course.subject || course.subjectAr || (lang === 'ar' ? 'تكنولوجيا المعلومات IT' : 'Information Technology');

  if (course.subject || course.grade) {
    return `${subjectName} - ${gradeLabel}`;
  }

  const rawTitle = lang === 'ar' ? (course.titleAr || '') : (course.titleEn || course.titleAr || '');
  if (rawTitle) {
    return rawTitle;
  }

  return `${subjectName} - ${gradeLabel}`;
}

export function normalizeGradeCode(code?: string): string {
  if (!code) return '';
  const c = code.toLowerCase().trim();
  if (c === 'year1' || c === '1year' || c === 'year_1' || c.includes('أولى') || c.includes('اولى') || c.includes('الفرقة الأولى') || c.includes('1st year') || c === 'prep1' || c === 'sec1') return 'year1';
  if (c === 'year2' || c === '2year' || c === 'year_2' || c.includes('ثانية') || c.includes('تانية') || c.includes('الفرقة الثانية') || c.includes('2nd year') || c === 'prep2' || c === 'sec2') return 'year2';
  if (c === 'year3' || c === '3year' || c === 'year_3' || c.includes('ثالثة') || c.includes('تالته') || c.includes('الفرقة الثالثة') || c.includes('3rd year') || c === 'prep3' || c === 'sec3') return 'year3';
  if (c === 'year4' || c === '4year' || c === 'year_4' || c.includes('رابعة') || c.includes('الفرقة الرابعة') || c.includes('4th year')) return 'year4';
  if (c === 'all' || c === 'general' || c.includes('عام') || c.includes('جميع')) return 'all';
  return c;
}

/**
 * Extracts normalized grade code from course properties, category, or title.
 * Returns null if the course has no specific grade restriction (meaning it's general/all).
 */
export function getGradeFromCourseOrCategory(course: Course, categories?: Category[]): string | null {
  // 1. Direct course grade property
  if (course.grade && course.grade !== 'all' && course.grade !== 'general') {
    const code = normalizeGradeCode(course.grade);
    if (code && code !== 'all') return code;
  }

  // 2. Category ID match
  if (course.categoryId && course.categoryId !== 'all' && course.categoryId !== 'general') {
    const code = normalizeGradeCode(course.categoryId);
    if (code && code !== 'all') return code;
  }

  // 3. Category Name match
  if (categories && categories.length > 0) {
    const cat = categories.find(c => c.id === course.categoryId);
    if (cat) {
      const codeAr = normalizeGradeCode(cat.nameAr);
      if (codeAr && codeAr !== 'all') return codeAr;
      const codeEn = normalizeGradeCode(cat.nameEn);
      if (codeEn && codeEn !== 'all') return codeEn;
    }
  }

  // 4. Course Title / Subject match
  const titleArCode = normalizeGradeCode(course.titleAr);
  if (titleArCode && titleArCode !== 'all') return titleArCode;
  
  const titleEnCode = normalizeGradeCode(course.titleEn);
  if (titleEnCode && titleEnCode !== 'all') return titleEnCode;

  const subjectArCode = normalizeGradeCode(course.subjectAr);
  if (subjectArCode && subjectArCode !== 'all') return subjectArCode;

  const subjectEnCode = normalizeGradeCode(course.subjectEn);
  if (subjectEnCode && subjectEnCode !== 'all') return subjectEnCode;

  return null;
}

/**
 * Verifies if a course matches a student's grade level and department.
 */
export function doesCourseMatchStudent(
  course: Course, 
  studentGrade?: string, 
  studentDepartment?: string, 
  categories?: Category[]
): boolean {
  // Grade matching
  if (studentGrade && studentGrade !== 'all' && studentGrade !== 'general') {
    const normStudentGrade = normalizeGradeCode(studentGrade);
    if (normStudentGrade) {
      const courseGrade = getGradeFromCourseOrCategory(course, categories);
      // If course has a specific grade restriction that differs from student's grade, exclude it
      if (courseGrade && courseGrade !== normStudentGrade) {
        return false;
      }
    }
  }

  // Department matching (IT department umbrella covers networks, software, cybersecurity tracks)
  if (studentDepartment && studentDepartment !== 'all' && studentDepartment !== 'general') {
    const studentDep = studentDepartment.toLowerCase().trim();
    const courseDep = (course as any).department ? (course as any).department.toLowerCase().trim() : '';
    const itTracks = ['it', 'networks', 'software', 'cybersecurity'];
    const bothInIt = itTracks.includes(studentDep) && (courseDep === 'it' || itTracks.includes(courseDep));
    if (courseDep && courseDep !== 'all' && courseDep !== 'general' && !bothInIt) {
      if (courseDep !== studentDep) {
        return false;
      }
    }
  }

  return true;
}

export function doesCourseMatchStudentGrade(course: Course, studentGrade?: string, categories?: Category[]): boolean {
  return doesCourseMatchStudent(course, studentGrade, undefined, categories);
}


