import type { SpeechOptions, SpeechResult, SpeechService } from '../../lib/speech';

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
      const { text, lang, voice, speed = 1, pitch = 1, volume = 1 } = options;
      
      // 在 background script 中，我们需要通过 content script 来使用 Web Speech API
      console.log('Local TTS 在 background 中不可用，需要通过 content script 实现');
      
      return {
        success: false,
        error: 'TTS not available in background script'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  stop(): void {
    // 在 background 中无法直接停止
    console.log('Local TTS stop called in background');
  }
} 