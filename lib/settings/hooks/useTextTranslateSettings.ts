import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

type TriggerModeKey = keyof Pick<
  GlobalSettings['textTranslate'],
  'selectTranslate' | 'quickTranslate' | 'pressKeyTranslate'
>;

export function useTextTranslateSettings() {
  const {
    moduleSettings: textTranslateSettings,
    updateSettings: updateTextTranslate,
  } = useSettingsModule('textTranslate');

  const toggleEnabled = useCallback(() => {
    updateTextTranslate({
      enabled: !textTranslateSettings.enabled,
    } as PartialDeep<GlobalSettings['textTranslate']>);
  }, [textTranslateSettings.enabled, updateTextTranslate]);

  const setTriggerMode = useCallback(
    (mode: TriggerModeKey, enabled: boolean) => {
      updateTextTranslate({
        [mode]: enabled,
      } as PartialDeep<GlobalSettings['textTranslate']>);
    },
    [updateTextTranslate]
  );

  return {
    textTranslateSettings,
    updateTextTranslate,
    toggleEnabled,
    setTriggerMode,
  };
}
