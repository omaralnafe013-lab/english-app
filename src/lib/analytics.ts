import { Lesson, LEVELS, Level } from '../data/lessons';
import { Catalog } from './catalog';
import { Assignment, StudentRecord } from './teacher';
import { dayNumber, MAX_BOX } from './srs';

/**
 * كل الحسابات التي تغذّي لوحة المعلم.
 *
 * دوال خالصة تأخذ الطلاب والمنهج وتعيد أرقاماً جاهزة للعرض — لا حالة ولا تخزين،
 * ليسهل التحقّق منها وإعادة استخدامها في أي شاشة.
 */

/** حالة الطالب حسب آخر ظهور له — تُحدّد لون الشارة وترتيب المتابعة. */
export type StudentStatus = 'active' | 'slipping' | 'inactive' | 'pending';

export type StudentStats = {
  student: StudentRecord;
  /** كلمات بدأها الطالب */
  started: number;
  mastered: number;
  /** نسبة إتقان المنهج كاملاً (0 إلى 100) */
  masteryPct: number;
  /** كلمات حان موعد مراجعتها ولم تُراجع */
  due: number;
  accuracy: number;
  completedLessons: number;
  xp: number;
  streak: number;
  /** عدد الأيام منذ آخر كود استلمه المعلم، أو null إن لم يصل كود بعد */
  daysSinceUpdate: number | null;
  status: StudentStatus;
  /** توزيع كلماته على مراحل الحفظ الخمس */
  boxCounts: number[];
  /** يحتاج متابعة: دقّة منخفضة أو تراكم مراجعات أو انقطاع */
  needsAttention: boolean;
  attentionReason: string;
};

const SLIPPING_AFTER_DAYS = 3;
const INACTIVE_AFTER_DAYS = 7;
const LOW_ACCURACY = 60;
const DUE_BACKLOG = 25;

export function statusLabel(status: StudentStatus): string {
  switch (status) {
    case 'active':
      return 'نشِط';
    case 'slipping':
      return 'يتباطأ';
    case 'inactive':
      return 'منقطع';
    case 'pending':
      return 'بانتظار كود';
  }
}

export function computeStudentStats(student: StudentRecord, catalog: Catalog): StudentStats {
  const { snapshot } = student;
  const states = Object.values(snapshot.words);
  const started = states.length;
  const mastered = states.filter((state) => state.box >= MAX_BOX).length;

  // نحسب المستحقّ بيوم الطالب وقت التصدير حتى لا نضخّم الرقم بمرور الوقت عند المعلم
  const referenceDay = snapshot.day || dayNumber();
  const due = states.filter((state) => state.due <= referenceDay).length;

  const accuracy =
    snapshot.quiz.answered > 0 ? Math.round((snapshot.quiz.correct / snapshot.quiz.answered) * 100) : 0;

  const daysSinceUpdate = snapshot.at > 0 ? Math.max(0, dayNumber() - dayNumber(new Date(snapshot.at))) : null;

  const status: StudentStatus =
    daysSinceUpdate === null
      ? 'pending'
      : daysSinceUpdate >= INACTIVE_AFTER_DAYS
        ? 'inactive'
        : daysSinceUpdate >= SLIPPING_AFTER_DAYS
          ? 'slipping'
          : 'active';

  const boxCounts = Array.from(
    { length: MAX_BOX },
    (_, index) => states.filter((state) => state.box === index + 1).length
  );

  // نُظهر سبباً واحداً — الأهم أولاً — حتى تبقى بطاقة الطالب مقروءة
  let attentionReason = '';
  if (status === 'inactive') {
    attentionReason = `لم يُرسل تقدّمه منذ ${daysSinceUpdate} يوماً`;
  } else if (snapshot.quiz.answered >= 10 && accuracy < LOW_ACCURACY) {
    attentionReason = `دقّة الاختبارات ${accuracy}%`;
  } else if (due >= DUE_BACKLOG) {
    attentionReason = `${due} كلمة متراكمة للمراجعة`;
  } else if (status === 'slipping') {
    attentionReason = `آخر تحديث قبل ${daysSinceUpdate} أيام`;
  }

  return {
    student,
    started,
    mastered,
    masteryPct: catalog.totalWords > 0 ? Math.round((mastered / catalog.totalWords) * 100) : 0,
    due,
    accuracy,
    completedLessons: snapshot.completedLessons.length,
    xp: snapshot.xp,
    streak: snapshot.streak,
    daysSinceUpdate,
    status,
    boxCounts,
    needsAttention: attentionReason !== '',
    attentionReason,
  };
}

