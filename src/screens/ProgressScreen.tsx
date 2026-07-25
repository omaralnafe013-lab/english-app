import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LESSONS, LEVELS, TOTAL_WORDS } from '../data/lessons';
import { completionRatio, useProgress } from '../lib/progress';
import { isMastered, MAX_BOX } from '../lib/srs';
import { colors, fonts, radius, spacing } from '../theme';
import { ArabicText, Button, Card, Fraction, ProgressBar, SectionTitle } from '../components/ui';

const GOAL_CHOICES = [5, 10, 20, 30];

export function ProgressScreen() {
  const { progress, masteredCount, startedCount, dueWordIds, setDailyGoal, resetProgress } = useProgress();

  const quizAccuracy =
    progress.quiz.answered > 0 ? Math.round((progress.quiz.correct / progress.quiz.answered) * 100) : 0;

  // توزيع الكلمات على صناديق التكرار المتباعد
  const boxCounts = Array.from({ length: MAX_BOX }, (_, i) =>
    Object.values(progress.words).filter((state) => state.box === i + 1).length
  );

  const confirmReset = () => {
    Alert.alert(
      'تصفير التقدّم',
      'سيتم حذف كل النقاط والكلمات المحفوظة وسلسلة الأيام. لا يمكن التراجع عن هذه الخطوة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف الكل', style: 'destructive', onPress: resetProgress },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ArabicText style={styles.heading}>تقدّمي</ArabicText>

      <Card style={styles.overviewCard}>
        <ArabicText style={styles.overviewLabel}>نسبة إتقان المنهج</ArabicText>
        <ArabicText style={styles.overviewPercent}>
          {Math.round(completionRatio(masteredCount) * 100)}%
        </ArabicText>
        <ProgressBar value={completionRatio(masteredCount)} color={colors.success} />
        <ArabicText style={styles.overviewSub}>
          {masteredCount} كلمة متقنة من أصل {TOTAL_WORDS}
        </ArabicText>
      </Card>

      <View style={styles.grid}>
        <GridStat emoji="⭐" value={progress.xp} label="مجموع النقاط" />
        <GridStat emoji="🔥" value={progress.streak.count} label="أيام متتالية" />
        <GridStat emoji="🏅" value={progress.streak.best} label="أطول سلسلة" />
        <GridStat emoji="📖" value={startedCount} label="كلمة قيد التعلّم" />
        <GridStat emoji="⏰" value={dueWordIds.length} label="مستحقّة للمراجعة" />
        <GridStat emoji="✅" value={progress.completedLessons.length} label="درس مكتمل" />
      </View>

      <SectionTitle title="نتائج الاختبارات" />
      <Card>
        <View style={styles.rowBetween}>
          <ArabicText style={styles.quizValue}>{progress.quiz.taken}</ArabicText>
          <ArabicText style={styles.quizLabel}>اختبار أُنجز</ArabicText>
        </View>
        <View style={styles.thinDivider} />
        <View style={styles.rowBetween}>
          <ArabicText style={styles.quizValue}>{quizAccuracy}%</ArabicText>
          <ArabicText style={styles.quizLabel}>نسبة الإجابات الصحيحة</ArabicText>
        </View>
        <View style={styles.thinDivider} />
        <View style={styles.rowBetween}>
          <Fraction current={progress.quiz.correct} total={progress.quiz.answered} style={styles.quizValue} />
          <ArabicText style={styles.quizLabel}>إجابات صحيحة</ArabicText>
        </View>
      </Card>

      <SectionTitle title="مراحل الحفظ" />
      <Card>
        <ArabicText style={styles.boxIntro}>
          كل كلمة تتدرّج عبر خمس مراحل. كلما ارتفعت المرحلة طالت الفترة قبل ظهورها للمراجعة مجدداً.
        </ArabicText>
        {boxCounts.map((count, i) => (
          <View key={i} style={styles.boxRow}>
            <ArabicText style={styles.boxCount}>{count}</ArabicText>
            <View style={styles.boxBar}>
              <ProgressBar
                value={startedCount > 0 ? count / startedCount : 0}
                color={i === MAX_BOX - 1 ? colors.success : colors.primary}
              />
            </View>
            <ArabicText style={styles.boxLabel}>
              {i === MAX_BOX - 1 ? 'متقنة' : `المرحلة ${i + 1}`}
            </ArabicText>
          </View>
        ))}
      </Card>

      <SectionTitle title="التقدّم حسب المستوى" />
      {LEVELS.map((level) => {
        const levelWords = LESSONS.filter((lesson) => lesson.level === level.id).flatMap(
          (lesson) => lesson.words
        );
        const mastered = levelWords.filter((word) => isMastered(progress.words[word.id])).length;
        const ratio = levelWords.length > 0 ? mastered / levelWords.length : 0;

        return (
          <Card key={level.id} style={styles.levelCard}>
            <View style={styles.rowBetween}>
              <ArabicText style={[styles.levelPercent, { color: level.color }]}>
                {Math.round(ratio * 100)}%
              </ArabicText>
              <ArabicText style={styles.levelTitle}>
                {level.title} · {level.subtitle}
              </ArabicText>
            </View>
            <View style={styles.levelBar}>
              <ProgressBar value={ratio} color={level.color} />
            </View>
            <ArabicText style={styles.levelSub}>
              {mastered} من {levelWords.length} كلمة
            </ArabicText>
          </Card>
        );
      })}

      <SectionTitle title="الهدف اليومي" />
      <Card>
        <ArabicText style={styles.goalIntro}>كم مراجعة تريد إنجازها كل يوم؟</ArabicText>
        <View style={styles.goalRow}>
          {GOAL_CHOICES.map((goal) => {
            const active = progress.dailyGoal === goal;
            return (
              <Pressable
                key={goal}
                onPress={() => setDailyGoal(goal)}
                style={({ pressed }) => [
                  styles.goalChip,
                  active && styles.goalChipActive,
                  pressed && { opacity: 0.7 },
                ]}>
                <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>{goal}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={styles.dangerZone}>
        <Button label="تصفير كل التقدّم" variant="ghost" onPress={confirmReset} />
        <ArabicText style={styles.dangerNote}>
          بياناتك محفوظة على هذا الجهاز فقط ولا تُرسل إلى أي خادم.
        </ArabicText>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function GridStat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.gridEmoji}>{emoji}</Text>
      <Text style={styles.gridValue}>{value}</Text>
      <ArabicText style={styles.gridLabel}>{label}</ArabicText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heading: {
    fontSize: 26,
    marginBottom: spacing.lg,
  },
  overviewCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  overviewLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  overviewPercent: {
    fontSize: 44,
    color: colors.success,
  },
  overviewSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  gridItem: {
    width: '31.5%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  gridEmoji: {
    fontSize: 19,
  },
  gridValue: {
    fontFamily: fonts.light,
    color: colors.text,
    fontSize: 19,
    marginTop: 2,
  },
  gridLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thinDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  quizLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  quizValue: {
    fontSize: 17,
  },
  boxIntro: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  boxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  boxLabel: {
    width: 74,
    fontSize: 13,
    color: colors.textMuted,
  },
  boxBar: {
    flex: 1,
  },
  boxCount: {
    width: 28,
    fontSize: 13,
    textAlign: 'left',
  },
  levelCard: {
    marginBottom: spacing.md,
  },
  levelTitle: {
    fontSize: 15,
  },
  levelPercent: {
    fontSize: 17,
  },
  levelBar: {
    marginTop: spacing.md,
  },
  levelSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  goalIntro: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  goalRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  goalChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
  },
  goalChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  goalChipText: {
    fontFamily: fonts.light,
    color: colors.textMuted,
    fontSize: 16,
  },
  goalChipTextActive: {
    color: colors.white,
  },
  dangerZone: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  dangerNote: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
});
