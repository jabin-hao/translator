/**
 * 语言设置 Hook
 */
import { useCallback } from 'react';
import { produce } from 'immer';
import { useGlobalSettings } from './useGlobalSettings';
import type { GlobalSettings, PartialDeep } from '../../constants/types';

export function useLanguageSettings() {
  const { settings, updateModuleSettings } = useGlobalSettings();

  const languageSettings = settings.languages;

  const updateLanguages = useCallback((updates: PartialDeep<GlobalSettings['languages']>) => {
    updateModuleSettings('languages', updates);
  }, [updateModuleSettings]);

  const setPageTargetLanguage = useCallback((pageTarget: string) => {
    updateLanguages({ pageTarget });
  }, [updateLanguages]);

  const setTextTargetLanguage = useCallback((textTarget: string) => {
    updateLanguages({ textTarget });
  }, [updateLanguages]);

  const setInputTargetLanguage = useCallback((inputTarget: string) => {
    updateLanguages({ inputTarget });
  }, [updateLanguages]);

  const addFavoriteLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        if (!draft.favorites.includes(langCode)) {
          draft.favorites.push(langCode);
        }
      })
    );
  }, [languageSettings, updateLanguages]);

  const removeFavoriteLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        draft.favorites = draft.favorites.filter(code => code !== langCode);
      })
    );
  }, [languageSettings, updateLanguages]);

  const addNeverLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        if (!draft.never.includes(langCode)) {
          draft.never.push(langCode);
        }
      })
    );
  }, [languageSettings, updateLanguages]);

  const removeNeverLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        draft.never = draft.never.filter(code => code !== langCode);
      })
    );
  }, [languageSettings, updateLanguages]);

  const addAlwaysLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        if (!draft.always.includes(langCode)) {
          draft.always.push(langCode);
        }
      })
    );
  }, [languageSettings, updateLanguages]);

  const removeAlwaysLanguage = useCallback((langCode: string) => {
    updateLanguages(
      produce(languageSettings, (draft) => {
        draft.always = draft.always.filter(code => code !== langCode);
      })
    );
  }, [languageSettings, updateLanguages]);

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