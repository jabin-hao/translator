import { Storage } from '@plasmohq/storage';

const STORAGE_KEY = 'site_translate_settings';
const storage = new Storage();

export interface SiteTranslateSettings {
  autoTranslateEnabled: boolean;
  alwaysTranslateSites: string[];
  neverTranslateSites: string[];
}

const defaultSettings: SiteTranslateSettings = {
  autoTranslateEnabled: true,
  alwaysTranslateSites: [],
  neverTranslateSites: []
};

export async function getSiteTranslateSettings(): Promise<SiteTranslateSettings> {
  const data = await storage.get(STORAGE_KEY);
  if (data && typeof data === 'object') {
    return { ...defaultSettings, ...(data as SiteTranslateSettings) };
  }
  return { ...defaultSettings };
}

export async function setSiteTranslateSettings(settings: SiteTranslateSettings) {
  await storage.set(STORAGE_KEY, settings);
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

export async function setAutoTranslateEnabled(enabled: boolean) {
  const settings = await getSiteTranslateSettings();
  settings.autoTranslateEnabled = enabled;
  await setSiteTranslateSettings(settings);
} 