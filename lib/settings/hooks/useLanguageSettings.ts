import { useCallback } from 'react';

import type { GlobalSettings, PartialDeep } from '../../constants/types';
import { useSettingsModule } from './useSettingsModule';
import { appendUniqueItem, removeItem } from './settingArrayUtils';

export function useLanguageSettings() {
  const { moduleSettings: languageSettings, updateSettings: updateLanguages } =
    useSettingsModule('languages');

  const setPageTargetLanguage = useCallback(
    (pageTarget: string) =>
      updateLanguages({ pageTarget } as PartialDeep<GlobalSettings['languages']>),
    [updateLanguages]
  );

  const setTextTargetLanguage = useCallback(
    (textTarget: string) =>
      updateLanguages({ textTarget } as PartialDeep<GlobalSettings['languages']>),
    [updateLanguages]
  );

  const setInputTargetLanguage = useCallback(
    (inputTarget: string) =>
      updateLanguages({ inputTarget } as PartialDeep<GlobalSettings['languages']>),
    [updateLanguages]
  );

  const addFavoriteLanguage = useCallback(
    (langCode: string) =>
      updateLanguages({
        favorites: appendUniqueItem(languageSettings.favorites, langCode),
      } as PartialDeep<GlobalSettings['languages']>),
    [languageSettings.favorites, updateLanguages]
  );

  const removeFavoriteLanguage = useCallback(
    (langCode: string) =>
      updateLanguages({
        favorites: removeItem(languageSettings.favorites, langCode),
      } as PartialDeep<GlobalSettings['languages']>),
    [languageSettings.favorites, updateLanguages]
  );

  const addNeverLanguage = useCallback(
    (langCode: string) =>
      updateLanguages({
        never: appendUniqueItem(languageSettings.never, langCode),
      } as PartialDeep<GlobalSettings['languages']>),
    [languageSettings.never, updateLanguages]
  );

  const removeNeverLanguage = useCallback(
    (langCode: string) =>
      updateLanguages({
        never: removeItem(languageSettings.never, langCode),
      } as PartialDeep<GlobalSettings['languages']>),
    [languageSettings.never, updateLanguages]
  );

  const addAlwaysLanguage = useCallback(
    (langCode: string) =>
      updateLanguages({
        always: appendUniqueItem(languageSettings.always, langCode),
      } as PartialDeep<GlobalSettings['languages']>),
    [languageSettings.always, updateLanguages]
  );

  const removeAlwaysLanguage = useCallback(
    (langCode: string) =>
      updateLanguages({
        always: removeItem(languageSettings.always, langCode),
      } as PartialDeep<GlobalSettings['languages']>),
    [languageSettings.always, updateLanguages]
  );

  return {
    languageSettings,
    updateLanguages,
    setPageTargetLanguage,
    setTextTargetLanguage,
    setInputTargetLanguage,
    addFavoriteLanguage,
    removeFavoriteLanguage,
    addNeverLanguage,
    removeNeverLanguage,
    addAlwaysLanguage,
    removeAlwaysLanguage,
  };
}
