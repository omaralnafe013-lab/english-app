import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { arabicText, chart, colors, fonts, radius, spacing } from '../theme';
import { ArabicText } from './ui';

/**
 * رسوم اللوحة — مبنيّة من `View` فقط بلا أي مكتبة رسم.
 *
 * قواعد ثابتة في كل الرسوم هنا:
 * • الأعمدة والأشرطة رفيعة، وطرف البيانات وحده مدوّر بينما الطرف الملاصق للأساس مستقيم.
 * • فاصل ٢ بكسل بلون السطح بين القطع المتجاورة حتى لا تذوب في بعضها.
 * • الأرقام والعناوين بألوان النص لا بلون السلسلة؛ اللون للهوية فقط.
 * • مقياس واحد لكل رسم — لا محورين مختلفين في رسم واحد.
 */

const BAR_RADIUS = 4;
const SEGMENT_GAP = 2;

/** الرقم الرئيسي — عندما تكون القيمة الواحدة أوضح من أي رسم. */
export function StatTile({
  label,
  value,
  hint,
  accent = chart.series[1],
  emphasis = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  /** يكبّر الرقم ويظهر شريطاً لونياً — للبطاقة الأهم في الصف */
  emphasis?: boolean;
}) {
  return (
    <View style={[styles.tile, emphasis && styles.tileEmphasis]}>
      <View style={[styles.tileAccent, { backgroundColor: accent }]} />
      <Text style={[styles.tileValue, emphasis && styles.tileValueLarge]}>{value}</Text>
      <ArabicText style={styles.tileLabel} numberOfLines={2}>
        {label}
      </ArabicText>
      {!!hint && (
        <ArabicText style={styles.tileHint} numberOfLines={2}>
          {hint}
        </ArabicText>
      )}
    </View>
  );
}

export type BarDatum = {
  key: string;
  label: string;
  value: number;
  /** نص القيمة المعروض — إن غاب عُرضت القيمة كما هي */
  valueLabel?: string;
  /** سطر ثانوي تحت العنوان */
  sub?: string;
  color?: string;
  onPress?: () => void;
};

/**
 * أشرطة أفقية للمقارنة بين فئات.
 * الاتجاه من اليمين لليسار ليقرأ الشريط مع النص العربي، والقيمة مكتوبة بجانب كل شريط
 * فلا حاجة لمحور أرقام.
 */
