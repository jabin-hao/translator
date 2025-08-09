import type { SpeechOptions, SpeechResult } from '~lib/translate/speech';

export class GoogleSpeechService {
  name = 'google' as const;

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, speed = 1 } = options;
      
      // 使用Google Translate TTS API
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=${speed}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error('Google TTS HTTP错误:', response.status, response.statusText);
      }

      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        console.error('Google TTS 返回空音频数据');
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();

      return {
        success: true,
        audioData: arrayBuffer,
        audioType: audioBlob.type || 'audio/mpeg'
      };
    } catch (error) {
      console.error('Google TTS 错误:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  stop(): void {
    // Google TTS 不需要停止操作
  }
}