// 后台脚本入口文件
import { Storage } from '@plasmohq/storage';

console.log('后台脚本已启动');

// 初始化默认设置
async function initializeDefaultSettings() {
  try {
    const storage = new Storage();
    
    // 检查并设置缓存默认值
    const cacheEnabled = await storage.get('translation_cache_enabled');
    if (cacheEnabled === null || cacheEnabled === undefined) {
      console.log('设置缓存默认值为启用');
      await storage.set('translation_cache_enabled', true);
    }
    
    console.log('默认设置初始化完成');
  } catch (error) {
    console.error('初始化默认设置失败:', error);
  }
}

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装/更新');
  initializeDefaultSettings();
});

// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
  console.log('扩展已启动');
  initializeDefaultSettings();
});

// 立即初始化（如果扩展已经运行）
initializeDefaultSettings();

export {}; 