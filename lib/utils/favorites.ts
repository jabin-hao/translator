import { produce } from 'immer';
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
      
      // 使用 immer 进行不可变更新
      const updatedSettings = produce(globalSettings, (draft) => {
        if (!draft.favorites.words) {
          draft.favorites.words = [];
        }
        
        // 检查是否已存在相同的收藏
        const existingIndex = draft.favorites.words.findIndex(
          item => item.word === word && 
                  item.sourceLanguage === sourceLanguage && 
                  item.targetLanguage === targetLanguage
        );
        
        if (existingIndex >= 0) {
          // 如果已存在，更新翻译结果和时间戳
          draft.favorites.words[existingIndex].translation = translation;
          draft.favorites.words[existingIndex].timestamp = Date.now();
          draft.favorites.words[existingIndex].notes = notes || draft.favorites.words[existingIndex].notes;
          draft.favorites.words[existingIndex].tags = tags || draft.favorites.words[existingIndex].tags;
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
          draft.favorites.words.unshift(newFavorite); // 添加到开头
          message.success('已添加到收藏');
        }
      });
      
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
      
      // 使用 immer 进行不可变更新
      const updatedSettings = produce(globalSettings, (draft) => {
        if (draft.favorites.words) {
          draft.favorites.words = draft.favorites.words.filter(item => item.id !== id);
        }
      });
      
      await storage.set('global_settings', updatedSettings);
      message.success('已移除收藏');
    } catch (error) {
      console.error('移除收藏失败:', error);
      message.error('移除收藏失败');
    }
  }
  
  // 批量移除收藏
  static async removeFavorites(ids: string[]): Promise<void> {
    try {
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return;
      
      // 使用 immer 进行不可变更新
      const updatedSettings = produce(globalSettings, (draft) => {
        if (draft.favorites.words) {
          draft.favorites.words = draft.favorites.words.filter(item => !ids.includes(item.id));
        }
      });
      
      await storage.set('global_settings', updatedSettings);
      message.success(`已移除 ${ids.length} 个收藏`);
    } catch (error) {
      console.error('批量移除收藏失败:', error);
      message.error('批量移除收藏失败');
    }
  }
  
  // 更新收藏笔记
  static async updateFavoriteNotes(id: string, notes: string): Promise<void> {
    try {
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return;
      
      // 使用 immer 进行不可变更新
      const updatedSettings = produce(globalSettings, (draft) => {
        if (draft.favorites.words) {
          const favorite = draft.favorites.words.find(item => item.id === id);
          if (favorite) {
            favorite.notes = notes;
            favorite.timestamp = Date.now(); // 更新时间戳
          }
        }
      });
      
      await storage.set('global_settings', updatedSettings);
      message.success('已更新笔记');
    } catch (error) {
      console.error('更新笔记失败:', error);
      message.error('更新笔记失败');
    }
  }
  
  // 更新收藏标签
  static async updateFavoriteTags(id: string, tags: string[]): Promise<void> {
    try {
      const { Storage } = await import('@plasmohq/storage');
      const storage = new Storage();
      const globalSettings = await storage.get('global_settings') as GlobalSettings | undefined;
      
      if (!globalSettings) return;
      
      // 使用 immer 进行不可变更新
      const updatedSettings = produce(globalSettings, (draft) => {
        if (draft.favorites.words) {
          const favorite = draft.favorites.words.find(item => item.id === id);
          if (favorite) {
            favorite.tags = tags;
            favorite.timestamp = Date.now(); // 更新时间戳
          }
        }
      });
      
      await storage.set('global_settings', updatedSettings);
      message.success('已更新标签');
    } catch (error) {
      console.error('更新标签失败:', error);
      message.error('更新标签失败');
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
