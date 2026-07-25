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
 * النصوص العربية تُعرض من اليمين لليسار، والنصوص الإنجليزية من اليسار لليمين.
 * نضبط الاتجاه على مستوى النص بدل فرض RTL على التطبيق كله (الذي يتطلب إعادة تشغيل).
 */
export const arabicText = {
  textAlign: 'right' as const,
  writingDirection: 'rtl' as const,
};

/**
 * الواجهة عربية الاتجاه، لذا تُحاذى النصوص الإنجليزية لليمين أيضاً حتى تبقى
 * كل بطاقة عموداً واحداً متناسقاً، مع إبقاء اتجاه الكتابة نفسه من اليسار لليمين.
 */
export const latinText = {
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
