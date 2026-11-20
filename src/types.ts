export interface Lesson {
  id: string;
  titleAr: string;
  titleEn: string;
  videoUrl: string;
  videoType?: 'youtube' | 'video' | 'drive' | 'vimeo' | 'iframe' | 'empty' | 'unsupported';
  videoId?: string;
  pdfUrl?: string;
  wordUrl?: string; // Word Document (.docx / .doc)
  fileUrl?: string; // Generic / Code / Archive
  fileType?: 'pdf' | 'word' | 'powerpoint' | 'excel' | 'code' | 'video' | 'zip' | 'other';
  isSection?: boolean; // True for practical section/lab, false for lecture
  attachments?: string[];
  homework?: string;
  notes?: string;
  duration: string;
}

export type LessonType = 'video' | 'pdf' | 'word' | 'quiz' | 'assignment' | 'lecture' | 'section';

export interface UnitLesson {
  id: string;
  title: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'video' | 'drive' | 'vimeo' | 'iframe' | 'empty' | 'unsupported';
  videoId?: string;
  duration: string;
  type: LessonType;
  pdfUrl?: string;
  wordUrl?: string; // Word document (.docx / .doc)
  fileUrl?: string; // Extra files / presentations
  fileType?: 'pdf' | 'word' | 'powerpoint' | 'excel' | 'code' | 'video' | 'zip' | 'other';
  isSection?: boolean; // True for practical section/lab
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

export type AcademicYear = 'year1' | 'year2' | 'year3' | 'year4' | 'general' | 'all';
export type AcademicSemester = 'term1' | 'term2' | 'all';

export interface AttachmentFile {
  id: string;
  name: string;
  url: string;
  fileType: 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'image' | 'code' | 'zip' | 'video' | 'other';
  size?: number;
}

export interface SectionExample {
  id: string;
  title: string;
  codeSnippet?: string;
  language?: string;
  solutionText: string;
}

export interface LectureItem {
  id: string;
  academicYear?: AcademicYear | string;
  semester?: AcademicSemester | string;
  courseId: string;
  courseTitle?: string;
  subject?: string;
  number: number;
  lectureNumber?: number;
  title: string;
  description?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pptxUrl?: string;
  imageUrls?: string[];
  attachments?: AttachmentFile[];
  lectureDate?: string;
  status?: 'draft' | 'published' | 'unpublished';
  published?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SectionItem {
  id: string;
  academicYear?: AcademicYear | string;
  semester?: AcademicSemester | string;
  courseId: string;
  courseTitle?: string;
  subject?: string;
  number: number;
  sectionNumber?: number;
  title: string;
  practicalTopic?: string;
  labInstructions?: string;
  description?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  pdfUrl?: string;
  archiveUrl?: string;
  codeFiles?: AttachmentFile[];
  imageUrls?: string[];
  practicalExamples?: SectionExample[];
  attachments?: AttachmentFile[];
  sectionDate?: string;
  status?: 'draft' | 'published' | 'unpublished';
  published?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface OnlineExamQuestion {
  id: string;
  questionText: string;
  question?: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correctAnswerIndex: number;
  correctAnswer?: number;
  acceptedAnswers?: string[];
  points: number;
  explanation?: string;
}

export interface ExamItem {
  id: string;
  academicYear?: AcademicYear | string;
  semester?: AcademicSemester | string;
  courseId: string;
  courseTitle?: string;
  subject?: string;
  number: string;
  title: string;
  description?: string;
  questionsFileUrl?: string;
  answersFileUrl?: string;
  questionsPdfUrl?: string;
  modelAnswerUrl?: string;
  examDate?: string;
  openAt?: string;
  closeAt?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  isOnlineExam?: boolean;
  durationMinutes?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  totalPoints?: number;
  showResultsImmediately?: boolean;
  showAnswersToStudents?: boolean;
  questions?: OnlineExamQuestion[];
  status?: 'draft' | 'published' | 'unpublished';
  published?: boolean;
}

export interface QuestionBankItem {
  id: string;
  academicYear?: AcademicYear | string;
  semester?: AcademicSemester | string;
  courseId: string;
  courseTitle: string;
  subject?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionText: string;
  question?: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correctAnswerIndex: number;
  correctAnswer?: number;
  acceptedAnswers?: string[];
  points: number;
  explanation?: string;
  createdAt: string;
}

export interface ExamSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  courseId: string;
  courseTitle?: string;
  subject?: string;
  academicYear?: string;
  semester?: string;
  score: number;
  totalPoints: number;
  percentage: number;
  correctCount?: number;
  totalQuestions?: number;
  attemptNumber?: number;
  answers: Record<string, number>;
  shortAnswers?: Record<string, string>;
  manualScores?: Record<string, number>;
  needsManualReview?: boolean;
  status?: 'auto_graded' | 'pending_review' | 'graded';
  feedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  academicYear?: AcademicYear | string;
  semester?: AcademicSemester | string;
  courseId: string;
  courseTitle: string;
  subject?: string;
  itemType: 'lecture' | 'section' | 'exam';
  type?: 'lecture' | 'section' | 'exam';
  dayOfWeek: string;
  dayOfWeekAr: string;
  startTime: string;
  endTime: string;
  location: string;
  instructor: string;
  notes?: string;
  active: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface StudentInquiry {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  courseId?: string;
  courseTitle?: string;
  subject?: string;
  subjectTitle?: string;
  category?: 'lecture' | 'section' | 'exam' | 'sheet' | 'general';
  title: string;
  question: string;
  message?: string;
  status: 'pending' | 'answered';
  reply?: string;
  adminReply?: string;
  repliedBy?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  adminEmail: string;
  adminName: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'approve' | 'reject' | 'suspend' | 'reply';
  targetType: 'lecture' | 'section' | 'exam' | 'sheet' | 'student' | 'schedule' | 'question_bank' | 'notification' | 'inquiry' | 'general';
  targetTitle: string;
  details?: string;
  timestamp: number;
  date: string;
}

export interface SheetItem {
  id: string;
  academicYear?: AcademicYear | string;
  semester?: AcademicSemester | string;
  courseId: string;
  courseTitle?: string;
  subject?: string;
  sheetType: 'lecture_sheet' | 'section_sheet';
  type?: 'lecture_sheet' | 'section_sheet';
  referenceNumber: number;
  lectureNumber?: number;
  sectionNumber?: number;
  title: string;
  description?: string;
  fileUrl: string;
  pdfUrl?: string;
  wordUrl?: string;
  imageUrls?: string[];
  attachments?: AttachmentFile[];
  publishDate?: string;
  deadline?: string;
  requiresSubmission?: boolean;
  totalPoints?: number;
  modelAnswerUrl?: string;
  modelAnswerText?: string;
  showAnswersToStudents?: boolean;
  status?: 'draft' | 'published' | 'unpublished' | 'closed';
  published?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SheetAnswerKeyDoc {
  sheetId: string;
  modelAnswerUrl?: string;
  modelAnswerText?: string;
  showAnswersToStudents: boolean;
  updatedAt: string;
}

export interface ExamPrivateKeyEntry {
  correctAnswerIndex: number;
  acceptedAnswers?: string[];
  explanation?: string;
}

export interface ExamPrivateKeyDoc {
  examId: string;
  modelAnswerUrl?: string;
  answersFileUrl?: string;
  questionKeys: Record<string, ExamPrivateKeyEntry>;
  showAnswersToStudents: boolean;
  showResultsImmediately: boolean;
  updatedAt: string;
}

export interface ExamSubmissionReceipt {
  examId: string;
  studentId: string;
  createdAt: string;
}

export interface SheetSubmission {
  id: string;
  sheetId: string;
  sheetTitle: string;
  sheetType?: 'lecture_sheet' | 'section_sheet';
  courseId: string;
  courseTitle?: string;
  subject?: string;
  academicYear?: string;
  semester?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  answerText?: string;
  fileUrl?: string;
  fileName?: string;
  status: 'submitted' | 'graded';
  score?: number;
  totalPoints?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  submittedAt: string;
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
  price?: number;
  discountPrice?: number;
  duration?: string; // e.g. "12 Hours"
  lessonsCount?: number;
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
  favorites?: string[]; // Bookmarked lecture/section IDs
  bookmarkedLectureIds?: string[];
  quizGrades?: Record<string, number>; // quizId -> percentage score
  enrollmentDate: string;
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  bio?: string;
  subscription?: UserSubscription;
  department?: string;
  grade?: string;
  semester?: AcademicSemester | string;
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
  adminLevel?: 'super' | 'editor';
  status: 'active' | 'suspended' | 'pending' | 'rejected';
  purchasedCourseIds?: string[];
  watchedLessonIds?: string[];
  favorites?: string[];
  bookmarkedLectureIds?: string[];
  quizGrades?: Record<string, number>;
  bio?: string;
  subscription?: UserSubscription;
  department?: string;
  grade?: string;
  semester?: AcademicSemester | string;
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
  studentEmail?: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  isRead: boolean;
  readBy?: string[];
  createdAt: string;
  type?: 'lecture_added' | 'course_activated' | 'assignment' | 'exam' | 'general';
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  actionUrl?: string;
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

