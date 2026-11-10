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
  { id: 'general', nameAr: 'جميع الفرق الدراسية', nameEn: 'All Academic Years' },
  // Backward compatibility aliases
  { id: 'prep1', nameAr: 'الفرقة الأولى', nameEn: '1st Year' },
  { id: 'prep2', nameAr: 'الفرقة الثانية', nameEn: '2nd Year' },
  { id: 'prep3', nameAr: 'الفرقة الثالثة', nameEn: '3rd Year' },
  { id: 'sec1', nameAr: 'الفرقة الأولى', nameEn: '1st Year' },
  { id: 'sec2', nameAr: 'الفرقة الثانية', nameEn: '2nd Year' },
  { id: 'sec3', nameAr: 'الفرقة الثالثة', nameEn: '3rd Year' },
];

export const ACADEMIC_SUBJECTS: AcademicSubject[] = [
  { id: 'Physics', nameAr: 'الفيزياء – Physics', nameEn: 'Physics' },
  { id: 'Python Programming', nameAr: 'برمجة بايثون – Python Programming', nameEn: 'Python Programming' },
  { id: 'IT Essentials', nameAr: 'أساسيات تكنولوجيا المعلومات – IT Essentials', nameEn: 'IT Essentials' },
  { id: 'Mathematics', nameAr: 'الرياضيات – Mathematics', nameEn: 'Mathematics' },
  { id: 'Cyber Security', nameAr: 'الأمن السيبراني – Cyber Security', nameEn: 'Cyber Security' },
  { id: 'English', nameAr: 'اللغة الإنجليزية – English', nameEn: 'English' },
  // Short Arabic aliases
  { id: 'الفيزياء', nameAr: 'الفيزياء', nameEn: 'Physics' },
  { id: 'برمجة بايثون', nameAr: 'برمجة بايثون', nameEn: 'Python Programming' },
  { id: 'أساسيات تكنولوجيا المعلومات', nameAr: 'أساسيات تكنولوجيا المعلومات', nameEn: 'IT Essentials' },
  { id: 'الرياضيات', nameAr: 'الرياضيات', nameEn: 'Mathematics' },
  { id: 'الأمن السيبراني', nameAr: 'الأمن السيبراني', nameEn: 'Cyber Security' },
  { id: 'اللغة الإنجليزية', nameAr: 'اللغة الإنجليزية', nameEn: 'English' },
];

export function getGradeName(gradeCode?: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!gradeCode) return lang === 'ar' ? 'عام / جميع الصفوف' : 'General / All Grades';
  const norm = normalizeGradeCode(gradeCode);
  const found = ACADEMIC_GRADES.find(g => g.id === norm || g.nameAr === gradeCode || g.nameEn === gradeCode);
  if (found) {
    return lang === 'ar' ? found.nameAr : found.nameEn;
  }
  if (norm === 'all' || norm === 'general') {
    return lang === 'ar' ? 'جميع الصفوف الدراسية' : 'All Academic Grades';
  }
  return gradeCode;
}

export function getCourseDisplayTitle(course: Course, lang: 'ar' | 'en' = 'ar'): string {
  if (!course) return '';
  const gradeLabel = getGradeName(course.grade || course.categoryId, lang);
  const subjectName = course.subject || course.subjectAr || (lang === 'ar' ? 'العلوم' : 'Science');

  if (course.subject || course.grade) {
    return `${subjectName} - ${gradeLabel}`;
  }

  const rawTitle = lang === 'ar' ? (course.titleAr || '') : (course.titleEn || course.titleAr || '');
  if (rawTitle) {
    return rawTitle;
  }

  return `${subjectName} - ${gradeLabel}`;
}

/**
 * Normalizes grade codes across different representations:
 * '1prep', 'prep1', '1st Prep', 'الصف الأول الإعدادي' -> 'prep1'
 * '2prep', 'prep2', '2nd Prep', 'الصف الثاني الإعدادي' -> 'prep2'
 * '3prep', 'prep3', '3rd Prep', 'الصف الثالث الإعدادي' -> 'prep3'
 * '1sec', 'sec1', '1st Secondary', 'الصف الأول الثانوي' -> 'sec1'
 */
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

  // Department matching
  if (studentDepartment && studentDepartment !== 'all' && studentDepartment !== 'general') {
    const studentDep = studentDepartment.toLowerCase().trim();
    const courseDep = (course as any).department ? (course as any).department.toLowerCase().trim() : '';
    if (courseDep && courseDep !== 'all' && courseDep !== 'general') {
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


