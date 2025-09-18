/**
 * 文本翻译设置 Hook
 */
import { useCallback } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep } from '../../constants/types';

export function useTextTranslateSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const textTranslateSettings = settings.textTranslate;

  const updateTextTranslate = useCallback((updates: PartialDeep<GlobalSettings['textTranslate']>) => {
    updateModuleSettings('textTranslate', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateTextTranslate({ enabled: !textTranslateSettings.enabled });
  }, [textTranslateSettings.enabled, updateTextTranslate]);

  const setTriggerMode = useCallback((mode: keyof Pick<GlobalSettings['textTranslate'], 'selectTranslate' | 'quickTranslate' | 'pressKeyTranslate'>, enabled: boolean) => {
    updateTextTranslate({ [mode]: enabled });
  }, [updateTextTranslate]);

  return {
    textTranslateSettings,
    updateTextTranslate,
    toggleEnabled,
    setTriggerMode,
  };
}