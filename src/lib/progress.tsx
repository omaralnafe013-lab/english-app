import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ALL_WORDS, TOTAL_WORDS } from '../data/lessons';
import { dayNumber, isDue, isMastered, newWordState, reviewWord, WordState } from './srs';

const STORAGE_KEY = '@english_app/progress/v1';

export const XP_PER_REVIEW = 5;
export const XP_PER_CORRECT_QUIZ = 10;
export const XP_PER_LESSON = 30;

export type Progress = {
  xp: number;
  words: Record<string, WordState>;
  completedLessons: string[];
  streak: { count: number; best: number; lastDay: number };
  quiz: { taken: number; correct: number; answered: number };
  dailyGoal: number;
  today: { day: number; reviews: number };
};

export function emptyProgress(): Progress {
  return {
    xp: 0,
    words: {},
    completedLessons: [],
    streak: { count: 0, best: 0, lastDay: 0 },
    quiz: { taken: 0, correct: 0, answered: 0 },
    dailyGoal: 10,
    today: { day: dayNumber(), reviews: 0 },
  };
}

/** يدمج البيانات المحفوظة مع الشكل الحالي حتى لا ينكسر التطبيق عند إضافة حقول جديدة. */
function hydrate(raw: unknown): Progress {
  const base = emptyProgress();
  if (!raw || typeof raw !== 'object') return base;
  const saved = raw as Partial<Progress>;

  return {
    xp: typeof saved.xp === 'number' ? saved.xp : base.xp,
    words: saved.words && typeof saved.words === 'object' ? saved.words : base.words,
    completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons : base.completedLessons,
    streak: { ...base.streak, ...(saved.streak ?? {}) },
    quiz: { ...base.quiz, ...(saved.quiz ?? {}) },
    dailyGoal: typeof saved.dailyGoal === 'number' ? saved.dailyGoal : base.dailyGoal,
    today: { ...base.today, ...(saved.today ?? {}) },
  };
}

/** يحدّث سلسلة الأيام المتتالية عند أي نشاط دراسي. */
function touchStreak(progress: Progress): Progress {
  const today = dayNumber();
  if (progress.streak.lastDay === today) return progress;

  const isConsecutive = progress.streak.lastDay === today - 1;
  const count = isConsecutive ? progress.streak.count + 1 : 1;

  return {
    ...progress,
    streak: { count, best: Math.max(count, progress.streak.best), lastDay: today },
  };
}

/** يصفّر عدّاد اليوم إذا تغيّر التاريخ. */
function rollDay(progress: Progress): Progress {
  const today = dayNumber();
  if (progress.today.day === today) return progress;
  return { ...progress, today: { day: today, reviews: 0 } };
}

type ProgressContextValue = {
  progress: Progress;
  loading: boolean;
  /** كلمات بدأ المستخدم تعلّمها */
  startedCount: number;
  masteredCount: number;
  dueWordIds: string[];
  reviewWordById: (wordId: string, remembered: boolean) => void;
  markWordSeen: (wordId: string) => void;
  completeLesson: (lessonId: string) => void;
  recordQuiz: (correct: number, answered: number) => void;
  setDailyGoal: (goal: number) => void;
  resetProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  // تحميل التقدّم المحفوظ عند بدء التطبيق
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && stored) {
          setProgress(rollDay(hydrate(JSON.parse(stored))));
        }
      } catch {
        // بيانات تالفة — نبدأ من جديد بدل تعطيل التطبيق
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

  // الحفظ عند كل تغيير، بعد اكتمال التحميل حتى لا نمسح البيانات القديمة
  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => {
      // فشل الحفظ لا يجب أن يوقف الاستخدام
    });
  }, [progress]);

  const reviewWordById = useCallback((wordId: string, remembered: boolean) => {
    setProgress((prev) => {
      const rolled = rollDay(prev);
      const next = touchStreak(rolled);
      return {
        ...next,
        words: { ...next.words, [wordId]: reviewWord(next.words[wordId], remembered) },
        xp: next.xp + (remembered ? XP_PER_REVIEW : 1),
        today: { ...next.today, reviews: next.today.reviews + 1 },
      };
    });
  }, []);

  /** يسجّل أن المستخدم اطّلع على الكلمة لأول مرة فتدخل دورة المراجعة. */
  const markWordSeen = useCallback((wordId: string) => {
    setProgress((prev) => {
      if (prev.words[wordId]) return prev;
      return { ...prev, words: { ...prev.words, [wordId]: newWordState() } };
    });
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setProgress((prev) => {
      const next = touchStreak(rollDay(prev));
      if (next.completedLessons.includes(lessonId)) return next;
      return {
        ...next,
        completedLessons: [...next.completedLessons, lessonId],
        xp: next.xp + XP_PER_LESSON,
      };
    });
  }, []);

  const recordQuiz = useCallback((correct: number, answered: number) => {
    setProgress((prev) => {
      const next = touchStreak(rollDay(prev));
      return {
        ...next,
        quiz: {
          taken: next.quiz.taken + 1,
          correct: next.quiz.correct + correct,
          answered: next.quiz.answered + answered,
        },
        xp: next.xp + correct * XP_PER_CORRECT_QUIZ,
      };
    });
  }, []);

  const setDailyGoal = useCallback((goal: number) => {
    setProgress((prev) => ({ ...prev, dailyGoal: goal }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(emptyProgress());
  }, []);

  const derived = useMemo(() => {
    const today = dayNumber();
    const states = progress.words;
    const startedCount = Object.keys(states).length;
    const masteredCount = Object.values(states).filter(isMastered).length;
    const dueWordIds = ALL_WORDS.filter((word) => isDue(states[word.id], today)).map((word) => word.id);
    return { startedCount, masteredCount, dueWordIds };
  }, [progress.words]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      loading,
      ...derived,
      reviewWordById,
      markWordSeen,
      completeLesson,
      recordQuiz,
      setDailyGoal,
      resetProgress,
    }),
    [progress, loading, derived, reviewWordById, markWordSeen, completeLesson, recordQuiz, setDailyGoal, resetProgress]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used inside a ProgressProvider');
  }
  return context;
}

/** نسبة إتمام المنهج كاملاً (0 إلى 1). */
export function completionRatio(masteredCount: number): number {
  return TOTAL_WORDS === 0 ? 0 : masteredCount / TOTAL_WORDS;
}
