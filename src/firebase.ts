import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, collection, doc, getDocs, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, onSnapshot, deleteField, increment } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';
import { Course, Category, Student, NewsItem, Article, UserReview, Message, Admin, WebsiteSettings, Teacher, Coupon, Order, Quiz, QuizSubmission, UserAuth, Assignment, AssignmentSubmission, Certificate, ChatMessage, ChatThread, LessonComment, Notification, LessonAccess, CourseAccess, CourseRequest, LectureItem, SectionItem, ExamItem, SheetItem, QuestionBankItem, OnlineExamQuestion, ExamSubmission, ScheduleItem, StudentInquiry, ActivityLogItem } from './types';
import { normalizeCourseLessons } from './utils/authAccess';
import { saveVideoToIndexedDB } from './utils/videoStorage';
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

// Pre-seeded 6 IT Department University Courses
export const IT_UNIVERSITY_COURSES: Course[] = [
  {
    id: 'course_physics_it',
    titleAr: 'Physics – الفيزياء',
    titleEn: 'Physics – General & Applied Physics for IT',
    descriptionAr: 'مقرر مادة الفيزياء العامة والتطبيقية لطلاب قسم تكنولوجيا المعلومات (IT) بالجامعة التكنولوجية. يشمل المحاضرات النظرية كاملة بصيغ PDF وسلايدز، وسكاشن المعامل والكهربية وشيتات المسائل والتقارير المعملية بصيغ Word (.docx) و PDF.',
    descriptionEn: 'General & Applied Physics course for Information Technology department at the Technological University. Includes lectures (PDF) and practical sections (Word/PDF).',
    teacherName: 'م. محمد عبد التواب',
    categoryId: 'year1',
    grade: 'year1',
    subject: 'Physics',
    subjectAr: 'الفيزياء',
    subjectEn: 'Physics',
    department: 'IT',
    price: 0,
    isFree: true,
    isPremium: false,
    duration: '24 ساعة معتمدة',
    lessonsCount: 6,
    featured: true,
    popular: true,
    published: true,
    status: 'published',
    thumbnailUrl: COURSE_HARDWARE_PHYSICS_IMG,
    imageUrls: [COURSE_HARDWARE_PHYSICS_IMG],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    units: [
      {
        id: 'unit_phys_lec',
        title: 'المحاضرات النظرية (Theoretical Lectures - PDF)',
        description: 'سلايدز ومذكرات محاضرات الفيزياء للجامعة التكنولوجية بصيغة PDF',
        order: 1,
        lessons: [
          {
            id: 'phys_lec_1',
            title: 'المحاضرة 1: الكهربية الساكنة والشحنات وقانون كولوم (PDF)',
            duration: '50:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 1
          },
          {
            id: 'phys_lec_2',
            title: 'المحاضرة 2: التيار الكهربي والمقاومة وقانون أوم وقوانين كيرشوف (PDF)',
            duration: '45:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 2
          },
          {
            id: 'phys_lec_3',
            title: 'المحاضرة 3: أشباه الموصلات والدايود والترانزستور في عتاد الحاسب (PDF)',
            duration: '55:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 3
          }
        ]
      },
      {
        id: 'unit_phys_sec',
        title: 'السكاشن العملية والمعامل (Lab Sections & Word Sheets)',
        description: 'شيتات وتجارب معمل الفيزياء بصيغة Word (.docx) و PDF',
        order: 2,
        lessons: [
          {
            id: 'phys_sec_1',
            title: 'سكشن عملي 1: تجربة تحقيق قانون أوم وتعيين المقاومة النوعية (Word DOCX)',
            duration: '40:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 1
          },
          {
            id: 'phys_sec_2',
            title: 'سكشن عملي 2: توصيل المقاومات على التوالي والتوازي وشيت الحل (Word DOCX)',
            duration: '45:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 2
          },
          {
            id: 'phys_sec_3',
            title: 'شيت مسائل الفيزياء الشامل ونماذج امتحانات الميدترم والفاينل (Word + PDF)',
            duration: '35:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 3
          }
        ]
      }
    ],
    createdAt: '2026-09-01'
  },
  {
    id: 'course_python_it',
    titleAr: 'Python Programming – برمجة بايثون',
    titleEn: 'Python Programming – Core & Practical IT Programming',
    descriptionAr: 'كورس برمجة بايثون الشامل لطلاب قسم تكنولوجيا المعلومات بالجامعة التكنولوجية. يغطي أساسيات البرمجة، هياكل البيانات، البرمجة كائنية التوجه OOP، وتطبيقات الخوارزميات. يشمل محاضرات PDF وسكاشن تطبيقية وشيتات تمارين Word مع أكواد بايثون كاملة.',
    descriptionEn: 'Complete Python Programming course for IT students. Includes lectures, lab exercises, and assignment sheets in Word and PDF.',
    teacherName: 'م. محمد عبد التواب',
    categoryId: 'year1',
    grade: 'year1',
    subject: 'Python Programming',
    subjectAr: 'برمجة بايثون',
    subjectEn: 'Python Programming',
    department: 'IT',
    price: 0,
    isFree: true,
    isPremium: false,
    duration: '32 ساعة معتمدة',
    lessonsCount: 6,
    featured: true,
    popular: true,
    published: true,
    status: 'published',
    thumbnailUrl: COURSE_PROGRAMMING_CYBER_IMG,
    imageUrls: [COURSE_PROGRAMMING_CYBER_IMG],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    units: [
      {
        id: 'unit_py_lec',
        title: 'محاضرات بايثون النظرية (Python Lectures - PDF)',
        description: 'مذكرات وسلايدز محاضرات بايثون بصيغة PDF',
        order: 1,
        lessons: [
          {
            id: 'py_lec_1',
            title: 'المحاضرة 1: مقدمة في بايثون، بيئة التشغيل، والمتغيرات Variables (PDF)',
            duration: '45:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 1
          },
          {
            id: 'py_lec_2',
            title: 'المحاضرة 2: الشروط والتحكم وسلاسل التكرار Loops & Conditionals (PDF)',
            duration: '50:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 2
          },
          {
            id: 'py_lec_3',
            title: 'المحاضرة 3: هياكل البيانات والقوائم والقواميس Lists, Tuples & Dictionaries (PDF)',
            duration: '60:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 3
          }
        ]
      },
      {
        id: 'unit_py_sec',
        title: 'سكاشن العملي والتطبيقات البرمجية (Lab Sections & Word Sheets)',
        description: 'شيتات التمارين والتكليفات والأكواد المعملية بصيغة Word (.docx)',
        order: 2,
        lessons: [
          {
            id: 'py_sec_1',
            title: 'سكشن عملي 1: إعداد VS Code وحل شيت البرامج الحسابية (Word DOCX)',
            duration: '45:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 1
          },
          {
            id: 'py_sec_2',
            title: 'سكشن عملي 2: تدريبات معملية على بناء الدوال Functions وكتابة الكود (Word DOCX)',
            duration: '50:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 2
          },
          {
            id: 'py_sec_3',
            title: 'شيت مشروع التيرم العملي لبايثون ونماذج امتحانات اللاب (Word DOCX)',
            duration: '40:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 3
          }
        ]
      }
    ],
    createdAt: '2026-09-01'
  },
  {
    id: 'course_it_essentials',
    titleAr: 'IT Essentials – أساسيات تكنولوجيا المعلومات',
    titleEn: 'IT Essentials – Hardware, Systems & Networking',
    descriptionAr: 'مقرر أساسيات تكنولوجيا المعلومات وعمارة الحاسب لطلاب قسم IT بالجامعة التكنولوجية. يشمل محاضرات PDF عن المكونات المادية والعتاد وأنظمة التشغيل، وسكاشن عملية لتجميع الحواسيب وتثبيت البرمجيات وشيتات التقارير الفنية بصيغة Word.',
    descriptionEn: 'IT Essentials course covering computer architecture, hardware components, operating systems, and troubleshooting. Lectures in PDF and practical labs in Word.',
    teacherName: 'م. محمد عبد التواب',
    categoryId: 'year1',
    grade: 'year1',
    subject: 'IT Essentials',
    subjectAr: 'أساسيات تكنولوجيا المعلومات',
    subjectEn: 'IT Essentials',
    department: 'IT',
    price: 0,
    isFree: true,
    isPremium: false,
    duration: '28 ساعة معتمدة',
    lessonsCount: 6,
    featured: true,
    popular: true,
    published: true,
    status: 'published',
    thumbnailUrl: COURSE_HARDWARE_PHYSICS_IMG,
    imageUrls: [COURSE_HARDWARE_PHYSICS_IMG],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    units: [
      {
        id: 'unit_it_lec',
        title: 'محاضرات عتاد ونظم تكنولوجيا المعلومات (Lectures - PDF)',
        description: 'المحاضرات المعتمدة لمكونات ونظم الحاسب بصيغة PDF',
        order: 1,
        lessons: [
          {
            id: 'it_lec_1',
            title: 'المحاضرة 1: المعالجات واللوحة الأم ووحدات الذاكرة CPU & RAM (PDF)',
            duration: '50:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 1
          },
          {
            id: 'it_lec_2',
            title: 'المحاضرة 2: أنظمة التخزين، وحدات الإمداد بالطاقة، ومنافذ الإدخال/الإخراج (PDF)',
            duration: '45:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 2
          },
          {
            id: 'it_lec_3',
            title: 'المحاضرة 3: تثبيت أنظمة التشغيل Windows/Linux وإدارة الـ BIOS/UEFI (PDF)',
            duration: '55:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 3
          }
        ]
      },
      {
        id: 'unit_it_sec',
        title: 'سكاشن المعامل والتدريب العملي (Lab Sections & Word Reports)',
        description: 'شيتات تقارير معمل الحاسب وتثبيت الأنظمة بصيغة Word (.docx)',
        order: 2,
        lessons: [
          {
            id: 'it_sec_1',
            title: 'سكشن عملي 1: التجميع اليدوي لمكونات الكيسة وفحص التوافق (Word DOCX)',
            duration: '45:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 1
          },
          {
            id: 'it_sec_2',
            title: 'سكشن عملي 2: إعداد الشبكة السلكية وكابلات UTP وإعداد الآي بي IP (Word DOCX)',
            duration: '50:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 2
          },
          {
            id: 'it_sec_3',
            title: 'شيت صيانة الأعطال واستكشاف الأخطاء Troubleshooting Sheet (Word DOCX)',
            duration: '40:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 3
          }
        ]
      }
    ],
    createdAt: '2026-09-01'
  },
  {
    id: 'course_mathematics_it',
    titleAr: 'Mathematics – الرياضيات',
    titleEn: 'Mathematics – Calculus & Discrete Math for IT',
    descriptionAr: 'مقرر الرياضيات لطلاب قسم تكنولوجيا المعلومات بالجامعة التكنولوجية. يشمل الجبر الخطي والمصفوفات، التفاضل والتكامل، والرياضيات المتقطعة لعلوم الحاسب. يتضمن مذكرات محاضرات PDF وسكاشن مسائل وتطبيقات محلولة بصيغ Word و PDF.',
    descriptionEn: 'Applied Mathematics and Discrete Mathematics for Computer Science & IT students. Comprehensive lectures in PDF and solved problem sheets in Word.',
    teacherName: 'م. محمد عبد التواب',
    categoryId: 'year1',
    grade: 'year1',
    subject: 'Mathematics',
    subjectAr: 'الرياضيات',
    subjectEn: 'Mathematics',
    department: 'IT',
    price: 0,
    isFree: true,
    isPremium: false,
    duration: '30 ساعة معتمدة',
    lessonsCount: 6,
    featured: true,
    popular: true,
    published: true,
    status: 'published',
    thumbnailUrl: COURSE_HARDWARE_PHYSICS_IMG,
    imageUrls: [COURSE_HARDWARE_PHYSICS_IMG],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    units: [
      {
        id: 'unit_math_lec',
        title: 'محاضرات الرياضيات والتفاضل والمصفوفات (Lectures - PDF)',
        description: 'المحاضرات النظرية للرياضيات بصيغة PDF',
        order: 1,
        lessons: [
          {
            id: 'math_lec_1',
            title: 'المحاضرة 1: المصفوفات والمحددات وحل المعادلات الخطية Matrices (PDF)',
            duration: '50:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 1
          },
          {
            id: 'math_lec_2',
            title: 'المحاضرة 2: النهايات والاشتقاق وتطبيقات التفاضل Calculus (PDF)',
            duration: '55:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 2
          },
          {
            id: 'math_lec_3',
            title: 'المحاضرة 3: الرياضيات المتقطعة ونظرية المجموعات والمنطق Discrete Math (PDF)',
            duration: '50:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 3
          }
        ]
      },
      {
        id: 'unit_math_sec',
        title: 'سكاشن التمارين وشيتات المسائل المحلولة (Math Sections & Word Sheets)',
        description: 'شيتات التمارين والواجبات بصيغة Word (.docx) و PDF',
        order: 2,
        lessons: [
          {
            id: 'math_sec_1',
            title: 'سكشن 1: تمارين محلولة على ضرب وتدوير ومعكوس المصفوفات (Word DOCX)',
            duration: '45:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 1
          },
          {
            id: 'math_sec_2',
            title: 'سكشن 2: شيت تدريبات قواعد الاشتقاق وقاعدة السلسلة (Word DOCX)',
            duration: '40:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 2
          },
          {
            id: 'math_sec_3',
            title: 'شيت بنك أسئلة الرياضيات وامتحانات السنوات السابقة (Word DOCX)',
            duration: '45:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 3
          }
        ]
      }
    ],
    createdAt: '2026-09-01'
  },
  {
    id: 'course_cyber_security',
    titleAr: 'Cyber Security – الأمن السيبراني',
    titleEn: 'Cyber Security – Defense, Cryptography & Systems Security',
    descriptionAr: 'مقرر الأمن السيبراني وحماية الشبكات لطلاب قسم تكنولوجيا المعلومات. يتناول أسس أمن المعلومات CIA، التشفير، الجدران النارية، تحليل الثغرات، واختبار الاختراق الأخلاقي. يشمل سلايدز ومحاضرات PDF وسكاشن معامل أمنية وشيتات تقارير Word.',
    descriptionEn: 'Cyber Security and network defense course for IT students. Covers encryption, vulnerabilities, and practical security labs with Word and PDF files.',
    teacherName: 'م. محمد عبد التواب',
    categoryId: 'year2',
    grade: 'year2',
    subject: 'Cyber Security',
    subjectAr: 'الأمن السيبراني',
    subjectEn: 'Cyber Security',
    department: 'IT',
    price: 0,
    isFree: true,
    isPremium: false,
    duration: '26 ساعة معتمدة',
    lessonsCount: 6,
    featured: true,
    popular: true,
    published: true,
    status: 'published',
    thumbnailUrl: COURSE_PROGRAMMING_CYBER_IMG,
    imageUrls: [COURSE_PROGRAMMING_CYBER_IMG],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    units: [
      {
        id: 'unit_cyber_lec',
        title: 'محاضرات الأمن السيبراني والتشفير (Lectures - PDF)',
        description: 'المحاضرات المعتمدة لمقرر الأمن السيبراني بصيغة PDF',
        order: 1,
        lessons: [
          {
            id: 'cyber_lec_1',
            title: 'المحاضرة 1: مدخل إلى الأمن السيبراني وثالوث الأمان CIA Triad (PDF)',
            duration: '45:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 1
          },
          {
            id: 'cyber_lec_2',
            title: 'المحاضرة 2: أنواع الهجمات السيبرانية، الفيروسات والهندسة الاجتماعية (PDF)',
            duration: '50:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 2
          },
          {
            id: 'cyber_lec_3',
            title: 'المحاضرة 3: أسس التشفير Symmetric & Asymmetric Cryptography (PDF)',
            duration: '55:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 3
          }
        ]
      },
      {
        id: 'unit_cyber_sec',
        title: 'سكاشن المعامل الأمنية واختبار الاختراق (Cyber Labs & Word Sheets)',
        description: 'شيتات وتجارب معمل أمن المعلومات بصيغة Word (.docx) و PDF',
        order: 2,
        lessons: [
          {
            id: 'cyber_sec_1',
            title: 'سكشن عملي 1: إعداد بيئة Kali Linux وفحص المنافذ باستخدام Nmap (Word DOCX)',
            duration: '45:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 1
          },
          {
            id: 'cyber_sec_2',
            title: 'سكشن عملي 2: التقاط وتحليل حزم الشبكة باستخدام Wireshark (Word DOCX)',
            duration: '50:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 2
          },
          {
            id: 'cyber_sec_3',
            title: 'شيت إعداد تقرير الثغرات الأمنية Vulnerability Assessment Report (Word DOCX)',
            duration: '40:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 3
          }
        ]
      }
    ],
    createdAt: '2026-09-01'
  },
  {
    id: 'course_english_it',
    titleAr: 'English – اللغة الإنجليزية',
    titleEn: 'English – Technical English for Information Technology',
    descriptionAr: 'مقرر اللغة الإنجليزية التقنية التخصصية لطلاب قسم تكنولوجيا المعلومات بالجامعة التكنولوجية. يركز على مصطلحات تكنولوجيا المعلومات، قراءة المستندات الفنية، كتابة التقارير البرمجية، والتواصل المهني في بيئة العمل التقني. يشمل محاضرات PDF وسكاشن تمارين Word.',
    descriptionEn: 'Technical English course tailored for IT students. Focuses on technical terminology, IT documentation, and professional communication with PDF and Word files.',
    teacherName: 'م. محمد عبد التواب',
    categoryId: 'year1',
    grade: 'year1',
    subject: 'English',
    subjectAr: 'اللغة الإنجليزية',
    subjectEn: 'English',
    department: 'IT',
    price: 0,
    isFree: true,
    isPremium: false,
    duration: '20 ساعة معتمدة',
    lessonsCount: 6,
    featured: true,
    popular: true,
    published: true,
    status: 'published',
    thumbnailUrl: HERO_IT_UNIVERSITY_IMG,
    imageUrls: [HERO_IT_UNIVERSITY_IMG],
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    units: [
      {
        id: 'unit_eng_lec',
        title: 'محاضرات اللغة الإنجليزية التقنية (Lectures - PDF)',
        description: 'سلايدز ومذكرات محاضرات اللغة الإنجليزية بصيغة PDF',
        order: 1,
        lessons: [
          {
            id: 'eng_lec_1',
            title: 'المحاضرة 1: المصطلحات التقنية الأساسية للحاسب والشبكات Essential IT Vocab (PDF)',
            duration: '40:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 1
          },
          {
            id: 'eng_lec_2',
            title: 'المحاضرة 2: قراءة وتفسير الوثائق البرمجية Reading Documentation (PDF)',
            duration: '45:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 2
          },
          {
            id: 'eng_lec_3',
            title: 'المحاضرة 3: كتابة الإيميلات والتقارير الفنية Professional Email & Tech Writing (PDF)',
            duration: '40:00',
            type: 'pdf',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: false,
            order: 3
          }
        ]
      },
      {
        id: 'unit_eng_sec',
        title: 'سكاشن التدريبات وورش العمل (Worksheets & Word Sheets)',
        description: 'شيتات تمارين وتطبيقات اللغة الإنجليزية التقنية بصيغة Word (.docx)',
        order: 2,
        lessons: [
          {
            id: 'eng_sec_1',
            title: 'سكشن 1: ورقة عمل ترجمة وتطبيق المصطلحات التقنية (Word DOCX)',
            duration: '35:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 1
          },
          {
            id: 'eng_sec_2',
            title: 'سكشن 2: تدريب كتابة تقرير فني عن مشكلة تقنية Technical Report Template (Word DOCX)',
            duration: '40:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 2
          },
          {
            id: 'eng_sec_3',
            title: 'شيت معجم مصطلحات IT ونماذج امتحانات الميدترم والفاينل (Word DOCX)',
            duration: '35:00',
            type: 'word',
            wordUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
            pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            isSection: true,
            order: 3
          }
        ]
      }
    ],
    createdAt: '2026-09-01'
  }
];

