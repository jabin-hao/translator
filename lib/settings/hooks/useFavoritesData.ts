import { sendToBackground } from '@plasmohq/messaging';
import { useCallback, useEffect, useState } from 'react';

import type { FavoriteWord } from '../../constants/types';
import { storageEvents } from '../../storage/indexed_db';

async function requestFavorites<T>(action: string, options?: Record<string, unknown>) {
  const response = await sendToBackground({
    name: 'handle' as never,
    body: {
      service: 'favorites',
      action,
      options,
    },
  });

  if (!response?.success) {
    throw new Error(response?.error || `Favorites action "${action}" failed`);
  }

  return response.data as T;
}

export function useFavoritesData() {
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setFavorites(await requestFavorites<FavoriteWord[]>('list'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
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
      if (message.type === storageEvents.favoritesUpdated) {
        void refresh();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  const addFavorite = useCallback(
    async (favorite: Omit<FavoriteWord, 'id' | 'timestamp'>) => {
      try {
        await requestFavorites('add', { favorite });
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const deleteFavorite = useCallback(
    async (id: string) => {
      try {
        await requestFavorites('delete', { id });
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const clearFavorites = useCallback(async () => {
    try {
      await requestFavorites('clear');
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const replaceFavorites = useCallback(
    async (nextFavorites: FavoriteWord[]) => {
      try {
        await requestFavorites('replace', { favorites: nextFavorites });
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const searchFavorites = useCallback((query: string) => {
    return requestFavorites<FavoriteWord[]>('search', { query });
  }, []);

  return {
    favorites,
    loading,
    error,
    refresh,
    addFavorite,
    deleteFavorite,
    clearFavorites,
    replaceFavorites,
    searchFavorites,
  };
}
