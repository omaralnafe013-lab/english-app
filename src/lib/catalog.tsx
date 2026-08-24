import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { LESSONS, Lesson, Level, Word } from '../data/lessons';

const STORAGE_KEY = '@english_app/catalog/v1';

/**
 * المنهج المعروض في التطبيق = الدروس المدمجة + الدروس التي أنشأها المعلم.
 *
 * الدروس المدمجة ثابتة في الكود، أما دروس المعلم فتُحفظ على الجهاز وتُضاف فوقها.
 * كل الشاشات تقرأ المنهج من هنا بدل استيراد `LESSONS` مباشرة، حتى يظهر أي درس
 * جديد يضيفه المعلم في الدروس والاختبارات والمراجعة دون أي تعديل آخر.
 */
export type CustomLesson = Lesson & {
  /** يميّز دروس المعلم عن الدروس المدمجة عند العرض والحذف */
  custom: true;
  createdAt: number;
};

export type Catalog = {
  lessons: Lesson[];
  allWords: (Word & { lessonId: string })[];
  totalWords: number;
  getLesson: (id: string) => Lesson | undefined;
  getWord: (id: string) => (Word & { lessonId: string }) | undefined;
  lessonsByLevel: (level: Level) => Lesson[];
};

type CatalogContextValue = Catalog & {
  loading: boolean;
  customLessons: CustomLesson[];
  /** يضيف درساً جديداً أو يستبدل درساً موجوداً بنفس المعرّف */
  saveCustomLesson: (lesson: Lesson) => void;
  deleteCustomLesson: (lessonId: string) => void;
  /** يدمج حزمة دروس واردة من كود مشاركة، ويعيد عدد الدروس المضافة والمحدّثة */
  mergeLessonPack: (lessons: Lesson[]) => { added: number; updated: number };
  clearCustomLessons: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

/** يبني الفهارس المشتقّة مرة واحدة لكل تغيير في قائمة الدروس. */
export function buildCatalog(lessons: Lesson[]): Catalog {
  const allWords = lessons.flatMap((lesson) =>
    lesson.words.map((word) => ({ ...word, lessonId: lesson.id }))
  );
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const wordById = new Map(allWords.map((word) => [word.id, word]));

  return {
    lessons,
    allWords,
    totalWords: allWords.length,
    getLesson: (id) => lessonById.get(id),
    getWord: (id) => wordById.get(id),
    lessonsByLevel: (level) => lessons.filter((lesson) => lesson.level === level),
  };
}

/** يتحقّق من شكل الدرس القادم من التخزين أو من كود مشاركة قبل إدخاله للمنهج. */
export function isValidLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== 'object') return false;
  const lesson = value as Partial<Lesson>;
  if (typeof lesson.id !== 'string' || lesson.id.length === 0) return false;
  if (typeof lesson.title !== 'string' || lesson.title.length === 0) return false;
  if (!Array.isArray(lesson.words) || lesson.words.length === 0) return false;

  return lesson.words.every(
    (word) =>
      word &&
      typeof word.id === 'string' &&
      typeof word.en === 'string' &&
      word.en.length > 0 &&
      typeof word.ar === 'string' &&
      word.ar.length > 0
  );
}

/** يُكمل الحقول الاختيارية حتى تعمل شاشات العرض مع دروس المعلم كما مع المدمجة. */
export function normalizeLesson(lesson: Lesson): Lesson {
  return {
    ...lesson,
    titleEn: lesson.titleEn ?? '',
    emoji: lesson.emoji || '📘',
    level: lesson.level ?? 'beginner',
    grammar: lesson.grammar ?? { title: '', body: '', examples: [] },
    words: lesson.words.map((word) => ({
      ...word,
      example: word.example ?? '',
      exampleAr: word.exampleAr ?? '',
    })),
  };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [customLessons, setCustomLessons] = useState<CustomLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomLessons(parsed.filter(isValidLesson).map((lesson) => normalizeLesson(lesson) as CustomLesson));
          }
        }
      } catch {
        // بيانات تالفة — نكتفي بالدروس المدمجة بدل تعطيل التطبيق
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customLessons)).catch(() => {
      // فشل الحفظ لا يجب أن يوقف الاستخدام
    });
  }, [customLessons]);

  const saveCustomLesson = useCallback((lesson: Lesson) => {
    const normalized = normalizeLesson(lesson);
    setCustomLessons((prev) => {
      const existing = prev.find((item) => item.id === normalized.id);
      const entry: CustomLesson = {
        ...normalized,
        custom: true,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      return existing
        ? prev.map((item) => (item.id === entry.id ? entry : item))
        : [...prev, entry];
    });
  }, []);

  const deleteCustomLesson = useCallback((lessonId: string) => {
    setCustomLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
  }, []);

  const mergeLessonPack = useCallback((incoming: Lesson[]) => {
    let added = 0;
    let updated = 0;

    setCustomLessons((prev) => {
      const next = [...prev];
      for (const raw of incoming) {
        if (!isValidLesson(raw)) continue;
        // درس مدمج بنفس المعرّف يبقى كما هو — لا نسمح لحزمة واردة بأن تُخفيه
        if (LESSONS.some((lesson) => lesson.id === raw.id)) continue;

        const lesson = normalizeLesson(raw);
        const index = next.findIndex((item) => item.id === lesson.id);
        if (index >= 0) {
          next[index] = { ...lesson, custom: true, createdAt: next[index].createdAt };
          updated += 1;
        } else {
          next.push({ ...lesson, custom: true, createdAt: Date.now() });
          added += 1;
        }
      }
      return next;
    });

    return { added, updated };
  }, []);

  const clearCustomLessons = useCallback(() => setCustomLessons([]), []);

  const catalog = useMemo(() => buildCatalog([...LESSONS, ...customLessons]), [customLessons]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      ...catalog,
      loading,
      customLessons,
      saveCustomLesson,
      deleteCustomLesson,
      mergeLessonPack,
      clearCustomLessons,
    }),
    [catalog, loading, customLessons, saveCustomLesson, deleteCustomLesson, mergeLessonPack, clearCustomLessons]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used inside a CatalogProvider');
  }
  return context;
}
