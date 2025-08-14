/**
 * 全局设置管理
 * 统一管理所有配置项，提供类型安全和默认值
 */

// 翻译引擎类型定义
export type TranslateEngine = 'google' | 'deepl' | 'bing' | 'yandex' | string;
export type TTSEngine = 'google' | 'local';

// 自定义引擎类型
export interface CustomEngine {
  id: string;
  name: string;
  type: 'api' | 'llm';
  apiUrl: string;
  apiKey: string;
  model?: string; // LLM模型名称
  prompt?: string; // LLM翻译提示词
  headers?: Record<string, string>;
  enabled: boolean;
}

// 主设置接口
export interface GlobalSettings {
  // 主题和界面
  theme: {
    mode: 'light' | 'dark' | 'auto';
    uiLanguage: string;
  };

  // 翻译引擎设置
  engines: {
    default: TranslateEngine;
    customEngines: CustomEngine[];
    apiKeys: {
      deepl: string;
      bing: string;
      yandex: string;
    };
  };

  // 划词翻译设置
  textTranslate: {
    enabled: boolean;
    autoDetectLanguage: boolean;
    showOriginal: boolean;
    doubleClickTranslate: boolean;
    selectTranslate: boolean;
    quickTranslate: boolean;
    pressKeyTranslate: boolean;
    keyCode: string;
    pressKeyWithCtrl: boolean;
    pressKeyWithShift: boolean;
    pressKeyWithAlt: boolean;
  };

  // 输入翻译设置（网页输入框翻译）
  inputTranslate: {
    enabled: boolean;
    targetLanguage: string;
    autoDetectLanguage: boolean;
    showTranslateButton: boolean;
    buttonPosition: 'inside' | 'outside';
    triggerMode: 'manual' | 'auto' | 'hotkey';
    hotkey: string;
    autoTranslateDelay: number; // 毫秒
    minTextLength: number;
    enabledInputTypes: string[]; // text, textarea, contenteditable 等
    excludeSelectors: string[]; // CSS选择器，排除某些输入框
    showOriginalText: boolean;
    replaceOriginalText: boolean;
  };

  // 网页翻译设置
  pageTranslate: {
    enabled: boolean;
    mode: 'translated' | 'compare';
    targetLanguage: string;
    autoTranslate: boolean; // 统一的自动翻译开关
    excludeDomains: string[];
    includeDomains: string[];
  };

  // 语音朗读设置
  speech: {
    enabled: boolean;
    engine: TTSEngine;
    speed: number;
    pitch: number;
    volume: number;
    autoPlay: boolean;
    voice: string;
  };

  // 语言设置
  languages: {
    favorites: string[];
    never: string[];
    always: string[];
    pageTarget: string;
    textTarget: string;
  };

  // 快捷键设置
  shortcuts: {
    enabled: boolean;
    toggleTranslate: string;
    translateSelection: string;
    translatePage: string;
    openPopup: string;
  };

  // 缓存设置
  cache: {
    enabled: boolean;
    maxAge: number; // 毫秒
    maxSize: number; // 条目数
  };

  // 收藏夹设置
  favorites: {
    enabled: boolean;
    words: Array<{
      id: string;
      word: string;
      translation: string;
      sourceLanguage: string;
      targetLanguage: string;
      timestamp: number;
      tags?: string[];
      notes?: string;
    }>;
    autoSave: boolean;
    maxSize: number;
  };
}

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
    autoDetectLanguage: true,
    showOriginal: false,
    doubleClickTranslate: true,
    selectTranslate: false, // 默认不自动翻译，显示图标
    quickTranslate: false,
    pressKeyTranslate: false,
    keyCode: 'Space',
    pressKeyWithCtrl: false,
    pressKeyWithShift: false,
    pressKeyWithAlt: false,
  },

  inputTranslate: {
    enabled: true,
    targetLanguage: 'zh-CN',
    autoDetectLanguage: true,
    showTranslateButton: true,
    buttonPosition: 'inside',
    triggerMode: 'manual',
    hotkey: 'Ctrl+T',
    autoTranslateDelay: 1000,
    minTextLength: 2,
    enabledInputTypes: ['text', 'textarea', 'email', 'search', 'url'],
    excludeSelectors: ['.no-translate', '[data-no-translate]'],
    showOriginalText: true,
    replaceOriginalText: false,
  },

  pageTranslate: {
    enabled: true,
    mode: 'translated',
    targetLanguage: 'zh-CN',
    autoTranslate: false, // 默认关闭自动翻译
    excludeDomains: [],
    includeDomains: [],
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
  },

  shortcuts: {
    enabled: true,
    toggleTranslate: 'Alt+T',
    translateSelection: 'Alt+S',
    translatePage: 'Alt+P',
    openPopup: 'Alt+Q',
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

// 部分设置更新类型
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};
