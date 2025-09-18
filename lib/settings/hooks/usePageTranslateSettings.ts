/**
 * 页面翻译设置 Hook
 * 包含基础设置、自定义词库、域名设置
 */
import { useCallback, useState, useEffect } from 'react';
import { useGlobalSettings } from './useGlobalSettings';
import { customDictionaryManager, domainSettingsManager } from '../../storage/chrome_storage';
import type { 
  GlobalSettings, 
  PartialDeep, 
  CustomDictionaryEntry, 
  DomainSetting 
} from '../../constants/types';

export function usePageTranslateSettings() {
  const { settings, updateSettings } = useGlobalSettings();

  const pageTranslateSettings = settings.pageTranslate;

  // 自定义词库状态
  const [dictionary, setDictionary] = useState<CustomDictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(true);
  const [dictError, setDictError] = useState<string>('');

  // 域名设置状态
  const [domainSettings, setDomainSettings] = useState<DomainSetting[]>([]);
  const [domainLoading, setDomainLoading] = useState(true);
  const [domainError, setDomainError] = useState<string>('');

  // 加载自定义词库
  const loadDictionary = useCallback(async () => {
    try {
      setDictLoading(true);
      const data = await customDictionaryManager.getDictionary();
      setDictionary(data);
      setDictError('');
    } catch (err) {
      console.error('加载自定义词库失败:', err);
      setDictError(err instanceof Error ? err.message : '加载自定义词库失败');
    } finally {
      setDictLoading(false);
    }
  }, []);

  // 加载域名设置
  const loadDomainSettings = useCallback(async () => {
    try {
      setDomainLoading(true);
      const data = await domainSettingsManager.getDomainSettings();
      setDomainSettings(data);
      setDomainError('');
    } catch (err) {
      console.error('加载域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '加载域名设置失败');
    } finally {
      setDomainLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDictionary();
    loadDomainSettings();
  }, [loadDictionary, loadDomainSettings]);

  const updatePageTranslateSettings = useCallback(async (updates: PartialDeep<GlobalSettings['pageTranslate']>) => {
    await updateSettings({ pageTranslate: updates });
  }, [updateSettings]);

  const toggleEnabled = useCallback(async () => {
    await updatePageTranslateSettings({ enabled: !pageTranslateSettings.enabled });
  }, [pageTranslateSettings.enabled, updatePageTranslateSettings]);

  const toggleAutoTranslate = useCallback(async () => {
    await updatePageTranslateSettings({ autoTranslate: !pageTranslateSettings.autoTranslate });
  }, [pageTranslateSettings.autoTranslate, updatePageTranslateSettings]);

  const setTranslateMode = useCallback(async (mode: 'translated' | 'compare') => {
    await updatePageTranslateSettings({ mode });
  }, [updatePageTranslateSettings]);

  // 自定义词库功能
  const addDictionaryEntry = useCallback(async (entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>) => {
    try {
      const success = await customDictionaryManager.addEntry(entry);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('添加词库条目失败:', err);
      setDictError(err instanceof Error ? err.message : '添加词库条目失败');
      return false;
    }
  }, [loadDictionary]);

  const updateDictionaryEntry = useCallback(async (entry: CustomDictionaryEntry) => {
    try {
      const success = await customDictionaryManager.updateEntry(entry);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('更新词库条目失败:', err);
      setDictError(err instanceof Error ? err.message : '更新词库条目失败');
      return false;
    }
  }, [loadDictionary]);

  const deleteDictionaryEntry = useCallback(async (id: string) => {
    try {
      const success = await customDictionaryManager.deleteEntry(id);
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('删除词库条目失败:', err);
      setDictError(err instanceof Error ? err.message : '删除词库条目失败');
      return false;
    }
  }, [loadDictionary]);

  const clearDictionary = useCallback(async () => {
    try {
      const success = await customDictionaryManager.clearDictionary();
      if (success) {
        await loadDictionary();
      }
      return success;
    } catch (err) {
      console.error('清空词库失败:', err);
      setDictError(err instanceof Error ? err.message : '清空词库失败');
      return false;
    }
  }, [loadDictionary]);

  const getDictionaryByDomain = useCallback(async (domain: string) => {
    try {
      return await customDictionaryManager.getDictionaryByDomain(domain);
    } catch (err) {
      console.error('查询域名词库失败:', err);
      return [];
    }
  }, []);

  const findTranslation = useCallback(async (domain: string, original: string) => {
    try {
      return await customDictionaryManager.findTranslation(domain, original);
    } catch (err) {
      console.error('查找翻译失败:', err);
      return undefined;
    }
  }, []);

  // 域名设置功能
  const setDomainSetting = useCallback(async (setting: Omit<DomainSetting, 'timestamp'>) => {
    try {
      const success = await domainSettingsManager.setDomainSetting(setting);
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('设置域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '设置域名设置失败');
      return false;
    }
  }, [loadDomainSettings]);

  const deleteDomainSetting = useCallback(async (domain: string) => {
    try {
      const success = await domainSettingsManager.deleteDomainSetting(domain);
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('删除域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '删除域名设置失败');
      return false;
    }
  }, [loadDomainSettings]);

  const clearDomainSettings = useCallback(async () => {
    try {
      const success = await domainSettingsManager.clearDomainSettings();
      if (success) {
        await loadDomainSettings();
      }
      return success;
    } catch (err) {
      console.error('清空域名设置失败:', err);
      setDomainError(err instanceof Error ? err.message : '清空域名设置失败');
      return false;
    }
  }, [loadDomainSettings]);

  const isWhitelisted = useCallback(async (domain: string) => {
    try {
      return await domainSettingsManager.isWhitelisted(domain);
    } catch (err) {
      console.error('检查白名单失败:', err);
      return false;
    }
  }, []);

  const getWhitelistedDomains = useCallback(async () => {
    try {
      return await domainSettingsManager.getWhitelistedDomains();
    } catch (err) {
      console.error('获取白名单域名失败:', err);
      return [];
    }
  }, []);

  return {
    // 基础设置
    pageTranslateSettings,
    updatePageTranslateSettings,
    toggleEnabled,
    toggleAutoTranslate,
    setTranslateMode,
    
    // 自定义词库
    dictionary,
    dictLoading,
    dictError,
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    clearDictionary,
    getDictionaryByDomain,
    findTranslation,
    refreshDictionary: loadDictionary,
    
    // 域名设置
    domainSettings,
    domainLoading,
    domainError,
    setDomainSetting,
    deleteDomainSetting,
    clearDomainSettings,
    isWhitelisted,
    getWhitelistedDomains,
    refreshDomainSettings: loadDomainSettings,
  };
}