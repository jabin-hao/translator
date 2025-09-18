/**
 * 翻译引擎设置 Hook
 */
import { useCallback } from 'react';
import { produce } from 'immer';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep, TranslateEngineType } from '../../constants/types';

export function useEngineSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const engineSettings = settings.engines;

  const updateEngine = useCallback((updates: PartialDeep<GlobalSettings['engines']>) => {
    updateModuleSettings('engines', updates);
  }, [updateModuleSettings]);

  const setDefaultEngine = useCallback((engine: TranslateEngineType) => {
    updateEngine({ default: engine });
  }, [updateEngine]);

  const updateApiKey = useCallback((
    provider: keyof GlobalSettings['engines']['apiKeys'],
    key: string
  ) => {
    updateEngine({
      apiKeys: {
        [provider]: key
      }
    });
  }, [updateEngine]);

  const addCustomEngine = useCallback((engine: GlobalSettings['engines']['customEngines'][0]) => {
    updateEngine({
      customEngines: [...engineSettings.customEngines, engine]
    });
  }, [updateEngine, engineSettings.customEngines]);

  const removeCustomEngine = useCallback((engineId: string) => {
    updateEngine(
      produce(engineSettings, (draft) => {
        draft.customEngines = draft.customEngines.filter(e => e.id !== engineId);
      })
    );
  }, [updateEngine, engineSettings]);

  const updateCustomEngine = useCallback((engineId: string, updates: Partial<GlobalSettings['engines']['customEngines'][0]>) => {
    updateEngine(
      produce(engineSettings, (draft) => {
        const engineIndex = draft.customEngines.findIndex(e => e.id === engineId);
        if (engineIndex !== -1) {
          Object.assign(draft.customEngines[engineIndex], updates);
        }
      })
    );
  }, [updateEngine, engineSettings]);

  return {
    engineSettings,
    updateEngine,
    setDefaultEngine,
    updateApiKey,
    addCustomEngine,
    removeCustomEngine,
    updateCustomEngine,
  };
}