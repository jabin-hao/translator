/**
 * 基于 IndexedDB 的网页翻译设置管理 Hook
 * 替换原有的基于 Storage API 的实现
 */

import { useCallback, useState, useEffect } from 'react';
import { useDomainSettings, useCustomDictionary } from '../storage/indexedHooks';
import type { DomainSetting, CustomDictionaryEntry } from '../storage/indexedHooks';

// 网页翻译设置类型定义
export interface PageTranslateSettings {
  enabled: boolean;
  autoTranslateEnabled: boolean;
  mode: 'never' | 'always' | 'ask';
  targetLanguage: string;
  pageTranslateMode: string;
  alwaysList: string[];
  neverList: string[];
}

// 默认设置
const DEFAULT_PAGE_TRANSLATE_SETTINGS: PageTranslateSettings = {
  enabled: true,
  autoTranslateEnabled: false,
  mode: 'ask',
  targetLanguage: 'zh-CN',
  pageTranslateMode: 'hover',
  alwaysList: [],
  neverList: []
};

export function usePageTranslateSettingsIndexedDB() {
  const { 
    domainSettings, 
    loading: domainLoading, 
    error: domainError,
    setDomainSetting,
    deleteDomainSetting: deleteDomain,
    getDomainSetting,
    isBlacklisted,
    isWhitelisted
  } = useDomainSettings();

  const [localSettings, setLocalSettings] = useState<PageTranslateSettings>(DEFAULT_PAGE_TRANSLATE_SETTINGS);
  const [loading, setLoading] = useState(true);

  // 从域名设置生成列表
  useEffect(() => {
    const alwaysList = domainSettings
      .filter(setting => setting.type === 'whitelist' && setting.enabled)
      .map(setting => setting.domain);
    
    const neverList = domainSettings
      .filter(setting => setting.type === 'blacklist' && setting.enabled)
      .map(setting => setting.domain);

    setLocalSettings(prev => ({
      ...prev,
      alwaysList,
      neverList
    }));
    setLoading(false);
  }, [domainSettings]);

  // 切换自动翻译
  const toggleAutoTranslate = useCallback(async () => {
    setLocalSettings(prev => ({
      ...prev,
      autoTranslateEnabled: !prev.autoTranslateEnabled
    }));
  }, []);

  // 切换启用状态
  const toggleEnabled = useCallback(async () => {
    setLocalSettings(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  }, []);

  // 设置模式
  const setMode = useCallback(async (mode: 'never' | 'always' | 'ask') => {
    setLocalSettings(prev => ({
      ...prev,
      mode
    }));
  }, []);

  // 设置目标语言
  const setTargetLanguage = useCallback(async (targetLanguage: string) => {
    setLocalSettings(prev => ({
      ...prev,
      targetLanguage
    }));
  }, []);

  // 设置页面翻译模式
  const setPageTranslateMode = useCallback(async (pageTranslateMode: string) => {
    setLocalSettings(prev => ({
      ...prev,
      pageTranslateMode
    }));
  }, []);

  // 添加到白名单
  const addToAlwaysList = useCallback(async (domain: string) => {
    await setDomainSetting({
      domain,
      type: 'whitelist',
      enabled: true,
      notes: '网页翻译白名单'
    });
  }, [setDomainSetting]);

  // 添加到黑名单
  const addToNeverList = useCallback(async (domain: string) => {
    await setDomainSetting({
      domain,
      type: 'blacklist',
      enabled: true,
      notes: '网页翻译黑名单'
    });
  }, [setDomainSetting]);

  // 从白名单移除
  const removeFromAlwaysList = useCallback(async (domain: string) => {
    const setting = getDomainSetting(domain);
    if (setting && setting.type === 'whitelist') {
      await deleteDomain(domain);
    }
  }, [getDomainSetting, deleteDomain]);

  // 从黑名单移除
  const removeFromNeverList = useCallback(async (domain: string) => {
    const setting = getDomainSetting(domain);
    if (setting && setting.type === 'blacklist') {
      await deleteDomain(domain);
    }
  }, [getDomainSetting, deleteDomain]);

  // 网站匹配逻辑
  const matchSiteList = useCallback((list: string[], url: string): boolean => {
    if (list.includes(url)) {
      return true;
    }
    
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      let path = u.pathname;

      while (path && path !== '/') {
        const test = u.hostname + path;
        if (list.includes(test)) {
          return true;
        }
        path = path.substring(0, path.lastIndexOf('/'));
      }
      
      return list.includes(u.hostname);
    } catch (error) {
      return list.some(item => url.startsWith(item));
    }
  }, []);

  return {
    pageTranslateSettings: localSettings,
    loading: loading || domainLoading,
    error: domainError,
    
    // 基本功能
    toggleEnabled,
    toggleAutoTranslate,
    setMode,
    setTargetLanguage,
    setPageTranslateMode,
    
    // 网站列表管理
    addToAlwaysList,
    addToNeverList,
    removeFromAlwaysList,
    removeFromNeverList,
    
    // 查询功能
    matchSiteList,
    isBlacklisted,
    isWhitelisted,
    getDomainSetting
  };
}

// 兼容性导出 - 保持与原有 API 的兼容性
export { usePageTranslateSettingsIndexedDB as usePageTranslateSettings };
