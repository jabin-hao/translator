import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useInputTranslateSettings() {
  const {
    moduleSettings: inputTranslateSettings,
    updateSettings: updateInputTranslate,
  } = useSettingsModule('inputTranslate');

  const toggleEnabled = useCallback(() => {
    updateInputTranslate({
      enabled: !inputTranslateSettings.enabled,
    } as PartialDeep<GlobalSettings['inputTranslate']>);
  }, [inputTranslateSettings.enabled, updateInputTranslate]);

  return {
    inputTranslateSettings,
    updateInputTranslate,
    toggleEnabled,
  };
}
