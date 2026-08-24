import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../../components/ui';
import { computeStudentStats } from '../../lib/analytics';
import { useCatalog } from '../../lib/catalog';
import { useTeacher } from '../../lib/teacher';
import { arabicText, colors, fonts, radius, spacing } from '../../theme';
import { AssignmentsSection } from './AssignmentsSection';
import { CurriculumSection } from './CurriculumSection';
import { ImportCodeSheet } from './ImportCodeSheet';
import { LessonsSection } from './LessonsSection';
import { OverviewSection } from './OverviewSection';
import { LockGate, SettingsSection } from './SettingsSection';
import { StudentsSection } from './StudentsSection';

/** عرض الشاشة الذي تتحوّل عنده القائمة من شريط علوي إلى عمود جانبي. */
const WIDE_BREAKPOINT = 900;

type SectionKey = 'overview' | 'students' | 'assignments' | 'curriculum' | 'lessons' | 'settings';

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'نظرة عامة', icon: '📊' },
  { key: 'students', label: 'الطلاب', icon: '👥' },
  { key: 'assignments', label: 'الواجبات', icon: '🗂️' },
  { key: 'curriculum', label: 'تحليل المنهج', icon: '🔍' },
  { key: 'lessons', label: 'الدروس', icon: '✏️' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export function TeacherDashboard({ onExit }: { onExit: () => void }) {
  const catalog = useCatalog();
  const { students, assignments, settings } = useTeacher();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const wide = width >= WIDE_BREAKPOINT;

  const [section, setSection] = useState<SectionKey>('overview');
  const [importOpen, setImportOpen] = useState(false);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const stats = useMemo(
    () => students.map((student) => computeStudentStats(student, catalog)),
    [students, catalog]
  );

  const openStudent = (studentId: string) => {
    setSection('students');
    setOpenStudentId(studentId);
  };

  if (settings.lockEnabled && settings.pin && !unlocked) {
    return <LockGate pin={settings.pin} onUnlock={() => setUnlocked(true)} onExit={onExit} />;
  }

  const nav = (
    <View style={wide ? styles.sidebarNav : styles.topNav}>
      {SECTIONS.map((item) => {
        const active = item.key === section;
        return (
          <Pressable
            key={item.key}
            onPress={() => setSection(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              wide ? styles.sidebarItem : styles.topItem,
              active && (wide ? styles.sidebarItemActive : styles.topItemActive),
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.navIcon, !active && styles.navIconInactive]}>{item.icon}</Text>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const body = (
    <>
      {section === 'overview' && (
        <OverviewSection
          stats={stats}
          catalog={catalog}
          assignments={assignments}
          onOpenStudent={openStudent}
          onGoToStudents={() => setSection('students')}
          onGoToAssignments={() => setSection('assignments')}
        />
      )}
      {section === 'students' && (
        <StudentsSection
          stats={stats}
          catalog={catalog}
          openStudentId={openStudentId}
          onOpenStudent={setOpenStudentId}
          onImportCode={() => setImportOpen(true)}
        />
      )}
      {section === 'assignments' && (
        <AssignmentsSection stats={stats} catalog={catalog} assignments={assignments} />
      )}
      {section === 'curriculum' && <CurriculumSection stats={stats} catalog={catalog} />}
      {section === 'lessons' && <LessonsSection catalog={catalog} />}
      {section === 'settings' && <SettingsSection onExit={onExit} />}
    </>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <HeaderButton label="استيراد كود" icon="⬇️" primary onPress={() => setImportOpen(true)} />
          <HeaderButton label="خروج" icon="↩️" onPress={onExit} />
        </View>

        <View style={styles.headerTitles}>
          <ArabicText style={styles.headerTitle} numberOfLines={1}>
            {settings.className || 'لوحة المعلم'}
          </ArabicText>
          <ArabicText style={styles.headerSubtitle} numberOfLines={1}>
            {settings.teacherName ? `${settings.teacherName} · ` : ''}
            {students.length} طالب · {catalog.lessons.length} درس
          </ArabicText>
        </View>
      </View>

      {!wide && nav}

      <View style={[styles.body, wide && styles.bodyWide]}>
        {wide && <View style={styles.sidebar}>{nav}</View>}

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentInner,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.contentColumn}>{body}</View>
        </ScrollView>
      </View>

      <ImportCodeSheet visible={importOpen} onClose={() => setImportOpen(false)} />
    </View>
  );
}

function HeaderButton({
  label,
  icon,
  onPress,
  primary,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.headerButton,
        primary && styles.headerButtonPrimary,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.headerButtonLabel, primary && styles.headerButtonLabelPrimary]}>
        {icon}  {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  headerTitles: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  headerButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headerButtonLabel: {
    ...arabicText,
    fontSize: 12,
    color: colors.textMuted,
  },
  headerButtonLabelPrimary: {
    color: colors.white,
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    flexDirection: 'row-reverse',
  },
  sidebar: {
    width: 220,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingVertical: spacing.lg,
  },
  sidebarNav: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sidebarItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  sidebarItemActive: {
    backgroundColor: colors.card,
  },
  topNav: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  topItemActive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  navIcon: {
    fontSize: 15,
  },
  navIconInactive: {
    opacity: 0.5,
  },
  navLabel: {
    ...arabicText,
    fontFamily: fonts.light,
    fontSize: 13,
    color: colors.textFaint,
  },
  navLabelActive: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // على الشاشات العريضة يبقى العمود في المنتصف بدل التمدّد عبر الشاشة
    alignItems: 'center',
  },
  contentColumn: {
    width: '100%',
    maxWidth: 900,
  },
  pressed: {
    opacity: 0.7,
  },
});
