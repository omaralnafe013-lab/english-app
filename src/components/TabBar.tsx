import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { arabicText, colors, spacing } from '../theme';

export type TabKey = 'home' | 'lessons' | 'flashcards' | 'quiz' | 'progress';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'الرئيسية', icon: '🏠' },
  { key: 'lessons', label: 'الدروس', icon: '📚' },
  { key: 'flashcards', label: 'المراجعة', icon: '🎴' },
  { key: 'quiz', label: 'الاختبار', icon: '🎯' },
  { key: 'progress', label: 'تقدّمي', icon: '📊' },
];

export function TabBar({
  active,
  onChange,
  badge,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** عدد الكلمات المستحقّة للمراجعة، يظهر فوق تبويب المراجعة */
  badge?: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const showBadge = tab.key === 'flashcards' && !!badge && badge > 0;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}>
            <View>
              <Text style={[styles.icon, !isActive && styles.iconInactive]}>{tab.icon}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 22,
  },
  iconInactive: {
    opacity: 0.45,
  },
  label: {
    ...arabicText,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1B1200',
  },
});