export type ClassOverview = {
  totalStudents: number;
  /** طلاب أرسلوا تقدّمهم خلال آخر ثلاثة أيام */
  activeStudents: number;
  needAttention: number;
  awaitingFirstCode: number;
  avgMasteryPct: number;
  avgAccuracy: number;
  totalMasteredWords: number;
  totalDue: number;
  completedLessonsTotal: number;
  bestStreak: number;
};

export function computeClassOverview(stats: StudentStats[]): ClassOverview {
  const count = stats.length;
  const reported = stats.filter((item) => item.status !== 'pending');
  const withQuiz = stats.filter((item) => item.student.snapshot.quiz.answered > 0);

  const average = (values: number[]) =>
    values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

  return {
    totalStudents: count,
    activeStudents: stats.filter((item) => item.status === 'active').length,
    needAttention: stats.filter((item) => item.needsAttention).length,
    awaitingFirstCode: stats.filter((item) => item.status === 'pending').length,
    avgMasteryPct: average(reported.map((item) => item.masteryPct)),
    avgAccuracy: average(withQuiz.map((item) => item.accuracy)),
    totalMasteredWords: stats.reduce((sum, item) => sum + item.mastered, 0),
    totalDue: stats.reduce((sum, item) => sum + item.due, 0),
    completedLessonsTotal: stats.reduce((sum, item) => sum + item.completedLessons, 0),
    bestStreak: stats.reduce((max, item) => Math.max(max, item.student.snapshot.best), 0),
  };
}

/** توزيع كل كلمات الصف على مراحل الحفظ الخمس. */
export function classBoxDistribution(stats: StudentStats[]): number[] {
  return Array.from({ length: MAX_BOX }, (_, index) =>
    stats.reduce((sum, item) => sum + item.boxCounts[index], 0)
  );
}

export type WordDifficulty = {
  wordId: string;
  en: string;
  ar: string;
  lessonTitle: string;
  /** مجموع المحاولات الخاطئة عند كل الطلاب */
  wrong: number;
  correct: number;
  /** نسبة الخطأ من إجمالي المحاولات (0 إلى 100) */
  errorRate: number;
  /** عدد الطلاب الذين تعثّروا فيها */
  strugglingStudents: number;
};

/**
 * أصعب الكلمات على الصف.
 * نرتّب بمجموع الأخطاء لا بنسبتها، حتى لا تتصدّر كلمة أخطأ فيها طالب واحد مرة واحدة.
 */
export function hardestWords(stats: StudentStats[], catalog: Catalog, limit = 10): WordDifficulty[] {
  const totals = new Map<string, { wrong: number; correct: number; students: number }>();

  for (const item of stats) {
    for (const [wordId, state] of Object.entries(item.student.snapshot.words)) {
      if (state.wrong === 0) continue;
      const entry = totals.get(wordId) ?? { wrong: 0, correct: 0, students: 0 };
      entry.wrong += state.wrong;
      entry.correct += state.correct;
      entry.students += 1;
      totals.set(wordId, entry);
    }
  }

  const rows: WordDifficulty[] = [];
  for (const [wordId, entry] of totals) {
    const word = catalog.getWord(wordId);
    if (!word) continue;
    const attempts = entry.wrong + entry.correct;

    rows.push({
      wordId,
      en: word.en,
      ar: word.ar,
      lessonTitle: catalog.getLesson(word.lessonId)?.title ?? '',
      wrong: entry.wrong,
      correct: entry.correct,
      errorRate: attempts > 0 ? Math.round((entry.wrong / attempts) * 100) : 0,
      strugglingStudents: entry.students,
    });
  }

  return rows.sort((a, b) => b.wrong - a.wrong || b.errorRate - a.errorRate).slice(0, limit);
}

export type LessonCoverage = {
  lesson: Lesson;
  /** متوسّط نسبة إتقان كلمات الدرس عبر الصف (0 إلى 100) */
  avgMasteryPct: number;
  /** طلاب أنهوا الدرس */
  completedBy: number;
  /** طلاب بدأوا أي كلمة من الدرس */
  startedBy: number;
};

