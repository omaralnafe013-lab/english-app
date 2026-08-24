// نستورد وزن Light وحده من مساره المباشر — الاستيراد من جذر الحزمة يحزم أوزان Tajawal السبعة كلها
import { Tajawal_300Light } from '@expo-google-fonts/tajawal/300Light';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar, TabKey } from './src/components/TabBar';
import { Loading, Screen } from './src/components/ui';
import { CatalogProvider, useCatalog } from './src/lib/catalog';
import { ProgressProvider, useProgress } from './src/lib/progress';
import { stopSpeaking } from './src/lib/speech';
import { TeacherProvider } from './src/lib/teacher';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonDetailScreen } from './src/screens/LessonDetailScreen';
import { LessonsScreen } from './src/screens/LessonsScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { TeacherDashboard } from './src/screens/teacher/TeacherDashboard';
import { colors } from './src/theme';

/**
 * التنقّل في التطبيق بسيط بما يكفي ليُدار بالحالة مباشرة:
 * خمسة تبويبات، وشاشتان تُفتحان فوقها (تفاصيل الدرس واختبار الدرس)،
 * ولوحة المعلم التي تحلّ محلّ الواجهة كاملة.
 */
type Overlay = { kind: 'lesson'; lessonId: string } | { kind: 'lessonQuiz'; lessonId: string } | null;

/** على الويب يفتح العنوان ‎#teacher‎ اللوحة مباشرة، ليكون للمعلم رابط خاص به. */
const TEACHER_HASH = '#teacher';

function teacherHashActive(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return window.location.hash === TEACHER_HASH;
}

function setTeacherHash(active: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const { pathname, search } = window.location;
  // نستبدل المدخلة الحالية بدل إضافة أخرى حتى لا يمتلئ زرّ الرجوع بالتبديلات
  window.history.replaceState(null, '', active ? `${pathname}${search}${TEACHER_HASH}` : `${pathname}${search}`);
}

function AppContent() {
  const { loading: progressLoading, dueWordIds } = useProgress();
  const { loading: catalogLoading } = useCatalog();
  const [tab, setTab] = useState<TabKey>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [teacherMode, setTeacherMode] = useState(teacherHashActive);

  // متابعة تغيّر العنوان على الويب (زرّ الرجوع، أو رابط ملصوق)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const onHashChange = () => setTeacherMode(teacherHashActive());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openTeacher = useCallback(() => {
    stopSpeaking();
    setTeacherHash(true);
    setTeacherMode(true);
  }, []);

  const closeTeacher = useCallback(() => {
    setTeacherHash(false);
    setTeacherMode(false);
  }, []);

  const openLesson = useCallback((lessonId: string) => {
    stopSpeaking();
    setOverlay({ kind: 'lesson', lessonId });
  }, []);

  const closeOverlay = useCallback(() => {
    stopSpeaking();
    setOverlay(null);
  }, []);

  const changeTab = useCallback((next: TabKey) => {
    stopSpeaking();
    setOverlay(null);
    setTab(next);
  }, []);

  if (progressLoading || catalogLoading) return <Loading />;

  if (teacherMode) return <TeacherDashboard onExit={closeTeacher} />;

  // الشاشات المفتوحة فوق التبويبات تأخذ الشاشة كاملة وتخفي شريط التبويب
  if (overlay?.kind === 'lesson') {
    return (
      <LessonOverlay
        lessonId={overlay.lessonId}
        onBack={closeOverlay}
        onStartQuiz={(lessonId) => setOverlay({ kind: 'lessonQuiz', lessonId })}
      />
    );
  }

  if (overlay?.kind === 'lessonQuiz') {
    const lessonId = overlay.lessonId;
    return (
      <Screen>
        <QuizScreen lessonId={lessonId} onExit={() => setOverlay({ kind: 'lesson', lessonId })} />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <Screen>
        {tab === 'home' && <HomeScreen onNavigate={changeTab} onOpenLesson={openLesson} />}
        {tab === 'lessons' && <LessonsScreen onOpenLesson={openLesson} />}
        {tab === 'flashcards' && <FlashcardsScreen />}
        {tab === 'quiz' && <QuizScreen />}
        {tab === 'progress' && <ProgressScreen onOpenTeacher={openTeacher} />}
      </Screen>
      <TabBar active={tab} onChange={changeTab} badge={dueWordIds.length} />
    </View>
  );
}

/** يقرأ الدرس من المنهج الحيّ — قد يكون درساً أضافه المعلم لا درساً مدمجاً. */
function LessonOverlay({
  lessonId,
  onBack,
  onStartQuiz,
}: {
  lessonId: string;
  onBack: () => void;
  onStartQuiz: (lessonId: string) => void;
}) {
  const { getLesson } = useCatalog();
  const lesson = getLesson(lessonId);

  // الدرس قد يُحذف من المحرّر بينما شاشته مفتوحة
  useEffect(() => {
    if (!lesson) onBack();
  }, [lesson, onBack]);

  if (!lesson) return <Loading />;

  return <LessonDetailScreen lesson={lesson} onBack={onBack} onStartQuiz={onStartQuiz} />;
}

export default function App() {
  // ننتظر تحميل خط Tajawal قبل العرض حتى لا تظهر الواجهة بالخط الافتراضي ثم تقفز
  const [fontsLoaded, fontError] = useFonts({ Tajawal_300Light });

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Loading />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* المنهج أولاً: التقدّم ولوحة المعلم يقرآن منه */}
      <CatalogProvider>
        <ProgressProvider>
          <TeacherProvider>
            <AppContent />
          </TeacherProvider>
        </ProgressProvider>
      </CatalogProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
