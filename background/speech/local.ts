import type { SpeechOptions, SpeechResult, SpeechService } from '~lib/translate/speech';

// 基础朗读服务接口
interface BaseSpeechService {
  name: SpeechService;
  speak(options: SpeechOptions): Promise<SpeechResult>;
  stop(): void;
}

// 本地 TTS 服务
export class LocalSpeechService implements BaseSpeechService {
  name: SpeechService = 'local';

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      return {
        success: false,
        error: 'TTS not available in background script'
      };
    } catch (error) {
      console.error('Local TTS error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  stop(): void {
    // 本地 TTS 服务不支持停止操作
    console.warn('Local TTS service does not support stop operation.');
  }
} 