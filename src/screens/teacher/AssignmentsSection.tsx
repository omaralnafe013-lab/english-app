import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarList, MiniBar, StatTile } from '../../components/charts';
import { Banner, ChipGroup, ConfirmDialog, Sheet, TextField } from '../../components/forms';
import { ArabicText, Button } from '../../components/ui';
import { assignmentProgress, StudentStats } from '../../lib/analytics';
import { Catalog } from '../../lib/catalog';
import { dayNumber } from '../../lib/srs';
import { Assignment, useTeacher } from '../../lib/teacher';
import { chart, colors, fonts, spacing } from '../../theme';
import { MiniButton, Panel, PanelEmpty } from './parts';

const DUE_CHOICES = ['3', '7', '14', '30'];
const TARGET_CHOICES = ['50', '70', '85', '100'];

type Draft = {
  title: string;
  lessonIds: string[];
  dueInDays: string;
  targetMastery: string;
  everyone: boolean;
  studentIds: string[];
};

function emptyDraft(): Draft {
  return { title: '', lessonIds: [], dueInDays: '7', targetMastery: '70', everyone: true, studentIds: [] };
}

export function AssignmentsSection({
  stats,
  catalog,
  assignments,
}: {
  stats: StudentStats[];
  catalog: Catalog;
  assignments: Assignment[];
}) {
  const { addAssignment, updateAssignment, removeAssignment } = useTeacher();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      assignments
        .map((assignment) => assignmentProgress(assignment, stats, catalog))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [assignments, stats, catalog]
  );

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setError('');
    setEditorOpen(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setDraft({
      title: assignment.title,
      lessonIds: assignment.lessonIds,
      dueInDays: String(Math.max(0, assignment.dueDay - dayNumber())),
      targetMastery: String(assignment.targetMastery),
      everyone: assignment.assignedTo === 'all',
      studentIds: assignment.assignedTo === 'all' ? [] : assignment.assignedTo,
    });
    setError('');
    setEditorOpen(true);
  };

  const save = () => {
    if (!draft.title.trim()) {
      setError('اكتب عنواناً للواجب.');
      return;
    }
    if (draft.lessonIds.length === 0) {
      setError('اختر درساً واحداً على الأقل.');
      return;
    }
    if (!draft.everyone && draft.studentIds.length === 0) {
      setError('اختر الطلاب المشمولين، أو فعّل «كل الصف».');
      return;
    }

    const days = Number(draft.dueInDays);
    const payload = {
      title: draft.title.trim(),
      lessonIds: draft.lessonIds,
      dueDay: dayNumber() + (Number.isFinite(days) ? days : 7),
      targetMastery: Math.min(100, Math.max(1, Number(draft.targetMastery) || 70)),
      assignedTo: draft.everyone ? ('all' as const) : draft.studentIds,
    };

    if (editingId) {
      updateAssignment(editingId, payload);
    } else {
      addAssignment(payload);
    }

    setEditorOpen(false);
  };

  const toggleLesson = (lessonId: string) =>
    setDraft((prev) => ({
      ...prev,
      lessonIds: prev.lessonIds.includes(lessonId)
        ? prev.lessonIds.filter((id) => id !== lessonId)
        : [...prev.lessonIds, lessonId],
    }));

  const toggleStudent = (studentId: string) =>
    setDraft((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }));

  const wordCount = draft.lessonIds.reduce(
    (sum, lessonId) => sum + (catalog.getLesson(lessonId)?.words.length ?? 0),
    0
  );

  return (
    <View>
      <Button label="واجب جديد" icon="➕" onPress={openCreate} style={{ marginBottom: spacing.md }} />

      {rows.length === 0 ? (
        <Panel title="لا توجد واجبات بعد">
          <PanelEmpty
            emoji="🗂️"
            text={
              'الواجب يربط مجموعة دروس بموعد تسليم ونسبة إتقان مطلوبة، ثم تتابع هنا من بلغها ' +
              'ومن تأخّر — تُحتسب من آخر كود وصلك من كل طالب.'
            }
          />
        </Panel>
      ) : (
        rows.map((row) => {
          const isOpen = expanded === row.assignment.id;
          const lessonTitles = row.assignment.lessonIds
            .map((id) => catalog.getLesson(id)?.title)
            .filter(Boolean)
            .join(' · ');

          return (
            <Panel
              key={row.assignment.id}
              title={row.assignment.title}
              subtitle={lessonTitles || 'دروس محذوفة'}
              action={<MiniButton label="تعديل" onPress={() => openEdit(row.assignment)} />}>
              <View style={styles.tiles}>
                <StatTile
                  label="أنجزوا الواجب"
                  value={`${row.done}/${row.assigned.length}`}
                  accent={row.done === row.assigned.length && row.assigned.length > 0 ? chart.status.good : chart.series[1]}
                  emphasis
                />
                <StatTile label="متوسّط الإنجاز" value={`${row.avgProgressPct}%`} accent={chart.series[2]} />
                <StatTile
                  label={row.overdue ? 'تأخّر' : 'المتبقّي'}
                  value={row.overdue ? `${Math.abs(row.daysLeft)} يوم` : `${row.daysLeft} يوم`}
                  accent={row.overdue ? chart.status.critical : chart.status.warning}
                />
                <StatTile label="نسبة الإتقان المطلوبة" value={`${row.assignment.targetMastery}%`} accent={chart.series[3]} />
              </View>

              <View style={styles.progressRow}>
                <Text style={styles.progressValue}>{row.avgProgressPct}%</Text>
                <MiniBar
                  value={row.avgProgressPct / 100}
                  color={row.overdue ? chart.status.critical : chart.series[1]}
                  style={{ flex: 1 }}
                />
              </View>

              <View style={styles.actions}>
                <MiniButton
                  label={isOpen ? 'إخفاء التفاصيل' : `عرض الطلاب (${row.assigned.length})`}
                  onPress={() => setExpanded(isOpen ? null : row.assignment.id)}
                />
                <MiniButton label="حذف" tone="danger" onPress={() => setConfirmId(row.assignment.id)} />
              </View>

              {isOpen && (
                <View style={styles.breakdown}>
                  <BarList
                    max={100}
                    data={row.perStudent.map((entry) => ({
                      key: entry.stats.student.id,
                      label: entry.stats.student.name,
                      value: entry.progressPct,
                      valueLabel: `${entry.progressPct}%`,
                      sub: entry.done ? 'بلغ النسبة المطلوبة ✓' : 'ما زال دون النسبة المطلوبة',
                      color: entry.done ? chart.status.good : chart.series[1],
                    }))}
                    emptyLabel="لا يوجد طلاب مشمولون بهذا الواجب."
                  />
                </View>
              )}
            </Panel>
          );
        })
      )}

      <Sheet
        visible={editorOpen}
        title={editingId ? 'تعديل الواجب' : 'واجب جديد'}
        onClose={() => setEditorOpen(false)}
        footer={
          <>
            <Button label="حفظ" onPress={save} style={{ flex: 1 }} />
            <Button label="إلغاء" variant="ghost" onPress={() => setEditorOpen(false)} style={{ flex: 1 }} />
          </>
        }>
        {!!error && <Banner tone="error" message={error} />}

        <TextField
          label="عنوان الواجب"
          value={draft.title}
          onChangeText={(title) => setDraft({ ...draft, title })}
          placeholder="مثال: مراجعة التحيات والأرقام"
        />

        <ChipGroup
          label={`الدروس المطلوبة (${draft.lessonIds.length} درس · ${wordCount} كلمة)`}
          options={catalog.lessons.map((lesson) => ({
            value: lesson.id,
            label: `${lesson.emoji} ${lesson.title}`,
          }))}
          selected={draft.lessonIds}
          onSelect={toggleLesson}
          multi
        />

        <ChipGroup
          label="موعد التسليم (بعد كم يوم)"
          options={DUE_CHOICES.map((value) => ({ value, label: `${value} أيام` }))}
          selected={draft.dueInDays}
          onSelect={(dueInDays) => setDraft({ ...draft, dueInDays })}
        />

        <ChipGroup
          label="نسبة الإتقان المطلوبة"
          options={TARGET_CHOICES.map((value) => ({ value, label: `${value}%` }))}
          selected={draft.targetMastery}
          onSelect={(targetMastery) => setDraft({ ...draft, targetMastery })}
        />

        <ChipGroup
          label="المشمولون"
          options={[
            { value: 'all', label: 'كل الصف' },
            { value: 'some', label: 'طلاب محدّدون' },
          ]}
          selected={draft.everyone ? 'all' : 'some'}
          onSelect={(value) => setDraft({ ...draft, everyone: value === 'all' })}
        />

        {!draft.everyone && (
          <ChipGroup
            label="اختر الطلاب"
            options={stats.map((item) => ({ value: item.student.id, label: item.student.name }))}
            selected={draft.studentIds}
            onSelect={toggleStudent}
            multi
          />
        )}

        <ArabicText style={styles.editorHint}>
          يُحتسب الإنجاز من كلمات دروس الواجب التي بلغت المرحلة الأخيرة عند الطالب، بحسب آخر كود استوردته منه.
        </ArabicText>
      </Sheet>

      <ConfirmDialog
        visible={confirmId !== null}
        title="حذف الواجب"
        message="سيُحذف الواجب ومتابعته من اللوحة. لا يتأثّر تقدّم الطلاب."
        confirmLabel="حذف"
        destructive
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) removeAssignment(confirmId);
          setConfirmId(null);
        }}
      />
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
  progressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressValue: {
    fontFamily: fonts.light,
    fontSize: 13,
    color: colors.textMuted,
    width: 42,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  breakdown: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editorHint: {
    fontSize: 12,
    color: colors.textFaint,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
});
