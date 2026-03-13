import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useShortcutSettings() {
  const { moduleSettings: shortcutSettings, updateSettings: updateShortcuts } =
    useSettingsModule('shortcuts');

  const toggleEnabled = useCallback(() => {
    updateShortcuts({
      enabled: !shortcutSettings.enabled,
    } as PartialDeep<GlobalSettings['shortcuts']>);
  }, [shortcutSettings.enabled, updateShortcuts]);

  const updateShortcut = useCallback(
    (key: keyof Omit<GlobalSettings['shortcuts'], 'enabled'>, value: string) => {
      updateShortcuts({
        [key]: value,
      } as PartialDeep<GlobalSettings['shortcuts']>);
    },
    [updateShortcuts]
  );

  return {
    shortcutSettings,
    updateShortcuts,
    toggleEnabled,
    updateShortcut,
  };
}
