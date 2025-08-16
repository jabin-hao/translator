/**
 * 全局设置管理
 * 统一管理所有配置项，提供类型安全和默认值
 */
import { useCallback } from 'react';
import { produce } from 'immer';
import { useStorage } from '../storage/storage';

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
    triggerMode: 'manual' | 'auto' | 'hotkey';
    hotkey: string;
    autoTranslateDelay: number; // 毫秒
    minTextLength: number;
    enabledInputTypes: string[]; // text, textarea, contenteditable 等
    excludeSelectors: string[]; // CSS选择器，排除某些输入框
  };

  // 网页翻译设置
  pageTranslate: {
    enabled: boolean;
    mode: 'translated' | 'compare';
    targetLanguage: string;
    autoTranslate: boolean; // 统一的自动翻译开关
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
    triggerMode: 'manual',
    hotkey: 'Ctrl+T',
    autoTranslateDelay: 1000,
    minTextLength: 2,
    enabledInputTypes: ['text', 'textarea', 'email', 'search', 'url'],
    excludeSelectors: ['.no-translate', '[data-no-translate]'],
  },

  pageTranslate: {
    enabled: true,
    mode: 'translated',
    targetLanguage: 'zh-CN',
    autoTranslate: false, // 默认关闭自动翻译
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

export const SPEECH_KEY = 'speech_settings'; // 语音合成相关设置
export const DEEPL_API_KEY = 'deepl_api_key';
export const YANDEX_API_KEY = 'yandex_api_key';

// 主题
export const THEME_OPTIONS = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'auto' }
]

// hooks

/**
 * 统一的全局设置管理 Hook
 * 提供类型安全的设置读取和更新功能
 */
export function useGlobalSettings() {
  const [settings, setStorageSettings] = useStorage<GlobalSettings>(
    GLOBAL_SETTINGS_KEY,
    DEFAULT_SETTINGS
  );

  // 使用 immer 进行不可变更新
  const updateSettings = useCallback(async (updates: PartialDeep<GlobalSettings>) => {
    const newSettings = produce(settings, (draft) => {
      // 递归合并更新
      Object.assign(draft, deepMergeWithImmer(draft, updates));
    });
    await setStorageSettings(newSettings);
  }, [settings, setStorageSettings]);

  // 重置设置到默认值
  const resetSettings = useCallback(async () => {
    await setStorageSettings(DEFAULT_SETTINGS);
  }, [setStorageSettings]);

  // 获取特定模块的设置
  const getModuleSettings = useCallback(<K extends keyof GlobalSettings>(
    module: K
  ): GlobalSettings[K] => {
    return settings[module];
  }, [settings]);

  // 使用 immer 更新特定模块的设置
  const updateModuleSettings = useCallback(async <K extends keyof GlobalSettings>(
    module: K,
    updates: PartialDeep<GlobalSettings[K]>
  ) => {
    const newSettings = produce(settings, (draft) => {
      Object.assign(draft[module], updates);
    });
    await setStorageSettings(newSettings);
  }, [settings, setStorageSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    getModuleSettings,
    updateModuleSettings,
  };
}

// 辅助函数：使用 immer 进行深度合并
function deepMergeWithImmer<T>(target: T, source: any): T {
  return produce(target, (draft: any) => {
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!draft[key]) {
          draft[key] = {};
        }
        draft[key] = deepMergeWithImmer(draft[key], source[key]);
      } else {
        draft[key] = source[key];
      }
    }
  });
}

/**
 * 专门用于主题设置的 Hook
 */
export function useThemeSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const themeSettings = settings.theme;

  const updateTheme = useCallback((updates: PartialDeep<GlobalSettings['theme']>) => {
    updateModuleSettings('theme', updates);
  }, [updateModuleSettings]);

  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'auto') => {
    updateTheme({ mode });
  }, [updateTheme]);

  const setUiLanguage = useCallback((uiLanguage: string) => {
    updateTheme({ uiLanguage });
  }, [updateTheme]);

  return {
    themeSettings,
    updateTheme,
    setThemeMode,
    setUiLanguage,
  };
}

/**
 * 专门用于翻译引擎设置的 Hook
 */
