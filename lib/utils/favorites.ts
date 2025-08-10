import { useStorage } from '~lib/utils/storage';
import { message } from 'antd';

// 收藏单词的接口
export interface FavoriteWord {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  engine: string;
  timestamp: number;
  tags?: string[];
  note?: string;
}

// 收藏相关的工具函数
export class FavoritesManager {
  // 添加收藏
  static async addFavorite(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    engine: string,
    note?: string,
    tags?: string[]
  ): Promise<void> {
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteWords') || '[]') as FavoriteWord[];
      
      // 检查是否已存在相同的收藏
      const existingIndex = favorites.findIndex(
        item => item.originalText === originalText && 
                item.sourceLanguage === sourceLanguage && 
                item.targetLanguage === targetLanguage
      );
      
      if (existingIndex >= 0) {
        // 如果已存在，更新翻译结果和时间戳
        favorites[existingIndex] = {
          ...favorites[existingIndex],
          translatedText,
          engine,
          timestamp: Date.now(),
          note: note || favorites[existingIndex].note,
          tags: tags || favorites[existingIndex].tags
        };
        message.info('已更新收藏');
      } else {
        // 添加新收藏
        const newFavorite: FavoriteWord = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalText,
          translatedText,
          sourceLanguage,
          targetLanguage,
          engine,
          timestamp: Date.now(),
          note,
          tags
        };
        favorites.unshift(newFavorite); // 添加到开头
        message.success('已添加到收藏');
      }
      
      localStorage.setItem('favoriteWords', JSON.stringify(favorites));
    } catch (error) {
      console.error('添加收藏失败:', error);
      message.error('添加收藏失败');
    }
  }
  
  // 移除收藏
  static async removeFavorite(id: string): Promise<void> {
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteWords') || '[]') as FavoriteWord[];
      const newFavorites = favorites.filter(item => item.id !== id);
      localStorage.setItem('favoriteWords', JSON.stringify(newFavorites));
      message.success('已移除收藏');
    } catch (error) {
      console.error('移除收藏失败:', error);
      message.error('移除收藏失败');
    }
  }
  
  // 检查是否已收藏
  static isFavorited(originalText: string, sourceLanguage: string, targetLanguage: string): boolean {
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteWords') || '[]') as FavoriteWord[];
      return favorites.some(
        item => item.originalText === originalText && 
                item.sourceLanguage === sourceLanguage && 
                item.targetLanguage === targetLanguage
      );
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  }
  
  // 获取所有收藏
  static getFavorites(): FavoriteWord[] {
    try {
      return JSON.parse(localStorage.getItem('favoriteWords') || '[]') as FavoriteWord[];
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return [];
    }
  }
  
  // 搜索收藏
  static searchFavorites(query: string): FavoriteWord[] {
    try {
      const favorites = this.getFavorites();
      const lowercaseQuery = query.toLowerCase();
      return favorites.filter(item => 
        item.originalText.toLowerCase().includes(lowercaseQuery) ||
        item.translatedText.toLowerCase().includes(lowercaseQuery) ||
        (item.note && item.note.toLowerCase().includes(lowercaseQuery)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
      );
    } catch (error) {
      console.error('搜索收藏失败:', error);
      return [];
    }
  }
}

// React Hook for favorites management
export function useFavorites() {
  const [favorites, setFavorites] = useStorage<FavoriteWord[]>('favoriteWords', []);
  
  const addFavorite = async (
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    engine: string,
    note?: string,
    tags?: string[]
  ) => {
    await FavoritesManager.addFavorite(
      originalText, 
      translatedText, 
      sourceLanguage, 
      targetLanguage, 
      engine, 
      note, 
      tags
    );
    // 刷新本地状态
    const newFavorites = FavoritesManager.getFavorites();
    setFavorites(newFavorites);
  };
  
  const removeFavorite = async (id: string) => {
    await FavoritesManager.removeFavorite(id);
    // 刷新本地状态
    const newFavorites = FavoritesManager.getFavorites();
    setFavorites(newFavorites);
  };
  
  const isFavorited = (originalText: string, sourceLanguage: string, targetLanguage: string) => {
    return FavoritesManager.isFavorited(originalText, sourceLanguage, targetLanguage);
  };
  
  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorited,
    setFavorites
  };
}
