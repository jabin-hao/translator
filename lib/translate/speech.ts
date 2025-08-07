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
  audioData?: string; // base64 编码的音频数据
  audioType?: string; // 音频 MIME 类型
  error?: string;
}

export type SpeechService = 'edge' | 'google' | 'browser' | 'local';