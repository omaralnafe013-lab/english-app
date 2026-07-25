/**
 * نظام التكرار المتباعد (Leitner) لمراجعة الكلمات.
 * كل كلمة تنتقل بين خمسة صناديق؛ كلما ارتفع الصندوق طالت الفترة قبل المراجعة التالية.
 */

export type WordState = {
  /** رقم الصندوق من 1 إلى 5 */
  box: number;
  /** تاريخ الاستحقاق التالي بصيغة يوم (عدد الأيام منذ 1970) */
  due: number;
  correct: number;
  wrong: number;
};

/** عدد الأيام قبل المراجعة التالية لكل صندوق (الفهرس = box - 1) */
const INTERVALS = [1, 2, 4, 9, 21];

export const MAX_BOX = INTERVALS.length;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** يحوّل وقتاً إلى رقم اليوم المحلي، حتى تكون المقارنات مستقلة عن ساعة اليوم. */
export function dayNumber(date: Date = new Date()): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / MS_PER_DAY);
}

export function newWordState(): WordState {
  return { box: 1, due: dayNumber(), correct: 0, wrong: 0 };
}

/**
 * يحدّث حالة الكلمة بعد المراجعة.
 * الإجابة الصحيحة ترفعها صندوقاً واحداً، والخاطئة تعيدها للصندوق الأول.
 */
export function reviewWord(state: WordState | undefined, remembered: boolean): WordState {
  const current = state ?? newWordState();
  const box = remembered ? Math.min(current.box + 1, MAX_BOX) : 1;
  const today = dayNumber();

  return {
    box,
    due: today + INTERVALS[box - 1],
    correct: current.correct + (remembered ? 1 : 0),
    wrong: current.wrong + (remembered ? 0 : 1),
  };
}

/** الكلمة مستحقّة للمراجعة إذا حان يومها أو تجاوزته. */
export function isDue(state: WordState | undefined, today: number = dayNumber()): boolean {
  if (!state) return false;
  return state.due <= today;
}

/** تُعتبر الكلمة "متقنة" عند وصولها للصندوق الأخير. */
export function isMastered(state: WordState | undefined): boolean {
  return !!state && state.box >= MAX_BOX;
}
