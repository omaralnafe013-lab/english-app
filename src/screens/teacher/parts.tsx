import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { ArabicText } from '../../components/ui';
import { chart, colors, fonts, radius, spacing } from '../../theme';
import { StudentStatus, statusLabel } from '../../lib/analytics';

/** بطاقة قسم — عنوان وشرح قصير فوق محتوى واحد. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.panelHeader}>
        {action}
        <View style={styles.panelTitles}>
          <ArabicText style={styles.panelTitle}>{title}</ArabicText>
          {!!subtitle && <ArabicText style={styles.panelSubtitle}>{subtitle}</ArabicText>}
        </View>
      </View>
      {children}
    </View>
  );
}

/** شارة حالة الطالب — لون ونص معاً، فلا تعتمد القراءة على اللون وحده. */
export function StatusBadge({ status }: { status: StudentStatus }) {
  const color = {
    active: chart.status.good,
    slipping: chart.status.warning,
    inactive: chart.status.critical,
    pending: chart.status.idle,
  }[status];

  return (
    <View style={[styles.badge, { borderColor: `${color}66`, backgroundColor: `${color}1F` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{statusLabel(status)}</Text>
    </View>
  );
}

/** زر ثانوي صغير داخل رؤوس البطاقات. */
export function MiniButton({
  label,
  onPress,
  tone = 'neutral',
}: {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'primary' | 'danger';
}) {
  const color = { neutral: colors.textMuted, primary: colors.primary, danger: colors.danger }[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.miniButton,
        { borderColor: tone === 'neutral' ? colors.border : `${color}66` },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.miniButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** حالة فارغة داخل بطاقة — تشرح الخطوة التالية بدل ترك مساحة بيضاء. */
export function PanelEmpty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.panelEmpty}>
      <Text style={styles.panelEmptyEmoji}>{emoji}</Text>
      <ArabicText style={styles.panelEmptyText}>{text}</ArabicText>
    </View>
  );
}

/** صف «مفتاح ← قيمة» داخل بطاقات التفاصيل. */
export function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailValue}>{value}</Text>
      <ArabicText style={styles.detailLabel}>{label}</ArabicText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  panelTitles: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 16,
  },
  panelSubtitle: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
    lineHeight: 19,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: fonts.light,
    fontSize: 11,
  },
  miniButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 1,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  miniButtonLabel: {
    fontFamily: fonts.light,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.65,
  },
  panelEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  panelEmptyEmoji: {
    fontSize: 30,
  },
  panelEmptyText: {
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 21,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    fontFamily: fonts.light,
    fontSize: 14,
    color: colors.text,
  },
});
