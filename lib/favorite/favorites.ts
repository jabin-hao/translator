import { produce } from 'immer';
import { useFavorites as useIndexedDBFavorites } from '../storage/indexedHooks';
import { IndexedDBManager, DATABASE_CONFIGS } from '../storage/indexedDB';
import { message } from 'antd';
import type { FavoriteWord } from '../storage/indexedHooks';

// 收藏相关的工具函数
export class FavoritesManager {
  private static dbManager: IndexedDBManager | null = null;

  // 获取数据库管理器实例
  private static async getDbManager(): Promise<IndexedDBManager> {
    if (!this.dbManager) {
      this.dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);
      await this.dbManager.init();
    }
    return this.dbManager;
  }
  // 添加收藏
  static async addFavorite(
    word: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string,
    notes?: string,
    tags?: string[]
  ): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      
      // 检查是否已存在相同的收藏
      const allFavorites = await dbManager.getAll<FavoriteWord>('favorites');
      const existingFavorite = allFavorites.find(
        item => item.word === word && 
                item.sourceLanguage === sourceLanguage && 
                item.targetLanguage === targetLanguage
      );
      
      if (existingFavorite) {
        // 如果已存在，更新翻译结果和时间戳
        const updatedFavorite = produce(existingFavorite, (draft) => {
          draft.translation = translation;
          draft.timestamp = Date.now();
          draft.notes = notes || draft.notes;
          draft.tags = tags || draft.tags;
        });
        
        await dbManager.put('favorites', updatedFavorite);
        message.info('已更新收藏');
      } else {
        // 添加新收藏
        const newFavorite: FavoriteWord = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          word,
          translation,
          sourceLanguage,
          targetLanguage,
          timestamp: Date.now(),
          notes,
          tags: tags || []
        };
        
        await dbManager.put('favorites', newFavorite);
        message.success('已添加到收藏');
      }
    } catch (error) {
      console.error('添加收藏失败:', error);
      message.error('添加收藏失败');
    }
  }

  // 移除收藏
  static async removeFavorite(id: string): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      await dbManager.delete('favorites', id);
      message.success('已移除收藏');
    } catch (error) {
      console.error('移除收藏失败:', error);
      message.error('移除收藏失败');
    }
  }
  
  // 批量移除收藏
  static async removeFavorites(ids: string[]): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      
      // 批量删除
      await Promise.all(ids.map(id => dbManager.delete('favorites', id)));
      
      message.success(`已移除 ${ids.length} 个收藏`);
    } catch (error) {
      console.error('批量移除收藏失败:', error);
      message.error('批量移除收藏失败');
    }
  }
  
  // 更新收藏笔记
  static async updateFavoriteNotes(id: string, notes: string): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      const favorite = await dbManager.get<FavoriteWord>('favorites', id);
      
      if (favorite) {
        const updatedFavorite = produce(favorite, (draft) => {
          draft.notes = notes;
          draft.timestamp = Date.now(); // 更新时间戳
        });
        
        await dbManager.put('favorites', updatedFavorite);
        message.success('已更新笔记');
      }
    } catch (error) {
      console.error('更新笔记失败:', error);
      message.error('更新笔记失败');
    }
  }
  
  // 更新收藏标签
  static async updateFavoriteTags(id: string, tags: string[]): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      const favorite = await dbManager.get<FavoriteWord>('favorites', id);
      
      if (favorite) {
        const updatedFavorite = produce(favorite, (draft) => {
          draft.tags = tags;
          draft.timestamp = Date.now(); // 更新时间戳
        });
        
        await dbManager.put('favorites', updatedFavorite);
        message.success('已更新标签');
      }
    } catch (error) {
      console.error('更新标签失败:', error);
      message.error('更新标签失败');
    }
  }
  
  // 检查是否已收藏
  static async isFavorited(word: string, sourceLanguage: string, targetLanguage: string): Promise<boolean> {
    try {
      const dbManager = await this.getDbManager();
      const allFavorites = await dbManager.getAll<FavoriteWord>('favorites');
      
      return allFavorites.some(
        item => item.word === word && 
                item.sourceLanguage === sourceLanguage && 
                item.targetLanguage === targetLanguage
      );
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  }
  
  // 获取所有收藏
  static async getFavorites(): Promise<FavoriteWord[]> {
    try {
      const dbManager = await this.getDbManager();
      return await dbManager.getAll<FavoriteWord>('favorites');
    } catch (error) {
      console.error('获取收藏失败:', error);
      return [];
    }
  }
  
  // 搜索收藏
  static async searchFavorites(keyword: string, language?: string): Promise<FavoriteWord[]> {
    const favorites = await this.getFavorites();
    if (!keyword) return favorites;
    
    return favorites.filter(item =>
      item.word.toLowerCase().includes(keyword.toLowerCase()) ||
      item.translation.toLowerCase().includes(keyword.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(keyword.toLowerCase())) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))) ||
      (language ? item.sourceLanguage === language || item.targetLanguage === language : true)
    );
  }
}

// React Hook for favorites management
export function useFavorites() {
  // 使用新的IndexedDB Hook
  const { 
    favorites, 
    loading, 
    error, 
    addFavorite: addFavoriteIndexedDB,
    updateFavorite,
    deleteFavorite,
    clearFavorites,
    searchFavorites: searchFavoritesIndexedDB
  } = useIndexedDBFavorites();
  
  const addFavorite = async (
    word: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string,
    notes?: string,
    tags?: string[]
  ) => {
    return await addFavoriteIndexedDB({
      word,
      translation,
      sourceLanguage,
      targetLanguage,
      notes,
      tags: tags || []
    });
  };
  
  const removeFavorite = async (id: string) => {
    return await deleteFavorite(id);
  };
  
  const isFavorited = async (word: string, sourceLanguage: string, targetLanguage: string) => {
    return favorites.some(
      item => item.word === word && 
              item.sourceLanguage === sourceLanguage && 
              item.targetLanguage === targetLanguage
    );
  };
  
  return {
    favorites: favorites || [],
    loading,
    error,
    addFavorite,
    removeFavorite,
    updateFavorite,
    clearFavorites,
    isFavorited,
    searchFavorites: searchFavoritesIndexedDB
  };
}
