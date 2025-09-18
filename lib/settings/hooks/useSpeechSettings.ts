/**
 * 语音设置 Hook
 */
import { useCallback } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep, TTSEngineType } from '../../constants/types';

export function useSpeechSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const speechSettings = settings.speech;

  const updateSpeech = useCallback((updates: PartialDeep<GlobalSettings['speech']>) => {
    updateModuleSettings('speech', updates);
  }, [updateModuleSettings]);

  const toggleEnabled = useCallback(() => {
    updateSpeech({ enabled: !speechSettings.enabled });
  }, [speechSettings.enabled, updateSpeech]);

  const setEngine = useCallback((engine: TTSEngineType) => {
    updateSpeech({ engine });
  }, [updateSpeech]);

  const setVoiceSettings = useCallback((settings: { speed?: number; pitch?: number; volume?: number; }) => {
    updateSpeech(settings);
  }, [updateSpeech]);

  return {
    speechSettings,
    updateSpeech,
    toggleEnabled,
    setEngine,
    setVoiceSettings,
  };
}