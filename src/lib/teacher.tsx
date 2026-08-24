import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { StudentSnapshot } from './shareCode';
import { dayNumber } from './srs';

const STORAGE_KEY = '@english_app/teacher/v1';

/** أقصى عدد لقطات محفوظة لكل طالب — يكفي لرسم منحنى التقدّم دون تضخيم التخزين. */
const HISTORY_LIMIT = 24;

export type HistoryPoint = {
  at: number;
  day: number;
  xp: number;
  started: number;
  mastered: number;
  accuracy: number;
};

export type StudentRecord = {
  id: string;
  name: string;
  /** الشعبة أو المجموعة — يسمح بتصفية اللوحة عند تعدّد الصفوف */
  group: string;
  note: string;
  addedAt: number;
  /** آخر لقطة مستوردة من كود الطالب */
  snapshot: StudentSnapshot;
  history: HistoryPoint[];
};

export type Assignment = {
  id: string;
  title: string;
  lessonIds: string[];
  /** موعد التسليم كرقم يوم — مقارنته برقم اليوم الحالي تعطي المتبقّي */
  dueDay: number;
  /** نسبة الإتقان المطلوبة داخل دروس الواجب (0 إلى 100) */
  targetMastery: number;
  /** 'all' = كل الصف، أو قائمة معرّفات طلاب */
  assignedTo: 'all' | string[];
  createdAt: number;
};

export type TeacherSettings = {
  teacherName: string;
  className: string;
  /** رمز بسيط يمنع الفضول فقط — ليس حماية حقيقية، والبيانات على الجهاز */
  pin: string;
  lockEnabled: boolean;
};

export type TeacherData = {
  students: StudentRecord[];
  assignments: Assignment[];
  settings: TeacherSettings;
};

