# 自动翻译调试指南

## 调试步骤

### 1. 检查调试日志
打开浏览器开发者工具的 Console 标签，刷新页面，查看以下日志：

#### AutoTranslate 相关日志
- `[AutoTranslate] 检查自动翻译:` - 显示当前网站信息
- `[AutoTranslate] 页面翻译配置:` - 显示翻译配置
- `[AutoTranslate] 域名设置:` - 显示从 IndexedDB 获取的域名设置
- `[AutoTranslate] 黑白名单:` - 显示处理后的黑白名单
- `[AutoTranslate] 网站在白名单中，开始自动翻译` - 确认自动翻译触发

#### Popup 相关日志
- `[Popup] 域名设置更新:` - 显示 popup 中的域名设置
- `[Popup] 站点匹配结果:` - 显示站点匹配结果

### 2. 检查设置状态

#### 全局自动翻译开关
确保在 popup 中 "网站自动翻译" 开关是开启状态。

#### 域名设置
确保当前网站已添加到白名单中：
1. 打开设置页面 -> 页面翻译设置
2. 在 "总是翻译的网站" 中添加当前网站域名
3. 或者在 popup 中直接点击 "总是翻译该网站" 按钮

### 3. 检查 IndexedDB 数据

#### 检查数据库是否创建
1. 打开开发者工具 -> Application -> Storage -> IndexedDB
2. 查看是否有 `UserData` 数据库
3. 展开数据库，查看是否有 `domainSettings` 表

#### 检查域名设置数据
在 Console 中运行以下代码检查数据：

```javascript
// 检查 IndexedDB 中的域名设置
(async () => {
  const request = indexedDB.open('UserData', 2);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['domainSettings'], 'readonly');
    const store = transaction.objectStore('domainSettings');
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      console.log('IndexedDB 域名设置:', getAllRequest.result);
    };
  };
})();
```

### 4. 手动添加测试数据

如果没有域名设置数据，可以手动添加测试数据：

```javascript
// 手动添加白名单域名
(async () => {
  const request = indexedDB.open('UserData', 2);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['domainSettings'], 'readwrite');
    const store = transaction.objectStore('domainSettings');
    
    const testDomain = {
      domain: window.location.hostname, // 当前网站域名
      type: 'whitelist',
      enabled: true,
      timestamp: Date.now(),
      notes: '测试添加'
    };
    
    store.put(testDomain);
    console.log('已添加测试域名到白名单:', testDomain);
  };
})();
```

### 5. 常见问题排查

#### 问题1: 没有自动翻译日志
- 检查 content script 是否正确加载
- 检查 `setupAutoTranslate` 是否被调用
- 检查页面是否完全加载

#### 问题2: 域名设置为空
- 检查 IndexedDB 是否正确初始化
- 检查数据库版本是否正确
- 尝试手动添加测试数据

#### 问题3: 自动翻译开关关闭
- 在 popup 中开启 "网站自动翻译"
- 检查全局设置中的 `pageTranslate.autoTranslateEnabled`

#### 问题4: 站点不在白名单
- 使用 popup 或设置页面添加当前站点到白名单
- 检查域名匹配逻辑是否正确

### 6. 验证修复

完成上述步骤后：
1. 刷新页面
2. 查看 Console 日志确认自动翻译流程
3. 如果看到 `[AutoTranslate] 执行全页翻译:` 说明自动翻译已触发
4. 页面应该自动开始翻译

## 调试命令速查

### 检查当前域名设置
```javascript
(async () => {
  const request = indexedDB.open('UserData', 2);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['domainSettings'], 'readonly');
    const store = transaction.objectStore('domainSettings');
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = () => console.log('域名设置:', getAllRequest.result);
  };
})();
```

### 添加当前网站到白名单
```javascript
(async () => {
  const request = indexedDB.open('UserData', 2);
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['domainSettings'], 'readwrite');
    const store = transaction.objectStore('domainSettings');
    store.put({
      domain: window.location.hostname,
      type: 'whitelist',
      enabled: true,
      timestamp: Date.now(),
      notes: '手动添加'
    });
    console.log('已添加到白名单:', window.location.hostname);
  };
})();
```

### 触发自动翻译检查
```javascript
// 重新触发自动翻译检查 (需要先刷新页面)
window.location.reload();
```
