import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep, ThemeMode } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useThemeSettings() {
  const { moduleSettings: themeSettings, updateSettings: updateTheme } =
    useSettingsModule('theme');

  const setThemeMode = useCallback(
    (mode: ThemeMode) => updateTheme({ mode } as PartialDeep<GlobalSettings['theme']>),
    [updateTheme]
  );

  const setUiLanguage = useCallback(
    (uiLanguage: string) =>
      updateTheme({ uiLanguage } as PartialDeep<GlobalSettings['theme']>),
    [updateTheme]
  );

  return {
    themeSettings,
    updateTheme,
    setThemeMode,
    setUiLanguage,
  };
}
