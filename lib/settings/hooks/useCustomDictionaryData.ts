import { useCallback, useEffect, useState } from 'react';

import type { CustomDictionaryEntry } from '../../constants/types';
import { customDictionaryManager } from '../../storage/chrome_storage';

export function useCustomDictionaryData() {
  const [dictionary, setDictionary] = useState<CustomDictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setDictionary(await customDictionaryManager.getDictionary());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dictionary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDictionaryEntry = useCallback(
    async (entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>) => {
      const success = await customDictionaryManager.addEntry(entry);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const updateDictionaryEntry = useCallback(
    async (entry: CustomDictionaryEntry) => {
      const success = await customDictionaryManager.updateEntry(entry);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const deleteDictionaryEntry = useCallback(
    async (id: string) => {
      const success = await customDictionaryManager.deleteEntry(id);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const clearDictionary = useCallback(async () => {
    const success = await customDictionaryManager.clearDictionary();
    if (success) {
      await refresh();
    }
    return success;
  }, [refresh]);

  const getDictionaryByDomain = useCallback((domain: string) => {
    return customDictionaryManager.getDictionaryByDomain(domain);
  }, []);

  const findTranslation = useCallback((domain: string, original: string) => {
    return customDictionaryManager.findTranslation(domain, original);
  }, []);

  return {
    dictionary,
    loading,
    error,
    refresh,
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    clearDictionary,
    getDictionaryByDomain,
    findTranslation,
  };
}
