import React, { useState } from 'react';
import { View } from 'react-native';

import { Banner, BannerTone, ChipGroup, Sheet, TextField } from '../../components/forms';
import { ArabicText, Button } from '../../components/ui';
import { useCatalog } from '../../lib/catalog';
import { decodeShareCode } from '../../lib/shareCode';
import { useTeacher } from '../../lib/teacher';
import { spacing } from '../../theme';

/**
 * لصق كود قادم من طالب.
 *
 * الكود قد يكون لقطة تقدّم فتُضاف للطالب، أو حزمة دروس فتُدمج في المنهج —
 * نقرأ نوعه من الكود نفسه بدل مطالبة المعلم باختيار النوع.
 */
export function ImportCodeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { importSnapshot, students } = useTeacher();
  const { mergeLessonPack } = useCatalog();

  const [code, setCode] = useState('');
  const [group, setGroup] = useState('');
  // عند تعذّر مطابقة الاسم يختار المعلم الطالب يدوياً
  const [targetId, setTargetId] = useState<string>('auto');
  const [result, setResult] = useState<{ tone: BannerTone; message: string } | null>(null);

  const reset = () => {
    setCode('');
    setGroup('');
    setTargetId('auto');
    setResult(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleImport = () => {
    const decoded = decodeShareCode(code);

    if (!decoded.ok) {
      setResult({ tone: 'error', message: decoded.error });
      return;
    }

    if (decoded.kind === 'lessons') {
      const { added, updated } = mergeLessonPack(decoded.pack.lessons);
      setResult({
        tone: added + updated > 0 ? 'success' : 'info',
        message:
          added + updated > 0
            ? `تمت إضافة ${added} درساً وتحديث ${updated} درساً في المنهج.`
            : 'كل الدروس في هذه الحزمة موجودة مسبقاً بنفس المعرّفات.',
      });
      setCode('');
      return;
    }

    const outcome = importSnapshot(decoded.snapshot, {
      studentId: targetId === 'auto' ? undefined : targetId,
      group: group.trim() || undefined,
    });

    if (!outcome.ok) {
      setResult({ tone: 'error', message: outcome.error });
      return;
    }

    setResult({
      tone: 'success',
      message: outcome.created
        ? `تمت إضافة ${outcome.student.name} إلى الصف.`
        : `تم تحديث تقدّم ${outcome.student.name}.`,
    });
    setCode('');
  };

  const studentOptions = [
    { value: 'auto', label: 'تعرَّف تلقائياً من الاسم' },
    ...students.map((student) => ({ value: student.id, label: student.name })),
  ];

  return (
    <Sheet
      visible={visible}
      title="استيراد كود"
      onClose={close}
      footer={
        <>
          <Button label="استيراد" icon="⬇️" onPress={handleImport} style={{ flex: 1 }} />
          <Button label="إغلاق" variant="ghost" onPress={close} style={{ flex: 1 }} />
        </>
      }>
      <ArabicText style={{ fontSize: 13, lineHeight: 22, marginBottom: spacing.lg, opacity: 0.75 }}>
        اطلب من الطالب فتح «تقدّمي ← مشاركة تقدّمي مع المعلم» ونسخ الكود وإرساله لك، ثم الصقه هنا.
        الأكواد تعمل بلا إنترنت، والبيانات تبقى على جهازك.
      </ArabicText>

      {!!result && <Banner tone={result.tone} message={result.message} />}

      <TextField
        label="كود المشاركة"
        value={code}
        onChangeText={setCode}
        placeholder="TLM1.P...."
        multiline
        latin
        autoFocus
        hint="يمكن لصق الكود بأسطره كما وصلك — المسافات والأسطر تُتجاهل."
      />

      {students.length > 0 && (
        <ChipGroup
          label="ربط الكود بطالب"
          options={studentOptions}
          selected={targetId}
          onSelect={setTargetId}
        />
      )}

      <TextField
        label="الشعبة (اختياري)"
        value={group}
        onChangeText={setGroup}
        placeholder="مثال: أول ب"
        hint="يساعد على تصفية اللوحة عند تدريس أكثر من صف."
      />

      <View style={{ height: spacing.sm }} />
    </Sheet>
  );
}
