import { useCallback, useEffect, useState } from 'react';

import type { DomainSetting } from '../../constants/types';
import { domainSettingsManager } from '../../storage/chrome_storage';

export function useDomainSettingsData() {
  const [domainSettings, setDomainSettings] = useState<DomainSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setDomainSettings(await domainSettingsManager.getDomainSettings());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domain settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setDomainSetting = useCallback(
    async (setting: Omit<DomainSetting, 'timestamp'>) => {
      const success = await domainSettingsManager.setDomainSetting(setting);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const deleteDomainSetting = useCallback(
    async (domain: string) => {
      const success = await domainSettingsManager.deleteDomainSetting(domain);
      if (success) {
        await refresh();
      }
      return success;
    },
    [refresh]
  );

  const clearDomainSettings = useCallback(async () => {
    const success = await domainSettingsManager.clearDomainSettings();
    if (success) {
      await refresh();
    }
    return success;
  }, [refresh]);

  const isWhitelisted = useCallback((domain: string) => {
    return domainSettingsManager.isWhitelisted(domain);
  }, []);

  const getWhitelistedDomains = useCallback(() => {
    return domainSettingsManager.getWhitelistedDomains();
  }, []);

  return {
    domainSettings,
    loading,
    error,
    refresh,
    setDomainSetting,
    deleteDomainSetting,
    clearDomainSettings,
    isWhitelisted,
    getWhitelistedDomains,
  };
}
