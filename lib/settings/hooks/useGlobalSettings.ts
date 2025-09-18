/**
 * 全局设置管理 Hook
 * 核心设置存储和更新逻辑
 */
import { useCallback } from 'react';
import { produce } from 'immer';
import { useStorage } from '../../storage/storage';
import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { DEFAULT_SETTINGS, GLOBAL_SETTINGS_KEY } from '../constants';

// 辅助函数：使用 immer 进行深度合并
function deepMergeWithImmer<T>(target: T, source: any): T {
  return produce(target, (draft: any) => {
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!draft[key]) {
          draft[key] = {};
        }
        draft[key] = deepMergeWithImmer(draft[key], source[key]);
      } else {
        draft[key] = source[key];
      }
    }
  });
}

/**
 * 统一的全局设置管理 Hook
 * 提供类型安全的设置读取和更新功能
 */
export function useGlobalSettings() {
  const [settings, setStorageSettings] = useStorage<GlobalSettings>(
    GLOBAL_SETTINGS_KEY,
    DEFAULT_SETTINGS
  );

  // 使用 immer 进行不可变更新
  const updateSettings = useCallback(async (updates: PartialDeep<GlobalSettings>) => {
    const newSettings = produce(settings, (draft) => {
      Object.assign(draft, deepMergeWithImmer(draft, updates));
    });
    await setStorageSettings(newSettings);
  }, [settings, setStorageSettings]);

  // 重置设置到默认值
  const resetSettings = useCallback(async () => {
    await setStorageSettings(DEFAULT_SETTINGS);
  }, [setStorageSettings]);

  // 获取特定模块的设置
  const getModuleSettings = useCallback(<K extends keyof GlobalSettings>(
    module: K
  ): GlobalSettings[K] => {
    return settings[module];
  }, [settings]);

  // 使用 immer 更新特定模块的设置
  const updateModuleSettings = useCallback(async <K extends keyof GlobalSettings>(
    module: K,
    updates: PartialDeep<GlobalSettings[K]>
  ) => {
    const newSettings = produce(settings, (draft) => {
      Object.assign(draft[module], updates);
    });
    await setStorageSettings(newSettings);
  }, [settings, setStorageSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    getModuleSettings,
    updateModuleSettings,
  };
}