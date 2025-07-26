// 后台脚本入口文件
console.log('后台脚本已启动');

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装/更新');
});

// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
  console.log('扩展已启动');
});

export {}; 