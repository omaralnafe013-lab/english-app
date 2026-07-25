import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lesson, LEVELS, Word } from '../data/lessons';
import { useProgress } from '../lib/progress';
import { isMastered } from '../lib/srs';
import { colors, radius, spacing } from '../theme';
import { ArabicText, Button, Card, EnglishText, SpeakButton } from '../components/ui';

export function LessonDetailScreen({
  lesson,
  onBack,
  onStartQuiz,
}: {
  lesson: Lesson;
  onBack: () => void;
  onStartQuiz: (lessonId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { progress, markWordSeen, completeLesson } = useProgress();
  const level = LEVELS.find((item) => item.id === lesson.level) ?? LEVELS[0];
  const isComplete = progress.completedLessons.includes(lesson.id);

  // فتح الدرس يُدخل كلماته في دورة المراجعة المتباعدة
  useEffect(() => {
    lesson.words.forEach((word) => markWordSeen(word.id));
  }, [lesson, markWordSeen]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backIcon}>›</Text>
        </Pressable>
        <ArabicText style={styles.headerTitle} numberOfLines={1}>
          {lesson.title}
        </ArabicText>
        <Text style={styles.headerEmoji}>{lesson.emoji}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <ArabicText style={styles.intro}>
            {lesson.words.length} كلمة · المستوى {level.subtitle}
          </ArabicText>
          <EnglishText style={[styles.introEn, { color: level.color }]}>{lesson.titleEn}</EnglishText>
        </View>

        <ArabicText style={styles.hint}>💡 اضغط 🔊 لسماع النطق، واضغط مطوّلاً لسماعه ببطء.</ArabicText>

        {lesson.words.map((word) => (
          <WordCard key={word.id} word={word} mastered={isMastered(progress.words[word.id])} />
        ))}

        {/* القاعدة النحوية */}
        <Card style={styles.grammarCard}>
          <ArabicText style={styles.grammarLabel}>القاعدة النحوية</ArabicText>
          <ArabicText style={styles.grammarTitle}>{lesson.grammar.title}</ArabicText>
          <ArabicText style={styles.grammarBody}>{lesson.grammar.body}</ArabicText>

          <View style={styles.grammarExamples}>
            {lesson.grammar.examples.map((example) => (
              <View key={example.en} style={styles.grammarExample}>
                <View style={styles.exampleRow}>
                  <SpeakButton text={example.en} size={34} />
                  <EnglishText style={styles.grammarEn}>{example.en}</EnglishText>
                </View>
                <ArabicText style={styles.grammarAr}>{example.ar}</ArabicText>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.actions}>
          <Button label="اختبر نفسك في هذا الدرس" icon="🎯" onPress={() => onStartQuiz(lesson.id)} />
          <Button
            label={isComplete ? 'الدرس مكتمل ✓' : 'وضع علامة: أنهيت الدرس'}
            variant={isComplete ? 'ghost' : 'success'}
            disabled={isComplete}
            onPress={() => completeLesson(lesson.id)}
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

function WordCard({ word, mastered }: { word: Word; mastered: boolean }) {
  return (
    <Card style={styles.wordCard}>
      <View style={styles.wordHeader}>
        <SpeakButton text={word.en} />
        <View style={styles.wordTitles}>
          <View style={styles.wordEnRow}>
            {mastered && <Text style={styles.masteredDot}>✓</Text>}
            <EnglishText style={styles.wordEn}>{word.en}</EnglishText>
          </View>
          <ArabicText style={styles.wordSay}>{word.say}</ArabicText>
        </View>
      </View>

      <ArabicText style={styles.wordAr}>{word.ar}</ArabicText>

      <View style={styles.exampleBox}>
        <View style={styles.exampleRow}>
          <SpeakButton text={word.example} size={32} />
          <EnglishText style={styles.exampleEn}>{word.example}</EnglishText>
        </View>
        <ArabicText style={styles.exampleAr}>{word.exampleAr}</ArabicText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 30,
    // السهم يشير لليمين ليتوافق مع اتجاه القراءة العربية
    transform: [{ scaleX: -1 }],
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  headerEmoji: {
    fontSize: 24,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  introRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intro: {
    fontSize: 14,
    color: colors.textMuted,
  },
  introEn: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  wordCard: {
    marginBottom: spacing.md,
  },
  wordHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordTitles: {
    flex: 1,
    marginRight: spacing.md,
  },
  wordEnRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  masteredDot: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
  },
  wordEn: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primary,
    flexShrink: 1,
  },
  wordSay: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 2,
  },
  wordAr: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  exampleBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exampleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exampleEn: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  exampleAr: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: spacing.xs,
  },
  grammarCard: {
    marginTop: spacing.lg,
    borderColor: colors.accent,
  },
  grammarLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  grammarTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  grammarBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 24,
  },
  grammarExamples: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  grammarExample: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  grammarEn: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  grammarAr: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
