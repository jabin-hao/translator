export interface SpeechOptions {
  text: string;
  lang: string;
  engine?: SpeechService;
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

export type SpeechService = 'google' | 'edge' | 'browser' | 'local';

export interface SpeechVoiceOption {
  value: string;
  label: string;
  lang: string;
}

export interface SpeechEngineCapabilities {
  supportsVoices: boolean;
  supportsSpeed: boolean;
  supportsPitch: boolean;
  supportsVolume: boolean;
}

export const EDGE_TTS_VOICES: SpeechVoiceOption[] = [
  { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (Chinese, Female)', lang: 'zh-CN' },
  { value: 'zh-CN-YunxiNeural', label: 'Yunxi (Chinese, Male)', lang: 'zh-CN' },
  { value: 'zh-CN-XiaoyiNeural', label: 'Xiaoyi (Chinese, Female)', lang: 'zh-CN' },
  { value: 'en-US-AriaNeural', label: 'Aria (English US, Female)', lang: 'en-US' },
  { value: 'en-US-GuyNeural', label: 'Guy (English US, Male)', lang: 'en-US' },
  { value: 'en-GB-SoniaNeural', label: 'Sonia (English UK, Female)', lang: 'en-GB' },
  { value: 'en-GB-RyanNeural', label: 'Ryan (English UK, Male)', lang: 'en-GB' },
  { value: 'ja-JP-NanamiNeural', label: 'Nanami (Japanese, Female)', lang: 'ja-JP' },
  { value: 'ja-JP-KeitaNeural', label: 'Keita (Japanese, Male)', lang: 'ja-JP' },
  { value: 'ko-KR-SunHiNeural', label: 'SunHi (Korean, Female)', lang: 'ko-KR' },
  { value: 'ko-KR-InJoonNeural', label: 'InJoon (Korean, Male)', lang: 'ko-KR' },
  { value: 'fr-FR-DeniseNeural', label: 'Denise (French, Female)', lang: 'fr-FR' },
  { value: 'fr-FR-HenriNeural', label: 'Henri (French, Male)', lang: 'fr-FR' },
  { value: 'de-DE-KatjaNeural', label: 'Katja (German, Female)', lang: 'de-DE' },
  { value: 'de-DE-ConradNeural', label: 'Conrad (German, Male)', lang: 'de-DE' },
  { value: 'es-ES-ElviraNeural', label: 'Elvira (Spanish, Female)', lang: 'es-ES' },
  { value: 'es-ES-AlvaroNeural', label: 'Alvaro (Spanish, Male)', lang: 'es-ES' },
  { value: 'ru-RU-SvetlanaNeural', label: 'Svetlana (Russian, Female)', lang: 'ru-RU' },
  { value: 'ru-RU-DmitryNeural', label: 'Dmitry (Russian, Male)', lang: 'ru-RU' },
  { value: 'pt-BR-FranciscaNeural', label: 'Francisca (Portuguese BR, Female)', lang: 'pt-BR' },
  { value: 'pt-BR-AntonioNeural', label: 'Antonio (Portuguese BR, Male)', lang: 'pt-BR' },
];

export const TTS_ENGINE_CAPABILITIES: Record<SpeechService, SpeechEngineCapabilities> = {
  google: {
    supportsVoices: false,
    supportsSpeed: true,
    supportsPitch: false,
    supportsVolume: true,
  },
  edge: {
    supportsVoices: true,
    supportsSpeed: true,
    supportsPitch: true,
    supportsVolume: true,
  },
  browser: {
    supportsVoices: true,
    supportsSpeed: true,
    supportsPitch: true,
    supportsVolume: true,
  },
  local: {
    supportsVoices: true,
    supportsSpeed: true,
    supportsPitch: true,
    supportsVolume: true,
  },
};

const EDGE_DEFAULT_VOICE_BY_PREFIX: Record<string, string> = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-AriaNeural',
  ja: 'ja-JP-NanamiNeural',
  ko: 'ko-KR-SunHiNeural',
  fr: 'fr-FR-DeniseNeural',
  de: 'de-DE-KatjaNeural',
  es: 'es-ES-ElviraNeural',
  ru: 'ru-RU-SvetlanaNeural',
  pt: 'pt-BR-FranciscaNeural',
};

export function resolveEdgeVoice(lang: string, preferredVoice?: string): string {
  if (preferredVoice && EDGE_TTS_VOICES.some((voice) => voice.value === preferredVoice)) {
    return preferredVoice;
  }

  const normalizedLang = lang.toLowerCase();
  const exactMatch = EDGE_TTS_VOICES.find((voice) => voice.lang.toLowerCase() === normalizedLang);
  if (exactMatch) {
    return exactMatch.value;
  }

  const prefix = normalizedLang.split('-')[0];
  return EDGE_DEFAULT_VOICE_BY_PREFIX[prefix] || 'en-US-AriaNeural';
}
