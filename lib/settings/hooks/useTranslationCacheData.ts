import { useCallback, useEffect, useState } from 'react';

import type { TranslationCacheEntry } from '../../constants/types';
import { cacheManager } from '../../cache/cache';
import { translationCacheManager } from '../../storage/chrome_storage';

export function useTranslationCacheData() {
  const [cacheEntries, setCacheEntries] = useState<TranslationCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setCacheEntries(await translationCacheManager.getEntries());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translation cache');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearCache = useCallback(async () => {
    const success = await translationCacheManager.clear();
    if (success) {
      await refresh();
    }
    return success;
  }, [refresh]);

  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  return {
    cacheEntries,
    loading,
    error,
    refresh,
    clearCache,
    getCacheStats,
  };
}
