/**
 * 基于IndexedDB的数据管理Hooks
 * 为收藏夹、自定义词库、域名设置和翻译缓存提供统一的数据操作接口
 */
import { useImmer } from 'use-immer';
import { useCallback, useEffect } from 'react';
import { IndexedDBManager, DATABASE_CONFIGS } from './indexedDB';

// 数据类型定义
export interface FavoriteWord {
  id: string;
  word: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  tags?: string[];
  notes?: string;
}

export interface CustomDictionaryEntry {
  id: string;
  domain: string;
  original: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  isActive: boolean;
}

export interface DomainSetting {
  domain: string;
  type: 'whitelist' | 'blacklist' | 'auto' | 'manual';
  enabled: boolean;
  targetLanguage?: string;
  timestamp: number;
  notes?: string;
}

export interface TranslationCacheEntry {
  key: string;
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  timestamp: number;
  accessCount?: number;
  lastAccessed?: number;
}

// 数据库管理器实例
const dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);

// 通用数据操作Hook
export function useIndexedDBData<T>(storeName: string) {
  const [data, setData] = useImmer<T[]>([]);
  const [loading, setLoading] = useImmer(false);
  const [error, setError] = useImmer<string | null>(null);

  // 初始化数据库
  const initDB = useCallback(async () => {
    try {
      await dbManager.init();
    } catch (err) {
      console.error('初始化数据库失败:', err);
      setError(err instanceof Error ? err.message : '数据库初始化失败');
    }
  }, []);

  // 加载所有数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initDB();
      const result = await dbManager.getAll<T>(storeName);
      setData(result);
    } catch (err) {
      console.error('加载数据失败:', err);
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [storeName, initDB]);

  // 添加数据
  const addData = useCallback(async (item: T) => {
    try {
      await initDB();
      await dbManager.put(storeName, item);
      await loadData(); // 重新加载数据
      return true;
    } catch (err) {
      console.error('添加数据失败:', err);
      setError(err instanceof Error ? err.message : '添加数据失败');
      return false;
    }
  }, [storeName, initDB, loadData]);

  // 更新数据
  const updateData = useCallback(async (item: T) => {
    try {
      await initDB();
      await dbManager.put(storeName, item);
      await loadData(); // 重新加载数据
      return true;
    } catch (err) {
      console.error('更新数据失败:', err);
      setError(err instanceof Error ? err.message : '更新数据失败');
      return false;
    }
  }, [storeName, initDB, loadData]);

  // 删除数据
  const deleteData = useCallback(async (key: string | number) => {
    try {
      await initDB();
      await dbManager.delete(storeName, key);
      await loadData(); // 重新加载数据
      return true;
    } catch (err) {
      console.error('删除数据失败:', err);
      setError(err instanceof Error ? err.message : '删除数据失败');
      return false;
    }
  }, [storeName, initDB, loadData]);

  // 根据索引查询数据
  const queryByIndex = useCallback(async (indexName: string, value: any) => {
    try {
      await initDB();
      return await dbManager.getByIndex<T>(storeName, indexName, value);
    } catch (err) {
      console.error('查询数据失败:', err);
      setError(err instanceof Error ? err.message : '查询数据失败');
      return [];
    }
  }, [storeName, initDB]);

  // 清空所有数据
  const clearData = useCallback(async () => {
    try {
      await initDB();
      await dbManager.clear(storeName);
      setData([]);
      return true;
    } catch (err) {
      console.error('清空数据失败:', err);
      setError(err instanceof Error ? err.message : '清空数据失败');
      return false;
    }
  }, [storeName, initDB]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    loadData,
    addData,
    updateData,
    deleteData,
    queryByIndex,
    clearData,
  };
}

// 翻译缓存管理Hook
export function useTranslationCache() {
  const {
    data: cache,
    loading,
    error,
    addData,
    updateData,
    deleteData,
    clearData,
  } = useIndexedDBData<TranslationCacheEntry>('translationCache');

  // 生成缓存键
  const generateCacheKey = useCallback(async (text: string, from: string, to: string, engine: string) => {
    const normalizedText = text.trim().toLowerCase();
    const normalizedFrom = from.toLowerCase();
    const normalizedTo = to.toLowerCase();
    const normalizedEngine = engine.toLowerCase();
    
    const input = `${normalizedText}||${normalizedFrom}||${normalizedTo}||${normalizedEngine}`;
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // 如果SHA-1不可用，使用简单哈希
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  }, []);

  // 获取缓存
  const getCachedTranslation = useCallback(async (text: string, from: string, to: string, engine: string) => {
    const key = await generateCacheKey(text, from, to, engine);
    const cached = cache.find(item => item.key === key);
    
    if (cached) {
      // 更新访问统计
      const updatedCache: TranslationCacheEntry = {
        ...cached,
        accessCount: (cached.accessCount || 0) + 1,
        lastAccessed: Date.now(),
      };
      await updateData(updatedCache);
      return cached.translatedText;
    }
    
    return null;
  }, [cache, generateCacheKey, updateData]);

  // 设置缓存
  const setCachedTranslation = useCallback(async (
    text: string, 
    translation: string, 
    from: string, 
    to: string, 
    engine: string
  ) => {
    const key = await generateCacheKey(text, from, to, engine);
    
    const cacheEntry: TranslationCacheEntry = {
      key,
      originalText: text,
      translatedText: translation,
      detectedLanguage: from,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };
    
    // 检查是否已存在
    const existing = cache.find(item => item.key === key);
    if (existing) {
      return await updateData(cacheEntry);
    } else {
      return await addData(cacheEntry);
    }
  }, [cache, generateCacheKey, addData, updateData]);

  // 删除过期缓存
  const cleanupExpiredCache = useCallback(async (maxAge: number) => {
    const now = Date.now();
    const expiredEntries = cache.filter(item => 
      item.timestamp && (now - item.timestamp) > maxAge
    );
    
    for (const entry of expiredEntries) {
      await deleteData(entry.key);
    }
    
    return expiredEntries.length;
  }, [cache, deleteData]);

  // 获取缓存统计
  const getCacheStats = useCallback(() => {
    const totalEntries = cache.length;
    const totalSize = cache.reduce((sum, entry) => sum + JSON.stringify(entry).length, 0);
    
    return {
      count: totalEntries,
      size: totalSize,
      memoryUsage: totalSize,
    };
  }, [cache]);

  return {
    cache,
    loading,
    error,
    getCachedTranslation,
    setCachedTranslation,
    deleteCachedTranslation: deleteData,
    clearCache: clearData,
    cleanupExpiredCache,
    getCacheStats,
  };
}