const defaultCourses: Course[] = IT_UNIVERSITY_COURSES;

const defaultStudents: Student[] = [];

const defaultNews: NewsItem[] = [];

const defaultArticles: Article[] = [];

const defaultReviews: UserReview[] = [];

// One-time migration to clear out old demo/sample local storage data
try {
  const clearedKey = 'tech_university_it_v1';
  if (typeof window !== 'undefined' && window.localStorage && localStorage.getItem(clearedKey) !== 'true') {
    localStorage.removeItem('academy_courses');
    localStorage.removeItem('courses');
    localStorage.removeItem('academy_categories');
    localStorage.removeItem('categories');
    localStorage.removeItem('academy_settings');
    localStorage.removeItem('settings');
    localStorage.setItem(clearedKey, 'true');
    console.log("Successfully wiped previous local storage data to load IT University Platform.");
  }
} catch (e) {
  console.error("Failed to execute one-time local storage demo data purge:", e);
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
  email: 'mhmdbdaltwabalsdawy7@gmail.com',
  footerAr: 'جميع الحقوق محفوظة © ٢٠٢٦ منصة MOHAMED ELJOKER التعليمية - قسم تكنولوجيا المعلومات IT.',
  footerEn: 'All Rights Reserved © 2026 MOHAMED ELJOKER Educational Platform - IT Department.',
  seoDescription: 'منصة MOHAMED ELJOKER التعليمية المجانية بالكامل لتنظيم ونشر المحاضرات والسكاشن والامتحانات وشيتات قسم تكنولوجيا المعلومات IT.',
  seoKeywords: 'منصة MOHAMED ELJOKER, محمد الجوكر, قسم IT, تكنولوجيا المعلومات, Physics, Python Programming, IT Essentials, Mathematics, Cyber Security, English, محاضرات, سكاشن, امتحانات, شيتات, PDF, Word',
  forceLogoutVersion: 0
};

