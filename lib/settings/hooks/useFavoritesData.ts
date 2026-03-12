import { useCallback, useEffect, useState } from 'react';

import type { FavoriteWord } from '../../constants/types';
import { favoritesManager } from '../../storage/chrome_storage';

export function useFavoritesData() {
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setFavorites(await favoritesManager.getFavorites());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFavorite = useCallback(
    async (favorite: Omit<FavoriteWord, 'id' | 'timestamp'>) => {
      const success = await favoritesManager.addFavorite(favorite);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const deleteFavorite = useCallback(
    async (id: string) => {
      const success = await favoritesManager.deleteFavorite(id);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const clearFavorites = useCallback(async () => {
    const success = await favoritesManager.clearFavorites();
    if (success) {
      await refresh();
    }
    return success;
  }, [refresh]);

  const replaceFavorites = useCallback(
    async (nextFavorites: FavoriteWord[]) => {
      const success = await favoritesManager.replaceFavorites(nextFavorites);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const searchFavorites = useCallback((query: string) => {
    return favoritesManager.searchFavorites(query);
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
