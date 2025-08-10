// 后台脚本入口文件
import { CACHE_KEY, THEME_MODE_KEY, UI_LANG_KEY, SHORTCUT_SETTINGS_KEY, TRANSLATION_CACHE_CONFIG_KEY, DEFAULT_CACHE_CONFIG } from '~lib/constants/settings';
import {storageApi} from "~lib/utils/storage";

console.log('后台脚本已启动');

const get = async (key: string)=>{
  return await storageApi.get(key);
}

const save = async (key: string, val: any)=>{
  await storageApi.set(key, val);
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  console.log('扩展已安装/更新');
  // 统一初始化所有默认设置
  if (await get(CACHE_KEY) == null) {
    await save(CACHE_KEY, true);
  }
  const cacheConfig = await get(TRANSLATION_CACHE_CONFIG_KEY);
  if (!cacheConfig) {
    await save(TRANSLATION_CACHE_CONFIG_KEY, DEFAULT_CACHE_CONFIG);
  }
  if (await get(THEME_MODE_KEY) == null) {
    await save(THEME_MODE_KEY, 'auto');
  }
  if (await get(UI_LANG_KEY) == null) {
    const browserLang = navigator.language || 'zh-CN';
    await save(UI_LANG_KEY, browserLang);
  }
  if (await get(SHORTCUT_SETTINGS_KEY) == null) {
    await save(SHORTCUT_SETTINGS_KEY, { enabled: true, customShortcut: '' });
  }
});

export {}