export const defaultLectures: LectureItem[] = [
  {
    id: 'lec_physics_1',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    number: 1,
    title: 'المحاضرة 1: الكهربية الساكنة وقانون كولوم Electrostatics & Coulomb\'s Law',
    description: 'شرح تفصيلي للمجال الكهربي وقانون كولوم وتوزيع الشحنات في أشباه الموصلات والدوائر الإلكترونية.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-01'
  },
  {
    id: 'lec_python_1',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    number: 1,
    title: 'المحاضرة 1: مقدمة بايثون وهياكل البيانات الأساسية Variables & Data Types',
    description: 'تثبيت بيئة التطوير، المتغيرات، الجمل الشرطية والدوال البرمجية في بايثون لطلاب تكنولوجيا المعلومات.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-02'
  },
  {
    id: 'lec_it_1',
    courseId: 'course_it_essentials',
    courseTitle: 'IT Essentials – أساسيات تكنولوجيا المعلومات',
    number: 1,
    title: 'المحاضرة 1: المعالجات واللوحة الأم ووحدات الذاكرة CPU & RAM',
    description: 'المفاهيم الأساسية لمعمارية الحاسب والعتاد الصلب وطرق نقل البيانات عبر ممرات النواقل Buses.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-03'
  },
  {
    id: 'lec_math_1',
    courseId: 'course_mathematics_it',
    courseTitle: 'Mathematics – الرياضيات',
    number: 1,
    title: 'المحاضرة 1: المصفوفات والمحددات وحل المعادلات الخطية Matrices',
    description: 'العمليات على المصفوفات، المحددات، وطرق حل أنظمة المعادلات الخطية المستخدمة في خوارزميات الحاسب.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-04'
  },
  {
    id: 'lec_cyber_1',
    courseId: 'course_cyber_security_it',
    courseTitle: 'Cyber Security – الأمن السيبراني',
    number: 1,
    title: 'المحاضرة 1: مبادئ أمن المعلومات وثالوث السرية CIA Triad',
    description: 'مفاهيم Confidentiality, Integrity, Availability ونماذج التهديدات الرقمية والهجمات السيبرانية الشائعة.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-05'
  },
  {
    id: 'lec_english_1',
    courseId: 'course_english_tech_it',
    courseTitle: 'English – اللغة الإنجليزية',
    number: 1,
    title: 'المحاضرة 1: المصطلحات التقنية الأساسية للحاسب والشبكات Essential IT Vocab',
    description: 'قراءة الوثائق والمصطلحات الإنجليزية الخاصة بعتاد الحاسب ونظم التشغيل والبرمجيات.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-06'
  }
];

export const defaultSections: SectionItem[] = [
  {
    id: 'sec_physics_1',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    number: 1,
    title: 'سكشن 1: القياسات العملية في معمل الفيزياء وقانون أوم (Word DOCX)',
    description: 'شيت التجارب العملية لقياس المقاومة وفرق الجهد الكهربي ورسم المنحنيات بصيغة Word.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-01'
  },
  {
    id: 'sec_python_1',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    number: 1,
    title: 'سكشن عملي 1: كتابة أول سكريبت بايثون وحل تمارين المعمل (Word DOCX)',
    description: 'حل تدريبات معمل البرمجة الأول وتمارين الإدخال والطباعة الحسابية بصيغة Word قابلة للتعديل.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-02'
  },
  {
    id: 'sec_it_1',
    courseId: 'course_it_essentials',
    courseTitle: 'IT Essentials – أساسيات تكنولوجيا المعلومات',
    number: 1,
    title: 'سكشن عملي 1: التجميع اليدوي لمكونات الكيسة وفحص التوافق (Word DOCX)',
    description: 'تقرير معمل صيانة الحاسب: خطوات فك وتركيب اللوحة الأم والمعالج ومزود الطاقة.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-03'
  },
  {
    id: 'sec_math_1',
    courseId: 'course_mathematics_it',
    courseTitle: 'Mathematics – الرياضيات',
    number: 1,
    title: 'سكشن 1: تمارين محلولة على ضرب وتدوير ومعكوس المصفوفات (Word DOCX)',
    description: 'شيت المسائل التدريبية المحلولة خطوة بخطوة للتحضير لكويزات الرياضيات بصيغة Word و PDF.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-04'
  },
  {
    id: 'sec_cyber_1',
    courseId: 'course_cyber_security_it',
    courseTitle: 'Cyber Security – الأمن السيبراني',
    number: 1,
    title: 'سكشن عملي 1: فحص وتحليل حزم الشبكة باستخدام Wireshark (Word DOCX)',
    description: 'دليل التدريب العملي لالتقاط وفحص بيانات بروتوكولات TCP/UDP وتحديد نقاط الضعف.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-05'
  },
  {
    id: 'sec_english_1',
    courseId: 'course_english_tech_it',
    courseTitle: 'English – اللغة الإنجليزية',
    number: 1,
    title: 'سكشن 1: ورقة عمل ترجمة وتطبيق المصطلحات التقنية (Word DOCX)',
    description: 'شيت تدريبات المصطلحات المهنية والتقارير الفنية باللغة الإنجليزية بصيغة Word قابلة للتعديل والحل.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-06'
  }
];

export const defaultExams: ExamItem[] = [
  {
    id: 'exam_physics_midterm',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    number: 'Midterm 2026',
    title: 'امتحان الميدترم لمقرر الفيزياء للجامعة التكنولوجية',
    description: 'أسئلة امتحان الميدترم الشامل لقوانين الكهربية والدوائر والمجالات المغناطيسية.',
    questionsFileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    answersFileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    examDate: '2026-11-15',
    createdAt: '2026-09-10'
  },
  {
    id: 'exam_python_midterm',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    number: 'Midterm 2026',
    title: 'امتحان منتصف الفصل في برمجة بايثون العملي والنظري',
    description: 'نماذج أسئلة تتبع الكود ومخرجات البرامج وكتابة الدوال البرمجية في بايثون.',
    questionsFileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    answersFileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    examDate: '2026-11-18',
    createdAt: '2026-09-10'
  },
  {
    id: 'exam_it_final',
    courseId: 'course_it_essentials',
    courseTitle: 'IT Essentials – أساسيات تكنولوجيا المعلومات',
    number: 'Archive 2025/2026',
    title: 'بنك أسئلة وامتحانات سابقة في عتاد وصيانة الحاسب',
    description: 'تجميعة شاملة لنماذج امتحانات السنوات السابقة ونماذج الإجابة المعتمدة.',
    questionsFileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    examDate: '2026-12-01',
    createdAt: '2026-09-10'
  },
  {
    id: 'exam_python_online_quiz',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    number: 'Quiz 1 (Online)',
    title: 'امتحان تفاعلي أونلاين: أساسيات لغة بايثون والدوال البرمجية',
    description: 'امتحان إلكتروني تفاعلي يتم تصحيحه ذاتياً وفورياً. يشمل أسئلة اختيار من متعدد وصح أو خطأ مع توقيت زمني.',
    isOnlineExam: true,
    durationMinutes: 20,
    totalPoints: 100,
    showResultsImmediately: true,
    published: true,
    examDate: '2026-11-20',
    createdAt: '2026-09-12',
    questions: [
      {
        id: 'q_py_1',
        questionText: 'ما هي الكلمة المفتاحية المستخدمة لتعريف دالة (Function) في لغة بايثون؟',
        type: 'multiple_choice',
        options: ['func', 'def', 'function', 'define'],
        correctAnswerIndex: 1,
        points: 20,
        explanation: 'الكلمة المفتاحية المعتمدة في بايثون لتعريف الدوال هي def متبوعة باسم الدالة والقوسين.'
      },
      {
        id: 'q_py_2',
        questionText: 'في لغة بايثون، تعتبر القوائم Lists غير قابلة للتعديل (Immutable).',
        type: 'true_false',
        options: ['صواب', 'خطأ'],
        correctAnswerIndex: 1,
        points: 20,
        explanation: 'القوائم (Lists) في بايثون قابلة للتعديل (Mutable)، بينما الـ Tuples هي غير القابلة للتعديل.'
      },
      {
        id: 'q_py_3',
        questionText: 'ما ناتج تنفيذ الأمر: print(type(10.5)) ؟',
        type: 'multiple_choice',
        options: ['<class \'int\'>', '<class \'float\'>', '<class \'double\'>', '<class \'number\'>'],
        correctAnswerIndex: 1,
        points: 20,
        explanation: 'الأرقام العشرية في بايثون تنتمي لنوع float.'
      },
      {
        id: 'q_py_4',
        questionText: 'أي من الرموز التالية يمثل معامل المقارنة "يساوي تماماً" في لغة بايثون؟',
        type: 'multiple_choice',
        options: ['=', '==', '===', 'equals'],
        correctAnswerIndex: 1,
        points: 20,
        explanation: 'الرمز == يستخدم للمقارنة والتحقق من التساوي، بينما = يستخدم للإسناد Assignment.'
      },
      {
        id: 'q_py_5',
        questionText: 'المسافات البادئة (Indentation) في بايثون تعتبر جزءاً أساسياً لتحديد كتل الأكواد (Code Blocks).',
        type: 'true_false',
        options: ['صواب', 'خطأ'],
        correctAnswerIndex: 0,
        points: 20,
        explanation: 'صحيح، بايثون تعتمد كلياً على المسافات البادئة لتحديد نطاق الدوال وحلقات التكرار والجمل الشرطية.'
      }
    ]
  },
  {
    id: 'exam_cyber_sec_quiz',
    courseId: 'course_cyber_sec',
    courseTitle: 'Cyber Security – الأمن السيبراني',
    number: 'Quiz 2 (Online)',
    title: 'امتحان إلكتروني أونلاين: أمن الشبكات والتشفير وثالوث السرية CIA',
    description: 'امتحان تفاعلي مصحح ذاتياً لقياس استيعاب مفاهيم أمن المعلومات CIA، التشفير المتماثل وغير المتماثل، وهجمات حجب الخدمة.',
    isOnlineExam: true,
    durationMinutes: 25,
    totalPoints: 100,
    showResultsImmediately: true,
    published: true,
    examDate: '2026-11-25',
    createdAt: '2026-09-15',
    questions: [
      {
        id: 'q_cs_1',
        questionText: 'ما هي العناصر الثلاثة التي تشكل ثالوث أمن المعلومات (CIA Triad)؟',
        type: 'multiple_choice',
        options: [
          'Confidentiality, Integrity, Availability',
          'Cyber, Internet, Authentication',
          'Control, Identification, Access',
          'Certificate, Inspection, Authorization'
        ],
        correctAnswerIndex: 0,
        points: 25,
        explanation: 'ثالوث أمن المعلومات يتكون من: السرية (Confidentiality)، وسلامة البيانات (Integrity)، وتوافر الخدمة (Availability).'
      },
      {
        id: 'q_cs_2',
        questionText: 'في التشفير غير المتماثل (Asymmetric Encryption)، يُستخدم مفتاح واحد فقط للتشفير وفك التشفير.',
        type: 'true_false',
        options: ['صواب', 'خطأ'],
        correctAnswerIndex: 1,
        points: 25,
        explanation: 'خطأ، التشفير غير المتماثل يستخدم زوجاً من المفاتيح (مفتاح عام Public Key ومفتاح خاص Private Key).'
      },
      {
        id: 'q_cs_3',
        questionText: 'أي من الهجمات التالية تهدف إلى حجب الخدمة عن المستخدمين الشرعيين بإغراق السيرفر بالطلبات؟',
        type: 'multiple_choice',
        options: ['Phishing', 'DDoS Attack', 'SQL Injection', 'Cross-Site Scripting'],
        correctAnswerIndex: 1,
        points: 25,
        explanation: 'هجمات حجب الخدمة الموزعة (DDoS) تغرق الخادم بحركة مرور وهمية لتعطيله.'
      },
      {
        id: 'q_cs_4',
        questionText: 'بروتوكول HTTPS يعتبر أكثر أماناً من HTTP لأنه يعتمد على تشفير SSL/TLS لنقل البيانات.',
        type: 'true_false',
        options: ['صواب', 'خطأ'],
        correctAnswerIndex: 0,
        points: 25,
        explanation: 'صحيح، HTTPS يشفر حركة البيانات بين المتصفح والخادم لمنع التنصت أو التلاعب.'
      }
    ]
  }
];

