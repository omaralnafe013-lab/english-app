import { Lesson } from '../data/lessons';
import { WordState } from './srs';

/**
 * أكواد المشاركة — الجسر بين جهاز الطالب وجهاز المعلم بلا خادم.
 *
 * الطالب يولّد كوداً نصياً يحمل لقطة من تقدّمه، والمعلم يلصقه في لوحته فيظهر
 * الطالب في القائمة. وبالاتجاه المعاكس يولّد المعلم «حزمة دروس» يلصقها الطلاب
 * فتُضاف الدروس الجديدة إلى مناهجهم.
 *
 * الترميز مكتوب هنا يدوياً بلا أي مكتبة خارجية: `btoa` غير متاح على Hermes،
 * و`Buffer` غير متاح على الويب، فنبني Base64URL فوق بايتات UTF-8 مباشرة.
 */

const PREFIX = 'TLM1';
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export type ShareKind = 'progress' | 'lessons';

const KIND_TAG: Record<ShareKind, string> = { progress: 'P', lessons: 'L' };

export type StudentSnapshot = {
  v: 1;
  name: string;
  /** وقت التصدير بالمللي ثانية — يُستخدم لعرض «آخر تحديث» */
  at: number;
  /** رقم اليوم وقت التصدير — يُستخدم لحساب المراجعات المستحقّة عند المعلم */
  day: number;
  xp: number;
  streak: number;
  best: number;
  goal: number;
  todayReviews: number;
  completedLessons: string[];
  quiz: { taken: number; correct: number; answered: number };
  words: Record<string, WordState>;
};

export type LessonPack = {
  v: 1;
  by: string;
  at: number;
  lessons: Lesson[];
};

export type DecodeResult =
  | { ok: true; kind: 'progress'; snapshot: StudentSnapshot }
  | { ok: true; kind: 'lessons'; pack: LessonPack }
  | { ok: false; error: string };

// ─────────────────────────────── Base64URL فوق UTF-8 ───────────────────────────────

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);

    // نجمع الزوج البديل إلى نقطة ترميز واحدة قبل تحويله
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

function utf8String(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i];
    let code: number;

    if (byte < 0x80) {
      code = byte;
      i += 1;
    } else if (byte >= 0xc0 && byte < 0xe0) {
      code = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      i += 2;
    } else if (byte >= 0xe0 && byte < 0xf0) {
      code = ((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      i += 3;
    } else {
      code =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      i += 4;
    }

    if (code > 0xffff) {
      const offset = code - 0x10000;
      out += String.fromCharCode(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
    } else {
      out += String.fromCharCode(code);
    }
  }
  return out;
}

function toBase64Url(text: string): string {
  const bytes = utf8Bytes(text);
  let out = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const remaining = bytes.length - i;
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);

    out += B64URL[(chunk >> 18) & 63] + B64URL[(chunk >> 12) & 63];
    // البايتات الناقصة في آخر مجموعة تُحذف بدل حشوها بـ '='
    if (remaining > 1) out += B64URL[(chunk >> 6) & 63];
    if (remaining > 2) out += B64URL[chunk & 63];
  }

  return out;
}

function fromBase64Url(encoded: string): string | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of encoded) {
    const value = B64URL.indexOf(char);
    if (value < 0) return null;

    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  try {
    return utf8String(bytes);
  } catch {
    return null;
  }
}

/** بصمة قصيرة (FNV-1a) تكشف الكود المقصوص أو المعدَّل قبل محاولة قراءته. */
function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0').slice(-7);
}

// ─────────────────────────────── التصدير والاستيراد ───────────────────────────────

function encode(kind: ShareKind, payload: unknown): string {
  const body = toBase64Url(JSON.stringify(payload));
  return `${PREFIX}.${KIND_TAG[kind]}.${body}.${checksum(body)}`;
}

export function encodeProgressCode(snapshot: StudentSnapshot): string {
  return encode('progress', snapshot);
}

export function encodeLessonPack(pack: LessonPack): string {
  return encode('lessons', pack);
}

/** يزيل المسافات والأسطر التي تلتصق بالكود عند نسخه من رسالة. */
export function cleanCode(raw: string): string {
  return raw.replace(/\s+/g, '');
}

export function decodeShareCode(raw: string): DecodeResult {
  const code = cleanCode(raw);
  if (!code) return { ok: false, error: 'الصق الكود أولاً.' };

  const parts = code.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    return { ok: false, error: 'هذا ليس كود مشاركة صالحاً. تأكّد من نسخ الكود كاملاً.' };
  }

  const [, tag, body, sum] = parts;
  if (checksum(body) !== sum) {
    return { ok: false, error: 'الكود ناقص أو تغيّر أثناء النسخ. اطلب نسخة جديدة منه.' };
  }

  const json = fromBase64Url(body);
  if (json === null) return { ok: false, error: 'تعذّرت قراءة الكود. تأكّد من نسخه كاملاً.' };

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, error: 'تعذّرت قراءة محتوى الكود.' };
  }

  if (tag === KIND_TAG.progress) {
    const snapshot = payload as Partial<StudentSnapshot>;
    if (typeof snapshot?.xp !== 'number' || typeof snapshot?.words !== 'object' || !snapshot.words) {
      return { ok: false, error: 'الكود لا يحتوي بيانات تقدّم صالحة.' };
    }
    return { ok: true, kind: 'progress', snapshot: hydrateSnapshot(snapshot) };
  }

  if (tag === KIND_TAG.lessons) {
    const pack = payload as Partial<LessonPack>;
    if (!Array.isArray(pack?.lessons) || pack.lessons.length === 0) {
      return { ok: false, error: 'الكود لا يحتوي أي دروس.' };
    }
    return {
      ok: true,
      kind: 'lessons',
      pack: { v: 1, by: pack.by ?? '', at: pack.at ?? Date.now(), lessons: pack.lessons },
    };
  }

  return { ok: false, error: 'نوع الكود غير معروف.' };
}

/** يملأ الحقول الناقصة حتى تعمل اللوحة مع أكواد صادرة من نسخة أقدم من التطبيق. */
function hydrateSnapshot(saved: Partial<StudentSnapshot>): StudentSnapshot {
  return {
    v: 1,
    name: typeof saved.name === 'string' ? saved.name.trim() : '',
    at: typeof saved.at === 'number' ? saved.at : Date.now(),
    day: typeof saved.day === 'number' ? saved.day : 0,
    xp: saved.xp ?? 0,
    streak: saved.streak ?? 0,
    best: saved.best ?? 0,
    goal: saved.goal ?? 10,
    todayReviews: saved.todayReviews ?? 0,
    completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons : [],
    quiz: {
      taken: saved.quiz?.taken ?? 0,
      correct: saved.quiz?.correct ?? 0,
      answered: saved.quiz?.answered ?? 0,
    },
    words: saved.words ?? {},
  };
}

/** يقسّم الكود إلى أسطر قصيرة ليسهل قراءته والتأكّد من اكتماله على الشاشة. */
export function prettyCode(code: string, width = 44): string {
  const chunks: string[] = [];
  for (let i = 0; i < code.length; i += width) {
    chunks.push(code.slice(i, i + width));
  }
  return chunks.join('\n');
}
