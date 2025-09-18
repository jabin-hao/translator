/**
 * 主题设置 Hook
 */
import { useCallback } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep } from '../../constants/types';

export function useThemeSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const themeSettings = settings.theme;

  const updateTheme = useCallback((updates: PartialDeep<GlobalSettings['theme']>) => {
    updateModuleSettings('theme', updates);
  }, [updateModuleSettings]);

  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'auto') => {
    updateTheme({ mode });
  }, [updateTheme]);

  const setUiLanguage = useCallback((uiLanguage: string) => {
    updateTheme({ uiLanguage });
  }, [updateTheme]);

  return {
    themeSettings,
    updateTheme,
    setThemeMode,
    setUiLanguage,
  };
}