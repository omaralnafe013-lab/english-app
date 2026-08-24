import { Platform } from 'react-native';

export const colors = {
  bg: '#0F1729',
  bgElevated: '#182034',
  card: '#1E2942',
  cardMuted: '#243052',
  border: '#2C3A5C',

  primary: '#4F8CFF',
  primaryDark: '#2E6BE0',
  accent: '#FFB020',

  success: '#22C55E',
  successDim: '#16532F',
  danger: '#EF4444',
  dangerDim: '#5A1D1D',

  text: '#F2F5FB',
  textMuted: '#9AA8C7',
  textFaint: '#68779B',

  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

/**
 * خط التطبيق: Tajawal بوزن Light (300) في كل الواجهة.
 * لأننا نحمّل وزناً واحداً فقط، لا نستخدم `fontWeight` في أي مكان — بعض المنصّات
 * تصطنع وزناً أثقل فيختلف شكل النص بين iOS و Android. التمييز البصري يعتمد على
 * حجم الخط ولونه بدلاً من ذلك.
 */
export const fonts = {
  light: 'Tajawal_300Light',
};

/**
 * النصوص العربية تُعرض من اليمين لليسار، والنصوص الإنجليزية من اليسار لليمين.
 * نضبط الاتجاه على مستوى النص بدل فرض RTL على التطبيق كله (الذي يتطلب إعادة تشغيل).
 */
export const arabicText = {
  fontFamily: fonts.light,
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};

/**
 * الواجهة عربية الاتجاه، لذا تُحاذى النصوص الإنجليزية لليمين أيضاً حتى تبقى
 * كل بطاقة عموداً واحداً متناسقاً، مع إبقاء اتجاه الكتابة نفسه من اليسار لليمين.
 */
export const latinText = {
  fontFamily: fonts.light,
  textAlign: 'right' as const,
  writingDirection: 'ltr' as const,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 4 },
  default: {},
});

/**
 * ألوان الرسوم البيانية في لوحة المعلم.
 *
 * مضبوطة على سطح البطاقة الداكن (`colors.card`) ومُتحقَّق منها حسابياً:
 * نطاق الإضاءة، حدّ التشبّع، فصل الألوان لعمى الألوان (protan/deutan)، والتباين مع السطح.
 * `series` مرتّبة ترتيباً ثابتاً — تُؤخذ بالتسلسل ولا تُدوَّر أبداً، حتى يبقى لون
 * كل فئة ثابتاً مهما تغيّر عدد الفئات المعروضة.
 */
export const chart = {
  /** ألوان فئوية (هوية) — بالترتيب الثابت */
  series: ['#C08410', '#3B7DD8', '#0FA07C', '#9A5CD0', '#DB5069'],

  /** تدرّج أحادي اللون (مقدار) — من الفاتح إلى الغامق، لمراحل الحفظ الخمس */
  ramp: ['#2C6099', '#3B7DD8', '#5C97E6', '#84B4EF', '#B0CFF8'],

  /** ألوان الحالة — محجوزة للحالة وحدها، ولا تُستخدم كلون فئة */
  status: {
    good: '#22C55E',
    warning: '#FFB020',
    critical: '#EF4444',
    idle: '#68779B',
  },

  /** خطوط الشبكة والمحاور — تبقى خافتة خلف البيانات */
  grid: '#2C3A5C',
  track: '#243052',
};
