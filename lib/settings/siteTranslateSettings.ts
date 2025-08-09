import { storageApi } from '~lib/utils/storage';
import { useStorage } from '~lib/utils/storage';
import { DICT_KEY } from '../constants/settings';

// 主要使用的配置接口
export interface DictConfig {
  siteAlwaysList: string[];
  siteNeverList: string[];
  customDicts: Record<string, any>;
  pageTranslateMode?: string;
  autoTranslateEnabled?: boolean;
}

const defaultDict: DictConfig = {
  siteAlwaysList: [],
  siteNeverList: [],
  customDicts: {},
  autoTranslateEnabled: false
};

// React Hook 版本 - 用于组件中的响应式状态管理
export function useDictConfig() {
  return useStorage<DictConfig>(DICT_KEY, defaultDict);
}

// 自动翻译开关的单独hook
export function useAutoTranslateEnabled() {
  const [dictConfig, setDictConfig] = useDictConfig();
  
  const setAutoTranslateEnabled = async (enabled: boolean) => {
    await setDictConfig({ ...dictConfig, autoTranslateEnabled: enabled });
  };
  
  return [dictConfig.autoTranslateEnabled ?? false, setAutoTranslateEnabled] as const;
}

// 主要API - 推荐使用

export async function getDictConfig(): Promise<DictConfig> {
  const data = await storageApi.get(DICT_KEY);
  if (data && typeof data === 'object') {
    return { ...defaultDict, ...(data as DictConfig) };
  }
  return { ...defaultDict };
}

export async function setDictConfig(dict: DictConfig) {
  await storageApi.set(DICT_KEY, dict);
}

export async function addAlwaysSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  if (!dict.siteAlwaysList.map(h => h.trim()).includes(trimmedHost)) {
    dict.siteAlwaysList.push(trimmedHost);
    dict.siteNeverList = (dict.siteNeverList || []).filter(h => h.trim() !== trimmedHost);
    await setDictConfig(dict);
  }
}

export async function addNeverSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  if (!dict.siteNeverList.map(h => h.trim()).includes(trimmedHost)) {
    dict.siteNeverList.push(trimmedHost);
    dict.siteAlwaysList = (dict.siteAlwaysList || []).filter(h => h.trim() !== trimmedHost);
    await setDictConfig(dict);
  }
}

export async function removeAlwaysSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  dict.siteAlwaysList = (dict.siteAlwaysList || []).filter(h => h.trim() !== trimmedHost);
  await setDictConfig(dict);
}

export async function removeNeverSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  dict.siteNeverList = (dict.siteNeverList || []).filter(h => h.trim() !== trimmedHost);
  await setDictConfig(dict);
}

export async function getCustomDict(host: string) {
  const dict = await getDictConfig();
  return dict.customDicts[host] || {};
}

export async function setCustomDict(host: string, customDict: any) {
  const dict = await getDictConfig();
  dict.customDicts[host] = customDict;
  await setDictConfig(dict);
}

export async function removeCustomDict(host: string) {
  const dict = await getDictConfig();
  delete dict.customDicts[host];
  await setDictConfig(dict);
}

export async function setAutoTranslateEnabled(enabled: boolean) {
  const dict = await getDictConfig();
  await setDictConfig({ ...dict, autoTranslateEnabled: enabled });
}

// 支持路径匹配的工具函数
export function matchSiteList(list: string[], url: string): boolean {
  
  // 完整匹配
  if (list.includes(url)) {
    return true;
  }
  
  // 路径递减匹配
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
    
    // 主域名匹配
    const result = list.includes(u.hostname);
    return result;
  } catch (error) {
    // fallback: 只用字符串包含
    return list.some(item => {
      const match = url.startsWith(item);
      return match;
    });
  }
}