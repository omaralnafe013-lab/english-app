import React, { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Banner, BannerTone, CodeBox, Sheet, TextField } from '../components/forms';
import { ArabicText, Button } from '../components/ui';
import { useCatalog } from '../lib/catalog';
import { useProgress } from '../lib/progress';
import { decodeShareCode, encodeProgressCode, prettyCode, StudentSnapshot } from '../lib/shareCode';
import { dayNumber } from '../lib/srs';
import { spacing } from '../theme';

/**
 * الجهة المقابلة لأكواد لوحة المعلم من طرف الطالب:
 * توليد كود تقدّمه، واستيراد الدروس التي يرسلها المعلم.
 */

export function ShareProgressSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { progress, setStudentName } = useProgress();
  const [name, setName] = useState(progress.studentName);

  const trimmed = name.trim();

  const code = useMemo(() => {
    if (!trimmed) return '';

    const snapshot: StudentSnapshot = {
      v: 1,
      name: trimmed,
      at: Date.now(),
      day: dayNumber(),
      xp: progress.xp,
      streak: progress.streak.count,
      best: progress.streak.best,
      goal: progress.dailyGoal,
      todayReviews: progress.today.reviews,
      completedLessons: progress.completedLessons,
      quiz: progress.quiz,
      words: progress.words,
    };

    return encodeProgressCode(snapshot);
  }, [trimmed, progress]);

  const close = () => {
    // نحفظ الاسم حتى لا يعيد الطالب كتابته في كل مشاركة
    if (trimmed && trimmed !== progress.studentName) setStudentName(trimmed);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      title="مشاركة تقدّمي مع المعلم"
      onClose={close}
      footer={<Button label="تم" onPress={close} style={{ flex: 1 }} />}>
      <ArabicText style={{ fontSize: 13, lineHeight: 22, marginBottom: spacing.lg, opacity: 0.75 }}>
        اكتب اسمك، ثم انسخ الكود وأرسله لمعلّمك. الكود يحمل تقدّمك فقط — الكلمات التي تعلّمتها
        ونتائج اختباراتك — ولا يحتوي أي بيانات شخصية أخرى.
      </ArabicText>

      <TextField
        label="اسمك كما يعرفه المعلم"
        value={name}
        onChangeText={setName}
        placeholder="مثال: عمر النافع"
        autoFocus
      />

      {code ? (
        <>
          <ArabicText style={{ fontSize: 13, marginBottom: spacing.sm, opacity: 0.7 }}>
            كود تقدّمك
          </ArabicText>
          <CodeBox code={prettyCode(code)} />
          <ArabicText style={{ fontSize: 12, lineHeight: 20, marginTop: spacing.sm, opacity: 0.55 }}>
            حدّد النص كاملاً وانسخه، ثم أرسله لمعلّمك في أي تطبيق مراسلة. كلما أرسلت كوداً جديداً
            تحدّثت بياناتك عنده.
          </ArabicText>
        </>
      ) : (
        <Banner tone="info" message="اكتب اسمك ليظهر الكود." />
      )}

      <View style={{ height: spacing.md }} />
    </Sheet>
  );
}

export function ImportLessonsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { mergeLessonPack } = useCatalog();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ tone: BannerTone; message: string } | null>(null);

  const close = () => {
    setCode('');
    setResult(null);
    onClose();
  };

  const handleImport = () => {
    const decoded = decodeShareCode(code);

    if (!decoded.ok) {
      setResult({ tone: 'error', message: decoded.error });
      return;
    }

    if (decoded.kind !== 'lessons') {
      setResult({ tone: 'error', message: 'هذا كود تقدّم طالب، وليس حزمة دروس من المعلم.' });
      return;
    }

    const { added, updated } = mergeLessonPack(decoded.pack.lessons);
    setResult({
      tone: added + updated > 0 ? 'success' : 'info',
      message:
        added + updated > 0
          ? `تمت إضافة ${added} درساً وتحديث ${updated} درساً. ستجدها في تبويب «الدروس».`
          : 'كل دروس هذه الحزمة موجودة عندك مسبقاً.',
    });
    setCode('');
  };

  return (
    <Sheet
      visible={visible}
      title="استيراد دروس من المعلم"
      onClose={close}
      footer={
        <>
          <Button label="استيراد" icon="⬇️" onPress={handleImport} style={{ flex: 1 }} />
          <Button label="إغلاق" variant="ghost" onPress={close} style={{ flex: 1 }} />
        </>
      }>
      <ArabicText style={{ fontSize: 13, lineHeight: 22, marginBottom: spacing.lg, opacity: 0.75 }}>
        إذا أرسل لك معلّمك كود حزمة دروس، الصقه هنا لتُضاف دروسه إلى تطبيقك مع بقية الدروس.
      </ArabicText>

      {!!result && <Banner tone={result.tone} message={result.message} />}

      <TextField
        label="كود الحزمة"
        value={code}
        onChangeText={setCode}
        placeholder="TLM1.L…"
        multiline
        latin
        autoFocus
      />

      <View style={{ height: spacing.sm }} />
    </Sheet>
  );
}
