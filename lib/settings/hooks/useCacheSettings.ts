/**
 * 缓存设置 Hook
 */
import { useCallback, useState, useEffect } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import { translationCacheManager } from '../../storage/chrome_storage';
import type { GlobalSettings, PartialDeep, TranslationCacheEntry } from '../../constants/types';

export function useCacheSettings() {
  const [caches, setCaches] = useState<TranslationCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();
  const cacheSettings = getModuleSettings('cache');

  const updateCache = useCallback((updates: PartialDeep<GlobalSettings['cache']>) => {
    updateModuleSettings('cache', updates);
  }, [updateModuleSettings]);

  const loadCaches = useCallback(async () => {
    try {
      setLoading(true);
      const { chromeStorage } = await import('../../storage/chrome_storage');
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