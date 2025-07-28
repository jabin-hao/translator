// 后台脚本入口文件
import { Storage } from '@plasmohq/storage';
import { CACHE_KEY, PLUGIN_THEME_KEY, CONTENT_THEME_KEY, UI_LANG_KEY, SHORTCUT_SETTINGS_KEY, TRANSLATION_CACHE_CONFIG_KEY } from '../lib/constants';

console.log('后台脚本已启动');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  console.log('扩展已安装/更新');
  const storage = new Storage();
  // 统一初始化所有默认设置
  if ((await storage.get(CACHE_KEY)) == null) {
    await storage.set(CACHE_KEY, true);
  }
  const cacheConfig = await storage.get(TRANSLATION_CACHE_CONFIG_KEY);
  if (!cacheConfig) {
    await storage.set(TRANSLATION_CACHE_CONFIG_KEY, { maxAge: 7*24*60*60*1000, maxSize: 2000 });
  }
  if ((await storage.get(PLUGIN_THEME_KEY)) == null) {
    await storage.set(PLUGIN_THEME_KEY, 'auto');
  }
  if ((await storage.get(CONTENT_THEME_KEY)) == null) {
    await storage.set(CONTENT_THEME_KEY, 'auto');
  }
  if ((await storage.get(UI_LANG_KEY)) == null) {
    const browserLang = navigator.language || 'zh-CN';
    await storage.set(UI_LANG_KEY, browserLang);
  }
  if ((await storage.get(SHORTCUT_SETTINGS_KEY)) == null) {
    await storage.set(SHORTCUT_SETTINGS_KEY, { enabled: true, customShortcut: '' });
  }
});

export {}; 