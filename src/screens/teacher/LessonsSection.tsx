import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatTile } from '../../components/charts';
import { Banner, ChipGroup, CodeBox, ConfirmDialog, Sheet, TextField } from '../../components/forms';
import { ArabicText, Button, EnglishText } from '../../components/ui';
import { Lesson, Level, LEVELS } from '../../data/lessons';
import { Catalog, CustomLesson, useCatalog } from '../../lib/catalog';
import { encodeLessonPack, prettyCode } from '../../lib/shareCode';
import { chart, colors, fonts, radius, spacing } from '../../theme';
import { MiniButton, Panel, PanelEmpty } from './parts';

type WordDraft = { id: string; en: string; ar: string; example: string; exampleAr: string };

type LessonDraft = {
  id: string;
  title: string;
  titleEn: string;
  emoji: string;
  level: Level;
  words: WordDraft[];
  grammarTitle: string;
  grammarBody: string;
};

function newWordDraft(lessonId: string): WordDraft {
  return {
    id: `${lessonId}-w${Math.random().toString(36).slice(2, 7)}`,
    en: '',
    ar: '',
    example: '',
    exampleAr: '',
  };
}

function emptyLessonDraft(): LessonDraft {
  const id = `custom-${Date.now().toString(36)}`;
  return {
    id,
    title: '',
    titleEn: '',
    emoji: '📘',
    level: 'beginner',
    words: [newWordDraft(id)],
    grammarTitle: '',
    grammarBody: '',
  };
}

function toDraft(lesson: CustomLesson): LessonDraft {
  return {
    id: lesson.id,
    title: lesson.title,
    titleEn: lesson.titleEn,
    emoji: lesson.emoji,
    level: lesson.level,
    words: lesson.words.map((word) => ({
      id: word.id,
      en: word.en,
      ar: word.ar,
      example: word.example,
      exampleAr: word.exampleAr,
    })),
    grammarTitle: lesson.grammar.title,
    grammarBody: lesson.grammar.body,
  };
}

function toLesson(draft: LessonDraft): Lesson {
  return {
    id: draft.id,
    title: draft.title.trim(),
    titleEn: draft.titleEn.trim(),
    emoji: draft.emoji.trim() || '📘',
    level: draft.level,
    words: draft.words
      .filter((word) => word.en.trim() && word.ar.trim())
      .map((word) => ({
        id: word.id,
        en: word.en.trim(),
        ar: word.ar.trim(),
        example: word.example.trim(),
        exampleAr: word.exampleAr.trim(),
      })),
    grammar: {
      title: draft.grammarTitle.trim(),
      body: draft.grammarBody.trim(),
      examples: [],
    },
  };
}

