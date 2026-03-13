import { sendToBackground } from '@plasmohq/messaging';
import { useCallback, useEffect, useState } from 'react';

import type { TranslationCacheEntry } from '../../constants/types';
import { storageEvents } from '../../storage/indexed_db';

type CacheStats = {
  count: number;
  size: number;
  hitRate: number;
  totalRequests: number;
  hitCount: number;
};

async function requestCache<T>(action: string) {
  const response = await sendToBackground({
    name: 'handle' as never,
    body: {
      service: 'cache',
      action,
    },
  });

  if (!response?.success) {
    throw new Error(response?.error || `Cache action "${action}" failed`);
  }

  return response.data as T;
}

export function useTranslationCacheData() {
  const [cacheEntries, setCacheEntries] = useState<TranslationCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setCacheEntries(await requestCache<TranslationCacheEntry[]>('list'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translation cache');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    if (!chrome?.runtime?.onMessage) {
      return undefined;
    }

    const listener = (message: { type?: string }) => {
      if (message.type === storageEvents.cacheUpdated) {
        void refresh();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  const clearCache = useCallback(async () => {
    try {
      await requestCache('clear');
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const getCacheStats = useCallback(() => requestCache<CacheStats>('stats'), []);

  return {
    cacheEntries,
    loading,
    error,
    refresh,
    clearCache,
    getCacheStats,
  };
}
