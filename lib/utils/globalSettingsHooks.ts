import { useCallback } from 'react';
import { useStorage } from './storage';
import type { 
  GlobalSettings, 
  PartialDeep 
} from '../settings/globalSettings';
import { 
  DEFAULT_SETTINGS, 
  GLOBAL_SETTINGS_KEY
} from '../settings/globalSettings';

/**
 * 统一的全局设置管理 Hook
 * 提供类型安全的设置读取和更新功能
 */
export function useGlobalSettings() {
  const [settings, setStorageSettings] = useStorage<GlobalSettings>(
    GLOBAL_SETTINGS_KEY, 
    DEFAULT_SETTINGS
  );

  // 深度合并设置更新
  const updateSettings = useCallback(async (updates: PartialDeep<GlobalSettings>) => {
    const mergedSettings = deepMerge(settings, updates);
    await setStorageSettings(mergedSettings);
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

  // 更新特定模块的设置
  const updateModuleSettings = useCallback(async <K extends keyof GlobalSettings>(
    module: K,
    updates: PartialDeep<GlobalSettings[K]>
  ) => {
    await updateSettings({ [module]: updates } as PartialDeep<GlobalSettings>);
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    getModuleSettings,
    updateModuleSettings,
  };
}

/**
 * 专门用于主题设置的 Hook
 */
export function useThemeSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  
  const themeSettings = getModuleSettings('theme');
  
  const updateTheme = useCallback((updates: PartialDeep<GlobalSettings['theme']>) => {
    updateModuleSettings('theme', updates);
  }, [updateModuleSettings]);

  return {
    themeSettings,
    updateTheme,
  };
}

/**
 * 专门用于翻译引擎设置的 Hook
 */
export function useEngineSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  
  const engineSettings = getModuleSettings('engines');
  
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

  return {
    engineSettings,
    updateEngines,
    setDefaultEngine,
    updateApiKey,
  };
}

/**
 * 专门用于文本翻译设置的 Hook
 */
export function useTextTranslateSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  
  const textTranslateSettings = getModuleSettings('textTranslate');
  
  const updateTextTranslate = useCallback((updates: PartialDeep<GlobalSettings['textTranslate']>) => {
    updateModuleSettings('textTranslate', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateTextTranslate({ enabled: !textTranslateSettings.enabled });
  }, [textTranslateSettings.enabled, updateTextTranslate]);

  return {
    textTranslateSettings,
    updateTextTranslate,
    toggleEnabled,
  };
}

/**
 * 专门用于语言设置的 Hook
 */
export function useLanguageSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  
  const languageSettings = getModuleSettings('languages');
  
  const updateLanguages = useCallback((updates: PartialDeep<GlobalSettings['languages']>) => {
    updateModuleSettings('languages', updates);
  }, [updateModuleSettings]);

  const setPageTargetLanguage = useCallback((pageTarget: string) => {
    updateLanguages({ pageTarget });
  }, [updateLanguages]);

  const setTextTargetLanguage = useCallback((textTarget: string) => {
    updateLanguages({ textTarget });
  }, [updateLanguages]);

  const addFavoriteLanguage = useCallback((langCode: string) => {
    if (!languageSettings.favorites.includes(langCode)) {
      const newFavorites = [...languageSettings.favorites, langCode];
      updateLanguages({ favorites: newFavorites });
    }
  }, [languageSettings.favorites, updateLanguages]);

  const removeFavoriteLanguage = useCallback((langCode: string) => {
    const newFavorites = languageSettings.favorites.filter(code => code !== langCode);
    updateLanguages({ favorites: newFavorites });
  }, [languageSettings.favorites, updateLanguages]);

  const addNeverLanguage = useCallback((langCode: string) => {
    if (!languageSettings.never.includes(langCode)) {
      const newNever = [...languageSettings.never, langCode];
      updateLanguages({ never: newNever });
    }
  }, [languageSettings.never, updateLanguages]);

  const removeNeverLanguage = useCallback((langCode: string) => {
    const newNever = languageSettings.never.filter(code => code !== langCode);
    updateLanguages({ never: newNever });
  }, [languageSettings.never, updateLanguages]);

  const addAlwaysLanguage = useCallback((langCode: string) => {
    if (!languageSettings.always.includes(langCode)) {
      const newAlways = [...languageSettings.always, langCode];
      updateLanguages({ always: newAlways });
    }
  }, [languageSettings.always, updateLanguages]);

  const removeAlwaysLanguage = useCallback((langCode: string) => {
    const newAlways = languageSettings.always.filter(code => code !== langCode);
    updateLanguages({ always: newAlways });
  }, [languageSettings.always, updateLanguages]);

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
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  
  const speechSettings = getModuleSettings('speech');
  
  const updateSpeech = useCallback((updates: PartialDeep<GlobalSettings['speech']>) => {
    updateModuleSettings('speech', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateSpeech({ enabled: !speechSettings.enabled });
  }, [speechSettings.enabled, updateSpeech]);

  return {
    speechSettings,
    updateSpeech,
    toggleEnabled,
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
 * 专门用于收藏夹设置的 Hook
 */
export function useFavoritesSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  
  const favoritesSettings = getModuleSettings('favorites');
  
  const updateFavorites = useCallback((updates: PartialDeep<GlobalSettings['favorites']>) => {
    updateModuleSettings('favorites', updates);
  }, [updateModuleSettings]);

  return {
    favoritesSettings,
    updateFavorites,
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
    await updatePageTranslateSettings({ autoTranslateEnabled: !pageTranslateSettings.autoTranslateEnabled });
  }, [pageTranslateSettings.autoTranslateEnabled, updatePageTranslateSettings]);

  const setMode = useCallback(async (mode: 'never' | 'always' | 'ask') => {
    await updatePageTranslateSettings({ mode });
  }, [updatePageTranslateSettings]);

  const setTargetLanguage = useCallback(async (targetLanguage: string) => {
    await updatePageTranslateSettings({ targetLanguage });
  }, [updatePageTranslateSettings]);

  // 网站列表管理（从 siteTranslateSettings 迁移的功能）
  const addToAlwaysList = useCallback(async (domain: string) => {
    const currentAlwaysList = pageTranslateSettings.alwaysList || [];
    const currentNeverList = pageTranslateSettings.neverList || [];
    
    if (!currentAlwaysList.includes(domain)) {
      await updatePageTranslateSettings({
        alwaysList: [...currentAlwaysList, domain],
        neverList: currentNeverList.filter(d => d !== domain)
      });
    }
  }, [pageTranslateSettings.alwaysList, pageTranslateSettings.neverList, updatePageTranslateSettings]);

  const addToNeverList = useCallback(async (domain: string) => {
    const currentAlwaysList = pageTranslateSettings.alwaysList || [];
    const currentNeverList = pageTranslateSettings.neverList || [];
    
    if (!currentNeverList.includes(domain)) {
      await updatePageTranslateSettings({
        neverList: [...currentNeverList, domain],
        alwaysList: currentAlwaysList.filter(d => d !== domain)
      });
    }
  }, [pageTranslateSettings.alwaysList, pageTranslateSettings.neverList, updatePageTranslateSettings]);

  const removeFromAlwaysList = useCallback(async (domain: string) => {
    const currentAlwaysList = pageTranslateSettings.alwaysList || [];
    await updatePageTranslateSettings({
      alwaysList: currentAlwaysList.filter(d => d !== domain)
    });
  }, [pageTranslateSettings.alwaysList, updatePageTranslateSettings]);

  const removeFromNeverList = useCallback(async (domain: string) => {
    const currentNeverList = pageTranslateSettings.neverList || [];
    await updatePageTranslateSettings({
      neverList: currentNeverList.filter(d => d !== domain)
    });
  }, [pageTranslateSettings.neverList, updatePageTranslateSettings]);

  const setPageTranslateMode = useCallback(async (mode: string) => {
    await updatePageTranslateSettings({ pageTranslateMode: mode });
  }, [updatePageTranslateSettings]);

  // 网站匹配逻辑 - 从 siteTranslateSettings 迁移
  const matchSiteList = useCallback((list: string[], url: string): boolean => {
    if (list.includes(url)) {
      return true;
    }
    
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      let path = u.pathname;

      while (path && path !== '/') {
        const test = u.hostname + path;
        if (list.includes(test)) {
          return true;
        }
        path = path.substring(0, path.lastIndexOf('/'));
      }
      
      return list.includes(u.hostname);
    } catch (error) {
      return list.some(item => url.startsWith(item));
    }
  }, []);

  return {
    pageTranslateSettings,
    updatePageTranslateSettings,
    // 基本功能
    toggleEnabled,
    toggleAutoTranslate,
    setMode,
    setTargetLanguage,
    // 网站列表管理
    addToAlwaysList,
    addToNeverList,
    removeFromAlwaysList,
    removeFromNeverList,
    setPageTranslateMode,
    matchSiteList,
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
          const updatedEntry: CustomDictEntry = {
            ...existingEntry,
            customTranslation: entry.customTranslation,
            lastUsed: Date.now()
          };
          
          const updateRequest = store.put(updatedEntry);
          updateRequest.onsuccess = () => resolve(updatedEntry.id!);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          // 添加新条目
          const newEntry: CustomDictEntry = {
            ...entry,
            timestamp: Date.now(),
            lastUsed: Date.now()
          };
          
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
