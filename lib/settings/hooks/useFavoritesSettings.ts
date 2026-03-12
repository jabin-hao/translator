import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';

export function useFavoritesSettings() {
  const { moduleSettings: favoritesSettings, updateSettings: updateFavorites } =
    useSettingsModule('favorites');

  const toggleEnabled = useCallback(() => {
    updateFavorites({
      enabled: !favoritesSettings.enabled,
    } as PartialDeep<GlobalSettings['favorites']>);
  }, [favoritesSettings.enabled, updateFavorites]);

  return {
    favoritesSettings,
    updateFavorites,
    toggleEnabled,
  };
}
