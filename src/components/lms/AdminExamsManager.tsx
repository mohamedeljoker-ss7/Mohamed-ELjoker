import React, { useEffect, useMemo, useState } from 'react';
import {
  Course,
  ExamItem,
  ExamSubmission,
  OnlineExamQuestion,
  QuestionBankItem
} from '../../types';
import { dbService } from '../../firebase';
import { useLanguage } from '../LanguageContext';
import { FileUploadField } from '../FileUploadField';
import {
  ACADEMIC_GRADES,
  ACADEMIC_SEMESTERS,
  ACADEMIC_SUBJECTS,
  doesItemMatchYearAndSemester,
  getGradeName,
  getSemesterName,
  isContentPublished
} from '../../utils/gradeMatching';
import {
  Award, Plus, Search, Edit3, Trash2, Eye, CheckCircle2, X, Globe, FileEdit,
  ArrowUpDown, Clock, Lock, Unlock, ClipboardList, Database, HelpCircle,
  Users, Send, MessageSquare, FileText
} from 'lucide-react';

interface AdminExamsManagerProps {
  exams: ExamItem[];
  courses: Course[];
  questionBank: QuestionBankItem[];
  adminName?: string;
  onRefresh: () => void;
  onLogAction: (
    action: 'create' | 'update' | 'delete' | 'status_change',
    targetTitle: string,
    details?: string
  ) => void;
  onPreviewMedia?: (url: string) => void;
}