export function emptyTeacherData(): TeacherData {
  return {
    students: [],
    assignments: [],
    settings: { teacherName: '', className: 'صفّي', pin: '', lockEnabled: false },
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hydrate(raw: unknown): TeacherData {
  const base = emptyTeacherData();
  if (!raw || typeof raw !== 'object') return base;
  const saved = raw as Partial<TeacherData>;

  return {
    students: Array.isArray(saved.students) ? saved.students.filter(isValidStudent) : base.students,
    assignments: Array.isArray(saved.assignments) ? saved.assignments : base.assignments,
    settings: { ...base.settings, ...(saved.settings ?? {}) },
  };
}

function isValidStudent(value: unknown): value is StudentRecord {
  const student = value as Partial<StudentRecord>;
  return !!student && typeof student.id === 'string' && typeof student.name === 'string' && !!student.snapshot;
}

/** نقطة تاريخ مشتقّة من لقطة — تُحسب مرة عند الاستيراد بدل حسابها في كل عرض. */
function historyPoint(snapshot: StudentSnapshot, masteredCount: number): HistoryPoint {
  const states = Object.values(snapshot.words);
  return {
    at: snapshot.at,
    day: snapshot.day,
    xp: snapshot.xp,
    started: states.length,
    mastered: masteredCount,
    accuracy:
      snapshot.quiz.answered > 0 ? Math.round((snapshot.quiz.correct / snapshot.quiz.answered) * 100) : 0,
  };
}

export type ImportOutcome =
  | { ok: true; student: StudentRecord; created: boolean }
  | { ok: false; error: string };

type TeacherContextValue = TeacherData & {
  loading: boolean;
  /** يُدخل لقطة طالب: يحدّث سجلاً موجوداً بنفس الاسم أو ينشئ سجلاً جديداً */
  importSnapshot: (snapshot: StudentSnapshot, options?: { studentId?: string; group?: string }) => ImportOutcome;
  addStudent: (name: string, group?: string) => StudentRecord | null;
  updateStudent: (id: string, patch: Partial<Pick<StudentRecord, 'name' | 'group' | 'note'>>) => void;
  removeStudent: (id: string) => void;
  addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  updateAssignment: (id: string, patch: Partial<Omit<Assignment, 'id' | 'createdAt'>>) => void;
  removeAssignment: (id: string) => void;
  updateSettings: (patch: Partial<TeacherSettings>) => void;
  resetTeacherData: () => void;
};

const TeacherContext = createContext<TeacherContextValue | null>(null);

/** عدد الكلمات المتقنة في لقطة (الصندوق الأخير في نظام التكرار المتباعد). */
function countMastered(snapshot: StudentSnapshot): number {
  return Object.values(snapshot.words).filter((state) => state.box >= 5).length;
}

/** يوحّد الأسماء للمقارنة: مسافات مضغوطة وحروف صغيرة، لتفادي تكرار الطالب نفسه. */
function nameKey(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TeacherData>(emptyTeacherData);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  // الاستيراد يحتاج قراءة القائمة الحالية ليقرّر «تحديث أم إنشاء» ويعيد النتيجة فوراً،
  // لذا نحتفظ بمرجع محدَّث بدل الاعتماد على الحالة داخل الدالة
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && stored) setData(hydrate(JSON.parse(stored)));
      } catch {
        // بيانات تالفة — نبدأ بلوحة فارغة بدل تعطيل التطبيق
      } finally {
        if (active) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {
      // فشل الحفظ لا يجب أن يوقف الاستخدام
    });
  }, [data]);

  const importSnapshot = useCallback<TeacherContextValue['importSnapshot']>((snapshot, options) => {
    const current = dataRef.current;
    const name = snapshot.name.trim();

    const existing = options?.studentId
      ? current.students.find((student) => student.id === options.studentId)
      : name
        ? current.students.find((student) => nameKey(student.name) === nameKey(name))
        : undefined;

    if (!existing && !name) {
      return { ok: false, error: 'الكود لا يحمل اسماً. اختر الطالب من القائمة أو اطلب منه كتابة اسمه قبل التصدير.' };
    }

    // لقطة أقدم مما هو محفوظ تعني كوداً قديماً أُعيد لصقه — نتجاهلها بدل التراجع بالبيانات
    if (existing && snapshot.at <= existing.snapshot.at) {
      return { ok: false, error: `هذا الكود ليس أحدث مما هو مسجّل عند ${existing.name}. اطلب كوداً جديداً.` };
    }

    const point = historyPoint(snapshot, countMastered(snapshot));

    const student: StudentRecord = existing
      ? {
          ...existing,
          name: name || existing.name,
          group: options?.group ?? existing.group,
          snapshot,
          history: [...existing.history, point].slice(-HISTORY_LIMIT),
        }
      : {
          id: newId('st'),
          name,
          group: options?.group ?? '',
          note: '',
          addedAt: Date.now(),
          snapshot,
          history: [point],
        };

    setData((prev) => ({
      ...prev,
      students: existing
        ? prev.students.map((item) => (item.id === student.id ? student : item))
        : [...prev.students, student],
    }));

    return { ok: true, student, created: !existing };
  }, []);

  const addStudent = useCallback<TeacherContextValue['addStudent']>((name, group) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const student: StudentRecord = {
      id: newId('st'),
      name: trimmed,
      group: group?.trim() ?? '',
      note: '',
      addedAt: Date.now(),
      // سجلّ فارغ ينتظر أول كود من الطالب
      snapshot: {
        v: 1,
        name: trimmed,
        at: 0,
        day: dayNumber(),
        xp: 0,
        streak: 0,
        best: 0,
        goal: 10,
        todayReviews: 0,
        completedLessons: [],
        quiz: { taken: 0, correct: 0, answered: 0 },
        words: {},
      },
      history: [],
    };

    setData((prev) => ({ ...prev, students: [...prev.students, student] }));
    return student;
  }, []);

  const updateStudent = useCallback<TeacherContextValue['updateStudent']>((id, patch) => {
    setData((prev) => ({
      ...prev,
      students: prev.students.map((student) => (student.id === id ? { ...student, ...patch } : student)),
    }));
  }, []);

  const removeStudent = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      students: prev.students.filter((student) => student.id !== id),
      // نزيل الطالب من الواجبات المخصّصة حتى لا تبقى معرّفات معلّقة
      assignments: prev.assignments.map((assignment) =>
        assignment.assignedTo === 'all'
          ? assignment
          : { ...assignment, assignedTo: assignment.assignedTo.filter((studentId) => studentId !== id) }
      ),
    }));
  }, []);

  const addAssignment = useCallback<TeacherContextValue['addAssignment']>((assignment) => {
    setData((prev) => ({
      ...prev,
      assignments: [...prev.assignments, { ...assignment, id: newId('as'), createdAt: Date.now() }],
    }));
  }, []);

  const updateAssignment = useCallback<TeacherContextValue['updateAssignment']>((id, patch) => {
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }, []);

  const removeAssignment = useCallback((id: string) => {
    setData((prev) => ({ ...prev, assignments: prev.assignments.filter((item) => item.id !== id) }));
  }, []);

  const updateSettings = useCallback<TeacherContextValue['updateSettings']>((patch) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const resetTeacherData = useCallback(() => setData(emptyTeacherData()), []);

  const value = useMemo<TeacherContextValue>(
    () => ({
      ...data,
      loading,
      importSnapshot,
      addStudent,
      updateStudent,
      removeStudent,
      addAssignment,
      updateAssignment,
      removeAssignment,
      updateSettings,
      resetTeacherData,
    }),
    [
      data,
      loading,
      importSnapshot,
      addStudent,
      updateStudent,
      removeStudent,
      addAssignment,
      updateAssignment,
      removeAssignment,
      updateSettings,
      resetTeacherData,
    ]
  );

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}

export function useTeacher(): TeacherContextValue {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacher must be used inside a TeacherProvider');
  }
  return context;
}
