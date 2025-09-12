/**
 * 全局设置管理
 * 统一管理所有配置项，提供类型安全和默认值
 */
import { useCallback, useState, useEffect } from 'react';
import { produce } from 'immer';
import { useStorage } from '../storage/storage';
import { 
  favoritesManager, 
  customDictionaryManager, 
  domainSettingsManager,
  translationCacheManager,
  type FavoriteWord,
  type CustomDictionaryEntry,
  type DomainSetting,
  type TranslationCacheEntry
} from '../storage/chrome_storage';

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
    showOriginal: boolean;
    selectTranslate: boolean;
    quickTranslate: boolean;
    pressKeyTranslate: boolean;
  };

  // 输入翻译设置（网页输入框翻译）
  inputTranslate: {
    enabled: boolean;
    triggerMode: 'auto' | 'hotkey';
    autoTranslateDelay: number; // 毫秒
    minTextLength: number;
    enabledInputTypes: string[]; // text, textarea, contenteditable 等
    excludeSelectors: string[]; // CSS选择器，排除某些输入框
  };

  // 网页翻译设置
  pageTranslate: {
    enabled: boolean;
    mode: 'translated' | 'compare';
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
    inputTarget: string;
  };

  // 快捷键设置
  shortcuts: {
    enabled: boolean;
    toggleTranslate: string;
    pageTranslate: string;
    openInput: string;
    textTranslate: string; // 原 textTranslate.hotkey
    inputTranslate: string; // 原 inputTranslate.hotkey
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
      originalText: string;
      translatedText: string;
      timestamp: number;
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
    showOriginal: false,
    selectTranslate: false, // 默认不自动翻译，显示图标
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
  },

  pageTranslate: {
    enabled: true,
    mode: 'translated',
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
    inputTarget: 'zh-CN'
  },

  shortcuts: {
    enabled: true,
    toggleTranslate: 'Alt+T',
    pageTranslate: 'Alt+P',
    openInput: 'Alt+I',
    textTranslate: 'Alt+S', // 原 textTranslate.hotkey
    inputTranslate: 'Ctrl+T', // 原 inputTranslate.hotkey
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

  const setTriggerMode = useCallback((mode: keyof Pick<GlobalSettings['textTranslate'], 'selectTranslate' | 'quickTranslate' | 'pressKeyTranslate'>, enabled: boolean) => {
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

  const setInputTargetLanguage = useCallback((inputTarget: string) => {
    updateLanguages({ inputTarget });
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
    setInputTargetLanguage,
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
 * 使用 Chrome Storage API 管理缓存数据
 */
export function useCacheSettings() {
  const [caches, setCaches] = useState<TranslationCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 缓存配置（从全局设置获取）
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  const cacheSettings = getModuleSettings('cache');

  const updateCache = useCallback((updates: PartialDeep<GlobalSettings['cache']>) => {
    updateModuleSettings('cache', updates);
  }, [updateModuleSettings]);

  const loadCaches = useCallback(async () => {
    try {
      setLoading(true);
      // 直接从 Chrome Storage 获取缓存数据
      const { chromeStorage } = await import('../storage/chrome_storage');
      const data = await chromeStorage.get<TranslationCacheEntry>('translationCache');
      setCaches(data);
      setError('');
    } catch (err) {
      console.error('加载缓存失败:', err);
      setError(err instanceof Error ? err.message : '加载缓存失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaches();
  }, [loadCaches]);

  const clearCache = useCallback(async () => {
    try {
      const success = await translationCacheManager.clear();
      if (success) {
        await loadCaches();
      }
      return success;
    } catch (err) {
      console.error('清空缓存失败:', err);
      setError(err instanceof Error ? err.message : '清空缓存失败');
      return false;
    }
  }, [loadCaches]);

  const getCacheStats = useCallback(async () => {
    try {
      return await translationCacheManager.getStats();
    } catch (err) {
      console.error('获取缓存统计失败:', err);
      return { count: 0, size: 0, hitRate: 0, totalRequests: 0, hitCount: 0 };
    }
  }, []);

  const toggleEnabled = useCallback(() => {
    updateCache({ enabled: !cacheSettings.enabled });
  }, [cacheSettings.enabled, updateCache]);

  return {
    caches,
    loading,
    error,
    cacheSettings,
    updateCache,
    clearCache,
    getCacheStats,
    refresh: loadCaches,
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
 * 使用 Chrome Storage API 管理收藏夹数据
 */
export function useFavoritesSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await favoritesManager.getFavorites();
      setFavorites(data);
      setError('');
    } catch (err) {
      console.error('加载收藏夹失败:', err);
      setError(err instanceof Error ? err.message : '加载收藏夹失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = useCallback(async (favorite: Omit<FavoriteWord, 'id' | 'timestamp'>) => {
    try {
      const success = await favoritesManager.addFavorite(favorite);
      if (success) {
        await loadFavorites();
      }
      return success;
    } catch (err) {
      console.error('添加收藏失败:', err);
      setError(err instanceof Error ? err.message : '添加收藏失败');
      return false;
    }
  }, [loadFavorites]);

  const deleteFavorite = useCallback(async (id: string) => {
    try {
      const success = await favoritesManager.deleteFavorite(id);
      if (success) {
        await loadFavorites();
      }
      return success;
    } catch (err) {
      console.error('删除收藏失败:', err);
      setError(err instanceof Error ? err.message : '删除收藏失败');
      return false;
    }
  }, [loadFavorites]);

  const clearFavorites = useCallback(async () => {
    try {
      const success = await favoritesManager.clearFavorites();
      if (success) {
        await loadFavorites();
      }
      return success;
    } catch (err) {
      console.error('清空收藏失败:', err);
      setError(err instanceof Error ? err.message : '清空收藏失败');
      return false;
    }
  }, [loadFavorites]);

  const searchFavorites = useCallback(async (query: string) => {
    try {
      return await favoritesManager.searchFavorites(query);
    } catch (err) {
      console.error('搜索收藏失败:', err);
      return [];
    }
  }, []);

  // 提供兼容性接口
  const favoritesSettings = {
    enabled: settings.favorites.enabled, // 从全局设置获取
    words: favorites,
    autoSave: settings.favorites.autoSave,
    maxSize: settings.favorites.maxSize,
  };

  const updateFavorites = useCallback((updates: { words?: FavoriteWord[] }) => {
    // 这是为了兼容现有代码，实际上数据通过 Chrome Storage 管理
    if (updates.words) {
      setFavorites(updates.words);
    }
  }, []);

  // 切换收藏夹启用状态
  const toggleEnabled = useCallback(() => {
    updateModuleSettings('favorites', { enabled: !settings.favorites.enabled });
  }, [settings.favorites.enabled, updateModuleSettings]);

  return {
    favorites,
    loading,
    error,
    favoritesSettings, // 兼容性
    addFavorite,
    deleteFavorite,
    clearFavorites,
    searchFavorites,
    refresh: loadFavorites,
    updateFavorites, // 兼容性
    toggleEnabled, // 新增：切换启用状态
    // 保持向后兼容的方法名
    addFavoriteWord: addFavorite,
    removeFavoriteWord: deleteFavorite,
    clearAllFavorites: clearFavorites,
  };
}

/**
 * 网页翻译设置 Hook（统一管理所有网页翻译相关配置）
 * 包含：基础设置、自定义词库、域名设置
 */
export function usePageTranslateSettings() {
  const { settings, updateSettings } = useGlobalSettings();

  const pageTranslateSettings = settings.pageTranslate;

  // 自定义词库状态
  const [dictionary, setDictionary] = useState<CustomDictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(true);
  const [dictError, setDictError] = useState<string>('');

  // 域名设置状态
  const [domainSettings, setDomainSettings] = useState<DomainSetting[]>([]);
  const [domainLoading, setDomainLoading] = useState(true);
  const [domainError, setDomainError] = useState<string>('');

  // 加载自定义词库
  const loadDictionary = useCallback(async () => {
    try {
      setDictLoading(true);
      const data = await customDictionaryManager.getDictionary();
      setDictionary(data);
      setDictError('');
    } catch (err) {
      console.error('加载自定义词库失败:', err);
      setDictError(err instanceof Error ? err.message : '加载自定义词库失败');
    } finally {
      setDictLoading(false);
    }
  }, []);

  // 加载域名设置
  const loadDomainSettings = useCallback(async () => {
    try {
      setDomainLoading(true);
      const data = await domainSettingsManager.getDomainSettings();
      setDomainSettings(data);
      setDomainError('');
    } catch (err) {
      console.error('加载域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '加载域名设置失败');
    } finally {
      setDomainLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadDictionary();
    loadDomainSettings();
  }, [loadDictionary, loadDomainSettings]);

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

  // 自定义词库功能
  const addDictionaryEntry = useCallback(async (entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>) => {
    try {
      const success = await customDictionaryManager.addEntry(entry);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('添加词库条目失败:', err);
      setDictError(err instanceof Error ? err.message : '添加词库条目失败');
      return false;
    }
  }, [loadDictionary]);

  const updateDictionaryEntry = useCallback(async (entry: CustomDictionaryEntry) => {
    try {
      const success = await customDictionaryManager.updateEntry(entry);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('更新词库条目失败:', err);
      setDictError(err instanceof Error ? err.message : '更新词库条目失败');
      return false;
    }
  }, [loadDictionary]);

  const deleteDictionaryEntry = useCallback(async (id: string) => {
    try {
      const success = await customDictionaryManager.deleteEntry(id);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('删除词库条目失败:', err);
      setDictError(err instanceof Error ? err.message : '删除词库条目失败');
      return false;
    }
  }, [loadDictionary]);

  const clearDictionary = useCallback(async () => {
    try {
      const success = await customDictionaryManager.clearDictionary();
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('清空词库失败:', err);
      setDictError(err instanceof Error ? err.message : '清空词库失败');
      return false;
    }
  }, [loadDictionary]);

  const getDictionaryByDomain = useCallback(async (domain: string) => {
    try {
      return await customDictionaryManager.getDictionaryByDomain(domain);
    } catch (err) {
      console.error('查询域名词库失败:', err);
      return [];
    }
  }, []);

  const findTranslation = useCallback(async (domain: string, original: string) => {
    try {
      return await customDictionaryManager.findTranslation(domain, original);
    } catch (err) {
      console.error('查找翻译失败:', err);
      return undefined;
    }
  }, []);

  // 域名设置功能
  const setDomainSetting = useCallback(async (setting: Omit<DomainSetting, 'timestamp'>) => {
    try {
      const success = await domainSettingsManager.setDomainSetting(setting);
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('设置域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '设置域名设置失败');
      return false;
    }
  }, [loadDomainSettings]);

  const deleteDomainSetting = useCallback(async (domain: string) => {
    try {
      const success = await domainSettingsManager.deleteDomainSetting(domain);
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('删除域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '删除域名设置失败');
      return false;
    }
  }, [loadDomainSettings]);

  const clearDomainSettings = useCallback(async () => {
    try {
      const success = await domainSettingsManager.clearDomainSettings();
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('清空域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '清空域名设置失败');
      return false;
    }
  }, [loadDomainSettings]);

  const isWhitelisted = useCallback(async (domain: string) => {
    try {
      return await domainSettingsManager.isWhitelisted(domain);
    } catch (err) {
      console.error('检查白名单失败:', err);
      return false;
    }
  }, []);

  const getWhitelistedDomains = useCallback(async () => {
    try {
      return await domainSettingsManager.getWhitelistedDomains();
    } catch (err) {
      console.error('获取白名单域名失败:', err);
      return [];
    }
  }, []);

  return {
    // 基础设置
    pageTranslateSettings,
    updatePageTranslateSettings,
    toggleEnabled,
    toggleAutoTranslate,
    setTranslateMode,
    
    // 自定义词库
    dictionary,
    dictLoading,
    dictError,
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    clearDictionary,
    getDictionaryByDomain,
    findTranslation,
    refreshDictionary: loadDictionary,
    
    // 域名设置
    domainSettings,
    domainLoading,
    domainError,
    setDomainSetting,
    deleteDomainSetting,
    clearDomainSettings,
    isWhitelisted,
    getWhitelistedDomains,
    refreshDomainSettings: loadDomainSettings,
  };
}