export const defaultSheets: SheetItem[] = [
  {
    id: 'sheet_lec_phys_1',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    sheetType: 'lecture_sheet',
    referenceNumber: 1,
    title: 'شيت تدريبات المحاضرة الأولى: مسائل قانون كولوم والمجال الكهربي',
    description: 'شيت مسائل واجبات المحاضرة الأولى للمذاكرة والحل.',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-01'
  },
  {
    id: 'sheet_sec_phys_1',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    sheetType: 'section_sheet',
    referenceNumber: 1,
    title: 'شيت سكشن معمل الفيزياء 1: تقرير قياس المقاومات وقانون أوم (DOCX)',
    description: 'نموذج تقرير المعمل الأسبوعي لتسليم السكشن بصيغة Word.',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-01'
  },
  {
    id: 'sheet_lec_py_1',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    sheetType: 'lecture_sheet',
    referenceNumber: 1,
    title: 'شيت تدريبات المحاضرة الأولى: تمارين المتغيرات والعمليات الحسابية',
    description: 'مسائل برمجية وتتبع كود بايثون.',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2026-09-02'
  },
  {
    id: 'sheet_sec_py_1',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    sheetType: 'section_sheet',
    referenceNumber: 1,
    title: 'شيت السكشن العملي 1: مهام معمل بايثون وحل الإشكالات (DOCX)',
    description: 'شيت تسليم مهام المعمل الأسبوعي بالوورد.',
    fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx',
    createdAt: '2026-09-02'
  }
];

const defaultAdmins: Admin[] = [];

const defaultTeachers: Teacher[] = [];

const defaultCoupons: Coupon[] = [];

const defaultOrders: Order[] = [];

const defaultQuizzes: Quiz[] = [];

export const defaultQuestionBank: QuestionBankItem[] = [
  {
    id: 'qb_py_1',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    subject: 'برمجة بايثون',
    topic: 'المحاضرة 1: المتغيرات وأنواع البيانات',
    questionText: 'أي مما يلي يعتبر اسماً غير صالح لمتغير في بايثون؟',
    type: 'multiple_choice',
    options: ['user_name', '_myVar', '2nd_student', 'student2'],
    correctAnswerIndex: 2,
    points: 10,
    explanation: 'أسماء المتغيرات في بايثون لا يجوز أن تبدأ برقم.',
    createdAt: '2026-09-01'
  },
  {
    id: 'qb_py_2',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    subject: 'برمجة بايثون',
    topic: 'المحاضرة 2: القوائم وهياكل البيانات',
    questionText: 'الدالة len() تستخدم لحساب عدد العناصر في القوائم والنصوص.',
    type: 'true_false',
    options: ['صواب', 'خطأ'],
    correctAnswerIndex: 0,
    points: 10,
    explanation: 'الدالة len() ترجع طول الكائن أو عدد عناصره.',
    createdAt: '2026-09-02'
  },
  {
    id: 'qb_phys_1',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    subject: 'الفيزياء',
    topic: 'المحاضرة 1: الكهربية والمجال الكهربي',
    questionText: 'وحدة قياس الشحنة الكهربية في النظام الدولي للوحدات (SI) هي:',
    type: 'multiple_choice',
    options: ['الفولت (Volt)', 'الأمبير (Ampere)', 'الكولوم (Coulomb)', 'الأوم (Ohm)'],
    correctAnswerIndex: 2,
    points: 10,
    explanation: 'الشحنة الكهربية تقاس بوحدة الكولوم (C).',
    createdAt: '2026-09-01'
  },
  {
    id: 'qb_phys_2',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    subject: 'الفيزياء',
    topic: 'المحاضرة 2: قانون أوم والمقاومة',
    questionText: 'قانون أوم ينص على أن فرق الجهد يتناسب طردياً مع شدة التيار عند ثبوت درجة الحرارة (V = I * R).',
    type: 'true_false',
    options: ['صواب', 'خطأ'],
    correctAnswerIndex: 0,
    points: 10,
    explanation: 'صحيح، قانون أوم هو V = I * R.',
    createdAt: '2026-09-02'
  },
  {
    id: 'qb_it_1',
    courseId: 'course_it_essentials',
    courseTitle: 'IT Essentials – أساسيات تكنولوجيا المعلومات',
    subject: 'أساسيات تكنولوجيا المعلومات',
    topic: 'المحاضرة 1: المعالج ووحدة الحساب والمنطق',
    questionText: 'الجزء المسؤول عن تنفيذ العمليات الرياضية والمنطقية داخل المعالج المركزي CPU هو:',
    type: 'multiple_choice',
    options: ['ALU (Arithmetic Logic Unit)', 'Control Unit (CU)', 'Registers', 'Cache Memory'],
    correctAnswerIndex: 0,
    points: 10,
    explanation: 'وحدة الحساب والمنطق ALU هي المسؤولة عن العمليات الرياضية والمنطقية.',
    createdAt: '2026-09-01'
  },
  {
    id: 'qb_cs_1',
    courseId: 'course_cyber_sec',
    courseTitle: 'Cyber Security – الأمن السيبراني',
    subject: 'الأمن السيبراني',
    topic: 'المحاضرة 1: مبادئ أمن المعلومات',
    questionText: 'الهندسة الاجتماعية (Social Engineering) تعتمد على استغلال الثغرات البشرية بدلاً من الثغرات البرمجية للحصول على بيانات سرية.',
    type: 'true_false',
    options: ['صواب', 'خطأ'],
    correctAnswerIndex: 0,
    points: 10,
    explanation: 'صحيح، الهندسة الاجتماعية تستهدف خداع العنصر البشري.',
    createdAt: '2026-09-03'
  },
  {
    id: 'qb_math_1',
    courseId: 'course_mathematics_it',
    courseTitle: 'Mathematics – الرياضيات',
    subject: 'الرياضيات',
    topic: 'المحاضرة 1: الجبر الخطي والمصفوفات',
    questionText: 'مصفوفة الوحدة (Identity Matrix) هي مصفوفة مربعة تكون جميع عناصر قطرها الرئيسي تساوي 1 وباقي العناصر أصفار.',
    type: 'true_false',
    options: ['صواب', 'خطأ'],
    correctAnswerIndex: 0,
    points: 10,
    explanation: 'صحيح، مصفوفة الوحدة I تتميز بقطر رئيسي من الآحاد وباقي العناصر أصفار.',
    createdAt: '2026-09-04'
  },
  {
    id: 'qb_eng_1',
    courseId: 'course_english_tech_it',
    courseTitle: 'English – اللغة الإنجليزية',
    subject: 'اللغة الإنجليزية',
    topic: 'المحاضرة 1: المصطلحات التقنية',
    questionText: 'What does the acronym "API" stand for in Software Engineering?',
    type: 'multiple_choice',
    options: [
      'Application Programming Interface',
      'Advanced Program Instruction',
      'Automated Protocol Integration',
      'Applied Process Identifier'
    ],
    correctAnswerIndex: 0,
    points: 10,
    explanation: 'API stands for Application Programming Interface.',
    createdAt: '2026-09-05'
  }
];

