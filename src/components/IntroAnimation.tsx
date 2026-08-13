import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { arabicText, colors, fonts, latinText, radius, spacing } from '../theme';

/**
 * شاشة الافتتاح — تُعرض مرّة واحدة قبل الدخول إلى التطبيق.
 *
 * الفكرة مأخوذة من قلب التطبيق نفسه: بطاقة تعليمية تظهر بوجهها الإنجليزي
 * ثم تنقلب لتكشف المعنى العربي، يتبعها اسم التطبيق وشريط تقدّم يمتلئ.
 * أثناء ذلك يكون التطبيق تحتها يُحمّل تقدّم المستخدم من التخزين، فتؤدّي
 * الحركة دور غطاء التحميل بدل شاشة انتظار فارغة.
 */

/** التحويلات والشفافية تعمل على السائق الأصلي — إلا على الويب فلا سائق أصلي فيه. */
const NATIVE = Platform.OS !== 'web';

/** حروف تسبح في الخلفية: لاتينية وعربية معاً، إشارة إلى الترجمة بين اللغتين. */
const FLOATING_LETTERS = [
  { char: 'A', left: '9%', top: '15%', size: 44, delay: 0 },
  { char: 'W', left: '47%', top: '7%', size: 26, delay: 620 },
  { char: 'ب', left: '82%', top: '19%', size: 36, delay: 240 },
  { char: 'C', left: '15%', top: '75%', size: 34, delay: 480 },
  { char: 'ا', left: '85%', top: '71%', size: 40, delay: 160 },
  { char: 'k', left: '38%', top: '87%', size: 28, delay: 780 },
] as const;

function FloatingLetter({
  char,
  left,
  top,
  size,
  delay,
  animate,
}: {
  char: string;
  left: string;
  top: string;
  size: number;
  delay: number;
  animate: boolean;
}) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      drift.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(drift, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, delay, drift]);

  return (
    <Animated.Text
      style={[
        styles.floatingLetter,
        {
          left: left as never,
          top: top as never,
          fontSize: size,
          opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.18] }),
          transform: [
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [10, -10] }) },
          ],
        },
      ]}>
      {char}
    </Animated.Text>
  );
}

