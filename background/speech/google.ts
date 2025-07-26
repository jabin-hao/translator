import type { SpeechOptions, SpeechResult, SpeechService } from '../../lib/speech';

// 基础朗读服务接口
interface BaseSpeechService {
  name: SpeechService;
  speak(options: SpeechOptions): Promise<SpeechResult>;
  stop(): void;
}

// Google TTS 服务
export class GoogleSpeechService implements BaseSpeechService {
  name: SpeechService = 'google';

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, voice, speed = 1, pitch = 1, volume = 1 } = options;
      
      // 在 background script 中，我们需要通过 content script 来使用 Web Speech API
      // 或者使用其他可用的 TTS 方案
      
      // 临时方案：返回成功但不实际播放，因为 background 无法直接使用 Web Speech API
      console.log('Google TTS 在 background 中不可用，需要通过 content script 实现');
      
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
    console.log('Google TTS stop called in background');
  }
} 