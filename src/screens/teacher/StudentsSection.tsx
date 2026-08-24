import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarList, ColumnChart, MiniBar, StackedBar, StatTile } from '../../components/charts';
import { Banner, ChipGroup, ConfirmDialog, Sheet, TextField } from '../../components/forms';
import { ArabicText, Button } from '../../components/ui';
import { lastSeenLabel, StudentStats } from '../../lib/analytics';
import { Catalog } from '../../lib/catalog';
import { MAX_BOX } from '../../lib/srs';
import { useTeacher } from '../../lib/teacher';
import { arabicText, chart, colors, fonts, radius, spacing } from '../../theme';
import { DetailRow, MiniButton, Panel, PanelEmpty, StatusBadge } from './parts';

const STAGE_LABELS = ['المرحلة ١', 'المرحلة ٢', 'المرحلة ٣', 'المرحلة ٤', 'متقنة'];

type SortKey = 'mastery' | 'name' | 'attention' | 'recent';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'mastery', label: 'الأعلى إتقاناً' },
  { value: 'attention', label: 'الأحوج للمتابعة' },
  { value: 'recent', label: 'الأحدث تحديثاً' },
  { value: 'name', label: 'أبجدياً' },
];

export function StudentsSection({
  stats,
  catalog,
  openStudentId,
  onOpenStudent,
  onImportCode,
}: {
  stats: StudentStats[];
  catalog: Catalog;
  /** الطالب المطلوب فتح تفاصيله — يأتي من نقرة في قسم آخر */
  openStudentId: string | null;
  onOpenStudent: (studentId: string | null) => void;
  onImportCode: () => void;
}) {
  const { addStudent } = useTeacher();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('mastery');
  const [group, setGroup] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [addError, setAddError] = useState('');

  const groups = useMemo(() => {
    const found = new Set(stats.map((item) => item.student.group).filter(Boolean));
    return ['all', ...[...found].sort()];
  }, [stats]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = stats.filter((item) => {
      const matchesGroup = group === 'all' || item.student.group === group;
      const matchesQuery = !needle || item.student.name.toLowerCase().includes(needle);
      return matchesGroup && matchesQuery;
    });

    const order: Record<SortKey, (a: StudentStats, b: StudentStats) => number> = {
      mastery: (a, b) => b.masteryPct - a.masteryPct || b.xp - a.xp,
      name: (a, b) => a.student.name.localeCompare(b.student.name, 'ar'),
      // الأحوج للمتابعة أولاً، ثم الأطول انقطاعاً
      attention: (a, b) =>
        Number(b.needsAttention) - Number(a.needsAttention) ||
        (b.daysSinceUpdate ?? 999) - (a.daysSinceUpdate ?? 999),
      recent: (a, b) => b.student.snapshot.at - a.student.snapshot.at,
    };

    return [...filtered].sort(order[sort]);
  }, [stats, query, group, sort]);

  const selected = openStudentId ? stats.find((item) => item.student.id === openStudentId) ?? null : null;

  const handleAdd = () => {
    const created = addStudent(newName, newGroup);
    if (!created) {
      setAddError('اكتب اسم الطالب أولاً.');
      return;
    }
    setNewName('');
    setNewGroup('');
    setAddError('');
    setAddOpen(false);
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <Button label="استيراد كود" icon="⬇️" onPress={onImportCode} style={styles.toolbarButton} />
        <Button
          label="إضافة طالب"
          icon="➕"
          variant="ghost"
          onPress={() => setAddOpen(true)}
          style={styles.toolbarButton}
        />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث باسم الطالب…"
          placeholderTextColor={colors.textFaint}
          style={styles.search}
        />
      </View>

      {groups.length > 1 && (
        <ChipGroup
          label="الشعبة"
          options={groups.map((item) => ({ value: item, label: item === 'all' ? 'الكل' : item }))}
          selected={group}
          onSelect={setGroup}
        />
      )}

      <ChipGroup label="الترتيب" options={SORT_OPTIONS} selected={sort} onSelect={setSort} />

      {visible.length === 0 ? (
        <Panel title="لا يوجد طلاب مطابقون">
          <PanelEmpty
            emoji="🔍"
            text={
              stats.length === 0
                ? 'أضف طالباً يدوياً، أو الصق كود تقدّم وصلك من أحد الطلاب.'
                : 'جرّب مسح البحث أو اختيار شعبة أخرى.'
            }
          />
        </Panel>
      ) : (
        visible.map((item) => (
          <StudentCard key={item.student.id} stats={item} onPress={() => onOpenStudent(item.student.id)} />
        ))
      )}

      <StudentDetailSheet
        stats={selected}
        catalog={catalog}
        onClose={() => onOpenStudent(null)}
      />

      <Sheet
        visible={addOpen}
        title="إضافة طالب"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button label="إضافة" onPress={handleAdd} style={{ flex: 1 }} />
            <Button label="إلغاء" variant="ghost" onPress={() => setAddOpen(false)} style={{ flex: 1 }} />
          </>
        }>
        {!!addError && <Banner tone="error" message={addError} />}
        <TextField label="اسم الطالب" value={newName} onChangeText={setNewName} autoFocus />
        <TextField
          label="الشعبة (اختياري)"
          value={newGroup}
          onChangeText={setNewGroup}
          placeholder="مثال: أول ب"
        />
        <ArabicText style={styles.addHint}>
          سيظهر الطالب بحالة «بانتظار كود» حتى يرسل لك أول كود تقدّم.
        </ArabicText>
      </Sheet>
    </View>
  );
}

