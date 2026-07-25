import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { arabicText, colors, fonts, latinText, radius, shadow, spacing } from '../theme';
import { speakEnglish } from '../lib/speech';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }, style]}>{children}</View>
  );
}

export function ArabicText({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}) {
  return (
    <Text style={[styles.arabic, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function EnglishText({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}) {
  return (
    <Text style={[styles.english, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

/**
 * كسر رقمي مثل «3 / 10».
 * يُعرض باتجاه من اليسار لليمين لأن السياق العربي يقلب ترتيب الرقمين حول الشرطة.
 */
export function Fraction({
  current,
  total,
  style,
}: {
  current: number;
  total: number;
  style?: TextStyle | TextStyle[];
}) {
  return (
    <Text style={[styles.fraction, style]}>
      {current} / {total}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, shadow, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'ghost' | 'success' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  icon?: string;
}) {
  const variantStyle = {
    primary: { backgroundColor: colors.primary },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    success: { backgroundColor: colors.success },
    danger: { backgroundColor: colors.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.buttonLabel, variant === 'ghost' && { color: colors.textMuted }]}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Pill({ label, color = colors.primary }: { label: string; color?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      {action}
      <ArabicText style={styles.sectionTitle}>{title}</ArabicText>
    </View>
  );
}

/** زر النطق — يقرأ النص الإنجليزي بصوت الجهاز. الضغط المطوّل ينطق ببطء. */
export function SpeakButton({ text, size = 44 }: { text: string; size?: number }) {
  return (
    <Pressable
      onPress={() => speakEnglish(text)}
      onLongPress={() => speakEnglish(text, { slow: true })}
      hitSlop={8}
      style={({ pressed }) => [
        styles.speakButton,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}>
      <Text style={{ fontSize: size * 0.45 }}>🔊</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <ArabicText style={styles.emptyTitle}>{title}</ArabicText>
      <ArabicText style={styles.emptySubtitle}>{subtitle}</ArabicText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  arabic: {
    ...arabicText,
    color: colors.text,
    fontSize: 16,
  },
  english: {
    ...latinText,
    color: colors.text,
    fontSize: 16,
  },
  fraction: {
    fontFamily: fonts.light,
    writingDirection: 'ltr',
    textAlign: 'right',
    color: colors.text,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.4,
  },
  button: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: colors.white,
    fontSize: 16,
    ...arabicText,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillLabel: {
    fontFamily: fonts.light,
    fontSize: 12,
  },
  sectionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 19,
    color: colors.text,
  },
  speakButton: {
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