export function useEngineSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const engineSettings = settings.engines;

  const updateEngine = useCallback((updates: PartialDeep<GlobalSettings['engines']>) => {
    updateModuleSettings('engines', updates);
  }, [updateModuleSettings]);

  const setDefaultEngine = useCallback((engine: string) => {
    updateEngine({ default: engine });
  }, [updateEngine]);

  const updateApiKey = useCallback((
    provider: keyof GlobalSettings['engines']['apiKeys'],
    key: string
  ) => {
    updateEngine({
      apiKeys: {
        [provider]: key
      }
    });
  }, [updateEngine]);

  // 添加自定义引擎
  const addCustomEngine = useCallback((engine: GlobalSettings['engines']['customEngines'][0]) => {
    updateEngine({
      customEngines: [...engineSettings.customEngines, engine]
    });
  }, [updateEngine, engineSettings.customEngines]);

  // 移除自定义引擎
  const removeCustomEngine = useCallback((engineId: string) => {
    updateEngine(
      produce(engineSettings, (draft) => {
        draft.customEngines = draft.customEngines.filter(e => e.id !== engineId);
      })
    );
  }, [updateEngine, engineSettings]);

  // 更新自定义引擎
  const updateCustomEngine = useCallback((engineId: string, updates: Partial<GlobalSettings['engines']['customEngines'][0]>) => {
    updateEngine(
      produce(engineSettings, (draft) => {
        const engineIndex = draft.customEngines.findIndex(e => e.id === engineId);
        if (engineIndex !== -1) {
          Object.assign(draft.customEngines[engineIndex], updates);
        }
      })
    );
  }, [updateEngine, engineSettings]);

  return {
    engineSettings,
    updateEngine,
    setDefaultEngine,
    updateApiKey,
    addCustomEngine,
    removeCustomEngine,
    updateCustomEngine,
  };
}

/**
 * 专门用于文本翻译设置的 Hook
 */
export function useTextTranslateSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const textTranslateSettings = settings.textTranslate;

  const updateTextTranslate = useCallback((updates: PartialDeep<GlobalSettings['textTranslate']>) => {
    updateModuleSettings('textTranslate', updates);
  }, [updateModuleSettings]);


  const toggleEnabled = useCallback(() => {
    updateTextTranslate({ enabled: !textTranslateSettings.enabled });
  }, [textTranslateSettings.enabled, updateTextTranslate]);

  const setTriggerMode = useCallback((mode: keyof Pick<GlobalSettings['textTranslate'], 'doubleClickTranslate' | 'selectTranslate' | 'quickTranslate' | 'pressKeyTranslate'>, enabled: boolean) => {
    updateTextTranslate({ [mode]: enabled });
  }, [updateTextTranslate]);

  return {
    textTranslateSettings,
    updateTextTranslate,
    toggleEnabled,
    setTriggerMode,
  };
}

/**
 * 专门用于语言设置的 Hook
 */
export function useLanguageSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const languageSettings = settings.languages;

  const updateLanguages = useCallback((updates: PartialDeep<GlobalSettings['languages']>) => {
    updateModuleSettings('languages', updates);
  }, [updateModuleSettings]);

  const setPageTargetLanguage = useCallback((pageTarget: string) => {
    updateLanguages({ pageTarget });
  }, [updateLanguages]);

  const setTextTargetLanguage = useCallback((textTarget: string) => {
    updateLanguages({ textTarget });
  }, [updateLanguages]);

  // 使用 immer 简化数组操作
  const addFavoriteLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        if (!draft.favorites.includes(langCode)) {
          draft.favorites.push(langCode);
        }
      })
    );
  }, [languageSettings, updateLanguages]);

  const removeFavoriteLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        draft.favorites = draft.favorites.filter(code => code !== langCode);
      })
    );
  }, [languageSettings, updateLanguages]);

  const addNeverLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        if (!draft.never.includes(langCode)) {
          draft.never.push(langCode);
        }
      })
    );
  }, [languageSettings, updateLanguages]);

  const removeNeverLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        draft.never = draft.never.filter(code => code !== langCode);
      })
    );
  }, [languageSettings, updateLanguages]);

  const addAlwaysLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        if (!draft.always.includes(langCode)) {
          draft.always.push(langCode);
        }
      })
    );
  }, [languageSettings, updateLanguages]);

  const removeAlwaysLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        draft.always = draft.always.filter(code => code !== langCode);
      })
    );
  }, [languageSettings, updateLanguages]);

  return {
    languageSettings,
    updateLanguages,
    setPageTargetLanguage,
    setTextTargetLanguage,
    addFavoriteLanguage,
    removeFavoriteLanguage,
    addNeverLanguage,
    removeNeverLanguage,
    addAlwaysLanguage,
    removeAlwaysLanguage,
  };
}

/**
 * 专门用于输入翻译设置的 Hook
 */
export function useInputTranslateSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();

  const inputTranslateSettings = getModuleSettings('inputTranslate');

  const updateInputTranslate = useCallback((updates: PartialDeep<GlobalSettings['inputTranslate']>) => {
    updateModuleSettings('inputTranslate', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateInputTranslate({ enabled: !inputTranslateSettings.enabled });
  }, [inputTranslateSettings.enabled, updateInputTranslate]);

  return {
    inputTranslateSettings,
    updateInputTranslate,
    toggleEnabled,
  };
}

/**
 * 专门用于语音设置的 Hook
 */
