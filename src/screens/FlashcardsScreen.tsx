import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCatalog } from '../lib/catalog';
import { useProgress } from '../lib/progress';
import { MAX_BOX } from '../lib/srs';
import { speakEnglish } from '../lib/speech';
import { colors, fonts, radius, spacing } from '../theme';
import { ArabicText, Button, Card, EmptyState, EnglishText, Fraction, ProgressBar, SpeakButton } from '../components/ui';

const SESSION_SIZE = 15;

type SessionResult = { known: number; unknown: number };

export function FlashcardsScreen() {
  const { progress, dueWordIds, reviewWordById, markWordSeen } = useProgress();
  const { allWords, getWord } = useCatalog();

  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [result, setResult] = useState<SessionResult>({ known: 0, unknown: 0 });

  const flipAnim = useRef(new Animated.Value(0)).current;

  /** الكلمات الجديدة التي لم يبدأها المستخدم بعد. */
  const newWordIds = useMemo(
    () => allWords.filter((word) => !progress.words[word.id]).map((word) => word.id),
    [progress.words, allWords]
  );

  const runFlip = useCallback(
    (toValue: number) => {
      Animated.timing(flipAnim, {
        toValue,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [flipAnim]
  );

  const startSession = useCallback(
    (ids: string[]) => {
      // ترتيب عشوائي حتى لا يحفظ المستخدم التسلسل بدل الكلمات
      const shuffled = [...ids].sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE);
      shuffled.forEach(markWordSeen);
      setQueue(shuffled);
      setIndex(0);
      setFlipped(false);
      setResult({ known: 0, unknown: 0 });
      flipAnim.setValue(0);
    },
    [flipAnim, markWordSeen]
  );

  const flip = useCallback(() => {
    const next = !flipped;
    setFlipped(next);
    runFlip(next ? 1 : 0);
  }, [flipped, runFlip]);

  const answer = useCallback(
    (remembered: boolean) => {
      if (!queue) return;
      reviewWordById(queue[index], remembered);
      setResult((prev) => ({
        known: prev.known + (remembered ? 1 : 0),
        unknown: prev.unknown + (remembered ? 0 : 1),
      }));
      setFlipped(false);
      flipAnim.setValue(0);
      setIndex((prev) => prev + 1);
    },
    [queue, index, reviewWordById, flipAnim]
  );

  // ── شاشة البداية ──
  if (!queue) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ArabicText style={styles.heading}>المراجعة</ArabicText>
        <ArabicText style={styles.subheading}>
          نظام التكرار المتباعد يعرض عليك كل كلمة قبل أن تنساها بقليل — أفضل طريقة للحفظ طويل الأمد.
        </ArabicText>

        <Card style={styles.startCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.bigNumber}>{dueWordIds.length}</Text>
            <View style={styles.startInfo}>
              <ArabicText style={styles.startTitle}>كلمات مستحقّة اليوم</ArabicText>
              <ArabicText style={styles.startSub}>
                {dueWordIds.length > 0
                  ? 'راجعها الآن لتثبيتها في ذاكرتك.'
                  : 'لا توجد مراجعات مستحقّة — عمل رائع!'}
              </ArabicText>
            </View>
          </View>
          <Button
            label="ابدأ المراجعة"
            icon="🎴"
            disabled={dueWordIds.length === 0}
            onPress={() => startSession(dueWordIds)}
          />
        </Card>

        <Card style={styles.startCard}>
          <View style={styles.rowBetween}>
            <Text style={[styles.bigNumber, { color: colors.accent }]}>{newWordIds.length}</Text>
            <View style={styles.startInfo}>
              <ArabicText style={styles.startTitle}>كلمات جديدة</ArabicText>
              <ArabicText style={styles.startSub}>
                {newWordIds.length > 0
                  ? 'تعلّم كلمات لم تدرسها بعد وأضفها لدورة المراجعة.'
                  : 'بدأت جميع كلمات التطبيق 🎉'}
              </ArabicText>
            </View>
          </View>
          <Button
            label="تعلّم كلمات جديدة"
            icon="✨"
            variant="ghost"
            disabled={newWordIds.length === 0}
            onPress={() => startSession(newWordIds)}
          />
        </Card>

        <Card style={styles.startCard}>
          <ArabicText style={styles.startTitle}>مراجعة حرّة</ArabicText>
          <ArabicText style={styles.startSub}>
            راجع مجموعة عشوائية من كل الكلمات في أي وقت، بغضّ النظر عن موعد استحقاقها.
          </ArabicText>
          <Button
            label="مراجعة عشوائية"
            icon="🔀"
            variant="ghost"
            onPress={() => startSession(allWords.map((word) => word.id))}
          />
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    );
  }

  // ── ملخّص نهاية الجلسة ──
  if (index >= queue.length) {
    const total = result.known + result.unknown;
    const accuracy = total > 0 ? Math.round((result.known / total) * 100) : 0;

    return (
      <View style={styles.centered}>
        <Text style={styles.summaryEmoji}>{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '👏' : '💪'}</Text>
        <ArabicText style={styles.summaryTitle}>انتهت الجلسة</ArabicText>
        <ArabicText style={styles.summaryText}>
          راجعت {total} كلمة · تذكّرت {result.known} منها ({accuracy}%)
        </ArabicText>
        <View style={styles.summaryActions}>
          <Button label="جلسة أخرى" icon="🔁" onPress={() => setQueue(null)} />
        </View>
      </View>
    );
  }

  // ── البطاقة الحالية ──
  const word = getWord(queue[index]);
  if (!word) {
    return (
      <View style={styles.centered}>
        <EmptyState emoji="🤔" title="تعذّر تحميل الكلمة" subtitle="ابدأ جلسة جديدة للمتابعة." />
        <Button label="رجوع" variant="ghost" onPress={() => setQueue(null)} />
      </View>
    );
  }

  const state = progress.words[word.id];
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <View style={styles.sessionContainer}>
      <View style={styles.sessionHeader}>
        <Pressable onPress={() => setQueue(null)} hitSlop={10}>
          <ArabicText style={styles.exit}>إنهاء</ArabicText>
        </Pressable>
        <Fraction current={index + 1} total={queue.length} style={styles.counter} />
      </View>
      <ProgressBar value={index / queue.length} />

      <Pressable style={styles.cardArea} onPress={flip}>
        {/* الوجه الأمامي: الكلمة الإنجليزية */}
        <Animated.View
          style={[styles.flipCard, styles.cardFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
          <ArabicText style={styles.faceLabel}>ما معنى هذه الكلمة؟</ArabicText>
          <EnglishText style={styles.frontWord}>{word.en}</EnglishText>
          <SpeakButton text={word.en} size={54} />
          <ArabicText style={styles.tapHint}>اضغط على البطاقة لكشف المعنى</ArabicText>
          {state && (
            <View style={styles.boxRow}>
              {Array.from({ length: MAX_BOX }).map((_, box) => (
                <View
                  key={box}
                  style={[styles.boxDot, box < state.box && { backgroundColor: colors.success }]}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* الوجه الخلفي: المعنى والمثال */}
        <Animated.View
          style={[styles.flipCard, styles.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}>
          <ArabicText style={styles.backWord}>{word.ar}</ArabicText>
          <View style={styles.backDivider} />
          <EnglishText style={styles.backExample}>{word.example}</EnglishText>
          <ArabicText style={styles.backExampleAr}>{word.exampleAr}</ArabicText>
          <Pressable onPress={() => speakEnglish(word.example)} style={styles.listenAgain} hitSlop={8}>
            <ArabicText style={styles.listenAgainText}>🔊 استمع للجملة</ArabicText>
          </Pressable>
        </Animated.View>
      </Pressable>

      <View style={styles.answerRow}>
        {flipped ? (
          <>
            <Button label="أتذكّرها" icon="✅" variant="success" style={styles.answerButton} onPress={() => answer(true)} />
            <Button label="لم أتذكّرها" icon="🔁" variant="danger" style={styles.answerButton} onPress={() => answer(false)} />
          </>
        ) : (
          <Button label="اكشف المعنى" icon="👀" style={{ flex: 1 }} onPress={flip} />
        )}
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
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigNumber: {
    fontFamily: fonts.light,
    fontSize: 38,
    color: colors.primary,
  },
  startInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  startTitle: {
    fontSize: 17,
  },
  startSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  summaryEmoji: {
    fontSize: 64,
  },
  summaryTitle: {
    fontSize: 24,
    marginTop: spacing.md,
  },
  summaryText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  summaryActions: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
  sessionContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sessionHeader: {
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
  cardArea: {
    flex: 1,
    marginVertical: spacing.lg,
  },
  flipCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: colors.card,
    gap: spacing.lg,
  },
  cardBack: {
    backgroundColor: colors.cardMuted,
  },
  faceLabel: {
    fontSize: 13,
    color: colors.textFaint,
  },
  frontWord: {
    fontSize: 36,
    color: colors.primary,
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 12,
    color: colors.textFaint,
  },
  boxRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  boxDot: {
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  backWord: {
    fontSize: 30,
    textAlign: 'center',
  },
  backDivider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  backExample: {
    fontSize: 17,
    textAlign: 'center',
    color: colors.text,
  },
  backExampleAr: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  listenAgain: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  listenAgainText: {
    fontSize: 13,
    color: colors.primary,
  },
  answerRow: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  answerButton: {
    flex: 1,
  },
});