export function BarList({
  data,
  max,
  color = chart.series[1],
  emptyLabel = 'لا توجد بيانات بعد',
}: {
  data: BarDatum[];
  /** أقصى قيمة على المقياس — تُحسب من البيانات إن لم تُمرَّر */
  max?: number;
  color?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) return <ArabicText style={styles.empty}>{emptyLabel}</ArabicText>;

  const scale = Math.max(max ?? 0, ...data.map((item) => item.value), 1);

  return (
    <View style={styles.barList}>
      {data.map((item) => {
        const width = `${Math.max(2, (item.value / scale) * 100)}%` as const;
        const row = (
          <View style={styles.barRow}>
            <View style={styles.barHeader}>
              <Text style={styles.barValue}>{item.valueLabel ?? item.value}</Text>
              <View style={styles.barLabelWrap}>
                <ArabicText style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </ArabicText>
                {!!item.sub && (
                  <ArabicText style={styles.barSub} numberOfLines={1}>
                    {item.sub}
                  </ArabicText>
                )}
              </View>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width, backgroundColor: item.color ?? color }]} />
            </View>
          </View>
        );

        if (item.onPress) {
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}: ${item.valueLabel ?? item.value}`}
              style={({ pressed }) => pressed && styles.pressed}>
              {row}
            </Pressable>
          );
        }

        return (
          <View key={item.key} accessibilityLabel={`${item.label}: ${item.valueLabel ?? item.value}`}>
            {row}
          </View>
        );
      })}
    </View>
  );
}

export type Segment = { key: string; label: string; value: number; color: string };

/**
 * شريط مقسّم — يعرض تركيبة مجموع واحد (مثل توزيع الكلمات على مراحل الحفظ).
 * تحته وسيلة إيضاح بالأرقام، فالهوية لا تعتمد على اللون وحده.
 */
export function StackedBar({ segments, total }: { segments: Segment[]; total?: number }) {
  const sum = total ?? segments.reduce((acc, segment) => acc + segment.value, 0);

  if (sum <= 0) {
    return <ArabicText style={styles.empty}>لا توجد كلمات مسجّلة بعد</ArabicText>;
  }

  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <View>
      <View style={styles.stackTrack}>
        {visible.map((segment, index) => (
          <View
            key={segment.key}
            accessibilityLabel={`${segment.label}: ${segment.value}`}
            style={[
              styles.stackSegment,
              {
                flexGrow: segment.value,
                backgroundColor: segment.color,
                marginLeft: index === visible.length - 1 ? 0 : SEGMENT_GAP,
              },
              index === 0 && styles.stackSegmentStart,
              index === visible.length - 1 && styles.stackSegmentEnd,
            ]}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: segment.color }]} />
            <ArabicText style={styles.legendLabel}>{segment.label}</ArabicText>
            <Text style={styles.legendValue}>{segment.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export type Column = { key: string; label: string; value: number };

/**
 * أعمدة رأسية لتتبّع قيمة واحدة عبر الزمن.
 * سلسلة واحدة فقط، فالعنوان يكفي عن وسيلة الإيضاح، وتُكتب قيمة الطرفين فقط
 * بدل رقم فوق كل عمود.
 */
export function ColumnChart({
  data,
  color = chart.series[1],
  height = 120,
  emptyLabel = 'لا توجد قراءات كافية بعد',
}: {
  data: Column[];
  color?: string;
  height?: number;
  emptyLabel?: string;
}) {
  if (data.length < 2) return <ArabicText style={styles.empty}>{emptyLabel}</ArabicText>;

  const scale = Math.max(...data.map((item) => item.value), 1);
  const lastIndex = data.length - 1;

  return (
    <View>
      <View style={[styles.columnPlot, { height }]}>
        {/* خط الأساس والشبكة يبقيان خافتين خلف البيانات */}
        <View style={[styles.gridLine, { bottom: height / 2 }]} />
        <View style={[styles.gridLine, styles.baseLine]} />

        {data.map((item, index) => (
          <View
            key={item.key}
            style={styles.columnSlot}
            accessibilityLabel={`${item.label}: ${item.value}`}>
            <View
              style={[
                styles.column,
                {
                  height: Math.max(3, (item.value / scale) * (height - 4)),
                  backgroundColor: index === lastIndex ? color : `${color}99`,
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* المحور بنفس اتجاه الأعمدة: الأقدم يميناً والأحدث يساراً، مع اتجاه القراءة */}
      <View style={styles.columnAxis}>
        <ArabicText style={styles.axisLabel}>{data[0].label}</ArabicText>
        <ArabicText style={styles.axisLabel}>{data[lastIndex].label}</ArabicText>
      </View>
    </View>
  );
}

/** شريط نسبة بسيط داخل صفوف الجداول — رفيع حتى لا ينافس النص. */
export function MiniBar({ value, color = chart.series[1], style }: { value: number; color?: string; style?: ViewStyle }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.miniTrack, style]}>
      <View style={[styles.miniFill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 104,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  tileEmphasis: {
    flexBasis: 150,
  },
  tileAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 3,
    height: '100%',
  },
  tileValue: {
    fontFamily: fonts.light,
    color: colors.text,
    fontSize: 24,
    textAlign: 'right',
  },
  tileValueLarge: {
    fontSize: 34,
  },
  tileLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  tileHint: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 2,
    lineHeight: 17,
  },
  barList: {
    gap: spacing.md,
  },
  barRow: {
    gap: spacing.xs + 2,
  },
  barHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  barLabelWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  barLabel: {
    fontSize: 14,
  },
  barSub: {
    fontSize: 11,
    color: colors.textFaint,
  },
  barValue: {
    fontFamily: fonts.light,
    color: colors.textMuted,
    fontSize: 13,
  },
  barTrack: {
    height: 8,
    borderRadius: BAR_RADIUS,
    backgroundColor: chart.track,
    // الشريط ينمو من اليمين مع اتجاه القراءة
    flexDirection: 'row-reverse',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderTopLeftRadius: BAR_RADIUS,
    borderBottomLeftRadius: BAR_RADIUS,
  },
  stackTrack: {
    flexDirection: 'row-reverse',
    height: 14,
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
    backgroundColor: chart.track,
  },
  stackSegment: {
    height: '100%',
  },
  stackSegmentStart: {
    borderTopRightRadius: BAR_RADIUS,
    borderBottomRightRadius: BAR_RADIUS,
  },
  stackSegmentEnd: {
    borderTopLeftRadius: BAR_RADIUS,
    borderBottomLeftRadius: BAR_RADIUS,
  },
  legend: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  legendValue: {
    fontFamily: fonts.light,
    fontSize: 12,
    color: colors.text,
  },
  columnPlot: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: SEGMENT_GAP,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: chart.grid,
  },
  baseLine: {
    bottom: 0,
  },
  columnSlot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  column: {
    width: '100%',
    borderTopLeftRadius: BAR_RADIUS,
    borderTopRightRadius: BAR_RADIUS,
  },
  columnAxis: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: spacing.xs + 2,
  },
  axisLabel: {
    ...arabicText,
    fontSize: 11,
    color: colors.textFaint,
  },
  miniTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: chart.track,
    flexDirection: 'row-reverse',
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  empty: {
    fontSize: 13,
    color: colors.textFaint,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
