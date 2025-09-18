/**
 * 收藏夹设置 Hook
 */
import { useCallback, useState, useEffect } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import { favoritesManager } from '../../storage/chrome_storage';
import type { FavoriteWord } from '../../constants/types';

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

  const favoritesSettings = {
    enabled: settings.favorites.enabled,
    words: favorites,
    autoSave: settings.favorites.autoSave,
    maxSize: settings.favorites.maxSize,
  };

  const updateFavorites = useCallback((updates: { words?: FavoriteWord[] }) => {
    if (updates.words) {
      setFavorites(updates.words);
    }
  }, []);

  const toggleEnabled = useCallback(() => {
    updateModuleSettings('favorites', { enabled: !settings.favorites.enabled });
  }, [settings.favorites.enabled, updateModuleSettings]);

  return {
    favorites,
    loading,
    error,
    favoritesSettings,
    addFavorite,
    deleteFavorite,
    clearFavorites,
    searchFavorites,
    refresh: loadFavorites,
    updateFavorites,
    toggleEnabled,
    // 兼容性方法名
    addFavoriteWord: addFavorite,
    removeFavoriteWord: deleteFavorite,
    clearAllFavorites: clearFavorites,
  };
}