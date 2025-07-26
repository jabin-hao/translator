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
  error?: string;
}

// 朗读服务类型
export type SpeechService = 'google' | 'bing' | 'azure' | 'amazon' | 'local'; 