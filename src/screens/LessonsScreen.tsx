import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LESSONS, LEVELS, Lesson } from '../data/lessons';
import { useProgress } from '../lib/progress';
import { isMastered } from '../lib/srs';
import { colors, radius, spacing } from '../theme';
import { ArabicText, Card, Pill, ProgressBar } from '../components/ui';

export function LessonsScreen({ onOpenLesson }: { onOpenLesson: (lessonId: string) => void }) {
  const { progress } = useProgress();

  /** نسبة الكلمات المتقنة داخل الدرس. */
  const lessonMastery = (lesson: Lesson) => {
    const mastered = lesson.words.filter((word) => isMastered(progress.words[word.id])).length;
    return { mastered, ratio: mastered / lesson.words.length };
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ArabicText style={styles.heading}>الدروس</ArabicText>
      <ArabicText style={styles.subheading}>
        {LESSONS.length} درساً مرتّبة من الأسهل إلى الأصعب. ابدأ من المستوى الأول إن كنت مبتدئاً.
      </ArabicText>

      {LEVELS.map((level) => {
        const levelLessons = LESSONS.filter((lesson) => lesson.level === level.id);
        if (levelLessons.length === 0) return null;

        return (
          <View key={level.id} style={styles.levelBlock}>
            <View style={styles.levelHeader}>
              <Pill label={level.subtitle} color={level.color} />
              <ArabicText style={styles.levelTitle}>{level.title}</ArabicText>
            </View>

            {levelLessons.map((lesson) => {
              const { mastered, ratio } = lessonMastery(lesson);
              const isComplete = progress.completedLessons.includes(lesson.id);

              return (
                <Card key={lesson.id} style={styles.lessonCard} onPress={() => onOpenLesson(lesson.id)}>
                  <View style={styles.lessonRow}>
                    <View style={[styles.emojiCircle, { backgroundColor: `${level.color}22` }]}>
                      <Text style={styles.emoji}>{lesson.emoji}</Text>
                    </View>

                    <View style={styles.lessonInfo}>
                      <View style={styles.titleRow}>
                        {isComplete && <Text style={styles.check}>✓</Text>}
                        <ArabicText style={styles.lessonTitle} numberOfLines={1}>
                          {lesson.title}
                        </ArabicText>
                      </View>
                      <ArabicText style={styles.lessonMeta}>
                        {lesson.words.length} كلمة · أتقنت {mastered}
                      </ArabicText>
                      <View style={styles.barWrap}>
                        <ProgressBar value={ratio} color={level.color} />
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        );
      })}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  levelBlock: {
    marginTop: spacing.xl,
  },
  levelHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  levelTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  lessonCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  lessonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  lessonInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  check: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '800',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  lessonMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  barWrap: {
    marginTop: 2,
  },
});
