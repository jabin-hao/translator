import { storageApi } from '~lib/utils/storage';
import { SITE_TRANSLATE_SETTINGS_KEY, DICT_KEY } from '../constants/settings';

export interface SiteTranslateSettings {
  autoTranslateEnabled: boolean;
  alwaysTranslateSites: string[];
  neverTranslateSites: string[];
  pageTranslateMode?: string;
}

const defaultSettings: SiteTranslateSettings = {
  autoTranslateEnabled: false,
  alwaysTranslateSites: [],
  neverTranslateSites: []
};

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
  customDicts: {}
};

export async function getSiteTranslateSettings(): Promise<SiteTranslateSettings> {
  const data = await storageApi.get(SITE_TRANSLATE_SETTINGS_KEY);
  if (data && typeof data === 'object') {
    return { ...defaultSettings, ...(data as SiteTranslateSettings) };
  }
  return { ...defaultSettings };
}

export async function setSiteTranslateSettings(settings: SiteTranslateSettings) {
  await storageApi.set(SITE_TRANSLATE_SETTINGS_KEY, settings);
}

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
  const settings = await getSiteTranslateSettings();
  settings.autoTranslateEnabled = enabled;
  await setSiteTranslateSettings(settings);
}

// 新增：支持路径匹配的工具函数
export function matchSiteList(list: string[], url: string): boolean {
  // 完整匹配
  if (list.includes(url)) return true;
  // 路径递减匹配
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    let path = u.pathname;
    while (path && path !== '/') {
      const test = u.hostname + path;
      if (list.includes(test)) return true;
      path = path.substring(0, path.lastIndexOf('/'));
    }
    // 主域名匹配
    return list.includes(u.hostname);
  } catch {
    // fallback: 只用字符串包含
    return list.some(item => url.startsWith(item));
  }
} 