export function useSpeechSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const speechSettings = settings.speech;

  const updateSpeech = useCallback((updates: PartialDeep<GlobalSettings['speech']>) => {
    updateModuleSettings('speech', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateSpeech({ enabled: !speechSettings.enabled });
  }, [speechSettings.enabled, updateSpeech]);

  const setEngine = useCallback((engine: GlobalSettings['speech']['engine']) => {
    updateSpeech({ engine });
  }, [updateSpeech]);

  const setVoiceSettings = useCallback((settings: { speed?: number; pitch?: number; volume?: number; }) => {
    updateSpeech(settings);
  }, [updateSpeech]);

  return {
    speechSettings,
    updateSpeech,
    toggleEnabled,
    setEngine,
    setVoiceSettings,
  };
}

/**
 * 专门用于缓存设置的 Hook
 */
export function useCacheSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();

  const cacheSettings = getModuleSettings('cache');

  const updateCache = useCallback((updates: PartialDeep<GlobalSettings['cache']>) => {
    updateModuleSettings('cache', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateCache({ enabled: !cacheSettings.enabled });
  }, [cacheSettings.enabled, updateCache]);

  return {
    cacheSettings,
    updateCache,
    toggleEnabled,
  };
}

/**
 * 专门用于快捷键设置的 Hook
 */
export function useShortcutSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();

  const shortcutSettings = getModuleSettings('shortcuts');

  const updateShortcuts = useCallback((updates: PartialDeep<GlobalSettings['shortcuts']>) => {
    updateModuleSettings('shortcuts', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateShortcuts({ enabled: !shortcutSettings.enabled });
  }, [shortcutSettings.enabled, updateShortcuts]);

  const updateShortcut = useCallback((key: keyof Omit<GlobalSettings['shortcuts'], 'enabled'>, value: string) => {
    updateShortcuts({ [key]: value });
  }, [updateShortcuts]);

  return {
    shortcutSettings,
    updateShortcuts,
    toggleEnabled,
    updateShortcut,
  };
}

/**
 * 专门用于收藏夹设置的 Hook
 */
export function useFavoritesSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const favoritesSettings = settings.favorites;

  const updateFavorites = useCallback((updates: PartialDeep<GlobalSettings['favorites']>) => {
    updateModuleSettings('favorites', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateFavorites({ enabled: !favoritesSettings.enabled });
  }, [favoritesSettings.enabled, updateFavorites]);

  // 使用 immer 优化收藏夹操作
  const addFavoriteWord = useCallback((word: GlobalSettings['favorites']['words'][0]) => {
    updateFavorites(
      produce(favoritesSettings, (draft) => {
        draft.words.push(word);
      })
    );
  }, [favoritesSettings, updateFavorites]);

  const removeFavoriteWord = useCallback((wordId: string) => {
    updateFavorites(
      produce(favoritesSettings, (draft) => {
        draft.words = draft.words.filter(w => w.id !== wordId);
      })
    );
  }, [favoritesSettings, updateFavorites]);

  const updateFavoriteWord = useCallback((wordId: string, updates: Partial<GlobalSettings['favorites']['words'][0]>) => {
    updateFavorites(
      produce(favoritesSettings, (draft) => {
        const wordIndex = draft.words.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
          Object.assign(draft.words[wordIndex], updates);
        }
      })
    );
  }, [favoritesSettings, updateFavorites]);

  const clearAllFavorites = useCallback(() => {
    updateFavorites({ words: [] });
  }, [updateFavorites]);

  return {
    favoritesSettings,
    updateFavorites,
    toggleEnabled,
    addFavoriteWord,
    removeFavoriteWord,
    updateFavoriteWord,
    clearAllFavorites,
  };
}

/**
 * 网页翻译设置 Hook（统一管理所有网页翻译相关配置）
 */
export function usePageTranslateSettings() {
  const { settings, updateSettings } = useGlobalSettings();

  const pageTranslateSettings = settings.pageTranslate;

  const updatePageTranslateSettings = useCallback(async (updates: PartialDeep<GlobalSettings['pageTranslate']>) => {
    await updateSettings({ pageTranslate: updates });
  }, [updateSettings]);

  // 基本功能
  const toggleEnabled = useCallback(async () => {
    await updatePageTranslateSettings({ enabled: !pageTranslateSettings.enabled });
  }, [pageTranslateSettings.enabled, updatePageTranslateSettings]);

  const toggleAutoTranslate = useCallback(async () => {
    await updatePageTranslateSettings({ autoTranslate: !pageTranslateSettings.autoTranslate });
  }, [pageTranslateSettings.autoTranslate, updatePageTranslateSettings]);

  const setTranslateMode = useCallback(async (mode: 'translated' | 'compare') => {
    await updatePageTranslateSettings({ mode });
  }, [updatePageTranslateSettings]);

  const setTargetLanguage = useCallback(async (targetLanguage: string) => {
    await updatePageTranslateSettings({ targetLanguage });
  }, [updatePageTranslateSettings]);

  return {
    pageTranslateSettings,
    updatePageTranslateSettings,
    // 基本功能
    toggleEnabled,
    toggleAutoTranslate,
    setTranslateMode,
    setTargetLanguage,
  };
}