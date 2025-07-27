import type { SpeechOptions, SpeechResult } from '../../lib/speech';

export class GoogleSpeechService {
  name = 'google' as const;

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, speed = 1, pitch = 1, volume = 1 } = options;
      
      // 使用Google Translate TTS API
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob&ttsspeed=${speed}`;
      
      console.log('Google TTS 开始请求:', { url, text, lang });
      
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
        throw new Error(`Google TTS 请求失败: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Google TTS 返回空音频数据');
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode(...uint8Array));

      console.log('Google TTS 成功生成音频:', { size: audioBlob.size, type: audioBlob.type });
      return {
        success: true,
        audioData: base64String,
        audioType: audioBlob.type || 'audio/mpeg'
      };
    } catch (error) {
      console.error('Google TTS 错误:', error);
      
      // 如果是网络错误，返回特殊错误信息
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Google TTS 请求超时，请检查网络连接'
          };
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          return {
            success: false,
            error: 'Google TTS 网络错误，可能是跨域限制'
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  stop(): void {
    // Google TTS 不需要停止操作
  }

  getSupportedLanguages(): string[] {
    return ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt'];
  }

  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language);
  }
} 