export const AdminExamsManager: React.FC<AdminExamsManagerProps> = ({
  exams,
  courses,
  questionBank,
  adminName = 'Administrator',
  onRefresh,
  onLogAction,
  onPreviewMedia
}) => {
  const { language, t } = useLanguage();

  // Independent Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'pdf'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  // Exam Submissions & Manual Review State
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [reviewExam, setReviewExam] = useState<ExamItem | null>(null);
  const [reviewSub, setReviewSub] = useState<ExamSubmission | null>(null);
  const [manualScoresDraft, setManualScoresDraft] = useState<Record<string, number>>({});
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Modal & Question Bank Picker State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewExam, setPreviewExam] = useState<ExamItem | null>(null);
  const [isBankPickerOpen, setIsBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const [form, setForm] = useState({
    academicYear: 'year1',
    semester: 'term1',
    courseId: '',
    subject: 'Physics',
    number: '1',
    title: '',
    description: '',
    questionsPdfUrl: '',
    modelAnswerUrl: '',
    examDate: new Date().toISOString().split('T')[0],
    openAt: '',
    closeAt: '',
    isOnlineExam: true,
    durationMinutes: 30,
    maxAttempts: 1,
    shuffleQuestions: false,
    showResultsImmediately: true,
    showAnswersToStudents: false,
    status: 'published' as 'draft' | 'published',
    questions: [] as OnlineExamQuestion[]
  });

  useEffect(() => {
    const unsub = dbService.listenToExamSubmissions((subs) => {
      setSubmissions(subs);
    });
    return () => unsub();
  }, []);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; courseId?: string }>();
    ACADEMIC_SUBJECTS.forEach(s => map.set(s.id.toLowerCase(), { id: s.id, label: language === 'ar' ? s.nameAr : s.nameEn }));
    courses.forEach(c => {
      const key = (c.subject || c.titleEn || c.titleAr).toLowerCase();
      if (!map.has(key)) {
        map.set(key, { id: c.subject || c.titleEn || c.titleAr, label: language === 'ar' ? c.titleAr : c.titleEn, courseId: c.id });
      }
    });
    return Array.from(map.values());
  }, [courses, language]);

  const resolveCourseMeta = (subjectVal: string, selectedCourseId: string) => {
    if (selectedCourseId) {
      const c = courses.find(cr => cr.id === selectedCourseId);
      if (c) return { courseId: c.id, courseTitle: c.titleAr || c.subject || subjectVal };
    }
    const lower = subjectVal.toLowerCase();
    const matched = courses.find(
      c =>
        (c.subject && c.subject.toLowerCase() === lower) ||
        c.titleAr.toLowerCase().includes(lower) ||
        c.titleEn.toLowerCase().includes(lower)
    );
    if (matched) return { courseId: matched.id, courseTitle: matched.titleAr };
    return { courseId: `course_${lower.replace(/\s+/g, '_')}`, courseTitle: subjectVal };
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      academicYear: yearFilter !== 'all' ? yearFilter : 'year1',
      semester: semesterFilter !== 'all' ? semesterFilter : 'term1',
      courseId: '',
      subject: subjectFilter !== 'all' ? subjectFilter : 'Physics',
      number: String(exams.length + 1),
      title: '',
      description: '',
      questionsPdfUrl: '',
      modelAnswerUrl: '',
      examDate: new Date().toISOString().split('T')[0],
      openAt: '',
      closeAt: '',
      isOnlineExam: true,
      durationMinutes: 30,
      maxAttempts: 1,
      shuffleQuestions: false,
      showResultsImmediately: true,
      showAnswersToStudents: false,
      status: 'published',
      questions: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exam: ExamItem) => {
    setEditingId(exam.id);
    setForm({
      academicYear: exam.academicYear || 'year1',
      semester: exam.semester || 'term1',
      courseId: exam.courseId || '',
      subject: exam.subject || exam.courseTitle || 'Physics',
      number: exam.number || '1',
      title: exam.title || '',
      description: exam.description || '',
      questionsPdfUrl: exam.questionsPdfUrl || exam.questionsFileUrl || '',
      modelAnswerUrl: exam.modelAnswerUrl || exam.answersFileUrl || '',
      examDate: exam.examDate || (exam.createdAt ? exam.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      openAt: exam.openAt || '',
      closeAt: exam.closeAt || '',
      isOnlineExam: exam.isOnlineExam ?? Boolean(exam.questions && exam.questions.length > 0),
      durationMinutes: exam.durationMinutes ?? 30,
      maxAttempts: exam.maxAttempts ?? 1,
      shuffleQuestions: Boolean(exam.shuffleQuestions),
      showResultsImmediately: exam.showResultsImmediately !== false,
      showAnswersToStudents: Boolean(exam.showAnswersToStudents),
      status: isContentPublished(exam) ? 'published' : 'draft',
      questions: (exam.questions || []).map(q => ({
        ...q,
        questionText: q.questionText || q.question || '',
        options: q.options && q.options.length > 0 ? q.options : (q.type === 'true_false' ? ['صحيح / True', 'خطأ / False'] : []),
        correctAnswerIndex: q.correctAnswerIndex ?? q.correctAnswer ?? 0,
        acceptedAnswers: q.acceptedAnswers || [],
        points: q.points || 1
      }))
    });
    setIsModalOpen(true);
  };

  const addQuestion = (type: OnlineExamQuestion['type']) => {
    const q: OnlineExamQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      questionText: '',
      options:
        type === 'multiple_choice'
          ? ['', '', '', '']
          : type === 'true_false'
          ? ['صحيح / True', 'خطأ / False']
          : [],
      correctAnswerIndex: 0,
      acceptedAnswers: [],
      points: 2,
      explanation: ''
    };
    setForm(prev => ({ ...prev, questions: [...prev.questions, q] }));
  };

  const updateQuestion = (idx: number, patch: Partial<OnlineExamQuestion>) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    }));
  };

  const removeQuestion = (idx: number) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const importBankQuestion = (item: QuestionBankItem) => {
    const q: OnlineExamQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: item.type || 'multiple_choice',
      questionText: item.questionText || item.question || '',
      options: item.options || [],
      correctAnswerIndex: item.correctAnswerIndex ?? item.correctAnswer ?? 0,
      acceptedAnswers: item.acceptedAnswers || [],
      points: item.points || 1,
      explanation: item.explanation || ''
    };
    setForm(prev => ({ ...prev, questions: [...prev.questions, q] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { courseId, courseTitle } = resolveCourseMeta(form.subject, form.courseId);
      const totalPoints = form.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      const cleanQuestions = form.questions.map(q => ({
        ...q,
        questionText: q.questionText.trim(),
        question: q.questionText.trim(),
        correctAnswer: q.correctAnswerIndex,
        acceptedAnswers: (q.acceptedAnswers || []).map(a => a.trim()).filter(Boolean)
      }));

      const payload: Omit<ExamItem, 'id' | 'createdAt'> = {
        academicYear: form.academicYear,
        semester: form.semester,
        courseId,
        courseTitle,
        subject: form.subject,
        number: form.number.trim() || '1',
        title: form.title.trim(),
        description: form.description.trim(),
        questionsPdfUrl: form.questionsPdfUrl.trim(),
        questionsFileUrl: form.questionsPdfUrl.trim(),
        modelAnswerUrl: form.modelAnswerUrl.trim(),
        answersFileUrl: form.modelAnswerUrl.trim(),
        examDate: form.examDate,
        openAt: form.openAt,
        closeAt: form.closeAt,
        isOnlineExam: form.isOnlineExam,
        durationMinutes: Number(form.durationMinutes) || 30,
        maxAttempts: Number(form.maxAttempts) || 1,
        shuffleQuestions: form.shuffleQuestions,
        totalPoints,
        showResultsImmediately: form.showResultsImmediately,
        showAnswersToStudents: form.showAnswersToStudents,
        questions: cleanQuestions,
        status: form.status,
        published: form.status === 'published',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await dbService.updateExam(editingId, payload);
        onLogAction('update', payload.title, `Updated exam (${form.subject})`);
      } else {
        await dbService.addExam(payload);
        onLogAction('create', payload.title, `Created exam (${form.subject})`);
        if (payload.status === 'published') {
          await dbService.addNotification({
            userId: 'global',
            type: 'exam',
            courseId,
            courseTitle,
            titleAr: `امتحان جديد: ${payload.title}`,
            titleEn: `New Exam: ${payload.title}`,
            bodyAr: `تم نشر امتحان جديد لمادة ${courseTitle}.`,
            bodyEn: `A new exam for ${courseTitle} is now available.`,
            isRead: false,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }
      }
      setIsModalOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAnswersVisibility = async (exam: ExamItem) => {
    const next = !exam.showAnswersToStudents;
    await dbService.updateExam(exam.id, {
      showAnswersToStudents: next,
      updatedAt: new Date().toISOString()
    });
    onLogAction('status_change', exam.title, `Exam answers visibility: ${next ? 'Shown' : 'Hidden'}`);
    onRefresh();
  };

  const handleToggleStatus = async (exam: ExamItem) => {
    const nextStatus = isContentPublished(exam) ? 'draft' : 'published';
    await dbService.updateExam(exam.id, {
      status: nextStatus,
      published: nextStatus === 'published',
      updatedAt: new Date().toISOString()
    });
    onLogAction('status_change', exam.title, `Set exam status to ${nextStatus}`);
    onRefresh();
  };

  const handleDelete = async (exam: ExamItem) => {
    if (!confirm(t(`هل تريد حذف الامتحان "${exam.title}"؟`, `Delete exam "${exam.title}"?`))) return;
    await dbService.deleteExam(exam.id);
    onLogAction('delete', exam.title, 'Deleted exam');
    onRefresh();
  };

  const openManualReview = (sub: ExamSubmission) => {
    setReviewSub(sub);
    setManualScoresDraft(sub.manualScores || {});
    setReviewFeedback(sub.feedback || '');
  };

  const handleSaveManualReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSub || !reviewExam) return;
    setSavingReview(true);
    try {
      const qs = reviewExam.questions || [];
      let totalScore = 0;
      let totalPts = 0;
      let correctCount = 0;

      qs.forEach(q => {
        const pts = Number(q.points) || 1;
        totalPts += pts;
        if (q.type === 'short_answer') {
          if (manualScoresDraft[q.id] !== undefined) {
            const ms = Math.max(0, Math.min(pts, Number(manualScoresDraft[q.id]) || 0));
            totalScore += ms;
            if (ms >= pts * 0.5) correctCount += 1;
          } else {
            const studentTxt = (reviewSub.shortAnswers?.[q.id] || '').trim().toLowerCase();
            const accepted = (q.acceptedAnswers || []).map(a => a.trim().toLowerCase()).filter(Boolean);
            if (accepted.length > 0 && accepted.includes(studentTxt)) {
              totalScore += pts;
              correctCount += 1;
            }
          }
        } else {
          const chosen = reviewSub.answers?.[q.id];
          const expected = q.correctAnswerIndex ?? q.correctAnswer ?? 0;
          if (chosen === expected) {
            totalScore += pts;
            correctCount += 1;
          }
        }
      });

      const finalTotalPts = totalPts || reviewSub.totalPoints || 1;
      const pct = Math.round((totalScore / finalTotalPts) * 100);

      await dbService.updateExamSubmission(reviewSub.id, {
        manualScores: manualScoresDraft,
        score: totalScore,
        totalPoints: finalTotalPts,
        percentage: pct,
        correctCount,
        needsManualReview: false,
        status: 'graded',
        feedback: reviewFeedback.trim(),
        reviewedBy: adminName,
        reviewedAt: new Date().toISOString()
      });
      onLogAction('update', reviewExam.title, `Reviewed submission by ${reviewSub.studentName} (${pct}%)`);
      setReviewSub(null);
    } finally {
      setSavingReview(false);
    }
  };

  const filteredExams = useMemo(() => {
    return exams
      .filter(exam => {
        if (!doesItemMatchYearAndSemester(exam, yearFilter, semesterFilter, courses)) return false;
        const subj = (exam.subject || exam.courseTitle || '').toLowerCase();
        if (subjectFilter !== 'all' && !subj.includes(subjectFilter.toLowerCase())) return false;
        const isOnline = exam.isOnlineExam ?? Boolean(exam.questions && exam.questions.length > 0);
        if (modeFilter === 'online' && !isOnline) return false;
        if (modeFilter === 'pdf' && isOnline) return false;
        const isPub = isContentPublished(exam);
        if (statusFilter === 'published' && !isPub) return false;
        if (statusFilter === 'draft' && isPub) return false;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${exam.title} ${exam.description || ''} ${subj}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return new Date(b.examDate || b.createdAt).getTime() - new Date(a.examDate || a.createdAt).getTime();
      });
  }, [exams, yearFilter, semesterFilter, subjectFilter, modeFilter, statusFilter, searchQuery, sortBy, courses]);

  const kpis = useMemo(() => {
    const onlineCount = exams.filter(e => e.isOnlineExam ?? Boolean(e.questions && e.questions.length > 0)).length;
    const pendingReviewCount = submissions.filter(s => s.status === 'pending_review' || s.needsManualReview).length;
    return {
      total: exams.length,
      onlineCount,
      pdfCount: exams.length - onlineCount,
      pendingReviewCount,
      totalAttempts: submissions.length
    };
  }, [exams, submissions]);

  const filteredBank = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return questionBank.filter(item => {
      if (!q) return true;
      return (item.questionText || item.question || '').toLowerCase().includes(q) || (item.subject || '').toLowerCase().includes(q);
    });
  }, [questionBank, bankSearch]);

  const examSubmissions = useMemo(() => {
    if (!reviewExam) return [];
    return submissions.filter(s => s.examId === reviewExam.id);
  }, [submissions, reviewExam]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-cyan" />
            <span>{t('إدارة الامتحانات الإلكترونية والورقية', 'University Online & Paper Exams Management')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('إنشاء اختبارات أونلاين (اختياري، صح/خطأ، إجابة قصيرة)، جدولة المواعيد، والتصحيح التلقائي واليدوي.', 'Build interactive exams (MCQ, True/False, Short Answer), schedule exam windows, and review attempts.')}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 min-h-[44px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t('إنشاء امتحان جديد', 'Create New Exam')}</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('إجمالي الامتحانات', 'Total Exams')}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{kpis.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('أونلاين / ورقي PDF', 'Online / Paper PDF')}</div>
          <div className="text-2xl font-black text-brand-cyan mt-1 tabular-nums">{kpis.onlineCount} / {kpis.pdfCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('بانتظار تصحيح يدوي', 'Pending Manual Review')}</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{kpis.pendingReviewCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('إجمالي محاولات الطلاب', 'Total Student Attempts')}</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{kpis.totalAttempts}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('بحث في الامتحانات...', 'Search exams...')}
            className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
          />
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل الفرق الدراسية', 'All Years')}</option>
          {ACADEMIC_GRADES.filter(g => g.id !== 'general').map(g => (
            <option key={g.id} value={g.id}>{language === 'ar' ? g.nameAr : g.nameEn}</option>
          ))}
        </select>
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل الفصول', 'All Semesters')}</option>
          {ACADEMIC_SEMESTERS.filter(s => s.id !== 'all').map(s => (
            <option key={s.id} value={s.id}>{language === 'ar' ? s.nameAr : s.nameEn}</option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل المواد', 'All Subjects')}</option>
          {subjectOptions.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value as 'all' | 'online' | 'pdf')}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل الأنماط', 'All Modes')}</option>
          <option value="online">{t('اختبار أونلاين', 'Interactive Online')}</option>
          <option value="pdf">{t('ورقي PDF', 'Paper PDF')}</option>
        </select>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="flex-1 px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all">{t('كل الحالات', 'All')}</option>
            <option value="published">{t('منشور', 'Published')}</option>
            <option value="draft">{t('مسودة', 'Draft')}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortBy(prev => prev === 'date' ? 'title' : 'date')}
            className="px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center cursor-pointer shrink-0"
            title={t('تبديل الترتيب', 'Toggle Sort')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
          </button>
        </div>
      </div>

      {/* Exams Cards */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <Award className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            {t('لا توجد امتحانات مطابقة للفلاتر الحالية.', 'No exams match the current filters.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map(exam => {
            const isPub = isContentPublished(exam);
            const isOnline = exam.isOnlineExam ?? Boolean(exam.questions && exam.questions.length > 0);
            const examSubs = submissions.filter(s => s.examId === exam.id);
            const pendingCount = examSubs.filter(s => s.status === 'pending_review' || s.needsManualReview).length;

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-brand-cyan/60 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 tabular-nums">
                        <span className="text-brand-cyan font-black">
                          {isOnline ? t('امتحان أونلاين', 'Online Exam') : t('امتحان PDF', 'Paper Exam')} #{exam.number}
                        </span>
                        <span>·</span>
                        <span>{exam.subject || exam.courseTitle}</span>
                        <span>·</span>
                        <span>{getGradeName(exam.academicYear, language)}</span>
                        <span>·</span>
                        <span>{getSemesterName(exam.semester, language)}</span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base mt-1 truncate">{exam.title}</h4>
                    </div>
                    <span className={`text-[11px] font-bold shrink-0 ${isPub ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isPub ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                    </span>
                  </div>

                  {exam.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 tabular-nums">
                    {isOnline && (
                      <>
                        <span className="font-bold text-brand-cyan">
                          {(exam.questions || []).length} {t('سؤال', 'Qs')} · {exam.totalPoints ?? 0} {t('درجة', 'pts')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {exam.durationMinutes ?? 30} {t('دقيقة', 'min')}
                        </span>
                      </>
                    )}
                    <span className={`inline-flex items-center gap-1 font-bold ${exam.showAnswersToStudents ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {exam.showAnswersToStudents ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {exam.showAnswersToStudents ? t('الإجابات ظاهرة', 'Keys Shown') : t('الإجابات مخفية', 'Keys Hidden')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewExam(exam)}
                      className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t('معاينة', 'Preview')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewExam(exam)}
                      className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-brand-cyan bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-lg flex items-center gap-1 cursor-pointer tabular-nums"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{t(`النتائج (${examSubs.length})`, `Attempts (${examSubs.length})`)}</span>
                      {pendingCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-black">· {pendingCount} {t('مراجعة', 'review')}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAnswersVisibility(exam)}
                      className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      {exam.showAnswersToStudents ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      <span>{exam.showAnswersToStudents ? t('إخفاء الحل', 'Hide Keys') : t('إظهار الحل', 'Show Keys')}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(exam)}
                      className="p-2 min-h-[36px] min-w-[36px] text-slate-600 dark:text-slate-300 hover:text-brand-cyan rounded-lg cursor-pointer"
                      title={isPub ? t('تحويل لمسودة', 'Move to Draft') : t('نشر', 'Publish')}
                    >
                      {isPub ? <FileEdit className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(exam)}
                      className="p-2 min-h-[36px] min-w-[36px] text-slate-600 dark:text-slate-300 hover:text-brand-cyan rounded-lg cursor-pointer"
                      title={t('تعديل', 'Edit')}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(exam)}
                      className="p-2 min-h-[36px] min-w-[36px] text-slate-600 dark:text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer"
                      title={t('حذف', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingId ? t('تعديل الامتحان', 'Edit Exam') : t('إنشاء امتحان جامعي جديد', 'Create University Exam')}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              {/* Academic Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('الفرقة الدراسية', 'Academic Year')}</label>
                  <select
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {ACADEMIC_GRADES.map(g => (
                      <option key={g.id} value={g.id}>{language === 'ar' ? g.nameAr : g.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('الفصل الدراسي', 'Semester')}</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {ACADEMIC_SEMESTERS.map(s => (
                      <option key={s.id} value={s.id}>{language === 'ar' ? s.nameAr : s.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('المادة الدراسية', 'Subject')}</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {subjectOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('الحالة', 'Status')}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="published">{t('منشور للطلاب', 'Published')}</option>
                    <option value="draft">{t('مسودة (مخفي)', 'Draft (Hidden)')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('رقم / رمز الامتحان', 'Exam #')}</label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('عنوان الامتحان *', 'Exam Title *')}</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t('مثال: امتحان منتصف الفصل - أساسيات بايثون', 'e.g. Midterm Exam - Python Fundamentals')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('تعليمات الامتحان', 'Exam Instructions')}</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Paper PDF & Model Answer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileUploadField
                  label={t('ملف أسئلة الامتحان PDF (اختياري)', 'Exam Questions PDF (Optional)')}
                  value={form.questionsPdfUrl}
                  onChange={(val) => setForm({ ...form, questionsPdfUrl: val })}
                  accept=".pdf,application/pdf"
                  fileType="pdf"
                  folder="lms_exams"
                  onPreview={(url) => onPreviewMedia?.(url)}
                />
                <FileUploadField
                  label={t('ملف الإجابة النموذجية PDF (اختياري)', 'Model Answer PDF (Optional)')}
                  value={form.modelAnswerUrl}
                  onChange={(val) => setForm({ ...form, modelAnswerUrl: val })}
                  accept=".pdf,application/pdf"
                  fileType="pdf"
                  folder="lms_exams_answers"
                  onPreview={(url) => onPreviewMedia?.(url)}
                />
              </div>

              {/* Scheduling & Attempt Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isOnlineExam}
                      onChange={(e) => setForm({ ...form, isOnlineExam: e.target.checked })}
                      className="w-4 h-4 accent-brand-cyan rounded"
                    />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {t('تفعيل الامتحان الإلكتروني التفاعلي (Online Exam)', 'Enable Interactive Online Exam')}
                    </span>
                  </label>
                  <span className="text-[11px] font-bold text-brand-cyan tabular-nums">
                    {t('مجموع الدرجات:', 'Total Points:')} {form.questions.reduce((s, q) => s + (Number(q.points) || 1), 0)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('المدة (دقيقة)', 'Duration (min)')}</label>
                    <input
                      type="number"
                      min={1}
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) || 30 })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('عدد المحاولات', 'Max Attempts')}</label>
                    <input
                      type="number"
                      min={1}
                      value={form.maxAttempts}
                      onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('يفتح في (اختياري)', 'Opens At')}</label>
                    <input
                      type="datetime-local"
                      value={form.openAt}
                      onChange={(e) => setForm({ ...form, openAt: e.target.value })}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('يغلق في (اختياري)', 'Closes At')}</label>
                    <input
                      type="datetime-local"
                      value={form.closeAt}
                      onChange={(e) => setForm({ ...form, closeAt: e.target.value })}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.shuffleQuestions}
                      onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                      className="w-4 h-4 accent-brand-cyan rounded"
                    />
                    <span>{t('ترتيب عشوائي للأسئلة لكل طالب', 'Shuffle Questions per Student')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.showResultsImmediately}
                      onChange={(e) => setForm({ ...form, showResultsImmediately: e.target.checked })}
                      className="w-4 h-4 accent-brand-cyan rounded"
                    />
                    <span>{t('إظهار الدرجة فور التسليم', 'Show Score Immediately')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-cyan">
                    <input
                      type="checkbox"
                      checked={form.showAnswersToStudents}
                      onChange={(e) => setForm({ ...form, showAnswersToStudents: e.target.checked })}
                      className="w-4 h-4 accent-brand-cyan rounded"
                    />
                    <span>{t('إظهار الإجابات الصحيحة والشرح للطلاب بعد التسليم', 'Reveal Correct Answers & Explanations to Students')}</span>
                  </label>
                </div>
              </div>

              {/* 3-Type Question Builder */}
              {form.isOnlineExam && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-brand-cyan" />
                      <span>{t(`منشئ الأسئلة (${form.questions.length})`, `Exam Question Builder (${form.questions.length})`)}</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addQuestion('multiple_choice')}
                        className="px-3 py-1.5 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        + {t('اختيار من متعدد', 'Multiple Choice')}
                      </button>
                      <button
                        type="button"
                        onClick={() => addQuestion('true_false')}
                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        + {t('صح / خطأ', 'True / False')}
                      </button>
                      <button
                        type="button"
                        onClick={() => addQuestion('short_answer')}
                        className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        + {t('إجابة قصيرة', 'Short Answer')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBankPickerOpen(true)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Database className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>{t('استيراد من بنك الأسئلة', 'Import from Bank')}</span>
                      </button>
                    </div>
                  </div>

                  {form.questions.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-500">
                      {t('أضف أسئلة باستخدام الأزرار بالأعلى أو استورد من بنك الأسئلة.', 'Add questions above or import from the Question Bank.')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {form.questions.map((q, qIdx) => (
                        <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-brand-cyan tabular-nums">
                              Q{qIdx + 1} · {q.type === 'multiple_choice' ? t('اختيار من متعدد', 'Multiple Choice') : q.type === 'true_false' ? t('صح / خطأ', 'True / False') : t('إجابة قصيرة', 'Short Answer')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-500">{t('الدرجة:', 'Pts:')}</span>
                              <input
                                type="number"
                                min={1}
                                value={q.points}
                                onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) || 1 })}
                                className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                              />
                              <button
                                type="button"
                                onClick={() => removeQuestion(qIdx)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            required
                            value={q.questionText}
                            onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                            placeholder={t('نص السؤال...', 'Question prompt...')}
                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                          />

                          {q.type === 'multiple_choice' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={q.correctAnswerIndex === optIdx}
                                    onChange={() => updateQuestion(qIdx, { correctAnswerIndex: optIdx })}
                                    className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
                                  />
                                  <input
                                    type="text"
                                    required
                                    value={opt}
                                    onChange={(e) => {
                                      const nextOpts = [...q.options];
                                      nextOpts[optIdx] = e.target.value;
                                      updateQuestion(qIdx, { options: nextOpts });
                                    }}
                                    placeholder={t(`الخيار ${optIdx + 1}`, `Option ${optIdx + 1}`)}
                                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'true_false' && (
                            <div className="flex flex-wrap gap-4">
                              {q.options.map((opt, optIdx) => (
                                <label key={optIdx} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                                  <input
                                    type="radio"
                                    name={`tf_${q.id}`}
                                    checked={q.correctAnswerIndex === optIdx}
                                    onChange={() => updateQuestion(qIdx, { correctAnswerIndex: optIdx })}
                                    className="w-4 h-4 accent-emerald-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.type === 'short_answer' && (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                {t('الإجابات المقبولة تلقائيًا (افصل بفاصلة , أو اتركه فارغًا للتصحيح اليدوي)', 'Accepted Answers for auto-grade (comma-separated, or leave blank for manual grading)')}
                              </label>
                              <input
                                type="text"
                                value={(q.acceptedAnswers || []).join(', ')}
                                onChange={(e) => updateQuestion(qIdx, { acceptedAnswers: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder={t('مثال: RAM, الذاكرة العشوائية', 'e.g. RAM, Random Access Memory')}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                              />
                            </div>
                          )}

                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                            placeholder={t('تفسير الإجابة (يظهر عند تفعيل إظهار الحل للطلاب)...', 'Optional answer explanation...')}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 min-h-[44px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ الامتحان', 'Save Exam')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Bank Picker Modal */}
      {isBankPickerOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-black text-slate-900 dark:text-white text-sm">{t('استيراد سؤال من بنك الأسئلة', 'Import from Question Bank')}</h4>
              <button type="button" onClick={() => setIsBankPickerOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder={t('ابحث في بنك الأسئلة...', 'Search question bank...')}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="p-4 overflow-y-auto space-y-2.5">
              {filteredBank.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">{t('لا توجد أسئلة متاحة في البنك.', 'No questions in Question Bank.')}</p>
              ) : (
                filteredBank.map(item => (
                  <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-brand-cyan">{item.subject || item.courseTitle} · {item.type}</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.questionText || item.question}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => importBankQuestion(item)}
                      className="px-3 py-1.5 bg-brand-cyan text-white dark:text-slate-950 font-black rounded-lg text-xs shrink-0 cursor-pointer"
                    >
                      + {t('إضافة', 'Add')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Exam As Student */}
      {previewExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-brand-cyan">{t('معاينة الامتحان كما يظهر للطالب', 'Student Exam Preview')}</span>
                <h4 className="font-black text-slate-900 dark:text-white text-lg">{previewExam.title}</h4>
              </div>
              <button type="button" onClick={() => setPreviewExam(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap gap-4 tabular-nums">
              <span>{t('المدة:', 'Duration:')} {previewExam.durationMinutes ?? 30} {t('دقيقة', 'min')}</span>
              <span>{t('المحاولات:', 'Max Attempts:')} {previewExam.maxAttempts ?? 1}</span>
              <span>{t('إظهار الإجابات:', 'Show Keys:')} {previewExam.showAnswersToStudents ? t('نعم', 'Yes') : t('لا', 'No')}</span>
            </div>
            {(previewExam.questions || []).map((q, idx) => (
              <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="font-black text-xs text-slate-900 dark:text-white">
                  {idx + 1}. {q.questionText || q.question} <span className="text-brand-cyan">({q.points} pts)</span>
                </div>
                {q.type === 'short_answer' ? (
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-400">
                    {t('[حقل كتابة الإجابة القصيرة للطالب]', '[Student short-answer input]')}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => (
                      <div key={i} className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions & Manual Grading Modal */}
      {reviewExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-brand-cyan">{t('نتائج الطلاب والمراجعة اليدوية', 'Exam Submissions & Manual Grading')}</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base">{reviewExam.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setReviewExam(null); setReviewSub(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {examSubmissions.length === 0 ? (
                <p className="text-center py-10 text-sm font-bold text-slate-500">
                  {t('لا توجد محاولات طلاب لهذا الامتحان بعد.', 'No attempts submitted yet.')}
                </p>
              ) : (
                examSubmissions.map(sub => {
                  const needsRev = sub.status === 'pending_review' || sub.needsManualReview;
                  return (
                    <div key={sub.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white">{sub.studentName}</div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {sub.studentEmail} · {new Date(sub.submittedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black tabular-nums ${needsRev ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {sub.score} / {sub.totalPoints} ({sub.percentage}%)
                            {needsRev ? ` · ${t('يحتاج مراجعة', 'Needs Review')}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => openManualReview(sub)}
                            className="px-3 py-1.5 min-h-[36px] bg-brand-cyan text-white dark:text-slate-950 font-black rounded-lg text-xs cursor-pointer"
                          >
                            {t('مراجعة وتصحيح', 'Review')}
                          </button>
                        </div>
                      </div>

                      {reviewSub?.id === sub.id && (
                        <form onSubmit={handleSaveManualReview} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                          {(reviewExam.questions || []).map((q, idx) => {
                            const isShort = q.type === 'short_answer';
                            const chosenIdx = sub.answers?.[q.id];
                            const shortTxt = sub.shortAnswers?.[q.id] || '';
                            const expectedIdx = q.correctAnswerIndex ?? q.correctAnswer ?? 0;

                            return (
                              <div key={q.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                                  <span>{idx + 1}. {q.questionText || q.question}</span>
                                  <span className="text-brand-cyan tabular-nums">{q.points} pts</span>
                                </div>
                                {isShort ? (
                                  <div className="space-y-2">
                                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                                      <strong>{t('إجابة الطالب:', 'Student Answer:')}</strong> {shortTxt || t('بدون إجابة', 'No answer')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        {t(`تقييم الإجابة (0 - ${q.points}):`, `Score (0 - ${q.points}):`)}
                                      </label>
                                      <input
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        max={q.points}
                                        value={manualScoresDraft[q.id] ?? ''}
                                        onChange={(e) => setManualScoresDraft(prev => ({ ...prev, [q.id]: Number(e.target.value) || 0 }))}
                                        className="w-24 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                    {t('اختيار الطالب:', 'Selected:')} <strong>{chosenIdx !== undefined ? (q.options[chosenIdx] || chosenIdx) : '-'}</strong>
                                    {' · '}
                                    {chosenIdx === expectedIdx
                                      ? <span className="text-emerald-600 font-bold">{t('صحيح', 'Correct')}</span>
                                      : <span className="text-rose-500 font-bold">{t('خطأ', 'Incorrect')} ({q.options[expectedIdx]})</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={reviewFeedback}
                              onChange={(e) => setReviewFeedback(e.target.value)}
                              placeholder={t('ملاحظات الإدارة للطالب...', 'Feedback for student...')}
                              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                            />
                            <button
                              type="submit"
                              disabled={savingReview}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{savingReview ? t('حفظ...', 'Saving...') : t('اعتماد النتيجة', 'Save Review')}</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
