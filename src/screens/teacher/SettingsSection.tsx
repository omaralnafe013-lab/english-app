import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, ConfirmDialog, TextField } from '../../components/forms';
import { ArabicText, Button } from '../../components/ui';
import { useCatalog } from '../../lib/catalog';
import { useTeacher } from '../../lib/teacher';
import { colors, spacing } from '../../theme';
import { DetailRow, Panel } from './parts';

export function SettingsSection({ onExit }: { onExit: () => void }) {
  const { settings, students, assignments, updateSettings, resetTeacherData } = useTeacher();
  const { customLessons, clearCustomLessons } = useCatalog();

  const [pinDraft, setPinDraft] = useState(settings.pin);
  const [pinMessage, setPinMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLessons, setConfirmLessons] = useState(false);

  const savePin = () => {
    const digits = pinDraft.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0 && digits.length < 4) {
      setPinMessage('الرمز يجب أن يكون من ٤ إلى ٦ أرقام.');
      return;
    }

    updateSettings({ pin: digits, lockEnabled: digits.length >= 4 });
    setPinDraft(digits);
    setPinMessage(digits ? 'تم تفعيل القفل.' : 'تم إلغاء القفل.');
  };

  return (
    <View>
      <Panel title="هوية الصف" subtitle="تظهر في أعلى اللوحة.">
        <TextField
          label="اسم المعلم"
          value={settings.teacherName}
          onChangeText={(teacherName) => updateSettings({ teacherName })}
          placeholder="مثال: أ. عمر"
        />
        <TextField
          label="اسم الصف"
          value={settings.className}
          onChangeText={(className) => updateSettings({ className })}
          placeholder="مثال: أول ثانوي — إنجليزي"
        />
      </Panel>

      <Panel
        title="قفل اللوحة"
        subtitle="رمز بسيط يمنع فتح اللوحة بالخطأ من جهاز مشترك. ليس حماية حقيقية — البيانات مخزّنة على الجهاز بلا تشفير.">
        {!!pinMessage && <Banner tone="info" message={pinMessage} />}
        <TextField
          label="رمز الدخول (٤ إلى ٦ أرقام)"
          value={pinDraft}
          onChangeText={setPinDraft}
          numeric
          latin
          placeholder="اتركه فارغاً لإلغاء القفل"
        />
        <Button label="حفظ الرمز" onPress={savePin} />
      </Panel>

      <Panel title="بياناتك" subtitle="كل شيء محفوظ على هذا الجهاز فقط، ولا يُرسل إلى أي خادم.">
        <DetailRow label="عدد الطلاب" value={students.length} />
        <DetailRow label="عدد الواجبات" value={assignments.length} />
        <DetailRow label="الدروس التي أضفتها" value={customLessons.length} />
        <ArabicText style={styles.note}>
          مسح بيانات المتصفّح أو حذف التطبيق يمسح اللوحة أيضاً. احتفظ بأكواد الطلاب المهمّة عندك.
        </ArabicText>
      </Panel>

      <Panel title="إجراءات" subtitle="لا يمكن التراجع عن أيٍّ منها.">
        <View style={styles.actions}>
          <Button label="الخروج من لوحة المعلم" icon="↩️" variant="ghost" onPress={onExit} />
          <Button label="حذف الدروس التي أضفتها" variant="ghost" onPress={() => setConfirmLessons(true)} />
          <Button label="حذف كل بيانات اللوحة" variant="danger" onPress={() => setConfirmReset(true)} />
        </View>
      </Panel>

      <ConfirmDialog
        visible={confirmLessons}
        title="حذف الدروس المضافة"
        message="ستُحذف كل الدروس التي أنشأتها. دروس المنهج الأساسي تبقى كما هي."
        confirmLabel="حذف"
        destructive
        onCancel={() => setConfirmLessons(false)}
        onConfirm={() => {
          clearCustomLessons();
          setConfirmLessons(false);
        }}
      />

      <ConfirmDialog
        visible={confirmReset}
        title="حذف كل بيانات اللوحة"
        message="سيُحذف كل الطلاب وتاريخهم وكل الواجبات والإعدادات. لا يمكن التراجع."
        confirmLabel="حذف الكل"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetTeacherData();
          setConfirmReset(false);
        }}
      />
    </View>
  );
}

/** شاشة طلب الرمز قبل فتح اللوحة. */
export function LockGate({ pin, onUnlock, onExit }: { pin: string; onUnlock: () => void; onExit: () => void }) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (entry === pin) {
      onUnlock();
      return;
    }
    setError('الرمز غير صحيح.');
    setEntry('');
  };

  return (
    <View style={styles.lockWrap}>
      <View style={styles.lockCard}>
        <ArabicText style={styles.lockTitle}>🔒  لوحة المعلم</ArabicText>
        <ArabicText style={styles.lockSub}>أدخل رمز الدخول لعرض بيانات الصف.</ArabicText>

        {!!error && <Banner tone="error" message={error} />}

        <TextField label="الرمز" value={entry} onChangeText={setEntry} numeric latin autoFocus />

        <Button label="دخول" onPress={submit} />
        <View style={{ height: spacing.sm }} />
        <Button label="رجوع إلى التطبيق" variant="ghost" onPress={onExit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 12,
    color: colors.textFaint,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  lockWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg,
  },
  lockCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  lockTitle: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  lockSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    lineHeight: 21,
  },
});
