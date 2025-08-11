import { useFavoritesSettings, useGlobalSettings } from './globalSettingsHooks';
import { message } from 'antd';
import type { GlobalSettings } from '../settings/globalSettings';

// 使用全局设置中的收藏单词接口
export type FavoriteWord = GlobalSettings['favorites']['words'][0];

// 收藏相关的工具函数
export class FavoritesManager {
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
      // 从存储中获取当前的收藏设置
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return;
      
      const favorites = globalSettings.favorites.words || [];
      
      // 检查是否已存在相同的收藏
      const existingIndex = favorites.findIndex(
        item => item.word === word && 
                item.sourceLanguage === sourceLanguage && 
                item.targetLanguage === targetLanguage
      );
      
      if (existingIndex >= 0) {
        // 如果已存在，更新翻译结果和时间戳
        favorites[existingIndex] = {
          ...favorites[existingIndex],
          translation,
          timestamp: Date.now(),
          notes: notes || favorites[existingIndex].notes,
          tags: tags || favorites[existingIndex].tags
        };
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
          tags
        };
        favorites.unshift(newFavorite); // 添加到开头
        message.success('已添加到收藏');
      }
      
      // 更新全局设置
      const updatedSettings = {
        ...globalSettings,
        favorites: {
          ...globalSettings.favorites,
          words: favorites
        }
      };
      await storage.set('global_settings', updatedSettings);
    } catch (error) {
      console.error('添加收藏失败:', error);
      message.error('添加收藏失败');
    }
  }
  
  // 移除收藏
  static async removeFavorite(id: string): Promise<void> {
    try {
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return;
      
      const favorites = globalSettings.favorites.words || [];
      const newFavorites = favorites.filter(item => item.id !== id);
      
      const updatedSettings = {
        ...globalSettings,
        favorites: {
          ...globalSettings.favorites,
          words: newFavorites
        }
      };
      await storage.set('global_settings', updatedSettings);
      message.success('已移除收藏');
    } catch (error) {
      console.error('移除收藏失败:', error);
      message.error('移除收藏失败');
    }
  }
  
  // 检查是否已收藏
  static async isFavorited(word: string, sourceLanguage: string, targetLanguage: string): Promise<boolean> {
    try {
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return false;
      
      const favorites = globalSettings.favorites.words || [];
      return favorites.some(
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
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return [];
      
      return globalSettings.favorites.words || [];
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
  const { settings } = useGlobalSettings();
  
  const addFavorite = async (
    word: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string,
    notes?: string,
    tags?: string[]
  ) => {
    await FavoritesManager.addFavorite(
      word, 
      translation, 
      sourceLanguage, 
      targetLanguage, 
      notes, 
      tags
    );
  };
  
  const removeFavorite = async (id: string) => {
    await FavoritesManager.removeFavorite(id);
  };
  
  const isFavorited = async (word: string, sourceLanguage: string, targetLanguage: string) => {
    return await FavoritesManager.isFavorited(word, sourceLanguage, targetLanguage);
  };
  
  return {
    favorites: settings.favorites.words,
    addFavorite,
    removeFavorite,
    isFavorited,
    searchFavorites: FavoritesManager.searchFavorites
  };
}
