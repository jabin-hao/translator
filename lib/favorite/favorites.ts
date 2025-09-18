// 收藏逻辑 - 使用 Chrome Storage API
// option | content 调用
import { useImmer } from 'use-immer';
import { useFavorites as useFavoritesHook } from '../storage/chrome_storage_hooks';
import { favoritesManager } from '../storage/chrome_storage';
import type { FavoriteWord } from '../constants/types';

// 收藏相关的工具函数 - 使用 Chrome Storage API
export class FavoritesManager {
  // 添加收藏
  static async addFavorite(
    originalText: string,
    translatedText: string
  ): Promise<void> {
    try {
      // 检查是否已存在相同的收藏
      const allFavorites = await favoritesManager.getFavorites();
      const existingFavorite = allFavorites.find(
        fav => fav.originalText === originalText && 
               fav.translatedText === translatedText
      );

      if (existingFavorite) {
        console.log('该收藏已存在');
        return;
      } else {
        // 添加新收藏
        await favoritesManager.addFavorite({
          originalText,
          translatedText
        });
      }
    } catch (error) {
      console.error('添加收藏失败:', error);
      throw error;
    }
  }

  // 删除收藏
  static async removeFavorite(id: string): Promise<void> {
    try {
      await favoritesManager.deleteFavorite(id);
    } catch (error) {
      console.error('删除收藏失败:', error);
      throw error;
    }
  }

  // 获取所有收藏
  static async getAllFavorites(): Promise<FavoriteWord[]> {
    try {
      return await favoritesManager.getFavorites();
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return [];
    }
  }

  // 清空收藏
  static async clearAllFavorites(): Promise<void> {
    try {
      await favoritesManager.clearFavorites();
    } catch (error) {
      console.error('清空收藏失败:', error);
      throw error;
    }
  }

  // 搜索收藏
  static async searchFavorites(keyword: string): Promise<FavoriteWord[]> {
    try {
      return await favoritesManager.searchFavorites(keyword);
    } catch (error) {
      console.error('搜索收藏失败:', error);
      return [];
    }
  }

  // 检查是否已收藏
  static async isFavorited(
    originalText: string,
    translatedText: string
  ): Promise<boolean> {
    try {
      const favorites = await favoritesManager.getFavorites();
      return favorites.some(
        fav => fav.originalText === originalText && 
               fav.translatedText === translatedText
      );
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  }

  // 获取所有收藏（简化版，不再支持按语言对筛选）
  static async getFavoritesByLanguagePair(): Promise<FavoriteWord[]> {
    try {
      return await favoritesManager.getFavorites();
    } catch (error) {
      console.error('获取收藏失败:', error);
      return [];
    }
  }

  // 获取收藏统计
  static async getFavoritesStats(): Promise<{
    total: number;
    recentCount: number;
  }> {
    try {
      const favorites = await favoritesManager.getFavorites();
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      let recentCount = 0;

      favorites.forEach(fav => {
        if (fav.timestamp > oneWeekAgo) {
          recentCount++;
        }
      });

      return {
        total: favorites.length,
        recentCount
      };
    } catch (error) {
      console.error('获取收藏统计失败:', error);
      return {
        total: 0,
        recentCount: 0
      };
    }
  }

  // 导出收藏到JSON
  static async exportFavorites(): Promise<string> {
    try {
      const favorites = await favoritesManager.getFavorites();
      return JSON.stringify(favorites, null, 2);
    } catch (error) {
      console.error('导出收藏失败:', error);
      throw error;
    }
  }

  // 从JSON导入收藏
  static async importFavorites(jsonData: string): Promise<void> {
    try {
      const favorites: any[] = JSON.parse(jsonData);
      
      for (const favorite of favorites) {
        // 验证数据结构，支持新旧格式
        const originalText = favorite.originalText || favorite.word;
        const translatedText = favorite.translatedText || favorite.translation;
        
        if (originalText && translatedText) {
          await favoritesManager.addFavorite({
            originalText,
            translatedText
          });
        }
      }
    } catch (error) {
      console.error('导入收藏失败:', error);
      throw error;
    }
  }
}

// 搜索收藏的辅助函数
export function searchInFavorites(favorites: FavoriteWord[], keyword: string): FavoriteWord[] {
  const lowercaseKeyword = keyword.toLowerCase();
  
  return favorites.filter(item =>
    (item.originalText?.toLowerCase().includes(lowercaseKeyword)) ||
    (item.translatedText?.toLowerCase().includes(lowercaseKeyword))
  );
}

// React Hook - 用于在组件中使用收藏功能
export const useFavorites = () => {
  const {
    favorites,
    loading,
    error,
    addFavorite,
    deleteFavorite,
    clearFavorites,
    searchFavorites,
    refresh
  } = useFavoritesHook();

  // 包装方法以保持API兼容性
  const addFavoriteCompat = async (
    originalText: string,
    translatedText: string
  ) => {
    return await addFavorite({
      originalText,
      translatedText
    });
  };

  const removeFavorite = async (id: string) => {
    return await deleteFavorite(id);
  };

  const isFavorited = (
    originalText: string,
    translatedText: string
  ): boolean => {
    return favorites.some(
      fav => fav.originalText === originalText && 
             fav.translatedText === translatedText
    );
  };

  const getFavoritesByLanguagePair = (): FavoriteWord[] => {
    return favorites;
  };

  const searchInCurrentFavorites = (keyword: string): FavoriteWord[] => {
    return searchInFavorites(favorites, keyword);
  };

  return {
    favorites,
    loading,
    error,
    addFavorite: addFavoriteCompat,
    removeFavorite,
    clearFavorites,
    isFavorited,
    getFavoritesByLanguagePair,
    searchFavorites: searchInCurrentFavorites,
    refresh
  };
};
