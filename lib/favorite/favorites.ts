// 收藏逻辑 
// option | content 调用
import { useImmer } from 'use-immer';
import { useFavorites as useIndexedDBFavorites } from '../storage/indexed';
import { IndexedDBManager, DATABASE_CONFIGS } from '../storage/indexed';
import type { FavoriteWord } from '../storage/indexed';

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
        // 更新现有收藏
        const updatedFavorite = {
          ...existingFavorite,
          translation,
          timestamp: Date.now(),
          notes: notes || existingFavorite.notes,
          tags: tags || existingFavorite.tags
        };

        await dbManager.put('favorites', updatedFavorite);
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
      }
    } catch (error) {
      console.error('添加收藏失败:', error);
    }
  }

  // 移除收藏
  static async removeFavorite(id: string): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      await dbManager.delete('favorites', id);
    } catch (error) {
      console.error('移除收藏失败:', error);
    }
  }

  // 批量移除收藏
  static async removeFavorites(ids: string[]): Promise<void> {
    try {
      const dbManager = await this.getDbManager();

      // 批量删除
      await Promise.all(ids.map(id => dbManager.delete('favorites', id)));
    } catch (error) {
      console.error('批量移除收藏失败:', error);
    }
  }

  // 更新收藏笔记
  static async updateFavoriteNotes(id: string, notes: string): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      const favorite = await dbManager.get<FavoriteWord>('favorites', id);

      if (favorite) {
        const updatedFavorite = {
          ...favorite,
          notes,
          timestamp: Date.now()
        };

        await dbManager.put('favorites', updatedFavorite);
      }
    } catch (error) {
      console.error('更新笔记失败:', error);
    }
  }

  // 更新收藏标签
  static async updateFavoriteTags(id: string, tags: string[]): Promise<void> {
    try {
      const dbManager = await this.getDbManager();
      const favorite = await dbManager.get<FavoriteWord>('favorites', id);

      if (favorite) {
        const updatedFavorite = {
          ...favorite,
          tags,
          timestamp: Date.now()
        };

        await dbManager.put('favorites', updatedFavorite);
      }
    } catch (error) {
      console.error('更新标签失败:', error);
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

// 搜索状态接口
interface SearchState {
  keyword: string;
  language?: string;
  results: FavoriteWord[];
  isSearching: boolean;
}

// 收藏操作状态接口
interface FavoriteOperationState {
  isAdding: boolean;
  isRemoving: boolean;
  isUpdating: boolean;
  selectedIds: string[];
}

// React Hook for favorites management with useImmer optimization
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

  // 使用 useImmer 管理搜索状态
  const [searchState, updateSearchState] = useImmer<SearchState>({
    keyword: '',
    language: undefined,
    results: [],
    isSearching: false
  });

  // 使用 useImmer 管理操作状态
  const [operationState, updateOperationState] = useImmer<FavoriteOperationState>({
    isAdding: false,
    isRemoving: false,
    isUpdating: false,
    selectedIds: []
  });

  // 添加收藏
  const addFavorite = async (
    word: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string,
    notes?: string,
    tags?: string[]
  ) => {
    updateOperationState(draft => {
      draft.isAdding = true;
    });

    try {
      await addFavoriteIndexedDB({
        word,
        translation,
        sourceLanguage,
        targetLanguage,
        notes,
        tags: tags || []
      });
    } finally {
      updateOperationState(draft => {
        draft.isAdding = false;
      });
    }
  };

  // 移除收藏
  const removeFavorite = async (id: string) => {
    updateOperationState(draft => {
      draft.isRemoving = true;
    });

    try {
      await deleteFavorite(id);
    } finally {
      updateOperationState(draft => {
        draft.isRemoving = false;
      });
    }
  };

  // 批量移除收藏
  const removeFavorites = async (ids: string[]) => {
    updateOperationState(draft => {
      draft.isRemoving = true;
    });

    try {
      await Promise.all(ids.map(id => deleteFavorite(id)));

      // 清空选中状态
      updateOperationState(draft => {
        draft.selectedIds = [];
      });
    } catch (error) {
      console.error('批量移除收藏失败:', error);
    } finally {
      updateOperationState(draft => {
        draft.isRemoving = false;
      });
    }
  };

  // 更新收藏信息
  const updateFavoriteInfo = async (
    id: string,
    updates: Partial<Pick<FavoriteWord, 'notes' | 'tags'>>
  ) => {
    updateOperationState(draft => {
      draft.isUpdating = true;
    });

    try {
      const favorite = favorites.find(f => f.id === id);
      if (favorite) {
        const updatedFavorite = {
          ...favorite,
          ...updates,
          timestamp: Date.now()
        };

        await updateFavorite(updatedFavorite);
      }
    } finally {
      updateOperationState(draft => {
        draft.isUpdating = false;
      });
    }
  };

  // 搜索收藏
  const searchFavorites = async (keyword: string, language?: string) => {
    updateSearchState(draft => {
      draft.keyword = keyword;
      draft.language = language;
      draft.isSearching = true;
    });

    try {
      const results = await searchFavoritesIndexedDB(keyword);

      updateSearchState(draft => {
        draft.results = language
          ? results.filter(item =>
            item.sourceLanguage === language || item.targetLanguage === language
          )
          : results;
        draft.isSearching = false;
      });
    } catch (error) {
      updateSearchState(draft => {
        draft.isSearching = false;
      });
      console.error('搜索失败:', error);
    }
  };

  // 切换选中状态
  const toggleSelection = (id: string) => {
    updateOperationState(draft => {
      const index = draft.selectedIds.indexOf(id);
      if (index > -1) {
        draft.selectedIds.splice(index, 1);
      } else {
        draft.selectedIds.push(id);
      }
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    updateOperationState(draft => {
      if (draft.selectedIds.length === favorites.length) {
        draft.selectedIds = [];
      } else {
        draft.selectedIds = favorites.map(f => f.id);
      }
    });
  };

  // 清空选中
  const clearSelection = () => {
    updateOperationState(draft => {
      draft.selectedIds = [];
    });
  };

  // 检查是否已收藏
  const isFavorited = (word: string, sourceLanguage: string, targetLanguage: string) => {
    return favorites.some(
      item => item.word === word &&
        item.sourceLanguage === sourceLanguage &&
        item.targetLanguage === targetLanguage
    );
  };

  return {
    // 基础数据
    favorites: favorites || [],
    loading,
    error,

    // 搜索状态
    searchState,

    // 操作状态
    operationState,

    // 基础操作
    addFavorite,
    removeFavorite,
    removeFavorites,
    updateFavoriteInfo,
    clearFavorites,
    isFavorited,

    // 搜索操作
    searchFavorites,

    // 选择操作
    toggleSelection,
    toggleSelectAll,
    clearSelection
  };
}