import type { TranslateEngineConfig, TTSEngineConfig } from './types';

export const TRANSLATE_ENGINES: TranslateEngineConfig[] = [
  {
    label: 'Bing',
    value: 'bing',
    icon: 'brand-edge',
    description: 'Microsoft Translate-compatible engine',
  },
  {
    label: 'Google',
    value: 'google',
    icon: 'brand-google',
    description: 'Google Translate web engine',
  },
  {
    label: 'DeepL',
    value: 'deepl',
    icon: 'language',
    description: 'DeepL free web translation',
  },
  {
    label: 'Yandex',
    value: 'yandex',
    icon: 'brand-yandex',
    description: 'Yandex free web translation',
  },
];

export const TTS_ENGINES: TTSEngineConfig[] = [
  {
    value: 'google',
    label: 'Google TTS',
    description: 'Google Translate speech endpoint',
    priority: 1,
  },
  {
    value: 'edge',
    label: 'Edge TTS',
    description: 'Microsoft Edge read-aloud voices',
    priority: 2,
  },
  {
    value: 'browser',
    label: 'Browser TTS',
    description: 'Use Web Speech API voices from the current browser',
    priority: 3,
  },
];
