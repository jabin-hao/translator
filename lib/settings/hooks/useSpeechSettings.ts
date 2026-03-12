import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep, TTSEngineType } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useSpeechSettings() {
  const { moduleSettings: speechSettings, updateSettings: updateSpeech } =
    useSettingsModule('speech');

  const toggleEnabled = useCallback(() => {
    updateSpeech({
      enabled: !speechSettings.enabled,
    } as PartialDeep<GlobalSettings['speech']>);
  }, [speechSettings.enabled, updateSpeech]);

  const setEngine = useCallback(
    (engine: TTSEngineType) => updateSpeech({ engine } as PartialDeep<GlobalSettings['speech']>),
    [updateSpeech]
  );

  const setVoiceSettings = useCallback(
    (settings: { speed?: number; pitch?: number; volume?: number }) => {
      updateSpeech(settings as PartialDeep<GlobalSettings['speech']>);
    },
    [updateSpeech]
  );

  return {
    speechSettings,
    updateSpeech,
    toggleEnabled,
    setEngine,
    setVoiceSettings,
  };
}
