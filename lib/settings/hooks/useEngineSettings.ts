import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useEngineSettings() {
  const { moduleSettings: engineSettings, updateSettings: updateEngine } =
    useSettingsModule('engines');

  const setDefaultEngine = useCallback(
    (engine: string) =>
      updateEngine({ default: engine } as PartialDeep<GlobalSettings['engines']>),
    [updateEngine]
  );

  const updateApiKey = useCallback(
    (provider: keyof GlobalSettings['engines']['apiKeys'], key: string) =>
      updateEngine({
        apiKeys: {
          ...engineSettings.apiKeys,
          [provider]: key,
        },
      } as PartialDeep<GlobalSettings['engines']>),
    [engineSettings.apiKeys, updateEngine]
  );

  const addCustomEngine = useCallback(
    (engine: GlobalSettings['engines']['customEngines'][0]) =>
      updateEngine({
        customEngines: [...engineSettings.customEngines, engine],
      } as PartialDeep<GlobalSettings['engines']>),
    [engineSettings.customEngines, updateEngine]
  );

  const removeCustomEngine = useCallback(
    (engineId: string) =>
      updateEngine({
        customEngines: engineSettings.customEngines.filter(
          (engine) => engine.id !== engineId
        ),
      } as PartialDeep<GlobalSettings['engines']>),
    [engineSettings.customEngines, updateEngine]
  );

  const updateCustomEngine = useCallback(
    (
      engineId: string,
      updates: Partial<GlobalSettings['engines']['customEngines'][0]>
    ) =>
      updateEngine({
        customEngines: engineSettings.customEngines.map((engine) =>
          engine.id === engineId ? { ...engine, ...updates } : engine
        ),
      } as PartialDeep<GlobalSettings['engines']>),
    [engineSettings.customEngines, updateEngine]
  );

  const setCustomEngineEnabled = useCallback(
    (engineId: string, enabled: boolean) =>
      updateCustomEngine(engineId, { enabled }),
    [updateCustomEngine]
  );

  return {
    engineSettings,
    updateEngine,
    setDefaultEngine,
    updateApiKey,
    addCustomEngine,
    removeCustomEngine,
    updateCustomEngine,
    setCustomEngineEnabled,
  };
}