export function IntroAnimation({ onFinish }: { onFinish: () => void }) {
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  /** عرض البطاقة أفقياً: 1 → 0 → 1 هو الانقلاب الذي يبدّل الوجه */
  const flip = useRef(new Animated.Value(1)).current;
  const details = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  const [face, setFace] = useState<'en' | 'ar'>('en');
  /** يبقى null حتى نعرف تفضيل المستخدم لتقليل الحركة، فلا تبدأ حركة قبل ذلك */
  const [motion, setMotion] = useState<'full' | 'reduced' | null>(null);

  const running = useRef<Animated.CompositeAnimation | null>(null);
  const done = useRef(false);
  const skipped = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onFinish();
  }, [onFinish]);

  /** الضغط في أي مكان يُنهي المقدّمة فوراً بتلاشٍ قصير. */
  const skip = useCallback(() => {
    if (done.current || skipped.current) return;
    skipped.current = true;
    running.current?.stop();
    Animated.timing(exit, {
      toValue: 1,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: NATIVE,
    }).start(() => finish());
  }, [exit, finish]);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const fadeOut = () =>
      Animated.timing(exit, {
        toValue: 1,
        duration: 520,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: NATIVE,
      });

    // من يُفضّل تقليل الحركة يرى الإطار الأخير ساكناً ثم يدخل التطبيق
    const runReduced = () => {
      glow.setValue(1);
      enter.setValue(1);
      details.setValue(1);
      bar.setValue(1);
      setFace('ar');
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          running.current = fadeOut();
          running.current.start(({ finished }) => finished && finish());
        }, 900)
      );
    };

    const runFull = () => {
      // نبض هادئ للهالة خلف البطاقة، يستمر طوال المقدّمة
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
        ])
      );
      pulseLoop.start();

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          Animated.timing(hint, {
            toValue: 1,
            duration: 400,
            useNativeDriver: NATIVE,
          }).start();
        }, 1000)
      );

      // المرحلة الأولى: الهالة تتّسع، البطاقة تصعد، ثم تنطوي أفقياً
      running.current = Animated.sequence([
        Animated.parallel([
          Animated.timing(glow, {
            toValue: 1,
            duration: 760,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE,
          }),
          Animated.spring(enter, {
            toValue: 1,
            friction: 7,
            tension: 62,
            useNativeDriver: NATIVE,
          }),
        ]),
        Animated.delay(480),
        Animated.timing(flip, {
          toValue: 0,
          duration: 230,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: NATIVE,
        }),
      ]);

      running.current.start(({ finished }) => {
        if (!finished || cancelled || skipped.current) return;

        // منتصف الانقلاب: البطاقة مطويّة، فنبدّل الوجه قبل فتحها
        setFace('ar');

        // المرحلة الثانية: البطاقة تنفتح على المعنى، ثم الاسم وشريط التقدّم، ثم الخروج
        running.current = Animated.sequence([
          Animated.timing(flip, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: NATIVE,
          }),
          Animated.parallel([
            Animated.timing(details, {
              toValue: 1,
              duration: 480,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: NATIVE,
            }),
            Animated.timing(bar, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              // عرض الشريط نسبة مئوية، ولا يدعمها السائق الأصلي
              useNativeDriver: false,
            }),
          ]),
          Animated.delay(240),
          fadeOut(),
        ]);

        running.current.start((result) => {
          if (result.finished && !cancelled) finish();
        });
      });

      return () => pulseLoop.stop();
    };

    let stopPulse: (() => void) | undefined;

    // بعض المنصّات لا تُنفّذ هذا الاستعلام، فنفترض عندها الحركة الكاملة
    Promise.resolve()
      .then(() => AccessibilityInfo.isReduceMotionEnabled?.())
      .catch(() => false)
      .then((reduced) => {
        if (cancelled) return;
        setMotion(reduced ? 'reduced' : 'full');
        if (reduced) runReduced();
        else stopPulse = runFull();
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      running.current?.stop();
      stopPulse?.();
    };
  }, [bar, details, enter, exit, finish, flip, glow, hint, pulse]);

  const cardTransform = [
    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    { scaleX: flip },
  ];

  const glowScale = Animated.multiply(
    glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] })
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="تخطّي المقدّمة"
      onPress={skip}
      style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.root,
          {
            opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            ],
          },
        ]}>
        {motion !== null &&
          FLOATING_LETTERS.map((letter) => (
            <FloatingLetter key={letter.char} {...letter} animate={motion === 'full'} />
          ))}

        <View style={styles.stage}>
          {/* الهالة: حلقات متراكزة شفيفة تتجمّع في تدرّج ناعم بلا حاجة إلى حزمة تدرّجات */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowWrap,
              {
                opacity: glow,
                transform: [{ scale: glowScale }],
              },
            ]}>
            {GLOW_RINGS.map((size) => (
              <View
                key={size}
                style={[
                  styles.ring,
                  {
                    width: CARD_WIDTH * size,
                    height: CARD_WIDTH * size,
                    borderRadius: (CARD_WIDTH * size) / 2,
                  },
                ]}
              />
            ))}
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: enter, transform: cardTransform }]}>
            {face === 'en' ? (
              <>
                <View style={styles.speakerDot}>
                  <Text style={styles.speakerGlyph}>🔊</Text>
                </View>
                <Text style={styles.cardWordEn}>English</Text>
                <Text style={styles.cardHint}>اقلب البطاقة</Text>
              </>
            ) : (
              <>
                <View style={[styles.speakerDot, styles.speakerDotDone]}>
                  <Text style={styles.speakerGlyph}>✅</Text>
                </View>
                <Text style={styles.cardWordAr}>الإنجليزية</Text>
                <Text style={styles.cardHint}>كلمة واحدة… والبقيّة تتبع</Text>
              </>
            )}
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.details,
            {
              opacity: details,
              transform: [
                { translateY: details.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}>
          <Text style={styles.title}>تعلّم الإنجليزية</Text>
          <Text style={styles.subtitle}>خمس دقائق كل يوم تكفي</Text>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
        </Animated.View>

        <Animated.Text style={[styles.skipHint, { opacity: hint }]}>اضغط للتخطّي</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const CARD_WIDTH = 264;

/**
 * الهالة خلف البطاقة: حلقات متراكزة من الأوسع إلى الأضيق، كل واحدة شفّافة جداً.
 * تراكبها يعطي تدرّجاً شعاعياً ناعماً على كل المنصّات دون حزمة تدرّجات إضافية —
 * كثرة الحلقات وقلّة شفافيّة كل منها هما ما يمنع ظهور حوافّ بينها.
 */
const GLOW_RINGS = Array.from({ length: 9 }, (_, index) => 2.05 - index * 0.15);
const RING_COLOR = `${colors.primary}0A`;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  floatingLetter: {
    position: 'absolute',
    fontFamily: fonts.light,
    color: colors.primary,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: RING_COLOR,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  speakerDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  speakerDotDone: {
    backgroundColor: colors.successDim,
  },
  speakerGlyph: {
    fontSize: 20,
  },
  cardWordEn: {
    ...latinText,
    textAlign: 'center',
    color: colors.text,
    fontSize: 34,
  },
  cardWordAr: {
    ...arabicText,
    textAlign: 'center',
    color: colors.text,
    fontSize: 34,
  },
  cardHint: {
    ...arabicText,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  details: {
    alignItems: 'center',
    marginTop: spacing.xl + spacing.sm,
  },
  title: {
    ...arabicText,
    textAlign: 'center',
    color: colors.text,
    fontSize: 26,
  },
  subtitle: {
    ...arabicText,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  barTrack: {
    width: 168,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  skipHint: {
    ...arabicText,
    textAlign: 'center',
    position: 'absolute',
    bottom: spacing.xxl,
    color: colors.textFaint,
    fontSize: 12,
  },
});