export function lessonCoverage(stats: StudentStats[], catalog: Catalog): LessonCoverage[] {
  return catalog.lessons.map((lesson) => {
    let masterySum = 0;
    let startedBy = 0;
    let completedBy = 0;

    for (const item of stats) {
      const words = item.student.snapshot.words;
      const mastered = lesson.words.filter((word) => (words[word.id]?.box ?? 0) >= MAX_BOX).length;
      const touched = lesson.words.some((word) => words[word.id]);

      masterySum += lesson.words.length > 0 ? mastered / lesson.words.length : 0;
      if (touched) startedBy += 1;
      if (item.student.snapshot.completedLessons.includes(lesson.id)) completedBy += 1;
    }

    return {
      lesson,
      avgMasteryPct: stats.length > 0 ? Math.round((masterySum / stats.length) * 100) : 0,
      completedBy,
      startedBy,
    };
  });
}

export type LevelBreakdown = {
  level: Level;
  title: string;
  subtitle: string;
  color: string;
  words: number;
  avgMasteryPct: number;
};

export function levelBreakdown(stats: StudentStats[], catalog: Catalog): LevelBreakdown[] {
  return LEVELS.map((level) => {
    const words = catalog.lessons
      .filter((lesson) => lesson.level === level.id)
      .flatMap((lesson) => lesson.words);

    let masterySum = 0;
    for (const item of stats) {
      const mastered = words.filter((word) => (item.student.snapshot.words[word.id]?.box ?? 0) >= MAX_BOX).length;
      masterySum += words.length > 0 ? mastered / words.length : 0;
    }

    return {
      level: level.id,
      title: level.title,
      subtitle: level.subtitle,
      color: level.color,
      words: words.length,
      avgMasteryPct: stats.length > 0 ? Math.round((masterySum / stats.length) * 100) : 0,
    };
  });
}

export type AssignmentProgress = {
  assignment: Assignment;
  /** الطلاب المشمولون بالواجب */
  assigned: StudentStats[];
  /** من بلغ نسبة الإتقان المطلوبة */
  done: number;
  /** متوسّط الإنجاز داخل دروس الواجب (0 إلى 100) */
  avgProgressPct: number;
  daysLeft: number;
  overdue: boolean;
  /** نسبة إنجاز كل طالب داخل دروس الواجب */
  perStudent: { stats: StudentStats; progressPct: number; done: boolean }[];
};

export function assignmentProgress(
  assignment: Assignment,
  stats: StudentStats[],
  catalog: Catalog
): AssignmentProgress {
  const assigned =
    assignment.assignedTo === 'all'
      ? stats
      : stats.filter((item) => (assignment.assignedTo as string[]).includes(item.student.id));

  const words = assignment.lessonIds
    .map((lessonId) => catalog.getLesson(lessonId))
    .filter((lesson): lesson is Lesson => !!lesson)
    .flatMap((lesson) => lesson.words);

  const perStudent = assigned.map((item) => {
    const mastered = words.filter((word) => (item.student.snapshot.words[word.id]?.box ?? 0) >= MAX_BOX).length;
    const progressPct = words.length > 0 ? Math.round((mastered / words.length) * 100) : 0;
    return { stats: item, progressPct, done: progressPct >= assignment.targetMastery };
  });

  const daysLeft = assignment.dueDay - dayNumber();

  return {
    assignment,
    assigned,
    done: perStudent.filter((row) => row.done).length,
    avgProgressPct:
      perStudent.length > 0
        ? Math.round(perStudent.reduce((sum, row) => sum + row.progressPct, 0) / perStudent.length)
        : 0,
    daysLeft,
    overdue: daysLeft < 0,
    perStudent: perStudent.sort((a, b) => b.progressPct - a.progressPct),
  };
}

/** ترتيب الصف — بالنقاط، فالكلمات المتقنة عند التساوي. */
export function leaderboard(stats: StudentStats[]): StudentStats[] {
  return [...stats].sort((a, b) => b.xp - a.xp || b.mastered - a.mastered);
}

/** صياغة عربية مختصرة لآخر ظهور. */
export function lastSeenLabel(daysSinceUpdate: number | null): string {
  if (daysSinceUpdate === null) return 'لم يصل كود بعد';
  if (daysSinceUpdate === 0) return 'اليوم';
  if (daysSinceUpdate === 1) return 'أمس';
  if (daysSinceUpdate === 2) return 'قبل يومين';
  if (daysSinceUpdate <= 10) return `قبل ${daysSinceUpdate} أيام`;
  return `قبل ${daysSinceUpdate} يوماً`;
}
