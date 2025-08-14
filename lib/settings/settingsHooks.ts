import { useCallback } from 'react';
import { produce } from 'immer';
import { useStorage } from '../storage/storage';
import type {
  GlobalSettings,
  PartialDeep
} from './settings';
import {
  DEFAULT_SETTINGS,
  GLOBAL_SETTINGS_KEY
} from './settings';

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

  const updateEngines = useCallback((updates: PartialDeep<GlobalSettings['engines']>) => {
    updateModuleSettings('engines', updates);
  }, [updateModuleSettings]);

  const setDefaultEngine = useCallback((engine: string) => {
    updateEngines({ default: engine });
  }, [updateEngines]);

  const updateApiKey = useCallback((
    provider: keyof GlobalSettings['engines']['apiKeys'],
    key: string
  ) => {
    updateEngines({
      apiKeys: {
        [provider]: key
      }
    });
  }, [updateEngines]);

  // 添加自定义引擎
  const addCustomEngine = useCallback((engine: GlobalSettings['engines']['customEngines'][0]) => {
    updateEngines({
      customEngines: [...engineSettings.customEngines, engine]
    });
  }, [updateEngines, engineSettings.customEngines]);

  // 移除自定义引擎
  const removeCustomEngine = useCallback((engineId: string) => {
    updateEngines(
      produce(engineSettings, (draft) => {
        draft.customEngines = draft.customEngines.filter(e => e.id !== engineId);
      })
    );
  }, [updateEngines, engineSettings]);

  // 更新自定义引擎
  const updateCustomEngine = useCallback((engineId: string, updates: Partial<GlobalSettings['engines']['customEngines'][0]>) => {
    updateEngines(
      produce(engineSettings, (draft) => {
        const engineIndex = draft.customEngines.findIndex(e => e.id === engineId);
        if (engineIndex !== -1) {
          Object.assign(draft.customEngines[engineIndex], updates);
        }
      })
    );
  }, [updateEngines, engineSettings]);

  return {
    engineSettings,
    updateEngines,
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

  const setMode = useCallback(async (mode: 'translated' | 'compare') => {
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
    setMode,
    setTargetLanguage,
  };
}

// ===== 自定义词库功能 =====

// 自定义词库条目接口
export interface CustomDictEntry {
  id?: number; // 自动生成的主键
  host: string; // 网站域名
  originalText: string; // 原文
  customTranslation: string; // 自定义翻译
  timestamp?: number; // 创建时间戳
  lastUsed?: number; // 最后使用时间
}

// IndexedDB 自定义词库管理器
class CustomDictManager {
  private dbName = 'TranslatorCustomDict';
  private version = 1;
  private storeName = 'customDictEntries';
  private db: IDBDatabase | null = null;

  // 初始化数据库
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // 创建自定义词库存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });

          // 创建索引
          store.createIndex('host', 'host', { unique: false });
          store.createIndex('originalText', 'originalText', { unique: false });
          store.createIndex('hostAndOriginal', ['host', 'originalText'], { unique: true });
        }
      };
    });
  }

  // 添加或更新自定义词库条目
  async addEntry(entry: Omit<CustomDictEntry, 'id' | 'timestamp'>): Promise<number> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('hostAndOriginal');

      // 先检查是否已存在
      const checkRequest = index.get([entry.host, entry.originalText]);

      checkRequest.onsuccess = () => {
        const existingEntry = checkRequest.result;

        if (existingEntry) {
          // 更新现有条目
          const updatedEntry = produce(existingEntry, (draft: CustomDictEntry) => {
            draft.customTranslation = entry.customTranslation;
            draft.lastUsed = Date.now();
          });
          const updateRequest = store.put(updatedEntry);
          updateRequest.onsuccess = () => resolve(existingEntry.id!);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          // 添加新条目
          const newEntry = produce(entry, (draft: CustomDictEntry) => {
            draft.timestamp = Date.now();
            draft.lastUsed = Date.now();
          });
          const addRequest = store.add(newEntry);
          addRequest.onsuccess = () => resolve(addRequest.result as number);
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      checkRequest.onerror = () => reject(checkRequest.error);
    });
  }

  // 获取指定网站的所有自定义词库
  async getEntriesByHost(host: string): Promise<CustomDictEntry[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('host');
      const request = index.getAll(host);

      request.onsuccess = () => {
        const entries = request.result;
        resolve(entries);
      };
      request.onerror = () => {
        console.error(`[CustomDictManager] 获取词库失败:`, request.error);
        reject(request.error);
      };
    });
  }

  // 查找自定义翻译
  async findCustomTranslation(host: string, originalText: string): Promise<string | null> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('hostAndOriginal');
      const request = index.get([host, originalText]);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          // 更新最后使用时间
          entry.lastUsed = Date.now();
          store.put(entry);
          resolve(entry.customTranslation);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error(`[CustomDictManager] 查找自定义翻译失败:`, request.error);
        reject(request.error);
      };
    });
  }

  // 删除自定义词库条目
  async deleteEntry(id: number): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 删除指定网站的所有自定义词库
  async deleteEntriesByHost(host: string): Promise<void> {
    const entries = await this.getEntriesByHost(host);
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      let completed = 0;
      let errors: any[] = [];

      if (entries.length === 0) {
        resolve();
        return;
      }

      entries.forEach(entry => {
        const request = store.delete(entry.id!);

        request.onsuccess = () => {
          completed++;
          if (completed === entries.length) {
            if (errors.length > 0) {
              reject(errors[0]);
            } else {
              resolve();
            }
          }
        };

        request.onerror = () => {
          errors.push(request.error);
          completed++;
          if (completed === entries.length) {
            reject(errors[0]);
          }
        };
      });
    });
  }

  // 获取统计信息
  async getStats(): Promise<{ totalEntries: number; entriesByHost: Record<string, number> }> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const entriesByHost: Record<string, number> = {};

        entries.forEach(entry => {
          entriesByHost[entry.host] = (entriesByHost[entry.host] || 0) + 1;
        });

        resolve({
          totalEntries: entries.length,
          entriesByHost
        });
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// 创建全局实例
const customDictManager = new CustomDictManager();

// 自定义词库 API 函数
export async function addCustomDictEntry(host: string, originalText: string, customTranslation: string): Promise<number> {
  return customDictManager.addEntry({ host, originalText, customTranslation });
}

export async function getCustomDictEntries(host: string): Promise<CustomDictEntry[]> {
  return customDictManager.getEntriesByHost(host);
}

export async function findCustomTranslation(host: string, originalText: string): Promise<string | null> {
  return customDictManager.findCustomTranslation(host, originalText);
}

export async function deleteCustomDictEntry(id: number): Promise<void> {
  return customDictManager.deleteEntry(id);
}

export async function deleteCustomDictByHost(host: string): Promise<void> {
  return customDictManager.deleteEntriesByHost(host);
}

export async function getCustomDictStats(): Promise<{ totalEntries: number; entriesByHost: Record<string, number> }> {
  return customDictManager.getStats();
}

// 深度合并工具函数
function deepMerge<T>(target: T, source: PartialDeep<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue !== undefined) {
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}
