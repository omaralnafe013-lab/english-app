import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getLesson, LESSONS } from '../data/lessons';
import { useProgress } from '../lib/progress';
import { buildQuiz, Question, questionTitle } from '../lib/quiz';
import { speakEnglish } from '../lib/speech';
import { arabicText, colors, fonts, radius, spacing } from '../theme';
import { ArabicText, Button, Card, EnglishText, Fraction, ProgressBar } from '../components/ui';

export function QuizScreen({
  lessonId,
  onExit,
}: {
  /** عند تمريره يبدأ الاختبار مباشرة على هذا الدرس */
  lessonId?: string;
  onExit?: () => void;
}) {
  const { reviewWordById, recordQuiz } = useProgress();

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [sourceLesson, setSourceLesson] = useState<string | undefined>(lessonId);

  const start = useCallback((source?: string) => {
    setSourceLesson(source);
    setQuestions(buildQuiz(source));
    setIndex(0);
    setSelected(null);
    setScore(0);
  }, []);

  // بدء الاختبار تلقائياً عند الدخول من صفحة درس
  useEffect(() => {
    if (lessonId) start(lessonId);
  }, [lessonId, start]);

  const question = questions?.[index];

  // نطق الكلمة تلقائياً في أسئلة الاستماع
  useEffect(() => {
    if (question?.kind === 'listen' && selected === null) {
      speakEnglish(question.word.en);
    }
  }, [question, selected]);

  const choose = useCallback(
    (option: string) => {
      if (!question || selected !== null) return;
      const isCorrect = option === question.answer;
      setSelected(option);
      if (isCorrect) setScore((prev) => prev + 1);
      // نتيجة الاختبار تغذّي نظام التكرار المتباعد أيضاً
      reviewWordById(question.word.id, isCorrect);
    },
    [question, selected, reviewWordById]
  );

  const next = useCallback(() => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      recordQuiz(score, questions.length);
      setIndex(questions.length);
    } else {
      setIndex((prev) => prev + 1);
      setSelected(null);
    }
  }, [questions, index, score, recordQuiz]);

  // ── اختيار مصدر الاختبار ──
  if (!questions) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ArabicText style={styles.heading}>الاختبار</ArabicText>
        <ArabicText style={styles.subheading}>
          عشرة أسئلة متنوّعة: معنى الكلمة، ترجمتها للإنجليزية، وأسئلة استماع. نتيجتك تُحتسب في تقدّمك.
        </ArabicText>

        <Card style={styles.startCard}>
          <ArabicText style={styles.startTitle}>اختبار شامل</ArabicText>
          <ArabicText style={styles.startSub}>أسئلة من كل الدروس والمستويات.</ArabicText>
          <Button label="ابدأ الاختبار الشامل" icon="🎯" onPress={() => start(undefined)} />
        </Card>

        <ArabicText style={styles.pickTitle}>أو اختبر درساً محدداً</ArabicText>
        {LESSONS.map((lesson) => (
          <Pressable
            key={lesson.id}
            onPress={() => start(lesson.id)}
            style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.7 }]}>
            <Text style={styles.chevron}>›</Text>
            <ArabicText style={styles.lessonRowTitle}>{lesson.title}</ArabicText>
            <Text style={styles.lessonEmoji}>{lesson.emoji}</Text>
          </Pressable>
        ))}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    );
  }

  // ── النتيجة النهائية ──
  if (index >= questions.length) {
    const percent = Math.round((score / questions.length) * 100);
    const lessonTitle = sourceLesson ? getLesson(sourceLesson)?.title : undefined;

    return (
      <View style={styles.centered}>
        <Text style={styles.resultEmoji}>{percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '📖'}</Text>
        <Fraction current={score} total={questions.length} style={styles.resultScore} />
        <ArabicText style={styles.resultText}>
          {percent >= 80
            ? 'ممتاز! أنت متمكّن من هذه الكلمات.'
            : percent >= 50
              ? 'جيد، لكن بعض الكلمات تحتاج مراجعة إضافية.'
              : 'لا بأس — راجع الكلمات في قسم المراجعة ثم أعد الاختبار.'}
        </ArabicText>
        {lessonTitle && <ArabicText style={styles.resultLesson}>الدرس: {lessonTitle}</ArabicText>}

        <View style={styles.resultActions}>
          <Button label="أعد الاختبار" icon="🔁" onPress={() => start(sourceLesson)} />
          <Button
            label={onExit ? 'رجوع للدرس' : 'اختر اختباراً آخر'}
            variant="ghost"
            onPress={() => (onExit ? onExit() : setQuestions(null))}
          />
        </View>
      </View>
    );
  }

  const current = questions[index];
  const answered = selected !== null;

  return (
    <View style={styles.quizContainer}>
      <View style={styles.quizHeader}>
        <Pressable onPress={() => (onExit ? onExit() : setQuestions(null))} hitSlop={10}>
          <ArabicText style={styles.exit}>إنهاء</ArabicText>
        </Pressable>
        <ArabicText style={styles.counter}>
          سؤال {index + 1} من {questions.length}
        </ArabicText>
      </View>
      <ProgressBar value={index / questions.length} />

      <ScrollView contentContainerStyle={styles.quizBody} showsVerticalScrollIndicator={false}>
        <ArabicText style={styles.questionLabel}>{questionTitle(current.kind)}</ArabicText>

        <Card style={styles.promptCard}>
          {current.kind === 'listen' ? (
            <Pressable onPress={() => speakEnglish(current.word.en)} style={styles.listenButton} hitSlop={10}>
              <Text style={styles.listenIcon}>🔊</Text>
              <ArabicText style={styles.listenLabel}>اضغط للاستماع مرة أخرى</ArabicText>
            </Pressable>
          ) : current.kind === 'ar-to-en' ? (
            <ArabicText style={styles.promptAr}>{current.prompt}</ArabicText>
          ) : (
            <View style={styles.promptEnRow}>
              <Pressable onPress={() => speakEnglish(current.word.en)} hitSlop={10}>
                <Text style={styles.smallSpeaker}>🔊</Text>
              </Pressable>
              <EnglishText style={styles.promptEn}>{current.prompt}</EnglishText>
            </View>
          )}
        </Card>

        <View style={styles.options}>
          {current.options.map((option) => {
            const isCorrectOption = option === current.answer;
            const isChosen = option === selected;
            const isEnglishOption = current.kind === 'ar-to-en';

            return (
              <Pressable
                key={option}
                onPress={() => choose(option)}
                disabled={answered}
                style={({ pressed }) => [
                  styles.option,
                  pressed && !answered && { opacity: 0.75 },
                  answered && isCorrectOption && styles.optionCorrect,
                  answered && isChosen && !isCorrectOption && styles.optionWrong,
                ]}>
                {answered && (isCorrectOption || isChosen) && (
                  <Text style={styles.optionMark}>{isCorrectOption ? '✓' : '✕'}</Text>
                )}
                <Text style={[isEnglishOption ? styles.optionTextEn : styles.optionTextAr]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        {answered && (
          <Card style={styles.explainCard}>
            <View style={styles.explainRow}>
              <Pressable onPress={() => speakEnglish(current.word.example)} hitSlop={10}>
                <Text style={styles.smallSpeaker}>🔊</Text>
              </Pressable>
              <EnglishText style={styles.explainEn}>{current.word.example}</EnglishText>
            </View>
            <ArabicText style={styles.explainAr}>{current.word.exampleAr}</ArabicText>
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={index + 1 >= questions.length ? 'إظهار النتيجة' : 'السؤال التالي'}
          disabled={!answered}
          onPress={next}
        />
      </View>
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
  },
  subheading: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  startCard: {
    gap: spacing.md,
  },
  startTitle: {
    fontSize: 18,
  },
  startSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
  pickTitle: {
    fontSize: 17,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  lessonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  lessonEmoji: {
    fontSize: 22,
  },
  lessonRowTitle: {
    flex: 1,
    fontSize: 15,
  },
  chevron: {
    color: colors.textFaint,
    fontSize: 22,
    transform: [{ scaleX: -1 }],
  },
  quizContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  quizHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  counter: {
    fontSize: 14,
    color: colors.textMuted,
  },
  exit: {
    fontSize: 14,
    color: colors.textFaint,
  },
  quizBody: {
    paddingTop: spacing.lg,
  },
  questionLabel: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  promptCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  promptAr: {
    fontSize: 28,
    textAlign: 'center',
  },
  promptEnRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  promptEn: {
    fontSize: 30,
    color: colors.primary,
    textAlign: 'center',
  },
  smallSpeaker: {
    fontSize: 22,
  },
  listenButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  listenIcon: {
    fontSize: 48,
  },
  listenLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  options: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  optionCorrect: {
    backgroundColor: colors.successDim,
    borderColor: colors.success,
  },
  optionWrong: {
    backgroundColor: colors.dangerDim,
    borderColor: colors.danger,
  },
  optionMark: {
    fontFamily: fonts.light,
    color: colors.white,
    fontSize: 16,
  },
  optionTextAr: {
    ...arabicText,
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  optionTextEn: {
    fontFamily: fonts.light,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'ltr',
    color: colors.text,
    fontSize: 16,
  },
  explainCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.cardMuted,
  },
  explainRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  explainEn: {
    flex: 1,
    fontSize: 15,
  },
  explainAr: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  resultEmoji: {
    fontSize: 64,
  },
  resultScore: {
    fontSize: 40,
    marginTop: spacing.md,
    color: colors.primary,
  },
  resultText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  resultLesson: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
  resultActions: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
