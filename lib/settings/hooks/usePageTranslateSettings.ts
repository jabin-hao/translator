import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function usePageTranslateSettings() {
  const {
    moduleSettings: pageTranslateSettings,
    updateSettings: updatePageTranslateSettings,
  } = useSettingsModule('pageTranslate');

  const toggleEnabled = useCallback(() => {
    updatePageTranslateSettings({
      enabled: !pageTranslateSettings.enabled,
    } as PartialDeep<GlobalSettings['pageTranslate']>);
  }, [pageTranslateSettings.enabled, updatePageTranslateSettings]);

  const toggleAutoTranslate = useCallback(() => {
    updatePageTranslateSettings({
      autoTranslate: !pageTranslateSettings.autoTranslate,
    } as PartialDeep<GlobalSettings['pageTranslate']>);
  }, [pageTranslateSettings.autoTranslate, updatePageTranslateSettings]);

  const setTranslateMode = useCallback(
    (mode: GlobalSettings['pageTranslate']['mode']) => {
      updatePageTranslateSettings({
        mode,
      } as PartialDeep<GlobalSettings['pageTranslate']>);
    },
    [updatePageTranslateSettings]
  );

  return {
    pageTranslateSettings,
    updatePageTranslateSettings,
    toggleEnabled,
    toggleAutoTranslate,
    setTranslateMode,
  };
}
