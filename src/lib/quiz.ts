import { Word } from '../data/lessons';
import { Catalog } from './catalog';

export type QuestionKind = 'en-to-ar' | 'ar-to-en' | 'listen';

export type Question = {
  kind: QuestionKind;
  word: Word;
  /** نص السؤال المعروض (يختلف حسب نوع السؤال) */
  prompt: string;
  options: string[];
  answer: string;
};

export const QUIZ_LENGTH = 10;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * يبني خيارات خاطئة من كلمات أخرى.
 * يفضّل كلمات من نفس المجموعة لأن التشابه يجعل السؤال أكثر فائدة.
 */
function buildOptions(correct: string, pool: Word[], pick: (word: Word) => string): string[] {
  const distractors: string[] = [];
  for (const word of shuffle(pool)) {
    const value = pick(word);
    if (value !== correct && !distractors.includes(value)) {
      distractors.push(value);
    }
    if (distractors.length === 3) break;
  }
  return shuffle([correct, ...distractors]);
}

/**
 * يولّد اختباراً من درس محدّد، أو من كل كلمات المنهج عند عدم تمرير درس.
 * عند نقص الكلمات في الدرس نكمل مجموعة الخيارات من باقي الكلمات.
 */
export function buildQuiz(catalog: Catalog, lessonId?: string): Question[] {
  const lesson = lessonId ? catalog.getLesson(lessonId) : undefined;
  const source: Word[] = lesson ? lesson.words : catalog.allWords;
  const optionPool: Word[] = source.length >= 4 ? [...source, ...catalog.allWords] : catalog.allWords;

  const kinds: QuestionKind[] = ['en-to-ar', 'ar-to-en', 'listen'];

  return shuffle(source)
    .slice(0, QUIZ_LENGTH)
    .map((word, position) => {
      const kind = kinds[position % kinds.length];

      if (kind === 'ar-to-en') {
        return {
          kind,
          word,
          prompt: word.ar,
          options: buildOptions(word.en, optionPool, (item) => item.en),
          answer: word.en,
        };
      }

      // 'en-to-ar' و 'listen' يشتركان في نفس الخيارات العربية،
      // والفرق أن سؤال الاستماع يخفي الكلمة المكتوبة.
      return {
        kind,
        word,
        prompt: word.en,
        options: buildOptions(word.ar, optionPool, (item) => item.ar),
        answer: word.ar,
      };
    });
}

export function questionTitle(kind: QuestionKind): string {
  switch (kind) {
    case 'en-to-ar':
      return 'ما معنى هذه الكلمة؟';
    case 'ar-to-en':
      return 'كيف نقولها بالإنجليزية؟';
    case 'listen':
      return 'استمع واختر المعنى الصحيح';
  }
}
