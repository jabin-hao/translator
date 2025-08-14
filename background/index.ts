// 后台脚本入口文件
import { DEFAULT_SETTINGS } from '~lib/settings/settings';
import { storageApi } from '~lib/storage/storage';

console.log('后台脚本已启动');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(async () => {
  console.log('扩展已安装/更新');
  
  // 检查是否已有全局设置
  const existingSettings = await storageApi.get('global_settings') as any;
  if (!existingSettings) {
    // 第一次安装，设置默认值
    await storageApi.set('global_settings', DEFAULT_SETTINGS);
    console.log('已初始化默认全局设置');
  } else {
    // 合并新的默认设置，保留现有的用户设置
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...existingSettings
    };
    await storageApi.set('global_settings', mergedSettings);
    console.log('已更新全局设置');
  }
});

export {}