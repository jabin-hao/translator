// 后台脚本入口文件
import { CACHE_KEY, PLUGIN_THEME_KEY, CONTENT_THEME_KEY, UI_LANG_KEY, SHORTCUT_SETTINGS_KEY, TRANSLATION_CACHE_CONFIG_KEY } from '~lib/constants/settings';
import {getConfig, saveConfig} from "~lib/utils/storage";

console.log('后台脚本已启动');

const get = async (key: string, def: string | any[])=>{
  return await getConfig(key,def);
}

const save = async (key: string, val: any)=>{
  await saveConfig(key, val);
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  console.log('扩展已安装/更新');
  // 统一初始化所有默认设置
  if (await get(CACHE_KEY, '') == null) {
    await save(CACHE_KEY, true);
  }
  const cacheConfig = await get(TRANSLATION_CACHE_CONFIG_KEY, '');
  if (!cacheConfig) {
    await save(TRANSLATION_CACHE_CONFIG_KEY, { maxAge: 7*24*60*60*1000, maxSize: 2000 });
  }
  if (await get(PLUGIN_THEME_KEY, '') == null) {
    await save(PLUGIN_THEME_KEY, 'auto');
  }
  if (await get(CONTENT_THEME_KEY, '') == null) {
    await save(CONTENT_THEME_KEY, 'auto');
  }
  if (await get(UI_LANG_KEY, '') == null) {
    const browserLang = navigator.language || 'zh-CN';
    await save(UI_LANG_KEY, browserLang);
  }
  if (await get(SHORTCUT_SETTINGS_KEY, '') == null) {
    await save(SHORTCUT_SETTINGS_KEY, { enabled: true, customShortcut: '' });
  }
});

export {}; 