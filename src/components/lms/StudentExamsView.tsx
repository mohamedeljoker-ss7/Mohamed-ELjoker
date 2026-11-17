import React, { useEffect, useMemo, useState } from 'react';
import { Course, ExamItem, ExamSubmission, OnlineExamQuestion, UserAuth } from '../../types';
import { dbService } from '../../firebase';
import { useLanguage } from '../LanguageContext';
import { triggerFileDownload } from '../../utils/videoStorage';
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
  Award, Search, FileText, Download, Eye, ArrowUpDown, X, Clock, Play,
  CheckCircle2, Lock, Unlock, AlertCircle, Send, MessageSquare
} from 'lucide-react';

interface StudentExamsViewProps {
  exams: ExamItem[];
  courses: Course[];
  currentUser: UserAuth | null;
  onOpenPdf: (url: string, title: string) => void;
  onExamSubmitted?: (submission: ExamSubmission) => void;
}

interface ExamDraftState {
  answers: Record<string, number>;
  shortAnswers: Record<string, string>;
  remainingSeconds: number;
  questionOrder: string[];
}

export const StudentExamsView: React.FC<StudentExamsViewProps> = ({
  exams,
  courses,
  currentUser,
  onOpenPdf,
  onExamSubmitted
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(currentUser?.grade || 'all');
  const [semesterFilter, setSemesterFilter] = useState<string>(currentUser?.semester || 'all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'pdf'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  const [mySubmissions, setMySubmissions] = useState<ExamSubmission[]>([]);

  // Active Exam Runner State
  const [activeExam, setActiveExam] = useState<ExamItem | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<OnlineExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Result / Review Modal State
  const [reviewSubmission, setReviewSubmission] = useState<{ exam: ExamItem; sub: ExamSubmission } | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = dbService.listenToExamSubmissions((subs) => {
      setMySubmissions(subs);
    }, undefined, currentUser.id);
    return () => unsub();
  }, [currentUser?.id]);

  const draftKey = (examId: string) => `exam_draft_${currentUser?.id || 'guest'}_${examId}`;

  // Countdown Timer for Active Exam
  useEffect(() => {
    if (!activeExam) return;
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExam?.id]);

  // Auto-save draft while attempting
  useEffect(() => {
    if (!activeExam) return;
    const payload: ExamDraftState = {
      answers,
      shortAnswers,
      remainingSeconds,
      questionOrder: orderedQuestions.map(q => q.id)
    };
    try {
      localStorage.setItem(draftKey(activeExam.id), JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [activeExam?.id, answers, shortAnswers, remainingSeconds, orderedQuestions]);

  // Auto-submit when countdown hits zero
  useEffect(() => {
    if (activeExam && remainingSeconds === 0 && !submitting) {
      handleSubmitExam(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, activeExam?.id]);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    ACADEMIC_SUBJECTS.forEach(s => map.set(s.id.toLowerCase(), language === 'ar' ? s.nameAr : s.nameEn));
    courses.forEach(c => {
      const id = c.subject || c.titleEn || c.titleAr;
      if (id && !map.has(id.toLowerCase())) {
        map.set(id.toLowerCase(), language === 'ar' ? c.titleAr : c.titleEn);
      }
    });
    return Array.from(map.entries()).map(([k, label]) => ({ id: k, label }));
  }, [courses, language]);

  const publishedExams = useMemo(() => {
    return exams.filter(e => isContentPublished(e));
  }, [exams]);

  const filteredExams = useMemo(() => {
    return publishedExams
      .filter(exam => {
        if (!doesItemMatchYearAndSemester(exam, yearFilter, semesterFilter, courses)) return false;
        const subj = (exam.subject || exam.courseTitle || '').toLowerCase();
        if (subjectFilter !== 'all' && !subj.includes(subjectFilter.toLowerCase())) return false;
        const isOnline = exam.isOnlineExam ?? Boolean(exam.questions && exam.questions.length > 0);
        if (modeFilter === 'online' && !isOnline) return false;
        if (modeFilter === 'pdf' && isOnline) return false;
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
  }, [publishedExams, yearFilter, semesterFilter, subjectFilter, modeFilter, searchQuery, sortBy, courses]);

  const getExamWindowStatus = (exam: ExamItem): 'available' | 'upcoming' | 'closed' => {
    const now = Date.now();
    if (exam.openAt) {
      const openTs = new Date(exam.openAt).getTime();
      if (!Number.isNaN(openTs) && now < openTs) return 'upcoming';
    }
    if (exam.closeAt) {
      const closeTs = new Date(exam.closeAt).getTime();
      if (!Number.isNaN(closeTs) && now > closeTs) return 'closed';
    }
    return 'available';
  };

  const startExamAttempt = (exam: ExamItem) => {
    const qs = [...(exam.questions || [])];
    if (qs.length === 0) return;

    let restored: ExamDraftState | null = null;
    try {
      const raw = localStorage.getItem(draftKey(exam.id));
      if (raw) restored = JSON.parse(raw);
    } catch {
      restored = null;
    }

    let ordered = qs;
    if (restored?.questionOrder && restored.questionOrder.length === qs.length) {
      const byId = new Map(qs.map(q => [q.id, q]));
      const mapped = restored.questionOrder.map(id => byId.get(id)).filter((q): q is OnlineExamQuestion => Boolean(q));
      if (mapped.length === qs.length) ordered = mapped;
    } else if (exam.shuffleQuestions) {
      ordered = [...qs].sort(() => Math.random() - 0.5);
    }

    setOrderedQuestions(ordered);
    setAnswers(restored?.answers || {});
    setShortAnswers(restored?.shortAnswers || {});
    setRemainingSeconds(
      restored?.remainingSeconds && restored.remainingSeconds > 0
        ? restored.remainingSeconds
        : (exam.durationMinutes || 30) * 60
    );
    setActiveExam(exam);
  };

  const handleSubmitExam = async (autoSubmitted = false) => {
    if (!activeExam || !currentUser || submitting) return;
    setSubmitting(true);
    try {
      const qs = activeExam.questions || [];
      let score = 0;
      let totalPoints = 0;
      let correctCount = 0;
      let needsManualReview = false;

      qs.forEach(q => {
        const pts = Number(q.points) || 1;
        totalPoints += pts;
        if (q.type === 'short_answer') {
          const accepted = (q.acceptedAnswers || []).map(a => a.trim().toLowerCase()).filter(Boolean);
          const ansTxt = (shortAnswers[q.id] || '').trim().toLowerCase();
          if (accepted.length === 0) {
            needsManualReview = true;
          } else if (accepted.includes(ansTxt)) {
            score += pts;
            correctCount += 1;
          }
        } else {
          const chosen = answers[q.id];
          const expected = q.correctAnswerIndex ?? q.correctAnswer ?? 0;
          if (chosen === expected) {
            score += pts;
            correctCount += 1;
          }
        }
      });

      const finalTotal = totalPoints || 1;
      const percentage = Math.round((score / finalTotal) * 100);
      const prevAttempts = mySubmissions.filter(s => s.examId === activeExam.id).length;

      const created = await dbService.submitExamResult({
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        examId: activeExam.id,
        examTitle: activeExam.title,
        courseId: activeExam.courseId,
        courseTitle: activeExam.courseTitle,
        subject: activeExam.subject,
        academicYear: activeExam.academicYear,
        semester: activeExam.semester,
        score,
        totalPoints: finalTotal,
        percentage,
        correctCount,
        totalQuestions: qs.length,
        attemptNumber: prevAttempts + 1,
        answers,
        shortAnswers,
        needsManualReview,
        status: needsManualReview ? 'pending_review' : 'graded',
        feedback: autoSubmitted ? t('تم الإرسال تلقائيًا عند انتهاء الوقت', 'Auto-submitted on timer expiration') : undefined
      });

      try {
        localStorage.removeItem(draftKey(activeExam.id));
      } catch {
        // ignore
      }

      const submittedExam = activeExam;
      setActiveExam(null);
      setReviewSubmission({ exam: submittedExam, sub: created });
      onExamSubmitted?.(created);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-cyan" />
            <span>{t('الامتحانات الإلكترونية والنماذج الدراسية', 'Online Exams & Assessment Center')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('خوض الاختبارات التفاعلية المؤقتة، متابعة النتائج، وتحميل أوراق الامتحانات المتاحة.', 'Take timed online exams, track your grades, and review released answer keys.')}
          </p>
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
          {filteredExams.length} {t('امتحان متاح', 'available exams')}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ابحث في الامتحانات...', 'Search exams...')}
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
        <div className="flex gap-2">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as 'all' | 'online' | 'pdf')}
            className="flex-1 px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all">{t('كل الأنماط', 'All Types')}</option>
            <option value="online">{t('إلكتروني', 'Online')}</option>
            <option value="pdf">{t('ورقي PDF', 'PDF')}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortBy(prev => prev === 'date' ? 'title' : 'date')}
            className="px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center cursor-pointer shrink-0"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
          </button>
        </div>
      </div>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <Award className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            {t('لا توجد امتحانات متاحة لهذا الفلتر حاليًا.', 'No exams available for this filter.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map(exam => {
            const isOnline = exam.isOnlineExam ?? Boolean(exam.questions && exam.questions.length > 0);
            const hasQuestions = (exam.questions || []).length > 0;
            const windowState = getExamWindowStatus(exam);
            const examSubs = mySubmissions.filter(s => s.examId === exam.id);
            const latestSub = examSubs[0];
            const maxAttempts = exam.maxAttempts ?? 1;
            const canAttempt = isOnline && hasQuestions && windowState === 'available' && examSubs.length < maxAttempts;
            const pdfHref = exam.questionsPdfUrl || exam.questionsFileUrl;
            const answerPdfHref = exam.modelAnswerUrl || exam.answersFileUrl;

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
                          {isOnline ? t('اختبار أونلاين', 'Online Exam') : t('نموذج امتحان PDF', 'Paper Exam')} #{exam.number}
                        </span>
                        <span>·</span>
                        <span>{exam.subject || exam.courseTitle}</span>
                        <span>·</span>
                        <span>{getGradeName(exam.academicYear, language)}</span>
                        <span>·</span>
                        <span>{getSemesterName(exam.semester, language)}</span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base mt-1">{exam.title}</h4>
                    </div>
                    <span className={`text-[11px] font-bold shrink-0 ${
                      windowState === 'available'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : windowState === 'upcoming'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-500'
                    }`}>
                      {windowState === 'available' ? t('متاح الآن', 'Open') : windowState === 'upcoming' ? t('قريبًا', 'Upcoming') : t('منتهي', 'Closed')}
                    </span>
                  </div>

                  {exam.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{exam.description}</p>
                  )}

                  {isOnline && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 tabular-nums">
                      <span>{(exam.questions || []).length} {t('سؤال', 'Questions')}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.durationMinutes ?? 30} {t('دقيقة', 'min')}
                      </span>
                      <span>·</span>
                      <span>
                        {t('المحاولات:', 'Attempts:')} {examSubs.length} / {maxAttempts}
                      </span>
                    </div>
                  )}

                  {latestSub && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{t('آخر محاولة:', 'Latest Attempt:')} </span>
                        {latestSub.status === 'pending_review' || latestSub.needsManualReview ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            {t('بانتظار مراجعة الإجابات المقالية', 'Pending instructor review')}
                          </span>
                        ) : exam.showResultsImmediately !== false ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums">
                            {latestSub.score} / {latestSub.totalPoints} ({latestSub.percentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold">{t('تم التسليم — النتيجة محجوبة مؤقتًا', 'Submitted — score held by instructor')}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewSubmission({ exam, sub: latestSub })}
                        className="text-brand-cyan font-black hover:underline cursor-pointer shrink-0"
                      >
                        {t('عرض التفاصيل', 'Details')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {canAttempt && (
                    <button
                      type="button"
                      onClick={() => startExamAttempt(exam)}
                      className="px-4 py-2 min-h-[40px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{examSubs.length > 0 ? t('بدء محاولة جديدة', 'Retake Exam') : t('بدء الامتحان الآن', 'Start Exam')}</span>
                    </button>
                  )}

                  {pdfHref && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenPdf(pdfHref, exam.title)}
                        className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-rose-500" />
                        <span>{t('ورقة الأسئلة PDF', 'View Paper PDF')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerFileDownload(pdfHref, `${exam.title}_questions.pdf`)}
                        className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>{t('تحميل', 'Download')}</span>
                      </button>
                    </>
                  )}

                  {/* Strictly gated Model Answer PDF */}
                  {exam.showAnswersToStudents === true && answerPdfHref && (
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(answerPdfHref, `${exam.title}_model_answer.pdf`)}
                      className="px-3 py-2 min-h-[38px] bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>{t('نموذج الإجابة PDF', 'Model Answer PDF')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Timed Exam Runner Modal (Zero Answer Leakage) */}
      {activeExam && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[11px] font-bold text-brand-cyan">{activeExam.subject || activeExam.courseTitle}</div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">{activeExam.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl font-black text-sm tabular-nums flex items-center gap-1.5 ${
                  remainingSeconds <= 120 ? 'bg-rose-500/15 text-rose-500' : 'bg-brand-cyan/15 text-brand-cyan'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span>{formatTimer(remainingSeconds)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('سيتم حفظ إجاباتك الحالية مؤقتًا، هل تريد الخروج؟', 'Your progress is saved locally as a draft. Exit exam window?'))) {
                      setActiveExam(null);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {orderedQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      <span className="text-brand-cyan tabular-nums">{idx + 1}. </span>
                      {q.questionText || q.question}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums shrink-0">{q.points} {t('درجة', 'pts')}</span>
                  </div>

                  {q.type === 'short_answer' ? (
                    <textarea
                      rows={3}
                      value={shortAnswers[q.id] || ''}
                      onChange={(e) => setShortAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={t('اكتب إجابتك القصيرة هنا...', 'Write your short answer here...')}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                    />
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const selected = answers[q.id] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                            className={`w-full text-start px-4 py-2.5 min-h-[42px] rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-3 ${
                              selected
                                ? 'bg-brand-cyan/15 border-brand-cyan text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-cyan/50'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              selected ? 'border-brand-cyan bg-brand-cyan' : 'border-slate-400'
                            }`} />
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-500 tabular-nums">
                {t('تمت الإجابة على:', 'Answered:')} {
                  orderedQuestions.filter(q =>
                    q.type === 'short_answer' ? Boolean((shortAnswers[q.id] || '').trim()) : answers[q.id] !== undefined
                  ).length
                } / {orderedQuestions.length}
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitExam(false)}
                className="px-6 py-2.5 min-h-[44px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? t('جاري تسليم الإجابات...', 'Submitting...') : t('تسليم الامتحان وإنهاء المحاولة', 'Submit Exam')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Result & Strictly Gated Answer Review Modal */}
      {reviewSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-brand-cyan">{t('ملخص نتيجة الامتحان', 'Exam Submission Summary')}</span>
                <h4 className="font-black text-slate-900 dark:text-white text-base">{reviewSubmission.exam.title}</h4>
              </div>
              <button type="button" onClick={() => setReviewSubmission(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {reviewSubmission.sub.status === 'pending_review' || reviewSubmission.sub.needsManualReview ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-black">{t('تم استلام إجاباتك بنجاح — قيد المراجعة', 'Submission Received — Pending Review')}</div>
                    <p className="mt-1">{t('يحتوي الامتحان على أسئلة مقالية قصيرة وسيتم اعتماد الدرجة النهائية بعد مراجعة الإدارة.', 'This exam includes open short-answer questions awaiting manual review.')}</p>
                  </div>
                </div>
              ) : reviewSubmission.exam.showResultsImmediately !== false ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-500">{t('النتيجة النهائية', 'Final Score')}</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                      {reviewSubmission.sub.score} / {reviewSubmission.sub.totalPoints} ({reviewSubmission.sub.percentage}%)
                    </div>
                  </div>
                  <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t('تم حفظ تسليمك بنجاح. قررت الإدارة إخفاء الدرجات مؤقتًا حتى انتهاء فترة الامتحان.', 'Your attempt is recorded. Grades are currently withheld by the administrator.')}
                </div>
              )}

              {reviewSubmission.sub.feedback && (
                <div className="p-3 rounded-xl bg-brand-cyan/10 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-brand-cyan shrink-0 mt-0.5" />
                  <span>{reviewSubmission.sub.feedback}</span>
                </div>
              )}

              {reviewSubmission.exam.showAnswersToStudents === true ? (
                <div className="space-y-3">
                  <h5 className="font-black text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Unlock className="h-4 w-4" />
                    <span>{t('مراجعة الأسئلة والإجابات النموذجية', 'Question Review & Answer Key')}</span>
                  </h5>
                  {(reviewSubmission.exam.questions || []).map((q, idx) => {
                    const expectedIdx = q.correctAnswerIndex ?? q.correctAnswer ?? 0;
                    const chosenIdx = reviewSubmission.sub.answers?.[q.id];
                    const shortAns = reviewSubmission.sub.shortAnswers?.[q.id];

                    return (
                      <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                        <div className="font-black text-slate-900 dark:text-white">{idx + 1}. {q.questionText || q.question}</div>
                        {q.type === 'short_answer' ? (
                          <div className="space-y-1">
                            <div className="text-slate-600 dark:text-slate-300">{t('إجابتك:', 'Your Answer:')} <strong>{shortAns || '-'}</strong></div>
                            {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {t('الإجابات المقبولة:', 'Accepted Keys:')} {q.acceptedAnswers.join(' / ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-slate-600 dark:text-slate-300">
                              {t('إجابتك:', 'Your Selection:')} <strong>{chosenIdx !== undefined ? q.options[chosenIdx] : t('بدون إجابة', 'Unanswered')}</strong>
                            </div>
                            <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {t('الإجابة الصحيحة:', 'Correct Answer:')} {q.options[expectedIdx]}
                            </div>
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>{t('تم إخفاء مراجعة الأسئلة والإجابات النموذجية بواسطة إدارة المنصة.', 'Detailed question keys and explanations are hidden by the administrator.')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
