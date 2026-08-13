// نستورد وزن Light وحده من مساره المباشر — الاستيراد من جذر الحزمة يحزم أوزان Tajawal السبعة كلها
import { Tajawal_300Light } from '@expo-google-fonts/tajawal/300Light';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IntroAnimation } from './src/components/IntroAnimation';
import { TabBar, TabKey } from './src/components/TabBar';
import { Loading, Screen } from './src/components/ui';
import { getLesson } from './src/data/lessons';
import { ProgressProvider, useProgress } from './src/lib/progress';
import { stopSpeaking } from './src/lib/speech';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonDetailScreen } from './src/screens/LessonDetailScreen';
import { LessonsScreen } from './src/screens/LessonsScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { colors } from './src/theme';

/**
 * التنقّل في التطبيق بسيط بما يكفي ليُدار بالحالة مباشرة:
 * خمسة تبويبات، وشاشتان تُفتحان فوقها (تفاصيل الدرس واختبار الدرس).
 */
type Overlay = { kind: 'lesson'; lessonId: string } | { kind: 'lessonQuiz'; lessonId: string } | null;

function AppContent() {
  const { loading, dueWordIds } = useProgress();
  const [tab, setTab] = useState<TabKey>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);

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

  if (loading) return <Loading />;

  // الشاشات المفتوحة فوق التبويبات تأخذ الشاشة كاملة وتخفي شريط التبويب
  if (overlay?.kind === 'lesson') {
    const lesson = getLesson(overlay.lessonId);
    if (lesson) {
      return (
        <LessonDetailScreen
          lesson={lesson}
          onBack={closeOverlay}
          onStartQuiz={(lessonId) => setOverlay({ kind: 'lessonQuiz', lessonId })}
        />
      );
    }
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
        {tab === 'progress' && <ProgressScreen />}
      </Screen>
      <TabBar active={tab} onChange={changeTab} badge={dueWordIds.length} />
    </View>
  );
}

export default function App() {
  // ننتظر تحميل خط Tajawal قبل العرض حتى لا تظهر الواجهة بالخط الافتراضي ثم تقفز
  const [fontsLoaded, fontError] = useFonts({ Tajawal_300Light });
  const [introDone, setIntroDone] = useState(false);

  const finishIntro = useCallback(() => setIntroDone(true), []);

  // خلال تحميل الخط نعرض خلفية التطبيق فقط، فتبدو امتداداً لبداية المقدّمة
  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.root} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
      {/* المقدّمة تعلو التطبيق وهو يُحمّل التقدّم تحتها، ثم تختفي */}
      {!introDone && <IntroAnimation onFinish={finishIntro} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