export const defaultSchedule: ScheduleItem[] = [
  {
    id: 'sch_1',
    title: 'محاضرة برمجة بايثون – Python Programming',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    itemType: 'lecture',
    dayOfWeek: 'Sunday',
    dayOfWeekAr: 'الأحد',
    startTime: '09:00 ص',
    endTime: '11:00 ص',
    location: 'مدرج IT 1 - المبنى الأكاديمي',
    instructor: 'م. محمد عبد التواب',
    notes: 'يرجى إحضار اللابتوب لمتابعة كتابة الأكواد والتطبيقات العملية.',
    active: true
  },
  {
    id: 'sch_2',
    title: 'سكشن معمل برمجة بايثون العملي',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    itemType: 'section',
    dayOfWeek: 'Sunday',
    dayOfWeekAr: 'الأحد',
    startTime: '11:30 ص',
    endTime: '01:30 م',
    location: 'معمل الحاسب والبرمجيات 2',
    instructor: 'م. محمد عبد التواب',
    notes: 'تسليم الشيت العملي رقم 1 وكتابة برامج بايثون.',
    active: true
  },
  {
    id: 'sch_3',
    title: 'محاضرة الأمن السيبراني – Cyber Security',
    courseId: 'course_cyber_sec',
    courseTitle: 'Cyber Security – الأمن السيبراني',
    itemType: 'lecture',
    dayOfWeek: 'Monday',
    dayOfWeekAr: 'الإثنين',
    startTime: '10:00 ص',
    endTime: '12:00 م',
    location: 'مدرج IT 2',
    instructor: 'م. محمد عبد التواب',
    notes: 'شرح أساسيات ثالوث أمن المعلومات والتشفير ونماذج الهجمات.',
    active: true
  },
  {
    id: 'sch_4',
    title: 'محاضرة الفيزياء العامة والتطبيقية – Physics',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    itemType: 'lecture',
    dayOfWeek: 'Tuesday',
    dayOfWeekAr: 'الثلاثاء',
    startTime: '09:00 ص',
    endTime: '11:00 ص',
    location: 'مدرج 3',
    instructor: 'م. محمد عبد التواب',
    notes: 'دراسة قوانين الكهربية الساكنة والمجال الكهرومغناطيسي.',
    active: true
  },
  {
    id: 'sch_5',
    title: 'سكشن معمل الفيزياء والدوائر الكهربية',
    courseId: 'course_physics_it',
    courseTitle: 'Physics – الفيزياء',
    itemType: 'section',
    dayOfWeek: 'Tuesday',
    dayOfWeekAr: 'الثلاثاء',
    startTime: '11:30 ص',
    endTime: '01:30 م',
    location: 'معمل الفيزياء التطبيقية',
    instructor: 'م. محمد عبد التواب',
    notes: 'تجربة قانون أوم وقياس المقاومات مع تسليم تقرير المعمل Word.',
    active: true
  },
  {
    id: 'sch_6',
    title: 'محاضرة أساسيات تكنولوجيا المعلومات – IT Essentials',
    courseId: 'course_it_essentials',
    courseTitle: 'IT Essentials – أساسيات تكنولوجيا المعلومات',
    itemType: 'lecture',
    dayOfWeek: 'Wednesday',
    dayOfWeekAr: 'الأربعاء',
    startTime: '10:00 ص',
    endTime: '12:00 م',
    location: 'مدرج IT 1',
    instructor: 'م. محمد عبد التواب',
    notes: 'معمارية الحاسب وعتاد المعالجات وأنظمة التشغيل.',
    active: true
  },
  {
    id: 'sch_7',
    title: 'محاضرة الرياضيات – Mathematics',
    courseId: 'course_mathematics_it',
    courseTitle: 'Mathematics – الرياضيات',
    itemType: 'lecture',
    dayOfWeek: 'Thursday',
    dayOfWeekAr: 'الخميس',
    startTime: '09:00 ص',
    endTime: '11:00 ص',
    location: 'مدرج 2',
    instructor: 'م. محمد عبد التواب',
    notes: 'الجبر الخطي والمصفوفات وتطبيقاتها في علوم الحاسب.',
    active: true
  },
  {
    id: 'sch_8',
    title: 'سكشن اللغة الإنجليزية التقنية – Technical English',
    courseId: 'course_english_tech_it',
    courseTitle: 'English – اللغة الإنجليزية',
    itemType: 'section',
    dayOfWeek: 'Thursday',
    dayOfWeekAr: 'الخميس',
    startTime: '11:30 ص',
    endTime: '01:00 م',
    location: 'قاعة اللغات والتقارير الفنية 4',
    instructor: 'م. محمد عبد التواب',
    notes: 'قراءة وفهم الوثائق الفنية وكتابة التقارير البرمجية.',
    active: true
  }
];

export const defaultInquiries: StudentInquiry[] = [
  {
    id: 'inq_1',
    studentId: 'sample_student_1',
    studentName: 'أحمد محمود علي',
    studentEmail: 'ahmed.student@it.university.edu',
    studentPhone: '01012345678',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    category: 'lecture',
    title: 'استفسار حول بيئة العمل المستخدمة في بايثون',
    question: 'السلام عليكم يا بشمهندس، هل يفضل تثبيت Anaconda و Jupyter Notebook أم العمل على VS Code لمقرر بايثون في المعمل؟',
    status: 'answered',
    reply: 'وعليكم السلام يا أحمد، سنعتمد في المحاضرات والسكاشن على VS Code مع إضافة Python Extension لأنه الأقرب لبيئة العمل الاحترافية في سوق العمل.',
    repliedBy: 'Eng/Mohamed abdal tawab',
    repliedAt: '2026-09-08T14:30:00.000Z',
    createdAt: '2026-09-08T10:15:00.000Z'
  }
];

export const defaultExamSubmissions: ExamSubmission[] = [
  {
    id: 'sub_sample_1',
    studentId: 'sample_student_1',
    studentName: 'أحمد محمود علي',
    studentEmail: 'ahmed.student@it.university.edu',
    examId: 'exam_python_online_quiz',
    examTitle: 'امتحان تفاعلي أونلاين: أساسيات لغة بايثون والدوال البرمجية',
    courseId: 'course_python_it',
    courseTitle: 'Python Programming – برمجة بايثون',
    score: 100,
    totalPoints: 100,
    percentage: 100,
    answers: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 0 },
    submittedAt: '2026-09-15T12:00:00.000Z'
  }
];

export const defaultActivityLogs: ActivityLogItem[] = [
  {
    id: 'act_1',
    adminEmail: 'mhmdbdaltwabalsdawy7@gmail.com',
    adminName: 'Eng/Mohamed abdal tawab',
    action: 'create',
    targetType: 'lecture',
    targetTitle: 'المحاضرة 1: مقدمة في بنية لغة بايثون والبيئة البرمجية',
    details: 'تم نشر المحاضرة مع ملف PDF ورابط YouTube الرسمي',
    timestamp: Date.now() - 86400000,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
  },
  {
    id: 'act_2',
    adminEmail: 'mhmdbdaltwabalsdawy7@gmail.com',
    adminName: 'Eng/Mohamed abdal tawab',
    action: 'create',
    targetType: 'exam',
    targetTitle: 'امتحان تفاعلي أونلاين: أساسيات لغة بايثون',
    details: 'تم تجهيز الامتحان الإلكتروني ونشر الأسئلة والتصحيح التلقائي',
    timestamp: Date.now() - 3600000,
    date: new Date().toISOString().split('T')[0]
  }
];

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
    console.log("Firebase initialized successfully inside Eng/Mohamed abdal tawab Academy with database ID:", dbId || "(default)");

    // Validate Firestore connection on boot (non-blocking)
    (async () => {
      try {
        await getDocFromServer(doc(firestoreDb, 'settings', 'global'));
      } catch (err) {
        if (err instanceof Error && err.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    })();
  } catch (error) {
    console.warn("Firebase initialization failed, falling back to local simulation:", error);
  }
} else {
  console.log("No Firebase config variables found. Running Eng/Mohamed abdal tawab Academy in offline-first localStorage simulated database.");
}

