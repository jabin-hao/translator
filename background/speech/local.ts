import type { SpeechOptions, SpeechResult, SpeechService } from '~lib/translate/speech';

// 基础朗读服务接口
interface BaseSpeechService {
  name: SpeechService;
  speak(options: SpeechOptions): Promise<SpeechResult>;
  stop(): void;
}

// 本地 TTS 服务 (Web Speech API)
// 注意：这个服务在background中只是占位符，实际的Web Speech API需要在content script中执行
export class LocalSpeechService implements BaseSpeechService {
  name: SpeechService = 'browser';

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    // 在background中，本地TTS服务返回特殊标记，让content script处理
    return {
      success: false,
      error: 'browser_tts_required', // 特殊错误标记，表示需要在content script中使用Web Speech API
      requiresBrowser: true // 添加标记表示需要浏览器环境
    };
  }

  stop(): void {
    // 本地 TTS 服务的停止操作需要在content script中处理
  }
} 