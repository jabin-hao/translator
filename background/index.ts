import { DEFAULT_SETTINGS, GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import { mergeSettings } from '~lib/settings/mergeSettings';
import { storageApi } from '~lib/storage/storage';

chrome.runtime.onInstalled.addListener(async () => {
  const existingSettings = (await storageApi.get(GLOBAL_SETTINGS_KEY)) as
    | typeof DEFAULT_SETTINGS
    | undefined;

  await storageApi.set(
    GLOBAL_SETTINGS_KEY,
    existingSettings ? mergeSettings(DEFAULT_SETTINGS, existingSettings) : DEFAULT_SETTINGS
  );
});

export {};
