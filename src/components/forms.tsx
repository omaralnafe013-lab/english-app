import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { arabicText, colors, fonts, latinText, radius, shadow, spacing } from '../theme';
import { ArabicText, Button } from './ui';

/**
 * عناصر الإدخال والحوارات المشتركة في لوحة المعلم.
 *
 * الحوارات مبنيّة على `Modal` بدل `Alert` لأن `Alert.alert` لا يفعل شيئاً على الويب،
 * واللوحة تُستخدم في المتصفّح أساساً.
 */

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numeric,
  latin,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  /** حقل يُكتب فيه نص إنجليزي — يُحاذى ويُكتب من اليسار لليمين */
  latin?: boolean;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <ArabicText style={styles.fieldLabel}>{label}</ArabicText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        autoFocus={autoFocus}
        keyboardType={numeric ? 'number-pad' : 'default'}
        style={[
          styles.input,
          latin ? styles.inputLatin : styles.inputArabic,
          multiline && styles.inputMultiline,
        ]}
      />
      {!!hint && <ArabicText style={styles.fieldHint}>{hint}</ArabicText>}
    </View>
  );
}

export type ChipOption<T extends string> = { value: T; label: string };

export function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
  multi,
}: {
  label?: string;
  options: ChipOption<T>[];
  /** القيمة المختارة، أو قائمة القيم عند `multi` */
  selected: T | T[];
  onSelect: (value: T) => void;
  multi?: boolean;
}) {
  const isSelected = (value: T) =>
    multi && Array.isArray(selected) ? selected.includes(value) : selected === value;

  return (
    <View style={styles.field}>
      {!!label && <ArabicText style={styles.fieldLabel}>{label}</ArabicText>}
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = isSelected(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {multi && active ? '✓  ' : ''}
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** لوحة منبثقة: بطاقة في وسط الشاشة على الشاشات العريضة، وورقة سفلية على الجوال. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;

  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.backdrop, wide && styles.backdropCentered]}>
        {/* النقر خارج اللوحة يغلقها — وعلى الجوال يترك مساحة فوق الورقة */}
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityLabel="إغلاق" />

        <View style={[styles.sheet, wide ? styles.sheetWide : styles.sheetMobile, shadow]}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="إغلاق">
              <Text style={styles.sheetClose}>✕</Text>
            </Pressable>
            <ArabicText style={styles.sheetTitle}>{title}</ArabicText>
          </View>

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {!!footer && <View style={styles.sheetFooter}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

/** تأكيد قبل إجراء لا رجعة فيه — يعمل على الجوال والويب معاً. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'تأكيد',
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, styles.backdropCentered]}>
        <Pressable style={styles.backdropFill} onPress={onCancel} accessibilityLabel="إلغاء" />
        <View style={[styles.dialog, shadow]}>
          <ArabicText style={styles.dialogTitle}>{title}</ArabicText>
          <ArabicText style={styles.dialogMessage}>{message}</ArabicText>
          <View style={styles.dialogActions}>
            <Button label="إلغاء" variant="ghost" onPress={onCancel} style={styles.dialogButton} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.dialogButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export type BannerTone = 'info' | 'success' | 'error';

/** رسالة قصيرة تحت الإجراء — بديل التنبيهات التي لا تظهر على الويب. */
export function Banner({ tone, message }: { tone: BannerTone; message: string }) {
  const palette = {
    info: { border: colors.primary, text: colors.primary, icon: 'ℹ️' },
    success: { border: colors.success, text: colors.success, icon: '✅' },
    error: { border: colors.danger, text: colors.danger, icon: '⚠️' },
  }[tone];

  return (
    <View style={[styles.banner, { borderColor: `${palette.border}88`, backgroundColor: `${palette.border}18` }]}>
      <ArabicText style={[styles.bannerText, { color: palette.text }]}>
        {palette.icon}  {message}
      </ArabicText>
    </View>
  );
}

/** صندوق كود قابل للتحديد — الطالب أو المعلم ينسخه يدوياً من هنا. */
export function CodeBox({ code, style }: { code: string; style?: ViewStyle }) {
  return (
    <View style={[styles.codeBox, style]}>
      <TextInput
        value={code}
        editable={false}
        multiline
        selectTextOnFocus
        style={styles.codeText}
        accessibilityLabel="كود المشاركة"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.light,
  },
  inputArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputLatin: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textFaint,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardMuted,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    ...arabicText,
    fontSize: 13,
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#05070Ecc',
    justifyContent: 'flex-end',
  },
  backdropCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetWide: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '86%',
    borderRadius: radius.lg,
  },
  sheetMobile: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: 17,
  },
  sheetClose: {
    fontFamily: fonts.light,
    fontSize: 18,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  sheetBody: {
    paddingHorizontal: spacing.lg,
  },
  sheetBodyContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sheetFooter: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: {
    fontSize: 18,
  },
  dialogMessage: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 23,
  },
  dialogActions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dialogButton: {
    flex: 1,
  },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 21,
  },
  codeBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  codeText: {
    ...latinText,
    textAlign: 'left',
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
    minHeight: 84,
  },
});