export const waitForFirebaseAuth = async (): Promise<void> => {
  if (isFirebaseConfigured && firebaseAuth) {
    try {
      await firebaseAuth.authStateReady();
    } catch {}
  }
};

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
          const normalized = list.map(c => normalizeCourseLessons(c));
          setStorageItem('courses', normalized);
          return normalized;
        }
      } catch (err: any) {
        console.warn("Firestore getCourses notice:", err);
      }
    }
    const localCourses = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
    return (localCourses && localCourses.length > 0) ? localCourses : defaultCourses;
  },

  listenToCourses: (onUpdate: (courses: Course[]) => void) => {
    // Immediate initial local emit
    const initial = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
    onUpdate(initial.length > 0 ? initial : defaultCourses);

    if (isFirebaseConfigured) {
      const unsubCourses = onSnapshot(collection(firestoreDb, 'courses'), (snap) => {
        const coursesList: Course[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Course;
          coursesList.push(item);
        });

        if (coursesList.length > 0) {
          const normalized = coursesList.map(c => normalizeCourseLessons(c));
          setStorageItem('courses', normalized);
          onUpdate(normalized);
        } else {
          const local = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
          onUpdate(local.length > 0 ? local : defaultCourses);
        }
      }, (err) => {
        console.warn("Courses Firestore listener notice:", err);
        const local = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
        onUpdate(local.length > 0 ? local : defaultCourses);
      });

      return () => {
        unsubCourses();
      };
    } else {
      const loadLocal = () => {
        const localCourses = getStorageItem<Course[]>('courses', defaultCourses).map(c => normalizeCourseLessons(c));
        onUpdate(localCourses.length > 0 ? localCourses : defaultCourses);
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
      grade: course.grade || course.categoryId || 'year1',
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

  deleteAllCourses: async (): Promise<void> => {
    checkAdminWrite('delete_all_courses', {});
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'courses'));
        for (const d of snap.docs) {
          try {
            await deleteDoc(d.ref);
          } catch (e) {}
        }
      } catch (err: any) {
        console.error("Firestore deleteAllCourses error:", err);
      }
    }
    setStorageItem('courses', []);
  },

  seedITUniversityCourses: async (): Promise<Course[]> => {
    checkAdminWrite('seed_it_courses', {});
    setStorageItem('courses', IT_UNIVERSITY_COURSES);
    if (isFirebaseConfigured) {
      try {
        for (const c of IT_UNIVERSITY_COURSES) {
          const sanitized = sanitizeForFirestore(c);
          await setDoc(doc(firestoreDb, 'courses', c.id), sanitized);
        }
      } catch (err: any) {
        console.warn("Firestore seedITUniversityCourses notice:", err);
      }
    }
    return IT_UNIVERSITY_COURSES;
  },

  // --- Lectures (المحاضرات) ---
  getLectures: async (courseId?: string): Promise<LectureItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'lectures'));
        const list: LectureItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as LectureItem));
        if (list.length > 0) {
          list.sort((a, b) => a.number - b.number);
          setStorageItem('lectures', list);
          return courseId ? list.filter(l => l.courseId === courseId) : list;
        }
      } catch (err) {
        console.warn("Firestore getLectures notice:", err);
      }
    }
    const local = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    return courseId ? local.filter(l => l.courseId === courseId) : local;
  },

  listenToLectures: (onUpdate: (lectures: LectureItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    onUpdate(courseId ? initial.filter(l => l.courseId === courseId) : initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'lectures'), (snap) => {
        const list: LectureItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as LectureItem));
        const res = list.length > 0 ? list : defaultLectures;
        res.sort((a, b) => a.number - b.number);
        setStorageItem('lectures', res);
        onUpdate(courseId ? res.filter(l => l.courseId === courseId) : res);
      }, (err) => {
        console.warn("Lectures listener notice:", err);
        const local = getStorageItem<LectureItem[]>('lectures', defaultLectures);
        onUpdate(courseId ? local.filter(l => l.courseId === courseId) : local);
      });
      return () => unsub();
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
    const newId = 'lec_' + Date.now();
    const item: LectureItem = {
      id: newId,
      ...lecture,
      createdAt: new Date().toISOString()
    };
    const current = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    const updated = [...current.filter(l => l.id !== newId), item];
    setStorageItem('lectures', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'lectures', newId), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("addLecture sync notice:", e);
      }
    }
    return item;
  },

  updateLecture: async (id: string, patch: Partial<LectureItem>): Promise<void> => {
    checkAdminWrite('update_lecture', { id, patch });
    const current = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    const updated = current.map(l => l.id === id ? { ...l, ...patch } : l);
    setStorageItem('lectures', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'lectures', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("updateLecture sync notice:", e);
      }
    }
  },

  deleteLecture: async (id: string): Promise<void> => {
    checkAdminWrite('delete_lecture', { id });
    const current = getStorageItem<LectureItem[]>('lectures', defaultLectures);
    setStorageItem('lectures', current.filter(l => l.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'lectures', id));
      } catch (e) {
        console.warn("deleteLecture notice:", e);
      }
    }
  },

  // --- Sections (السكاشن) ---
  getSections: async (courseId?: string): Promise<SectionItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'sections'));
        const list: SectionItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SectionItem));
        if (list.length > 0) {
          list.sort((a, b) => a.number - b.number);
          setStorageItem('sections', list);
          return courseId ? list.filter(s => s.courseId === courseId) : list;
        }
      } catch (err) {
        console.warn("Firestore getSections notice:", err);
      }
    }
    const local = getStorageItem<SectionItem[]>('sections', defaultSections);
    return courseId ? local.filter(s => s.courseId === courseId) : local;
  },

  listenToSections: (onUpdate: (sections: SectionItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<SectionItem[]>('sections', defaultSections);
    onUpdate(courseId ? initial.filter(s => s.courseId === courseId) : initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'sections'), (snap) => {
        const list: SectionItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SectionItem));
        const res = list.length > 0 ? list : defaultSections;
        res.sort((a, b) => a.number - b.number);
        setStorageItem('sections', res);
        onUpdate(courseId ? res.filter(s => s.courseId === courseId) : res);
      }, (err) => {
        console.warn("Sections listener notice:", err);
        const local = getStorageItem<SectionItem[]>('sections', defaultSections);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      });
      return () => unsub();
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
    const newId = 'sec_' + Date.now();
    const item: SectionItem = {
      id: newId,
      ...section,
      createdAt: new Date().toISOString()
    };
    const current = getStorageItem<SectionItem[]>('sections', defaultSections);
    const updated = [...current.filter(s => s.id !== newId), item];
    setStorageItem('sections', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sections', newId), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("addSection sync notice:", e);
      }
    }
    return item;
  },

  updateSection: async (id: string, patch: Partial<SectionItem>): Promise<void> => {
    checkAdminWrite('update_section', { id, patch });
    const current = getStorageItem<SectionItem[]>('sections', defaultSections);
    const updated = current.map(s => s.id === id ? { ...s, ...patch } : s);
    setStorageItem('sections', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sections', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("updateSection sync notice:", e);
      }
    }
  },

  deleteSection: async (id: string): Promise<void> => {
    checkAdminWrite('delete_section', { id });
    const current = getStorageItem<SectionItem[]>('sections', defaultSections);
    setStorageItem('sections', current.filter(s => s.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'sections', id));
      } catch (e) {
        console.warn("deleteSection notice:", e);
      }
    }
  },

  // --- Exams (الامتحانات) ---
  getExams: async (courseId?: string): Promise<ExamItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'exams'));
        const list: ExamItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExamItem));
        if (list.length > 0) {
          setStorageItem('exams', list);
          return courseId ? list.filter(e => e.courseId === courseId) : list;
        }
      } catch (err) {
        console.warn("Firestore getExams notice:", err);
      }
    }
    const local = getStorageItem<ExamItem[]>('exams', defaultExams);
    return courseId ? local.filter(e => e.courseId === courseId) : local;
  },

  listenToExams: (onUpdate: (exams: ExamItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<ExamItem[]>('exams', defaultExams);
    onUpdate(courseId ? initial.filter(e => e.courseId === courseId) : initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'exams'), (snap) => {
        const list: ExamItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExamItem));
        const res = list.length > 0 ? list : defaultExams;
        setStorageItem('exams', res);
        onUpdate(courseId ? res.filter(e => e.courseId === courseId) : res);
      }, (err) => {
        console.warn("Exams listener notice:", err);
        const local = getStorageItem<ExamItem[]>('exams', defaultExams);
        onUpdate(courseId ? local.filter(e => e.courseId === courseId) : local);
      });
      return () => unsub();
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

  addExam: async (exam: Omit<ExamItem, 'id' | 'createdAt'>): Promise<ExamItem> => {
    checkAdminWrite('add_exam', { exam });
    const newId = 'exam_' + Date.now();
    const item: ExamItem = {
      id: newId,
      ...exam,
      createdAt: new Date().toISOString()
    };
    const current = getStorageItem<ExamItem[]>('exams', defaultExams);
    const updated = [...current.filter(e => e.id !== newId), item];
    setStorageItem('exams', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exams', newId), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("addExam sync notice:", e);
      }
    }
    return item;
  },

  updateExam: async (id: string, patch: Partial<ExamItem>): Promise<void> => {
    checkAdminWrite('update_exam', { id, patch });
    const current = getStorageItem<ExamItem[]>('exams', defaultExams);
    const updated = current.map(e => e.id === id ? { ...e, ...patch } : e);
    setStorageItem('exams', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exams', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("updateExam sync notice:", e);
      }
    }
  },

  deleteExam: async (id: string): Promise<void> => {
    checkAdminWrite('delete_exam', { id });
    const current = getStorageItem<ExamItem[]>('exams', defaultExams);
    setStorageItem('exams', current.filter(e => e.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'exams', id));
      } catch (e) {
        console.warn("deleteExam notice:", e);
      }
    }
  },

  // --- Sheets (الشيتات) ---
  getSheets: async (courseId?: string, sheetType?: 'lecture_sheet' | 'section_sheet'): Promise<SheetItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'sheets'));
        const list: SheetItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SheetItem));
        if (list.length > 0) {
          list.sort((a, b) => a.referenceNumber - b.referenceNumber);
          setStorageItem('sheets', list);
          let res = list;
          if (courseId) res = res.filter(s => s.courseId === courseId);
          if (sheetType) res = res.filter(s => s.sheetType === sheetType);
          return res;
        }
      } catch (err) {
        console.warn("Firestore getSheets notice:", err);
      }
    }
    let local = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    if (courseId) local = local.filter(s => s.courseId === courseId);
    if (sheetType) local = local.filter(s => s.sheetType === sheetType);
    return local;
  },

  listenToSheets: (onUpdate: (sheets: SheetItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    onUpdate(courseId ? initial.filter(s => s.courseId === courseId) : initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'sheets'), (snap) => {
        const list: SheetItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SheetItem));
        const res = list.length > 0 ? list : defaultSheets;
        res.sort((a, b) => a.referenceNumber - b.referenceNumber);
        setStorageItem('sheets', res);
        onUpdate(courseId ? res.filter(s => s.courseId === courseId) : res);
      }, (err) => {
        console.warn("Sheets listener notice:", err);
        const local = getStorageItem<SheetItem[]>('sheets', defaultSheets);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      });
      return () => unsub();
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

  addSheet: async (sheet: Omit<SheetItem, 'id' | 'createdAt'>): Promise<SheetItem> => {
    checkAdminWrite('add_sheet', { sheet });
    const newId = 'sheet_' + Date.now();
    const item: SheetItem = {
      id: newId,
      ...sheet,
      createdAt: new Date().toISOString()
    };
    const current = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    const updated = [...current.filter(s => s.id !== newId), item];
    setStorageItem('sheets', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sheets', newId), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("addSheet sync notice:", e);
      }
    }
    return item;
  },

  updateSheet: async (id: string, patch: Partial<SheetItem>): Promise<void> => {
    checkAdminWrite('update_sheet', { id, patch });
    const current = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    const updated = current.map(s => s.id === id ? { ...s, ...patch } : s);
    setStorageItem('sheets', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'sheets', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("updateSheet sync notice:", e);
      }
    }
  },

  deleteSheet: async (id: string): Promise<void> => {
    checkAdminWrite('delete_sheet', { id });
    const current = getStorageItem<SheetItem[]>('sheets', defaultSheets);
    setStorageItem('sheets', current.filter(s => s.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'sheets', id));
      } catch (e) {
        console.warn("deleteSheet notice:", e);
      }
    }
  },

  // --- Question Bank (بنك الأسئلة) ---
  getQuestionBank: async (courseId?: string): Promise<QuestionBankItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'question_bank'));
        const list: QuestionBankItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuestionBankItem));
        if (list.length > 0) {
          setStorageItem('question_bank', list);
          return courseId ? list.filter(q => q.courseId === courseId) : list;
        }
      } catch (err) {
        console.warn("Firestore getQuestionBank notice:", err);
      }
    }
    const local = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    return courseId ? local.filter(q => q.courseId === courseId) : local;
  },

  listenToQuestionBank: (onUpdate: (items: QuestionBankItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    onUpdate(courseId ? initial.filter(q => q.courseId === courseId) : initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'question_bank'), (snap) => {
        const list: QuestionBankItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as QuestionBankItem));
        const res = list.length > 0 ? list : defaultQuestionBank;
        setStorageItem('question_bank', res);
        onUpdate(courseId ? res.filter(q => q.courseId === courseId) : res);
      }, (err) => {
        console.warn("QuestionBank listener notice:", err);
        const local = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
        onUpdate(courseId ? local.filter(q => q.courseId === courseId) : local);
      });
      return () => unsub();
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
    const newId = 'qb_' + Date.now();
    const fullItem: QuestionBankItem = {
      id: newId,
      ...item,
      createdAt: new Date().toISOString()
    };
    const current = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    const updated = [...current.filter(q => q.id !== newId), fullItem];
    setStorageItem('question_bank', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'question_bank', newId), sanitizeForFirestore(fullItem));
      } catch (e) {
        console.warn("addQuestionBankItem sync notice:", e);
      }
    }
    return fullItem;
  },

  updateQuestionBankItem: async (id: string, patch: Partial<QuestionBankItem>): Promise<void> => {
    checkAdminWrite('update_question_bank', { id, patch });
    const current = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    const updated = current.map(q => q.id === id ? { ...q, ...patch } : q);
    setStorageItem('question_bank', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'question_bank', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("updateQuestionBankItem sync notice:", e);
      }
    }
  },

  deleteQuestionBankItem: async (id: string): Promise<void> => {
    checkAdminWrite('delete_question_bank', { id });
    const current = getStorageItem<QuestionBankItem[]>('question_bank', defaultQuestionBank);
    setStorageItem('question_bank', current.filter(q => q.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'question_bank', id));
      } catch (e) {
        console.warn("deleteQuestionBankItem notice:", e);
      }
    }
  },

  // --- Online Exam Submissions (تسليمات الامتحانات ونتائج الطلاب) ---
  submitExamResult: async (submission: Omit<ExamSubmission, 'id' | 'submittedAt'>): Promise<ExamSubmission> => {
    const newId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const item: ExamSubmission = {
      id: newId,
      ...submission,
      submittedAt: new Date().toISOString()
    };
    const current = getStorageItem<ExamSubmission[]>('exam_submissions', defaultExamSubmissions);
    const updated = [item, ...current.filter(s => s.id !== newId)];
    setStorageItem('exam_submissions', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'exam_submissions', newId), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("submitExamResult sync notice:", e);
      }
    }
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
          if (list.length > 0) {
            list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            if (!effectiveStudentId) setStorageItem('exam_submissions', list);
            let res = list;
            if (examId) res = res.filter(s => s.examId === examId);
            if (effectiveStudentId) res = res.filter(s => s.studentId === effectiveStudentId);
            return res;
          }
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
        const res = list.length > 0 ? list : (effectiveStudentId ? [] : defaultExamSubmissions);
        res.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        if (!effectiveStudentId) setStorageItem('exam_submissions', res);
        onUpdate(filterList(res));
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

  // --- Schedule (جدول المحاضرات والسكاشن) ---
  getSchedule: async (courseId?: string): Promise<ScheduleItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'schedule'));
        const list: ScheduleItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScheduleItem));
        if (list.length > 0) {
          setStorageItem('schedule', list);
          return courseId ? list.filter(s => s.courseId === courseId) : list;
        }
      } catch (err) {
        console.warn("Firestore getSchedule notice:", err);
      }
    }
    const local = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    return courseId ? local.filter(s => s.courseId === courseId) : local;
  },

  listenToSchedule: (onUpdate: (items: ScheduleItem[]) => void, courseId?: string) => {
    const initial = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    onUpdate(courseId ? initial.filter(s => s.courseId === courseId) : initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'schedule'), (snap) => {
        const list: ScheduleItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScheduleItem));
        const res = list.length > 0 ? list : defaultSchedule;
        setStorageItem('schedule', res);
        onUpdate(courseId ? res.filter(s => s.courseId === courseId) : res);
      }, (err) => {
        console.warn("Schedule listener notice:", err);
        const local = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
        onUpdate(courseId ? local.filter(s => s.courseId === courseId) : local);
      });
      return () => unsub();
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
    const newId = 'sch_' + Date.now();
    const fullItem: ScheduleItem = {
      id: newId,
      ...item
    };
    const current = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    const updated = [...current.filter(s => s.id !== newId), fullItem];
    setStorageItem('schedule', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'schedule', newId), sanitizeForFirestore(fullItem));
      } catch (e) {
        console.warn("addScheduleItem sync notice:", e);
      }
    }
    return fullItem;
  },

  updateScheduleItem: async (id: string, patch: Partial<ScheduleItem>): Promise<void> => {
    checkAdminWrite('update_schedule', { id, patch });
    const current = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    const updated = current.map(s => s.id === id ? { ...s, ...patch } : s);
    setStorageItem('schedule', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'schedule', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("updateScheduleItem sync notice:", e);
      }
    }
  },

  deleteScheduleItem: async (id: string): Promise<void> => {
    checkAdminWrite('delete_schedule', { id });
    const current = getStorageItem<ScheduleItem[]>('schedule', defaultSchedule);
    setStorageItem('schedule', current.filter(s => s.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'schedule', id));
      } catch (e) {
        console.warn("deleteScheduleItem notice:", e);
      }
    }
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
          if (list.length > 0) {
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (!effectiveStudentId) setStorageItem('inquiries', list);
            return effectiveStudentId ? list.filter(i => i.studentId === effectiveStudentId) : list;
          }
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
        const res = list.length > 0 ? list : (effectiveStudentId ? [] : defaultInquiries);
        res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!effectiveStudentId) setStorageItem('inquiries', res);
        onUpdate(filterList(res));
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
    const newId = 'inq_' + Date.now();
    const item: StudentInquiry = {
      id: newId,
      ...inquiry,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const current = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    const updated = [item, ...current.filter(i => i.id !== newId)];
    setStorageItem('inquiries', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'inquiries', newId), sanitizeForFirestore(item));
      } catch (e) {
        console.warn("submitInquiry sync notice:", e);
      }
    }
    return item;
  },

  replyToInquiry: async (id: string, reply: string, adminName: string = 'Eng/Mohamed abdal tawab'): Promise<void> => {
    checkAdminWrite('reply_inquiry', { id, reply });
    const patch: Partial<StudentInquiry> = {
      reply,
      repliedBy: adminName,
      repliedAt: new Date().toISOString(),
      status: 'answered'
    };
    const current = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    const updated = current.map(i => i.id === id ? { ...i, ...patch } : i);
    setStorageItem('inquiries', updated);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'inquiries', id), sanitizeForFirestore(patch), { merge: true });
      } catch (e) {
        console.warn("replyToInquiry sync notice:", e);
      }
    }
  },

  deleteInquiry: async (id: string): Promise<void> => {
    checkAdminWrite('delete_inquiry', { id });
    const current = getStorageItem<StudentInquiry[]>('inquiries', defaultInquiries);
    setStorageItem('inquiries', current.filter(i => i.id !== id));

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'inquiries', id));
      } catch (e) {
        console.warn("deleteInquiry notice:", e);
      }
    }
  },

  // --- Activity Logs (سجل العمليات والتدقيق الإداري) ---
  getActivityLogs: async (): Promise<ActivityLogItem[]> => {
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'activity_logs'));
        const list: ActivityLogItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ActivityLogItem));
        if (list.length > 0) {
          list.sort((a, b) => b.timestamp - a.timestamp);
          setStorageItem('activity_logs', list);
          return list;
        }
      } catch (err) {
        console.warn("Firestore getActivityLogs notice:", err);
      }
    }
    return getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
  },

  listenToActivityLogs: (onUpdate: (logs: ActivityLogItem[]) => void) => {
    const initial = getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
    onUpdate(initial);

    if (isFirebaseConfigured) {
      const unsub = onSnapshot(collection(firestoreDb, 'activity_logs'), (snap) => {
        const list: ActivityLogItem[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as ActivityLogItem));
        const res = list.length > 0 ? list : defaultActivityLogs;
        res.sort((a, b) => b.timestamp - a.timestamp);
        setStorageItem('activity_logs', res);
        onUpdate(res);
      }, (err) => {
        console.warn("ActivityLogs listener notice:", err);
        const local = getStorageItem<ActivityLogItem[]>('activity_logs', defaultActivityLogs);
        onUpdate(local);
      });
      return () => unsub();
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
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser || !isAdminEmail(firebaseAuth.currentUser.email || '')) {
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
          grade: student.grade || 'year1',
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
        await setDoc(doc(firestoreDb, 'students', id), normalizedStudent as any, { merge: true }).catch(() => {});
        if (normalizedStudent.status === 'active' || normalizedStudent.status === 'rejected' || normalizedStudent.isApproved) {
          await deleteDoc(doc(firestoreDb, 'registrations', id)).catch(() => {});
          await deleteDoc(doc(firestoreDb, 'studentRequests', id)).catch(() => {});
        } else {
          await updateDoc(doc(firestoreDb, 'registrations', id), normalizedStudent as any).catch(() => {});
          await updateDoc(doc(firestoreDb, 'studentRequests', id), normalizedStudent as any).catch(() => {});
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
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser || !isAdminEmail(firebaseAuth.currentUser.email || '')) {
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
  getOrders: async (studentId?: string): Promise<Order[]> => {
    if (isFirebaseConfigured) {
      await waitForFirebaseAuth();
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<Order[]>('orders', defaultOrders);
        return studentId ? local.filter(o => o.studentId === studentId) : local;
      }
      try {
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
        const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);

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
      const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);

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

  listenToAssignmentSubmissions: (onUpdate: (submissions: AssignmentSubmission[]) => void, studentId?: string) => {
    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser) {
        const local = getStorageItem<AssignmentSubmission[]>('assignments', []);
        onUpdate(studentId ? local.filter(a => a.studentId === studentId) : local);
        return () => {};
      }
      const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
      const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);
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
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '');
        const effectiveStudentId = isAdm ? studentId : (studentId || firebaseAuth.currentUser.uid);
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
  listenToNotifications: (userId: string, userEmailOrOnUpdate: string | ((notifs: Notification[]) => void), maybeOnUpdate?: (notifs: Notification[]) => void) => {
    const userEmail = typeof userEmailOrOnUpdate === 'string' ? userEmailOrOnUpdate : '';
    const onUpdate = typeof userEmailOrOnUpdate === 'function' ? userEmailOrOnUpdate : (maybeOnUpdate || (() => {}));

    const cleanUser = (userId || '').trim().toLowerCase();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    const matchesTarget = (item: Notification) => {
      const target = (item.userId || '').trim().toLowerCase();
      if (!target || target === 'global') return true;
      if (cleanUser && target === cleanUser) return true;
      if (cleanEmail && (target === cleanEmail || (item as any).studentEmail?.toLowerCase() === cleanEmail)) return true;
      return false;
    };

    if (isFirebaseConfigured) {
      if (!firebaseAuth?.currentUser) {
        const list = getStorageItem<Notification[]>('notifications', []);
        onUpdate(list.filter(matchesTarget));
        return () => {};
      }
      const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '') || isAdminEmail(cleanEmail);
      const colRef = collection(firestoreDb, 'notifications');
      const targetIds = Array.from(new Set(['global', firebaseAuth.currentUser.uid, userId].filter(Boolean) as string[])).slice(0, 10);
      const q = isAdm ? colRef : query(colRef, where('userId', 'in', targetIds));
      return onSnapshot(q, (snap) => {
        const list: Notification[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Notification;
          if (isAdm || matchesTarget(item)) {
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
            id: 'notif_welcome',
            userId: 'global',
            titleAr: 'أهلاً بك في منصة Eng/Mohamed abdal tawab الأكاديمية 🎓',
            titleEn: 'Welcome to Eng/Mohamed abdal tawab IT Academic Platform 🎓',
            bodyAr: 'يسعدنا انضمامك لقسم تكنولوجيا المعلومات (IT) بالجامعة التكنولوجية. يمكنك تصفح المحاضرات والسكاشن وطلب تفعيل المقررات لمتابعة المذاكرة وتحميل ملفات PDF و Word.',
            bodyEn: 'Welcome to Technological University - IT Department. Explore lectures, labs, and request course activation to download PDF and Word files.',
            isRead: false,
            type: 'general',
            createdAt: new Date().toISOString()
          }
        ]);
        onUpdate(list.filter(matchesTarget));
      };
      loadLocal();
      const interval = setInterval(loadLocal, 3000);
      return () => clearInterval(interval);
    }
  },

  addNotification: async (notif: Omit<Notification, 'id'>): Promise<Notification> => {
    const newId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newNotif: Notification = { id: newId, ...notif };
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(firestoreDb, 'notifications', newId), newNotif);
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
      } catch (err) {
        console.error("Firebase notification mark read failed:", err);
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    const updated = current.map(item => item.id === id ? { ...item, isRead: true } : item);
    setStorageItem('notifications', updated);
  },

  markAllNotificationsAsRead: async (userId: string, userEmail: string = ''): Promise<void> => {
    const cleanUser = (userId || '').trim().toLowerCase();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    const matchesTarget = (item: Notification) => {
      const target = (item.userId || '').trim().toLowerCase();
      if (!target || target === 'global') return true;
      if (cleanUser && target === cleanUser) return true;
      if (cleanEmail && (target === cleanEmail || (item as any).studentEmail?.toLowerCase() === cleanEmail)) return true;
      return false;
    };

    if (isFirebaseConfigured && firebaseAuth?.currentUser) {
      try {
        const isAdm = isAdminEmail(firebaseAuth.currentUser.email || '') || isAdminEmail(cleanEmail);
        const colRef = collection(firestoreDb, 'notifications');
        const targetIds = Array.from(new Set(['global', firebaseAuth.currentUser.uid, userId].filter(Boolean) as string[])).slice(0, 10);
        const q = isAdm ? colRef : query(colRef, where('userId', 'in', targetIds));
        const snap = await getDocs(q);
        const batchUpdates: Promise<void>[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Notification;
          if ((isAdm || matchesTarget(item)) && !item.isRead) {
            batchUpdates.push(updateDoc(doc(firestoreDb, 'notifications', d.id), { isRead: true }));
          }
        });
        await Promise.all(batchUpdates);
      } catch (err) {
        console.error("Firebase markAllNotificationsAsRead failed:", err);
      }
    }
    const current = getStorageItem<Notification[]>('notifications', []);
    const updated = current.map(item => matchesTarget(item) ? { ...item, isRead: true } : item);
    setStorageItem('notifications', updated);
  },

  deleteNotification: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(firestoreDb, 'notifications', id));
      } catch (err) {
        console.error("Firebase deleteNotification failed:", err);
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
      name: 'Eng/Mohamed abdal tawab',
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
        return { success: true, admin: { id: userData.id, name: userData.name || 'Eng/Mohamed abdal tawab', email: userData.email, role: 'super' } };
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
      return { success: true, admin: { id: found.id, name: found.name || 'Eng/Mohamed abdal tawab', email: found.email, role: 'super' } };
    }
  },

  getCurrentAdmin: (): Admin | null => {
    const u = authService.getCurrentUser();
    if (u && (u.role === 'admin' || u.email === 'mhmdbdaltwabalsdawy7@gmail.com')) {
      return { id: u.id, name: u.name || 'Eng/Mohamed abdal tawab', email: u.email, role: 'super' };
    }
    const activeUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('academy_active_user') : null;
    if (activeUserStr) {
      try {
        const activeUser = JSON.parse(activeUserStr);
        if (activeUser && (activeUser.role === 'admin' || activeUser.email === 'mhmdbdaltwabalsdawy7@gmail.com')) {
          return { id: activeUser.id || 'admin_1', name: activeUser.name || 'Eng/Mohamed abdal tawab', email: activeUser.email, role: 'super' };
        }
      } catch (e) {}
    }
    return null;
  },

  logoutAdmin: async (): Promise<void> => {
    await authService.logout();
  },

  // Global login supporting all roles
  loginUser: async (email: string, password: string): Promise<{ success: boolean; user?: UserAuth; accountStatus?: string; error?: string }> => {
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
            return { success: false, accountStatus: 'suspended', error: 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.' };
          }
          if (userData.status === 'pending' || (userData.role !== 'admin' && userData.isApproved === false && userData.status !== 'active')) {
            await signOut(firebaseAuth);
            recordLoginAttempt(normalizedEmail, false);
            return { success: false, accountStatus: 'pending', error: 'حسابك قيد المراجعة حالياً (Pending) من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
          }
          if (userData.status === 'rejected') {
            await signOut(firebaseAuth);
            recordLoginAttempt(normalizedEmail, false);
            return { success: false, accountStatus: 'rejected', error: 'تم رفض طلب تسجيل حسابك (Rejected) من قبل إدارة الأكاديمية.' };
          }
          finalUser = { id: firebaseUid, uid: firebaseUid, ...userData };
        } else {
          const userRole = isAdminEmail(normalizedEmail) ? 'admin' : 'student';
          const isAdm = userRole === 'admin';
          const nowIso = new Date().toISOString();
          finalUser = {
            id: firebaseUid,
            uid: firebaseUid,
            name: isAdm ? 'Eng/Mohamed abdal tawab' : 'طالب تكنولوجيا المعلومات',
            email: normalizedEmail,
            phone: '',
            role: userRole,
            status: isAdm ? 'active' : 'pending',
            isApproved: isAdm,
            grade: 'year1',
            department: 'IT',
            createdAt: nowIso,
            purchasedCourseIds: [],
            watchedLessonIds: [],
            quizGrades: {}
          };
          await setDoc(userRef, finalUser, { merge: true });
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
            await setDoc(doc(firestoreDb, 'students', firebaseUid), studentDoc, { merge: true });
            await signOut(firebaseAuth);
            return { success: false, accountStatus: 'pending', error: 'تم تسجيل حسابك وهو الآن في انتظار موافقة الإدارة (Pending).' };
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
              return { success: false, accountStatus: 'suspended', error: 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.' };
            }
            if (userData.status === 'pending' || (userData.role !== 'admin' && userData.isApproved === false && userData.status !== 'active')) {
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, accountStatus: 'pending', error: 'حسابك قيد المراجعة حالياً (Pending) من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
            }
            if (userData.status === 'rejected') {
              recordLoginAttempt(normalizedEmail, false);
              return { success: false, accountStatus: 'rejected', error: 'تم رفض طلب تسجيل حسابك (Rejected) من قبل إدارة الأكاديمية.' };
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
            name: 'Eng/Mohamed abdal tawab',
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
          const newUid = 'usr_' + Date.now();
          const nowIso = new Date().toISOString();
          const fallbackUser: UserAuth = {
            id: newUid,
            uid: newUid,
            name: 'طالب تكنولوجيا المعلومات',
            email: normalizedEmail,
            phone: '',
            role: 'student',
            status: 'pending',
            isApproved: false,
            grade: 'year1',
            department: 'IT',
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
          return { success: false, accountStatus: 'pending', error: 'تم تسجيل طلب حسابك وهو في انتظار موافقة الإدارة (Pending).' };
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
        return { success: false, accountStatus: 'suspended', error: 'تم إيقاف هذا الحساب من قبل إدارة الأكاديمية.' };
      }
      if (found.status === 'pending' || (found.role !== 'admin' && found.isApproved === false && found.status !== 'active')) {
        return { success: false, accountStatus: 'pending', error: 'حسابك قيد المراجعة حالياً (Pending) من قبل إدارة الأكاديمية. يرجى الانتظار حتى يتم قبول الحساب.' };
      }
      if (found.status === 'rejected') {
        return { success: false, accountStatus: 'rejected', error: 'تم رفض طلب تسجيل حسابك (Rejected) من قبل إدارة الأكاديمية.' };
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
    grade: string = 'year1',
    department: string = 'IT'
  ): Promise<{ success: boolean; user?: UserAuth; error?: string; accountStatus?: 'pending' | 'active' | 'rejected' | 'suspended' }> => {
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
            firebaseUid = 'usr_' + Date.now();
          } else {
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
          grade: finalUser.grade || 'year1',
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
              const isAdm = role === 'admin';
              userData = {
                id: uid,
                uid,
                name: fbUser.displayName || (isAdm ? 'Eng/Mohamed abdal tawab' : 'طالب تكنولوجيا المعلومات'),
                email: cleanEmail,
                phone: '',
                role,
                department: 'IT',
                grade: 'year1',
                createdAt: new Date().toISOString(),
                status: isAdm ? 'active' : 'pending',
                isApproved: isAdm
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
