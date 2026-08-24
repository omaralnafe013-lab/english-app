import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarList, ColumnChart, StackedBar, StatTile } from '../../components/charts';
import { ArabicText } from '../../components/ui';
import {
  assignmentProgress,
  classBoxDistribution,
  computeClassOverview,
  hardestWords,
  lastSeenLabel,
  leaderboard,
  StudentStats,
} from '../../lib/analytics';
import { Catalog } from '../../lib/catalog';
import { Assignment } from '../../lib/teacher';
import { chart, colors, spacing } from '../../theme';
import { DetailRow, MiniButton, Panel, PanelEmpty, StatusBadge } from './parts';

const STAGE_LABELS = ['المرحلة ١', 'المرحلة ٢', 'المرحلة ٣', 'المرحلة ٤', 'متقنة'];

export function OverviewSection({
  stats,
  catalog,
  assignments,
  onOpenStudent,
  onGoToStudents,
  onGoToAssignments,
}: {
  stats: StudentStats[];
  catalog: Catalog;
  assignments: Assignment[];
  onOpenStudent: (studentId: string) => void;
  onGoToStudents: () => void;
  onGoToAssignments: () => void;
}) {
  const overview = useMemo(() => computeClassOverview(stats), [stats]);
  const distribution = useMemo(() => classBoxDistribution(stats), [stats]);
  const hardest = useMemo(() => hardestWords(stats, catalog, 6), [stats, catalog]);
  const ranked = useMemo(() => leaderboard(stats).slice(0, 6), [stats]);
  const attention = useMemo(() => stats.filter((item) => item.needsAttention).slice(0, 6), [stats]);

  // منحنى نقاط الصف عبر اللقطات المستوردة — يحتاج طالبين فأكثر ليكون له معنى
  const xpTrend = useMemo(() => {
    const byDay = new Map<number, number>();
    for (const item of stats) {
      for (const point of item.student.history) {
        byDay.set(point.day, (byDay.get(point.day) ?? 0) + point.xp);
      }
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-14)
      .map(([day, xp]) => ({ key: String(day), label: dayLabel(day), value: xp }));
  }, [stats]);

  const upcoming = useMemo(
    () =>
      assignments
        .map((assignment) => assignmentProgress(assignment, stats, catalog))
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 3),
    [assignments, stats, catalog]
  );

  if (stats.length === 0) {
    return (
      <Panel
        title="ابدأ ببناء صفّك"
        subtitle="اللوحة تعمل بالكامل على جهازك — لا حساب ولا إنترنت.">
        <PanelEmpty
          emoji="👥"
          text={
            'أضف طلابك يدوياً من قسم «الطلاب»، أو اطلب من كل طالب أن يرسل لك كود تقدّمه ' +
            'من التطبيق ثم الصقه في «استيراد كود» — سيظهر الطالب وإحصاءاته هنا مباشرة.'
          }
        />
        <View style={styles.emptyActions}>
          <MiniButton label="فتح قسم الطلاب" tone="primary" onPress={onGoToStudents} />
        </View>
      </Panel>
    );
  }

  return (
    <View>
      {/* ملخّص الصف في أرقام مفردة — أوضح من أي رسم لقيمة واحدة */}
      <View style={styles.tiles}>
        <StatTile
          label="متوسّط إتقان المنهج"
          value={`${overview.avgMasteryPct}%`}
          hint={`${overview.totalMasteredWords} كلمة متقنة في الصف`}
          accent={chart.series[1]}
          emphasis
        />
        <StatTile label="عدد الطلاب" value={overview.totalStudents} accent={chart.series[3]} />
        <StatTile
          label="نشِطون"
          value={overview.activeStudents}
          hint="أرسلوا تقدّمهم خلال ٣ أيام"
          accent={chart.status.good}
        />
        <StatTile
          label="يحتاجون متابعة"
          value={overview.needAttention}
          accent={overview.needAttention > 0 ? chart.status.warning : chart.status.idle}
        />
        <StatTile
          label="متوسّط دقّة الاختبارات"
          value={overview.avgAccuracy > 0 ? `${overview.avgAccuracy}%` : '—'}
          accent={chart.series[2]}
        />
        <StatTile label="مراجعات متراكمة" value={overview.totalDue} accent={chart.series[0]} />
      </View>

      <Panel
        title="توزيع كلمات الصف على مراحل الحفظ"
        subtitle="كل كلمة تتدرّج عبر خمس مراحل؛ اتساع المرحلة الأخيرة يعني ترسّخ المفردات.">
        <StackedBar
          segments={distribution.map((count, index) => ({
            key: `stage-${index}`,
            label: STAGE_LABELS[index],
            value: count,
            // مقياس ترتيبي: تدرّج لون واحد يزداد سطوعاً مع تقدّم المرحلة على الخلفية الداكنة
            color: chart.ramp[index],
          }))}
        />
      </Panel>

      <Panel
        title="الأعلى نقاطاً"
        subtitle="النقاط تجمع المراجعات والاختبارات والدروس المكتملة."
        action={<MiniButton label="كل الطلاب" onPress={onGoToStudents} />}>
        <BarList
          data={ranked.map((item) => ({
            key: item.student.id,
            label: item.student.name,
            value: item.xp,
            valueLabel: `${item.xp} نقطة`,
            sub: `${item.mastered} كلمة متقنة · ${lastSeenLabel(item.daysSinceUpdate)}`,
            onPress: () => onOpenStudent(item.student.id),
          }))}
        />
      </Panel>

      <Panel
        title="يحتاجون متابعة"
        subtitle="طلاب انقطعوا، أو تراجعت دقّتهم، أو تراكمت عليهم المراجعات.">
        {attention.length === 0 ? (
          <PanelEmpty emoji="✅" text="لا أحد متأخّر الآن — كل الطلاب ضمن المعدّل الطبيعي." />
        ) : (
          <View>
            {attention.map((item) => (
              <View key={item.student.id} style={styles.attentionRow}>
                <StatusBadge status={item.status} />
                <View style={styles.attentionText}>
                  <ArabicText style={styles.attentionName}>{item.student.name}</ArabicText>
                  <ArabicText style={styles.attentionReason}>{item.attentionReason}</ArabicText>
                </View>
                <MiniButton label="عرض" onPress={() => onOpenStudent(item.student.id)} />
              </View>
            ))}
          </View>
        )}
      </Panel>

      <Panel
        title="أصعب الكلمات على الصف"
        subtitle="مرتّبة بمجموع المحاولات الخاطئة — ابدأ بها في المراجعة الصفّية.">
        <BarList
          data={hardest.map((word) => ({
            key: word.wordId,
            label: word.en,
            value: word.wrong,
            valueLabel: `${word.wrong} خطأ`,
            sub: `${word.ar} · ${word.strugglingStudents} طالب · نسبة الخطأ ${word.errorRate}%`,
          }))}
          color={chart.series[0]}
          emptyLabel="لا توجد أخطاء مسجّلة بعد — استورد أكواد الطلاب لتظهر هنا."
        />
      </Panel>

      <Panel
        title="مجموع نقاط الصف"
        subtitle="يُبنى من الأكواد التي استوردتها، ونقطة لكل يوم وصلك فيه تحديث.">
        <ColumnChart
          data={xpTrend}
          emptyLabel="تحتاج تحديثين على الأقل في يومين مختلفين ليظهر المنحنى."
        />
      </Panel>

      <Panel
        title="الواجبات القريبة"
        action={<MiniButton label="كل الواجبات" onPress={onGoToAssignments} />}>
        {upcoming.length === 0 ? (
          <PanelEmpty emoji="🗂️" text="لا توجد واجبات بعد. أنشئ واجباً وحدّد دروسه وموعد تسليمه." />
        ) : (
          upcoming.map((item) => (
            <DetailRow
              key={item.assignment.id}
              label={item.assignment.title}
              value={`${item.done}/${item.assigned.length} · ${
                item.overdue ? `متأخّر ${Math.abs(item.daysLeft)} يوم` : `${item.daysLeft} يوم متبقٍ`
              }`}
            />
          ))
        )}
      </Panel>
    </View>
  );
}

/** يحوّل رقم اليوم إلى «يوم/شهر» للعرض على المحور. */
function dayLabel(day: number): string {
  const date = new Date(day * 24 * 60 * 60 * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyActions: {
    flexDirection: 'row-reverse',
    marginTop: spacing.sm,
  },
  attentionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attentionText: {
    flex: 1,
  },
  attentionName: {
    fontSize: 14,
  },
  attentionReason: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
  },
});
