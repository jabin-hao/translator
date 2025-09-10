/**
 * Chrome Storage Hook
 * 用于在React组件中使用Chrome Storage API
 */
import { useState, useEffect, useCallback } from 'react';
import {
  favoritesManager,
  customDictionaryManager,
  domainSettingsManager,
  translationCacheManager,
  type FavoriteWord,
  type CustomDictionaryEntry,
  type DomainSetting,
  type TranslationCacheEntry
} from './chrome_storage';

// 收藏夹Hook
export function useFavorites() {
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

  return {
    favorites,
    loading,
    error,
    addFavorite,
    deleteFavorite,
    clearFavorites,
    searchFavorites,
    refresh: loadFavorites,
  };
}

// 自定义词库Hook
export function useCustomDictionary() {
  const [dictionary, setDictionary] = useState<CustomDictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadDictionary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customDictionaryManager.getDictionary();
      setDictionary(data);
      setError('');
    } catch (err) {
      console.error('加载自定义词库失败:', err);
      setError(err instanceof Error ? err.message : '加载自定义词库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDictionary();
  }, [loadDictionary]);

  const addDictionaryEntry = useCallback(async (entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>) => {
    try {
      const success = await customDictionaryManager.addEntry(entry);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('添加词库条目失败:', err);
      setError(err instanceof Error ? err.message : '添加词库条目失败');
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
      setError(err instanceof Error ? err.message : '更新词库条目失败');
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
      setError(err instanceof Error ? err.message : '删除词库条目失败');
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
      setError(err instanceof Error ? err.message : '清空词库失败');
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

  return {
    dictionary,
    loading,
    error,
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    clearDictionary,
    getDictionaryByDomain,
    findTranslation,
    refresh: loadDictionary,
  };
}

// 域名设置Hook
export function useDomainSettings() {
  const [domainSettings, setDomainSettings] = useState<DomainSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadDomainSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await domainSettingsManager.getDomainSettings();
      setDomainSettings(data);
      setError('');
    } catch (err) {
      console.error('加载域名设置失败:', err);
      setError(err instanceof Error ? err.message : '加载域名设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDomainSettings();
  }, [loadDomainSettings]);

  const setDomainSetting = useCallback(async (setting: Omit<DomainSetting, 'timestamp'>) => {
    try {
      const success = await domainSettingsManager.setDomainSetting(setting);
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('设置域名设置失败:', err);
      setError(err instanceof Error ? err.message : '设置域名设置失败');
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
      setError(err instanceof Error ? err.message : '删除域名设置失败');
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
      setError(err instanceof Error ? err.message : '清空域名设置失败');
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
    domainSettings,
    loading,
    error,
    setDomainSetting,
    deleteDomainSetting,
    clearDomainSettings,
    isWhitelisted,
    getWhitelistedDomains,
    refresh: loadDomainSettings,
  };
}
