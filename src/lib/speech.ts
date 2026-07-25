import * as Speech from 'expo-speech';

/**
 * ينطق نصاً إنجليزياً بصوت الجهاز.
 * يوقف أي نطق جارٍ أولاً حتى لا تتراكم الجمل في قائمة الانتظار.
 */
export async function speakEnglish(text: string, options?: { slow?: boolean }): Promise<void> {
  try {
    if (await Speech.isSpeakingAsync()) {
      await Speech.stop();
    }
  } catch {
    // تجاهل — بعض الأجهزة ترمي خطأ عند الإيقاف بدون نطق جارٍ
  }

  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: options?.slow ? 0.55 : 0.92,
  });
}

export function stopSpeaking(): void {
  Speech.stop().catch(() => {
    // لا شيء لإيقافه
  });
}