function StudentCard({ stats, onPress }: { stats: StudentStats; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${stats.student.name}، إتقان ${stats.masteryPct}%`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(stats.student.name)}</Text>
        </View>

        <View style={styles.cardInfo}>
          <ArabicText style={styles.cardName} numberOfLines={1}>
            {stats.student.name}
          </ArabicText>
          <ArabicText style={styles.cardMeta} numberOfLines={1}>
            {stats.student.group ? `${stats.student.group} · ` : ''}
            {lastSeenLabel(stats.daysSinceUpdate)}
          </ArabicText>
        </View>

        <StatusBadge status={stats.status} />
      </View>

      <View style={styles.cardBar}>
        <Text style={styles.cardPct}>{stats.masteryPct}%</Text>
        <MiniBar value={stats.masteryPct / 100} style={{ flex: 1 }} />
      </View>

      <View style={styles.cardStats}>
        <CardStat value={stats.mastered} label="متقنة" />
        <CardStat value={stats.started} label="قيد التعلّم" />
        <CardStat value={stats.due} label="مستحقّة" />
        <CardStat value={stats.accuracy > 0 ? `${stats.accuracy}%` : '—'} label="الدقّة" />
        <CardStat value={stats.xp} label="نقطة" />
      </View>

      {stats.needsAttention && (
        <ArabicText style={styles.cardWarning}>⚠️  {stats.attentionReason}</ArabicText>
      )}
    </Pressable>
  );
}

function CardStat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.cardStat}>
      <Text style={styles.cardStatValue}>{value}</Text>
      <ArabicText style={styles.cardStatLabel}>{label}</ArabicText>
    </View>
  );
}

function StudentDetailSheet({
  stats,
  catalog,
  onClose,
}: {
  stats: StudentStats | null;
  catalog: Catalog;
  onClose: () => void;
}) {
  const { updateStudent, removeStudent } = useTeacher();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', group: '', note: '' });

  // الدروس الأضعف عند هذا الطالب — يقودان الحصّة القادمة معه
  const weakestLessons = useMemo(() => {
    if (!stats) return [];
    const words = stats.student.snapshot.words;

    return catalog.lessons
      .map((lesson) => {
        const touched = lesson.words.filter((word) => words[word.id]).length;
        const mastered = lesson.words.filter((word) => (words[word.id]?.box ?? 0) >= MAX_BOX).length;
        return { lesson, touched, mastered, pct: Math.round((mastered / lesson.words.length) * 100) };
      })
      .filter((row) => row.touched > 0)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 6);
  }, [stats, catalog]);

  if (!stats) return null;

  const { student } = stats;

  const startEditing = () => {
    setDraft({ name: student.name, group: student.group, note: student.note });
    setEditing(true);
  };

  const saveEditing = () => {
    if (draft.name.trim()) {
      updateStudent(student.id, {
        name: draft.name.trim(),
        group: draft.group.trim(),
        note: draft.note,
      });
    }
    setEditing(false);
  };

  const history = student.history.slice(-14).map((point) => ({
    key: String(point.at),
    label: new Date(point.at).getDate() + '/' + (new Date(point.at).getMonth() + 1),
    value: point.xp,
  }));

  return (
    <>
      <Sheet
        visible
        title={student.name}
        onClose={onClose}
        footer={
          <>
            {editing ? (
              <Button label="حفظ" onPress={saveEditing} style={{ flex: 1 }} />
            ) : (
              <Button label="تعديل البيانات" variant="ghost" onPress={startEditing} style={{ flex: 1 }} />
            )}
            <Button
              label="حذف"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
              style={{ flex: 1 }}
            />
          </>
        }>
        {editing ? (
          <>
            <TextField label="الاسم" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
            <TextField
              label="الشعبة"
              value={draft.group}
              onChangeText={(group) => setDraft({ ...draft, group })}
            />
            <TextField
              label="ملاحظات"
              value={draft.note}
              onChangeText={(note) => setDraft({ ...draft, note })}
              multiline
              hint="ملاحظاتك الخاصة عن الطالب — تبقى على جهازك."
            />
          </>
        ) : (
          <>
            <View style={styles.detailBadgeRow}>
              <StatusBadge status={stats.status} />
              <ArabicText style={styles.detailLastSeen}>
                آخر تحديث: {lastSeenLabel(stats.daysSinceUpdate)}
              </ArabicText>
            </View>

            <View style={styles.detailTiles}>
              <StatTile label="إتقان المنهج" value={`${stats.masteryPct}%`} accent={chart.series[1]} emphasis />
              <StatTile label="كلمة متقنة" value={stats.mastered} accent={chart.series[2]} />
              <StatTile label="مستحقّة للمراجعة" value={stats.due} accent={chart.series[0]} />
              <StatTile
                label="دقّة الاختبارات"
                value={stats.accuracy > 0 ? `${stats.accuracy}%` : '—'}
                accent={chart.series[3]}
              />
            </View>

            {!!student.note && (
              <View style={styles.noteBox}>
                <ArabicText style={styles.noteText}>{student.note}</ArabicText>
              </View>
            )}

            <ArabicText style={styles.detailHeading}>مراحل الحفظ</ArabicText>
            <StackedBar
              segments={stats.boxCounts.map((count, index) => ({
                key: `stage-${index}`,
                label: STAGE_LABELS[index],
                value: count,
                color: chart.ramp[index],
              }))}
            />

            <ArabicText style={styles.detailHeading}>تطوّر النقاط</ArabicText>
            <ColumnChart data={history} emptyLabel="يحتاج تحديثين على الأقل ليظهر المنحنى." />

            <ArabicText style={styles.detailHeading}>الدروس الأضعف عنده</ArabicText>
            <BarList
              data={weakestLessons.map((row) => ({
                key: row.lesson.id,
                label: `${row.lesson.emoji} ${row.lesson.title}`,
                value: row.pct,
                valueLabel: `${row.pct}%`,
                sub: `أتقن ${row.mastered} من ${row.lesson.words.length} كلمة`,
              }))}
              max={100}
              color={chart.series[0]}
              emptyLabel="لم يبدأ أي درس بعد."
            />

            <ArabicText style={styles.detailHeading}>أرقام أخرى</ArabicText>
            <DetailRow label="مجموع النقاط" value={stats.xp} />
            <DetailRow label="سلسلة الأيام الحالية" value={student.snapshot.streak} />
            <DetailRow label="أطول سلسلة" value={student.snapshot.best} />
            <DetailRow label="دروس مكتملة" value={stats.completedLessons} />
            <DetailRow label="اختبارات أُنجزت" value={student.snapshot.quiz.taken} />
            <DetailRow
              label="إجابات صحيحة"
              value={`${student.snapshot.quiz.correct} / ${student.snapshot.quiz.answered}`}
            />
            <DetailRow label="هدفه اليومي" value={`${student.snapshot.goal} مراجعة`} />
          </>
        )}
      </Sheet>

      <ConfirmDialog
        visible={confirmDelete}
        title="حذف الطالب"
        message={`سيُحذف ${student.name} وكل تاريخه من اللوحة. لا يمكن التراجع.`}
        confirmLabel="حذف"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          removeStudent(student.id);
          onClose();
        }}
      />
    </>
  );
}

/** أول حرفين من الاسم — بديل خفيف عن الصور الشخصية. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toolbarButton: {
    flex: 1,
  },
  searchWrap: {
    marginBottom: spacing.md,
  },
  search: {
    ...arabicText,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.light,
    fontSize: 15,
    color: colors.text,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 1,
  },
  cardBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardPct: {
    fontFamily: fonts.light,
    fontSize: 13,
    color: colors.textMuted,
    width: 42,
    textAlign: 'right',
  },
  cardStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  cardStat: {
    alignItems: 'center',
    flex: 1,
  },
  cardStatValue: {
    fontFamily: fonts.light,
    fontSize: 15,
    color: colors.text,
  },
  cardStatLabel: {
    ...arabicText,
    textAlign: 'center',
    fontSize: 10,
    color: colors.textFaint,
    marginTop: 1,
  },
  cardWarning: {
    fontSize: 12,
    color: chart.status.warning,
    lineHeight: 20,
  },
  addHint: {
    fontSize: 12,
    color: colors.textFaint,
    lineHeight: 20,
  },
  detailBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  detailLastSeen: {
    fontSize: 12,
    color: colors.textFaint,
  },
  detailTiles: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailHeading: {
    fontSize: 15,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  noteBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 21,
  },
});
