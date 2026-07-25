import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_WORDS, LESSONS, TOTAL_WORDS } from '../data/lessons';
import { completionRatio, useProgress } from '../lib/progress';
import { dayNumber } from '../lib/srs';
import { arabicText, colors, radius, spacing } from '../theme';
import {
  ArabicText,
  Button,
  Card,
  EnglishText,
  Fraction,
  ProgressBar,
  SectionTitle,
  SpeakButton,
} from '../components/ui';
import type { TabKey } from '../components/TabBar';

/** كلمة اليوم — تتغيّر يومياً بشكل ثابت لكل المستخدمين على نفس التاريخ. */
function useWordOfTheDay() {
  return useMemo(() => ALL_WORDS[dayNumber() % ALL_WORDS.length], []);
}

export function HomeScreen({
  onNavigate,
  onOpenLesson,
}: {
  onNavigate: (tab: TabKey) => void;
  onOpenLesson: (lessonId: string) => void;
}) {
  const { progress, masteredCount, startedCount, dueWordIds } = useProgress();
  const wordOfDay = useWordOfTheDay();

  const goalProgress = progress.dailyGoal > 0 ? progress.today.reviews / progress.dailyGoal : 0;
  const goalReached = progress.today.reviews >= progress.dailyGoal;

  // الدرس التالي = أول درس لم يكتمل بعد
  const nextLesson = useMemo(
    () => LESSONS.find((lesson) => !progress.completedLessons.includes(lesson.id)) ?? LESSONS[0],
    [progress.completedLessons]
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ArabicText style={styles.greeting}>أهلاً بك 👋</ArabicText>
      <ArabicText style={styles.subGreeting}>جاهز لتعلّم بعض الكلمات الجديدة اليوم؟</ArabicText>

      {/* شريط الإحصاءات السريعة */}
      <View style={styles.statsRow}>
        <StatBox emoji="🔥" value={progress.streak.count} label="يوم متتالٍ" />
        <StatBox emoji="⭐" value={progress.xp} label="نقطة" />
        <StatBox emoji="✅" value={masteredCount} label="كلمة متقنة" />
      </View>

      {/* الهدف اليومي */}
      <Card style={styles.goalCard}>
        <View style={styles.rowBetween}>
          <Fraction current={progress.today.reviews} total={progress.dailyGoal} style={styles.goalCount} />
          <ArabicText style={styles.cardTitle}>الهدف اليومي</ArabicText>
        </View>
        <View style={styles.goalBar}>
          <ProgressBar value={goalProgress} color={goalReached ? colors.success : colors.accent} />
        </View>
        <ArabicText style={styles.goalHint}>
          {goalReached
            ? 'ممتاز! أكملت هدف اليوم 🎉 يمكنك الاستمرار لمزيد من النقاط.'
            : `تبقّى ${progress.dailyGoal - progress.today.reviews} مراجعة لإكمال هدف اليوم.`}
        </ArabicText>
      </Card>

      {/* المراجعة المستحقّة */}
      {dueWordIds.length > 0 && (
        <Card style={styles.dueCard}>
          <ArabicText style={styles.cardTitle}>حان وقت المراجعة</ArabicText>
          <ArabicText style={styles.cardBody}>
            لديك {dueWordIds.length} كلمة مستحقّة للمراجعة اليوم. المراجعة في وقتها تثبّت الكلمات في ذاكرتك.
          </ArabicText>
          <Button label="ابدأ المراجعة" icon="🎴" onPress={() => onNavigate('flashcards')} />
        </Card>
      )}

      {/* كلمة اليوم */}
      <SectionTitle title="كلمة اليوم" />
      <Card>
        <View style={styles.rowBetween}>
          <SpeakButton text={wordOfDay.en} />
          <View style={styles.wordOfDayText}>
            <EnglishText style={styles.wordEn}>{wordOfDay.en}</EnglishText>
            <ArabicText style={styles.wordSay}>النطق: {wordOfDay.say}</ArabicText>
          </View>
        </View>
        <View style={styles.divider} />
        <ArabicText style={styles.wordAr}>{wordOfDay.ar}</ArabicText>
        <EnglishText style={styles.example}>{wordOfDay.example}</EnglishText>
        <ArabicText style={styles.exampleAr}>{wordOfDay.exampleAr}</ArabicText>
      </Card>

      {/* متابعة الدروس */}
      <SectionTitle title="أكمل من حيث توقفت" />
      <Card onPress={() => onOpenLesson(nextLesson.id)}>
        <View style={styles.rowBetween}>
          <Text style={styles.lessonEmoji}>{nextLesson.emoji}</Text>
          <View style={styles.lessonText}>
            <ArabicText style={styles.lessonTitle}>{nextLesson.title}</ArabicText>
            <ArabicText style={styles.lessonMeta}>{nextLesson.words.length} كلمة · قاعدة نحوية</ArabicText>
          </View>
        </View>
      </Card>

      {/* التقدّم العام */}
      <SectionTitle title="تقدّمك في المنهج" />
      <Card>
        <ProgressBar value={completionRatio(masteredCount)} color={colors.success} />
        <ArabicText style={styles.overallText}>
          أتقنت {masteredCount} من {TOTAL_WORDS} كلمة · بدأت بـ {startedCount} كلمة
        </ArabicText>
        <Button label="اختبر نفسك الآن" icon="🎯" variant="ghost" onPress={() => onNavigate('quiz')} />
      </Card>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function StatBox({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <ArabicText style={styles.statLabel}>{label}</ArabicText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
  },
  subGreeting: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 20,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  statLabel: {
    ...arabicText,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
  },
  goalCard: {
    gap: spacing.sm,
  },
  goalBar: {
    marginTop: spacing.xs,
  },
  goalCount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent,
  },
  goalHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  dueCard: {
    marginTop: spacing.md,
    gap: spacing.md,
    borderColor: colors.primary,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordOfDayText: {
    flex: 1,
    marginRight: spacing.md,
  },
  wordEn: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  wordSay: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  wordAr: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  example: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  exampleAr: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 2,
  },
  lessonEmoji: {
    fontSize: 34,
  },
  lessonText: {
    flex: 1,
    marginRight: spacing.md,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  lessonMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  overallText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});
