import type { SpeechOptions, SpeechResult } from '~lib/translate/speech';

export class GoogleSpeechService {
  name = 'google' as const;

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, speed = 1, pitch, volume } = options;
  
      // 使用正确的参数和客户端标识
      const params = new URLSearchParams({
        'ie': 'UTF-8',
        'tl': lang,
        'client': 'dict-chrome-ex',
        'ttsspeed': '0.5', // Google TTS 的固定速度参数
        'q': text
      });
      
      const url = `https://translate.google.com/translate_tts?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error('[Google TTS] HTTP错误:', response.status, response.statusText);
        return {
          success: false,
          error: `Google TTS HTTP错误: ${response.status} ${response.statusText}`
        };
      }

      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        console.error('[Google TTS] 返回空音频数据');
        return {
          success: false,
          error: 'Google TTS 返回空音频数据'
        };
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();

      // 检查 ArrayBuffer 是否为空
      if (arrayBuffer.byteLength === 0) {
        console.error('Google TTS 返回空的 ArrayBuffer');
        return {
          success: false,
          error: 'Google TTS 返回空的音频数据'
        };
      }

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