// 收藏夹管理Hook
export function useFavorites() {
  const {
    data: favorites,
    loading,
    error,
    addData,
    updateData,
    deleteData,
    queryByIndex,
    clearData,
  } = useIndexedDBData<FavoriteWord>('favorites');

  // 添加收藏
  const addFavorite = useCallback(async (word: Omit<FavoriteWord, 'id' | 'timestamp'>) => {
    const favorite: FavoriteWord = {
      ...word,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    return await addData(favorite);
  }, [addData]);

  // 搜索收藏
  const searchFavorites = useCallback((keyword: string) => {
    if (!keyword.trim()) return favorites;
    const lowerKeyword = keyword.toLowerCase();
    return favorites.filter(item => 
      item.word.toLowerCase().includes(lowerKeyword) ||
      item.translation.toLowerCase().includes(lowerKeyword) ||
      item.notes?.toLowerCase().includes(lowerKeyword)
    );
  }, [favorites]);

  return {
    favorites,
    loading,
    error,
    addFavorite,
    updateFavorite: updateData,
    deleteFavorite: deleteData,
    clearFavorites: clearData,
    searchFavorites,
  };
}

// 自定义词库管理Hook
export function useCustomDictionary() {
  const {
    data: dictionary,
    loading,
    error,
    addData,
    updateData,
    deleteData,
    queryByIndex,
    clearData,
  } = useIndexedDBData<CustomDictionaryEntry>('customDictionary');

  // 添加词库条目
  const addDictionaryEntry = useCallback(async (entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>) => {
    const dictionaryEntry: CustomDictionaryEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    return await addData(dictionaryEntry);
  }, [addData]);

  // 根据域名查询词库
  const getDictionaryByDomain = useCallback(async (domain: string) => {
    return await queryByIndex('domain', domain);
  }, [queryByIndex]);

  // 查找翻译
  const findTranslation = useCallback(async (domain: string, original: string) => {
    const domainEntries = await getDictionaryByDomain(domain);
    return domainEntries.find(entry => 
      entry.original.toLowerCase() === original.toLowerCase() && entry.isActive
    );
  }, [getDictionaryByDomain]);

  return {
    dictionary,
    loading,
    error,
    addDictionaryEntry,
    updateDictionaryEntry: updateData,
    deleteDictionaryEntry: deleteData,
    clearDictionary: clearData,
    getDictionaryByDomain,
    findTranslation,
  };
}

// 域名设置管理Hook
export function useDomainSettings() {
  const {
    data: domainSettings,
    loading,
    error,
    addData,
    updateData,
    deleteData,
    queryByIndex,
    clearData,
  } = useIndexedDBData<DomainSetting>('domainSettings');

  // 添加或更新域名设置
  const setDomainSetting = useCallback(async (setting: Omit<DomainSetting, 'timestamp'>) => {
    const domainSetting: DomainSetting = {
      ...setting,
      timestamp: Date.now(),
    };
    
    // 检查是否已存在
    const existing = domainSettings.find(item => item.domain === setting.domain);
    if (existing) {
      return await updateData(domainSetting);
    } else {
      return await addData(domainSetting);
    }
  }, [domainSettings, addData, updateData]);

  // 获取域名设置
  const getDomainSetting = useCallback((domain: string) => {
    return domainSettings.find(item => item.domain === domain);
  }, [domainSettings]);

  // 检查域名是否在黑名单
  const isBlacklisted = useCallback((domain: string) => {
    const setting = getDomainSetting(domain);
    return setting?.type === 'blacklist' && setting.enabled;
  }, [getDomainSetting]);

  // 检查域名是否在白名单
  const isWhitelisted = useCallback((domain: string) => {
    const setting = getDomainSetting(domain);
    return setting?.type === 'whitelist' && setting.enabled;
  }, [getDomainSetting]);

  return {
    domainSettings,
    loading,
    error,
    setDomainSetting,
    deleteDomainSetting: deleteData,
    clearDomainSettings: clearData,
    getDomainSetting,
    isBlacklisted,
    isWhitelisted,
  };
}