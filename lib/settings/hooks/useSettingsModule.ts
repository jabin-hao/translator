import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useGlobalSettings } from './useGlobalSettings';

export function useSettingsModule<K extends keyof GlobalSettings>(key: K) {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const moduleSettings = settings[key];

  const updateSettings = useCallback(
    (updates: PartialDeep<GlobalSettings[K]>) => updateModuleSettings(key, updates),
    [key, updateModuleSettings]
  );

  return {
    moduleSettings,
    updateSettings,
  };
}
