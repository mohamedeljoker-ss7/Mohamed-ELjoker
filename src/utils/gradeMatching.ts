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
  { id: 'prep1', nameAr: 'الصف الأول الإعدادي', nameEn: '1st Prep Grade' },
  { id: 'prep2', nameAr: 'الصف الثاني الإعدادي', nameEn: '2nd Prep Grade' },
  { id: 'prep3', nameAr: 'الصف الثالث الإعدادي', nameEn: '3rd Prep Grade' },
  { id: 'sec1', nameAr: 'الصف الأول الثانوي', nameEn: '1st Secondary Grade' },
  { id: 'sec2', nameAr: 'الصف الثاني الثانوي', nameEn: '2nd Secondary Grade' },
  { id: 'sec3', nameAr: 'الصف الثالث الثانوي', nameEn: '3rd Secondary Grade' },
];

export const ACADEMIC_SUBJECTS: AcademicSubject[] = [
  { id: 'العلوم', nameAr: 'العلوم', nameEn: 'Science' },
  { id: 'العلوم المتكاملة', nameAr: 'العلوم المتكاملة', nameEn: 'Integrated Sciences' },
  { id: 'الرياضيات', nameAr: 'الرياضيات', nameEn: 'Mathematics' },
  { id: 'الجبر', nameAr: 'الجبر', nameEn: 'Algebra' },
  { id: 'الهندسة', nameAr: 'الهندسة', nameEn: 'Geometry' },
  { id: 'اللغة العربية', nameAr: 'اللغة العربية', nameEn: 'Arabic Language' },
  { id: 'اللغة الإنجليزية', nameAr: 'اللغة الإنجليزية', nameEn: 'English Language' },
  { id: 'الدراسات الاجتماعية', nameAr: 'الدراسات الاجتماعية', nameEn: 'Social Studies' },
  { id: 'التاريخ', nameAr: 'التاريخ', nameEn: 'History' },
  { id: 'الجغرافيا', nameAr: 'الجغرافيا', nameEn: 'Geography' },
  { id: 'الفلسفة والمنطق', nameAr: 'الفلسفة والمنطق', nameEn: 'Philosophy & Logic' },
  { id: 'علم النفس', nameAr: 'علم النفس', nameEn: 'Psychology' },
  { id: 'الكيمياء', nameAr: 'الكيمياء', nameEn: 'Chemistry' },
  { id: 'الفيزياء', nameAr: 'الفيزياء', nameEn: 'Physics' },
  { id: 'الأحياء', nameAr: 'الأحياء', nameEn: 'Biology' },
  { id: 'الجيولوجيا', nameAr: 'الجيولوجيا', nameEn: 'Geology' },
  { id: 'الحاسب الآلي', nameAr: 'الحاسب الآلي', nameEn: 'Computer Science' },
  { id: 'تكنولوجيا المعلومات ICT', nameAr: 'تكنولوجيا المعلومات ICT', nameEn: 'Information & Communication Tech (ICT)' },
  { id: 'التربية الدينية', nameAr: 'التربية الدينية', nameEn: 'Religious Education' },
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
  if (c === '1prep' || c === 'prep1' || c === 'prep_1' || c.includes('أول إعداد') || c.includes('اول إعداد') || c.includes('أول اعداد') || c.includes('1st prep') || c.includes('grade 1 prep')) return 'prep1';
  if (c === '2prep' || c === 'prep2' || c === 'prep_2' || c.includes('ثاني إعداد') || c.includes('ثانى إعداد') || c.includes('ثاني اعداد') || c.includes('2nd prep') || c.includes('grade 2 prep')) return 'prep2';
  if (c === '3prep' || c === 'prep3' || c === 'prep_3' || c.includes('ثالث إعداد') || c.includes('ثالث اعداد') || c.includes('3rd prep') || c.includes('grade 3 prep')) return 'prep3';
  if (c === '1sec' || c === 'sec1' || c === 'sec_1' || c.includes('أول ثان') || c.includes('اول ثان') || c.includes('1st sec') || c.includes('grade 1 sec') || c.includes('علوم متكاملة') || c.includes('integrated science')) return 'sec1';
  if (c === '2sec' || c === 'sec2' || c === 'sec_2' || c.includes('ثاني ثان') || c.includes('ثانى ثان') || c.includes('2nd sec') || c.includes('grade 2 sec')) return 'sec2';
  if (c === '3sec' || c === 'sec3' || c === 'sec_3' || c.includes('ثالث ثان') || c.includes('3rd sec') || c.includes('grade 3 sec')) return 'sec3';
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


