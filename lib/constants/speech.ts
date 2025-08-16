export interface SpeechOptions {
  text: string;
  lang: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface SpeechResult {
  success: boolean;
  audioUrl?: string;
  audioData?: ArrayBuffer | Uint8Array; // 支持 ArrayBuffer 和 Uint8Array
  audioType?: string; // 音频 MIME 类型
  error?: string;
  requiresBrowser?: boolean; // 标记是否需要在浏览器环境中执行
}

export type SpeechService = 'google' | 'browser' | 'local';