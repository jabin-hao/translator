import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useStorage } from '../../storage/storage';
import { DEFAULT_SETTINGS, GLOBAL_SETTINGS_KEY } from '../constants';
import { mergeSettings } from '../mergeSettings';

export function useGlobalSettings() {
  const [settings, setStorageSettings] = useStorage<GlobalSettings>(
    GLOBAL_SETTINGS_KEY,
    DEFAULT_SETTINGS
  );

  const updateSettings = useCallback(
    async (updates: PartialDeep<GlobalSettings>) => {
      await setStorageSettings(mergeSettings(settings, updates));
    },
    [settings, setStorageSettings]
  );

  const resetSettings = useCallback(async () => {
    await setStorageSettings(DEFAULT_SETTINGS);
  }, [setStorageSettings]);

  const getModuleSettings = useCallback(
    <K extends keyof GlobalSettings>(module: K): GlobalSettings[K] => settings[module],
    [settings]
  );

  const updateModuleSettings = useCallback(
    async <K extends keyof GlobalSettings>(
      module: K,
      updates: PartialDeep<GlobalSettings[K]>
    ) => {
      await setStorageSettings(
        mergeSettings(settings, {
          [module]: updates,
        } as PartialDeep<GlobalSettings>)
      );
    },
    [settings, setStorageSettings]
  );

  return {
    settings,
    updateSettings,
    resetSettings,
    getModuleSettings,
    updateModuleSettings,
  };
}
