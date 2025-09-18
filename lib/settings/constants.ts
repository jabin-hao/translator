/**
 * 设置相关常量
 */
import type { GlobalSettings, ThemeOption } from '../constants/types';

// 默认设置
export const DEFAULT_SETTINGS: GlobalSettings = {
  theme: {
    mode: 'auto',
    uiLanguage: 'zh-CN',
  },

  engines: {
    default: 'google',
    customEngines: [],
    apiKeys: {
      deepl: '',
      bing: '',
      yandex: '',
    },
  },

  textTranslate: {
    enabled: true,
    showOriginal: false,
    selectTranslate: false,
    quickTranslate: false,
    pressKeyTranslate: false,
  },

  inputTranslate: {
    enabled: true,
    triggerMode: 'auto',
    autoTranslateDelay: 1000,
    minTextLength: 2,
    enabledInputTypes: ['text', 'textarea', 'email', 'search', 'url'],
    excludeSelectors: ['.no-translate', '[data-no-translate]'],
    autoReplace: true,
  },

  pageTranslate: {
    enabled: true,
    mode: 'translated',
    autoTranslate: false,
  },

  speech: {
    enabled: true,
    engine: 'google',
    speed: 1,
    pitch: 1,
    volume: 1,
    autoPlay: false,
    voice: '',
  },

  languages: {
    favorites: ['zh-CN'],
    never: [],
    always: [],
    pageTarget: 'zh-CN',
    textTarget: 'zh-CN',
    inputTarget: 'zh-CN'
  },

  shortcuts: {
    enabled: true,
    toggleTranslate: 'Alt+T',
    pageTranslate: 'Alt+P',
    openInput: 'Alt+I',
    textTranslate: 'Alt+S',
    inputTranslate: 'Ctrl+T',
  },

  cache: {
    enabled: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    maxSize: 2000,
  },

  favorites: {
    enabled: true,
    words: [],
    autoSave: true,
    maxSize: 1000,
  },
};

// 设置存储键
export const GLOBAL_SETTINGS_KEY = 'global_settings';
export const SPEECH_KEY = 'speech_settings';
export const DEEPL_API_KEY = 'deepl_api_key';
export const YANDEX_API_KEY = 'yandex_api_key';

// 主题选项
export const THEME_OPTIONS: ThemeOption[] = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'auto' }
];