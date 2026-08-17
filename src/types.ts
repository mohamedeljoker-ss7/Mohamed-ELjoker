export interface Lesson {
  id: string;
  titleAr: string;
  titleEn: string;
  videoUrl: string;
  videoType?: 'youtube' | 'video' | 'drive' | 'vimeo' | 'iframe' | 'empty' | 'unsupported';
  videoId?: string;
  pdfUrl?: string;
  attachments?: string[];
  homework?: string;
  notes?: string;
  duration: string;
}

export type LessonType = 'video' | 'pdf' | 'quiz' | 'assignment';

export interface UnitLesson {
  id: string;
  title: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'video' | 'drive' | 'vimeo' | 'iframe' | 'empty' | 'unsupported';
  videoId?: string;
  duration: string;
  type: LessonType;
  pdfUrl?: string;
  order: number;
}

export interface CourseUnit {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: UnitLesson[];
}

export interface UserSubscription {
  active: boolean;
  expiresAt: string | number;
}

export interface Course {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  teacherName: string;
  teacherId?: string; // References Teacher id
  categoryId: string; // References Category
  grade?: string; // Optional grade code (e.g., prep1, prep2, prep3, sec1, sec2, sec3)
  subject?: string; // Course subject (e.g., العلوم, الرياضيات, الفيزياء)
  price: number;
  discountPrice?: number;
  duration: string; // e.g. "12 Hours"
  lessonsCount: number;
  featured: boolean;
  popular: boolean;
  published: boolean;
  status?: 'published' | 'draft';
  department?: string;
  thumbnailUrl: string;
  bannerUrl?: string; // Course Banner Image
  isFree?: boolean; // Free/Paid toggle
  isPremium?: boolean; // Premium toggle
  password?: string; // Optional course password
  imageUrls: string[]; // Multiple images
  videoUrl?: string; // Promo intro video URL
  videoType?: 'youtube' | 'video' | 'drive' | 'vimeo' | 'iframe' | 'empty' | 'unsupported';
  videoId?: string;
  pdfUrl?: string; // Syllabus / PDF download
  attachments?: string[]; // Extra attachments
  lessons?: Lesson[]; // Course lessons list
  units?: CourseUnit[]; // Course syllabus units and lessons
  subjectAr?: string; // Course subject in Arabic
  subjectEn?: string; // Course subject in English
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  color: string; // Hex or tailwind class name
}

export interface Teacher {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  bioAr: string;
  bioEn: string;
  imageUrl: string;
  rating: number;
}

export interface Student {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phone: string;
  purchasedCourseIds: string[];
  watchedLessonIds?: string[]; // Progress tracking
  quizGrades?: Record<string, number>; // quizId -> percentage score
  enrollmentDate: string;
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  bio?: string;
  subscription?: UserSubscription;
  department?: string;
  grade?: string;
  createdAt?: string;
  isApproved?: boolean;
}

export interface UserAuth {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  purchasedCourseIds?: string[];
  watchedLessonIds?: string[];
  quizGrades?: Record<string, number>;
  bio?: string;
  subscription?: UserSubscription;
  department?: string;
  grade?: string;
  createdAt?: string;
  lastLoginTimestamp?: number;
  forceLogoutVersion?: number;
  isApproved?: boolean;
}

export interface NewsItem {
  id: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  date: string;
  imageUrl: string;
}

export interface Article {
  id: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  authorAr: string;
  authorEn: string;
  date: string;
  imageUrl: string;
  tags: string[];
}

export interface UserReview {
  id: string;
  studentName: string;
  studentTitleAr: string;
  studentTitleEn: string;
  rating: number;
  commentAr: string;
  commentEn: string;
  courseId?: string;
  date: string;
  approved: boolean;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  date: string;
  read: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  expiresAt: string;
  active: boolean;
}

export interface Order {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  courseId: string;
  courseTitle: string;
  pricePaid: number;
  couponCode?: string;
  date: string;
  status: 'pending' | 'completed' | 'approved' | 'rejected';
}

export interface QuizQuestion {
  id: string;
  questionAr: string;
  questionEn: string;
  optionsAr: string[];
  optionsEn: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  grade?: string;
  titleAr: string;
  titleEn: string;
  timeLimit?: number; // Time limit in minutes
  published?: boolean;
  autoCorrection?: boolean;
  questions: QuizQuestion[];
  createdAt?: string;
}

export interface QuizSubmission {
  id?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  quizId: string;
  quizTitle?: string;
  courseId?: string;
  score: number; // percentage score or total score
  correctCount?: number;
  totalQuestions?: number;
  answers?: Record<string, number>;
  submittedAt?: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseName?: string;
  visibility?: 'free' | 'course';
  grade?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  pdfUrl?: string;
  imageUrls?: string[];
  deadline?: string;
  totalGrade?: number;
  published: boolean;
  createdAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'super' | 'editor';
}

export interface WebsiteSettings {
  websiteNameAr: string;
  websiteNameEn: string;
  logoUrl: string;
  faviconUrl: string;
  whatsapp: string;
  telegram: string;
  facebook: string;
  youtube: string;
  instagram: string;
  email: string;
  footerAr: string;
  footerEn: string;
  seoDescription: string;
  seoKeywords: string;
  forceLogoutVersion?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId?: string;
  studentId: string;
  studentName: string;
  courseId: string;
  lessonId?: string;
  homeworkAr: string;
  studentText: string;
  fileUrl?: string;
  date: string;
  status: 'submitted' | 'graded';
  grade?: string;
  feedback?: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitleAr: string;
  courseTitleEn: string;
  issueDate: string;
  verificationCode: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  fileUrl?: string;
  timestamp: number;
  isRead?: boolean;
}

export interface ChatThread {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  lastMessageText?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface LessonComment {
  id: string;
  courseId: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  comment: string;
  timestamp: number;
  reply?: string;
  replyTimestamp?: number;
}

export interface Notification {
  id: string;
  userId: string; // userId or 'global'
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  isRead: boolean;
  createdAt: string;
}

export interface CourseRequest extends Order {
  updatedAt?: string;
}

export interface CourseAccess {
  id: string; // e.g. studentId_courseId
  studentId: string;
  courseId: string;
  status: 'approved' | 'rejected' | 'pending';
  grantedAt?: string;
}

export interface LessonAccess {
  id: string; // e.g. studentId_courseId or courseId_global
  studentId: string;
  courseId: string;
  unlockedItems: Record<string, boolean>;
  updatedAt: string;
}

