import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarList, StatTile } from '../../components/charts';
import { ChipGroup } from '../../components/forms';
import { ArabicText } from '../../components/ui';
import { hardestWords, lessonCoverage, levelBreakdown, StudentStats } from '../../lib/analytics';
import { Catalog } from '../../lib/catalog';
import { chart, colors, spacing } from '../../theme';
import { Panel, PanelEmpty } from './parts';

type CoverageSort = 'weakest' | 'strongest' | 'order';

const COVERAGE_SORTS: { value: CoverageSort; label: string }[] = [
  { value: 'weakest', label: 'الأضعف أولاً' },
  { value: 'strongest', label: 'الأقوى أولاً' },
  { value: 'order', label: 'ترتيب المنهج' },
];

export function CurriculumSection({ stats, catalog }: { stats: StudentStats[]; catalog: Catalog }) {
  const [sort, setSort] = useState<CoverageSort>('weakest');

  const levels = useMemo(() => levelBreakdown(stats, catalog), [stats, catalog]);
  const coverage = useMemo(() => lessonCoverage(stats, catalog), [stats, catalog]);
  const hardest = useMemo(() => hardestWords(stats, catalog, 12), [stats, catalog]);

  const sortedCoverage = useMemo(() => {
    const rows = [...coverage];
    if (sort === 'weakest') rows.sort((a, b) => a.avgMasteryPct - b.avgMasteryPct);
    if (sort === 'strongest') rows.sort((a, b) => b.avgMasteryPct - a.avgMasteryPct);
    return rows;
  }, [coverage, sort]);

  // دروس لم يفتحها أحد — فجوة في التغطية لا تظهر في المتوسّطات
  const untouched = useMemo(() => coverage.filter((row) => row.startedBy === 0), [coverage]);

  if (stats.length === 0) {
    return (
      <Panel title="تحليل المنهج" subtitle="يظهر بعد استيراد أول كود من الطلاب.">
        <PanelEmpty emoji="📈" text="استورد أكواد تقدّم من طلابك، وستجد هنا أصعب الكلمات وأضعف الدروس على مستوى الصف." />
      </Panel>
    );
  }

  return (
    <View>
      <View style={styles.tiles}>
        <StatTile label="دروس المنهج" value={catalog.lessons.length} accent={chart.series[1]} emphasis />
        <StatTile label="إجمالي الكلمات" value={catalog.totalWords} accent={chart.series[3]} />
        <StatTile
          label="دروس لم يبدأها أحد"
          value={untouched.length}
          accent={untouched.length > 0 ? chart.status.warning : chart.status.good}
        />
        <StatTile label="كلمات فيها أخطاء" value={hardest.length} accent={chart.series[0]} />
      </View>

      <Panel
        title="متوسّط الإتقان حسب المستوى"
        subtitle="نسبة كلمات المستوى التي بلغت المرحلة الأخيرة، بمتوسّط الصف.">
        <BarList
          max={100}
          data={levels.map((level) => ({
            key: level.level,
            label: `${level.title} · ${level.subtitle}`,
            value: level.avgMasteryPct,
            valueLabel: `${level.avgMasteryPct}%`,
            sub: `${level.words} كلمة`,
            color: level.color,
          }))}
        />
      </Panel>

      <Panel
        title="تغطية الدروس"
        subtitle="ابدأ الحصّة القادمة من أعلى القائمة عند الترتيب بالأضعف.">
        <ChipGroup options={COVERAGE_SORTS} selected={sort} onSelect={setSort} />
        <BarList
          max={100}
          data={sortedCoverage.map((row) => ({
            key: row.lesson.id,
            label: `${row.lesson.emoji} ${row.lesson.title}`,
            value: row.avgMasteryPct,
            valueLabel: `${row.avgMasteryPct}%`,
            sub: `بدأه ${row.startedBy} · أنهاه ${row.completedBy} من ${stats.length}`,
            color: row.startedBy === 0 ? chart.status.idle : chart.series[1],
          }))}
        />
      </Panel>

      <Panel
        title="أصعب الكلمات على الصف"
        subtitle="مرتّبة بمجموع المحاولات الخاطئة، مع نسبة الخطأ وعدد الطلاب المتعثّرين.">
        <BarList
          color={chart.series[0]}
          data={hardest.map((word) => ({
            key: word.wordId,
            label: word.en,
            value: word.wrong,
            valueLabel: `${word.wrong} خطأ`,
            sub: `${word.ar} · ${word.lessonTitle} · ${word.strugglingStudents} طالب · خطأ ${word.errorRate}%`,
          }))}
          emptyLabel="لا توجد أخطاء مسجّلة في أكواد الطلاب حتى الآن."
        />
      </Panel>

      {untouched.length > 0 && (
        <Panel title="دروس لم يبدأها أي طالب" subtitle="قد تحتاج إلى تقديمها في الحصّة أو تعيينها كواجب.">
          <ArabicText style={styles.untouched}>
            {untouched.map((row) => `${row.lesson.emoji} ${row.lesson.title}`).join('  ·  ')}
          </ArabicText>
        </Panel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  untouched: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 24,
  },
});
