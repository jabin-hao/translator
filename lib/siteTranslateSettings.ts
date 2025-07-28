import { Storage } from '@plasmohq/storage';
import { SITE_TRANSLATE_SETTINGS_KEY, DICT_KEY } from './constants';

const storage = new Storage();

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
  const data = await storage.get(SITE_TRANSLATE_SETTINGS_KEY);
  if (data && typeof data === 'object') {
    return { ...defaultSettings, ...(data as SiteTranslateSettings) };
  }
  return { ...defaultSettings };
}

export async function setSiteTranslateSettings(settings: SiteTranslateSettings) {
  await storage.set(SITE_TRANSLATE_SETTINGS_KEY, settings);
}

export async function getDictConfig(): Promise<DictConfig> {
  const data = await storage.get(DICT_KEY);
  if (data && typeof data === 'object') {
    return { ...defaultDict, ...(data as DictConfig) };
  }
  return { ...defaultDict };
}

export async function setDictConfig(dict: DictConfig) {
  await storage.set(DICT_KEY, dict);
}

export async function addAlwaysTranslateSite(host: string) {
  const settings = await getSiteTranslateSettings();
  if (!settings.alwaysTranslateSites.includes(host)) {
    settings.alwaysTranslateSites.push(host);
    // 移除 never 列表
    settings.neverTranslateSites = settings.neverTranslateSites.filter(h => h !== host);
    await setSiteTranslateSettings(settings);
  }
}

export async function addNeverTranslateSite(host: string) {
  const settings = await getSiteTranslateSettings();
  if (!settings.neverTranslateSites.includes(host)) {
    settings.neverTranslateSites.push(host);
    // 移除 always 列表
    settings.alwaysTranslateSites = settings.alwaysTranslateSites.filter(h => h !== host);
    await setSiteTranslateSettings(settings);
  }
}

export async function removeAlwaysTranslateSite(host: string) {
  const settings = await getSiteTranslateSettings();
  settings.alwaysTranslateSites = settings.alwaysTranslateSites.filter(h => h !== host);
  await setSiteTranslateSettings(settings);
}

export async function removeNeverTranslateSite(host: string) {
  const settings = await getSiteTranslateSettings();
  settings.neverTranslateSites = settings.neverTranslateSites.filter(h => h !== host);
  await setSiteTranslateSettings(settings);
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

export async function clearCustomDict(host: string) {
  const dict = await getDictConfig();
  delete dict.customDicts[host];
  await setDictConfig(dict);
}

export async function setAutoTranslateEnabled(enabled: boolean) {
  const settings = await getSiteTranslateSettings();
  settings.autoTranslateEnabled = enabled;
  await setSiteTranslateSettings(settings);
} 