import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useCacheSettings() {
  const { moduleSettings: cacheSettings, updateSettings: updateCache } =
    useSettingsModule('cache');

  const toggleEnabled = useCallback(() => {
    updateCache({
      enabled: !cacheSettings.enabled,
    } as PartialDeep<GlobalSettings['cache']>);
  }, [cacheSettings.enabled, updateCache]);

  return {
    cacheSettings,
    updateCache,
    toggleEnabled,
  };
}
