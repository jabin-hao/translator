/**
 * 输入翻译设置 Hook
 */
import { useCallback } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep } from '../../constants/types';

export function useInputTranslateSettings() {
  const { getModuleSettings, updateModuleSettings } = useGlobalSettings();

  const inputTranslateSettings = getModuleSettings('inputTranslate');

  const updateInputTranslate = useCallback((updates: PartialDeep<GlobalSettings['inputTranslate']>) => {
    updateModuleSettings('inputTranslate', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateInputTranslate({ enabled: !inputTranslateSettings.enabled });
  }, [inputTranslateSettings.enabled, updateInputTranslate]);

  return {
    inputTranslateSettings,
    updateInputTranslate,
    toggleEnabled,
  };
}