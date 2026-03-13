import type { SpeechOptions, SpeechResult } from '~lib/constants/speech';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapGoogleSpeed(speed = 1) {
  return clamp(speed, 0.24, 1).toFixed(2);
}

export class GoogleSpeechService {
  name = 'google' as const;

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, speed = 1 } = options;

      const params = new URLSearchParams({
        ie: 'UTF-8',
        tl: lang,
        client: 'dict-chrome-ex',
        ttsspeed: mapGoogleSpeed(speed),
        q: text,
      });

      const url = `https://translate.google.com/translate_tts?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
          Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Google TTS request failed: ${response.status} ${response.statusText}`,
        };
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        return {
          success: false,
          error: 'Google TTS returned an empty audio payload',
        };
      }

      const audioData = await audioBlob.arrayBuffer();
      if (audioData.byteLength === 0) {
        return {
          success: false,
          error: 'Google TTS returned an empty audio buffer',
        };
      }

      return {
        success: true,
        audioData,
        audioType: audioBlob.type || 'audio/mpeg',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  stop(): void {
    // Google TTS returns audio data only; playback is handled in the content script.
  }
}