export function LessonsSection({ catalog }: { catalog: Catalog }) {
  const { customLessons, saveCustomLesson, deleteCustomLesson } = useCatalog();

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<LessonDraft>(emptyLessonDraft);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareIds, setShareIds] = useState<string[]>([]);

  const builtInCount = catalog.lessons.length - customLessons.length;
  const customWords = useMemo(
    () => customLessons.reduce((sum, lesson) => sum + lesson.words.length, 0),
    [customLessons]
  );

  const openCreate = () => {
    setDraft(emptyLessonDraft());
    setError('');
    setEditorOpen(true);
  };

  const openEdit = (lesson: CustomLesson) => {
    setDraft(toDraft(lesson));
    setError('');
    setEditorOpen(true);
  };

  const save = () => {
    const lesson = toLesson(draft);

    if (!lesson.title) {
      setError('اكتب عنوان الدرس.');
      return;
    }
    if (lesson.words.length === 0) {
      setError('أضف كلمة واحدة على الأقل، بالإنجليزية ومعناها بالعربية.');
      return;
    }

    saveCustomLesson(lesson);
    setEditorOpen(false);
  };

  const updateWord = (wordId: string, patch: Partial<WordDraft>) =>
    setDraft((prev) => ({
      ...prev,
      words: prev.words.map((word) => (word.id === wordId ? { ...word, ...patch } : word)),
    }));

  const removeWord = (wordId: string) =>
    setDraft((prev) => ({ ...prev, words: prev.words.filter((word) => word.id !== wordId) }));

  const addWord = () =>
    setDraft((prev) => ({ ...prev, words: [...prev.words, newWordDraft(prev.id)] }));

  const shareCode = useMemo(() => {
    const selected = customLessons.filter((lesson) => shareIds.includes(lesson.id));
    if (selected.length === 0) return '';

    // نجرّد الحقول الداخلية قبل التصدير حتى تصل للطالب كدرس عادي
    const lessons: Lesson[] = selected.map(({ custom, createdAt, ...lesson }) => lesson);
    return encodeLessonPack({ v: 1, by: '', at: Date.now(), lessons });
  }, [customLessons, shareIds]);

  const toggleShare = (lessonId: string) =>
    setShareIds((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );

  return (
    <View>
      <View style={styles.tiles}>
        <StatTile label="دروس المنهج الأساسي" value={builtInCount} accent={chart.series[1]} emphasis />
        <StatTile label="دروسك المضافة" value={customLessons.length} accent={chart.series[3]} />
        <StatTile label="كلمات أضفتها" value={customWords} accent={chart.series[2]} />
      </View>

      <View style={styles.toolbar}>
        <Button label="درس جديد" icon="➕" onPress={openCreate} style={{ flex: 1 }} />
        <Button
          label="تصدير حزمة دروس"
          icon="📤"
          variant="ghost"
          onPress={() => setShareOpen(true)}
          style={{ flex: 1 }}
        />
      </View>

      {customLessons.length === 0 ? (
        <Panel title="دروسك المضافة">
          <PanelEmpty
            emoji="✏️"
            text={
              'أنشئ درساً بكلماته وأمثلته، فيظهر فوراً في الدروس والمراجعة والاختبارات. ' +
              'ويمكنك تصديره كحزمة يلصقها طلابك في تطبيقهم.'
            }
          />
        </Panel>
      ) : (
        customLessons.map((lesson) => (
          <Panel
            key={lesson.id}
            title={`${lesson.emoji} ${lesson.title}`}
            subtitle={`${lesson.words.length} كلمة · ${levelLabel(lesson.level)}`}
            action={<MiniButton label="تعديل" tone="primary" onPress={() => openEdit(lesson)} />}>
            <View style={styles.wordChips}>
              {lesson.words.slice(0, 8).map((word) => (
                <View key={word.id} style={styles.wordChip}>
                  <EnglishText style={styles.wordChipEn}>{word.en}</EnglishText>
                  <ArabicText style={styles.wordChipAr}>{word.ar}</ArabicText>
                </View>
              ))}
              {lesson.words.length > 8 && (
                <ArabicText style={styles.moreWords}>+{lesson.words.length - 8} كلمة أخرى</ArabicText>
              )}
            </View>

            <View style={styles.lessonActions}>
              <MiniButton label="حذف الدرس" tone="danger" onPress={() => setConfirmId(lesson.id)} />
            </View>
          </Panel>
        ))
      )}

      {/* محرّر الدرس */}
      <Sheet
        visible={editorOpen}
        title={draft.title ? `تعديل: ${draft.title}` : 'درس جديد'}
        onClose={() => setEditorOpen(false)}
        footer={
          <>
            <Button label="حفظ الدرس" onPress={save} style={{ flex: 1 }} />
            <Button label="إلغاء" variant="ghost" onPress={() => setEditorOpen(false)} style={{ flex: 1 }} />
          </>
        }>
        {!!error && <Banner tone="error" message={error} />}

        <TextField
          label="عنوان الدرس بالعربية"
          value={draft.title}
          onChangeText={(title) => setDraft({ ...draft, title })}
          placeholder="مثال: في المطار"
        />
        <TextField
          label="العنوان بالإنجليزية (اختياري)"
          value={draft.titleEn}
          onChangeText={(titleEn) => setDraft({ ...draft, titleEn })}
          placeholder="At the airport"
          latin
        />
        <TextField
          label="رمز الدرس"
          value={draft.emoji}
          onChangeText={(emoji) => setDraft({ ...draft, emoji })}
          placeholder="✈️"
          hint="رمز تعبيري واحد يظهر بجانب اسم الدرس."
        />

        <ChipGroup
          label="المستوى"
          options={LEVELS.map((level) => ({ value: level.id, label: `${level.title} · ${level.subtitle}` }))}
          selected={draft.level}
          onSelect={(level) => setDraft({ ...draft, level })}
        />

        <ArabicText style={styles.editorHeading}>الكلمات ({draft.words.length})</ArabicText>

        {draft.words.map((word, index) => (
          <View key={word.id} style={styles.wordEditor}>
            <View style={styles.wordEditorHeader}>
              <ArabicText style={styles.wordEditorIndex}>الكلمة {index + 1}</ArabicText>
              {draft.words.length > 1 && (
                <Pressable onPress={() => removeWord(word.id)} hitSlop={8} accessibilityLabel="حذف الكلمة">
                  <Text style={styles.removeWord}>✕</Text>
                </Pressable>
              )}
            </View>

            <TextField
              label="الكلمة بالإنجليزية"
              value={word.en}
              onChangeText={(en) => updateWord(word.id, { en })}
              placeholder="Boarding pass"
              latin
            />
            <TextField
              label="المعنى بالعربية"
              value={word.ar}
              onChangeText={(ar) => updateWord(word.id, { ar })}
              placeholder="بطاقة صعود الطائرة"
            />
            <TextField
              label="جملة مثال (اختياري)"
              value={word.example}
              onChangeText={(example) => updateWord(word.id, { example })}
              placeholder="Show me your boarding pass."
              latin
            />
            <TextField
              label="ترجمة الجملة (اختياري)"
              value={word.exampleAr}
              onChangeText={(exampleAr) => updateWord(word.id, { exampleAr })}
              placeholder="أرني بطاقة صعودك."
            />
          </View>
        ))}

        <Button label="إضافة كلمة" icon="➕" variant="ghost" onPress={addWord} />

        <ArabicText style={styles.editorHeading}>القاعدة النحوية (اختياري)</ArabicText>
        <TextField
          label="عنوان القاعدة"
          value={draft.grammarTitle}
          onChangeText={(grammarTitle) => setDraft({ ...draft, grammarTitle })}
          placeholder="مثال: السؤال بـ Where"
        />
        <TextField
          label="شرح القاعدة"
          value={draft.grammarBody}
          onChangeText={(grammarBody) => setDraft({ ...draft, grammarBody })}
          multiline
        />
      </Sheet>

      {/* تصدير حزمة دروس */}
      <Sheet
        visible={shareOpen}
        title="تصدير حزمة دروس"
        onClose={() => setShareOpen(false)}
        footer={<Button label="إغلاق" variant="ghost" onPress={() => setShareOpen(false)} style={{ flex: 1 }} />}>
        <ArabicText style={styles.shareIntro}>
          اختر الدروس التي تريد إرسالها لطلابك، ثم انسخ الكود وأرسله لهم. يلصقه الطالب في
          «تقدّمي ← استيراد دروس من المعلم» فتُضاف الدروس إلى تطبيقه.
        </ArabicText>

        {customLessons.length === 0 ? (
          <Banner tone="info" message="لا توجد دروس مضافة بعد. أنشئ درساً أولاً ثم صدّره." />
        ) : (
          <>
            <ChipGroup
              label="الدروس"
              options={customLessons.map((lesson) => ({
                value: lesson.id,
                label: `${lesson.emoji} ${lesson.title}`,
              }))}
              selected={shareIds}
              onSelect={toggleShare}
              multi
            />

            {shareCode ? (
              <>
                <ArabicText style={styles.shareLabel}>الكود ({shareCode.length} حرف)</ArabicText>
                <CodeBox code={prettyCode(shareCode)} />
                <ArabicText style={styles.shareHint}>
                  حدّد النص كاملاً وانسخه، ثم أرسله في أي تطبيق مراسلة.
                </ArabicText>
              </>
            ) : (
              <Banner tone="info" message="اختر درساً واحداً على الأقل ليظهر الكود." />
            )}
          </>
        )}
      </Sheet>

      <ConfirmDialog
        visible={confirmId !== null}
        title="حذف الدرس"
        message="سيُحذف الدرس وكلماته من منهجك على هذا الجهاز. تقدّم الطلاب المسجّل عندك لا يتأثّر."
        confirmLabel="حذف"
        destructive
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) deleteCustomLesson(confirmId);
          setConfirmId(null);
        }}
      />
    </View>
  );
}

function levelLabel(level: Level): string {
  return LEVELS.find((item) => item.id === level)?.subtitle ?? '';
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  wordChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  wordChip: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  wordChipEn: {
    fontSize: 12,
    color: colors.text,
  },
  wordChipAr: {
    fontSize: 11,
    color: colors.textFaint,
  },
  moreWords: {
    fontSize: 12,
    color: colors.textFaint,
  },
  lessonActions: {
    flexDirection: 'row-reverse',
    marginTop: spacing.lg,
  },
  editorHeading: {
    fontSize: 15,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  wordEditor: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  wordEditorHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  wordEditorIndex: {
    fontSize: 13,
    color: colors.textMuted,
  },
  removeWord: {
    fontFamily: fonts.light,
    fontSize: 16,
    color: colors.danger,
  },
  shareIntro: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  shareLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  shareHint: {
    fontSize: 12,
    color: colors.textFaint,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
});
