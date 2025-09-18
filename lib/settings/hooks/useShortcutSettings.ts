/**
 * 快捷键设置 Hook
 */
import { useCallback } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep } from '../../constants/types';

export function useShortcutSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();

  const shortcutSettings = getModuleSettings('shortcuts');

  const updateShortcuts = useCallback((updates: PartialDeep<GlobalSettings['shortcuts']>) => {
    updateModuleSettings('shortcuts', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateShortcuts({ enabled: !shortcutSettings.enabled });
  }, [shortcutSettings.enabled, updateShortcuts]);

  const updateShortcut = useCallback((key: keyof Omit<GlobalSettings['shortcuts'], 'enabled'>, value: string) => {
    updateShortcuts({ [key]: value });
  }, [updateShortcuts]);

  return {
    shortcutSettings,
    updateShortcuts,
    toggleEnabled,
    updateShortcut,
  };
}