# 自动翻译黑白名单修复总结

## 问题描述
用户报告 popup 中没有正确识别黑白名单，自动翻译功能没有触发。

## 根本原因
经过分析发现有两个主要问题：

### 1. PopupInner.tsx 中的黑白名单检查问题
- **问题**: PopupInner.tsx 还在使用旧的 `pageTranslateSettings.alwaysList` 和 `pageTranslateSettings.neverList`
- **原因**: 黑白名单数据已经迁移到 IndexedDB 中的 `domainSettings`，但 popup 组件没有更新

### 2. autoTranslate.ts 中的自动翻译逻辑问题  
- **问题**: 自动翻译模块还在使用旧的 `pageTranslateConfig.alwaysList` 和 `pageTranslateConfig.neverList`
- **原因**: 自动翻译逻辑没有更新为使用 IndexedDB 中的域名设置

## 修复方案

### 1. 修复 PopupInner.tsx

#### 1.1 添加 IndexedDB Hook 导入
```tsx
import { useDomainSettings } from '~lib/storage/dataHooks';
```

#### 1.2 替换黑白名单操作函数
```tsx
// 使用新的域名设置 Hook
const { 
  domainSettings, 
  setDomainSetting, 
  deleteDomainSetting,
  isBlacklisted,
  isWhitelisted 
} = useDomainSettings();

// 创建黑白名单操作函数
const addToAlwaysList = async (domain: string) => {
  await setDomainSetting({
    domain,
    type: 'whitelist',
    enabled: true,
    notes: '用户手动添加'
  });
};

const addToNeverList = async (domain: string) => {
  await setDomainSetting({
    domain,
    type: 'blacklist',
    enabled: true,
    notes: '用户手动添加'
  });
};
```

#### 1.3 更新黑白名单检查逻辑
```tsx
// 从 IndexedDB 获取黑白名单数据
const alwaysList = domainSettings.filter(setting => setting.type === 'whitelist' && setting.enabled).map(s => s.domain);
const neverList = domainSettings.filter(setting => setting.type === 'blacklist' && setting.enabled).map(s => s.domain);

const isAlways = matchSiteList(alwaysList, key);
const isNever = matchSiteList(neverList, key);
```

#### 1.4 添加响应式更新
```tsx
// 监听域名设置变化，重新计算站点设置
useEffect(() => {
  if (siteKey && domainSettings.length >= 0) {
    const alwaysList = domainSettings.filter(setting => setting.type === 'whitelist' && setting.enabled).map(s => s.domain);
    const neverList = domainSettings.filter(setting => setting.type === 'blacklist' && setting.enabled).map(s => s.domain);
    
    const isAlways = matchSiteList(alwaysList, siteKey);
    const isNever = matchSiteList(neverList, siteKey);
    
    setSiteSettings({
      always: isAlways,
      never: isNever
    });
  }
}, [domainSettings, siteKey]);
```

### 2. 修复 autoTranslate.ts

#### 2.1 添加 IndexedDB 相关导入
```typescript
import { IndexedDBManager, DATABASE_CONFIGS } from '~lib/storage/indexedDB';
import type { DomainSetting } from '~lib/storage/dataHooks';
```

#### 2.2 添加获取域名设置函数
```typescript
// 获取域名设置
const getDomainSettings = async (): Promise<DomainSetting[]> => {
  try {
    const dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);
    await dbManager.init();
    return await dbManager.getAll<DomainSetting>('domainSettings');
  } catch (error) {
    console.error('获取域名设置失败:', error);
    return [];
  }
};
```

#### 2.3 更新自动翻译逻辑
```typescript
// 获取域名设置
const domainSettings = await getDomainSettings();
const neverList = domainSettings
  .filter(setting => setting.type === 'blacklist' && setting.enabled)
  .map(setting => setting.domain);
const alwaysList = domainSettings
  .filter(setting => setting.type === 'whitelist' && setting.enabled)
  .map(setting => setting.domain);

if (matchSiteList(neverList, fullUrl)) {
  return;
}

if (matchSiteList(alwaysList, fullUrl)) {
  // 执行自动翻译逻辑
}
```

## 数据流程

### 修复前的数据流程
```
页面翻译设置页面 -> Storage API -> pageTranslateSettings.alwaysList/neverList
                                 ↓
PopupInner.tsx <- 读取 pageTranslateSettings <- Storage API
autoTranslate.ts <- 读取 pageTranslateSettings <- Storage API
```

### 修复后的数据流程  
```
页面翻译设置页面 -> IndexedDB -> domainSettings (type: whitelist/blacklist)
                            ↓
PopupInner.tsx <- useDomainSettings Hook <- IndexedDB
autoTranslate.ts <- getDomainSettings() <- IndexedDB
```

## 修复效果

### 1. PopupInner.tsx 修复效果
- ✅ 正确识别当前网站的黑白名单状态
- ✅ 黑白名单开关能正确显示和操作
- ✅ 实时响应域名设置的变化
- ✅ 与设置页面的数据保持同步

### 2. autoTranslate.ts 修复效果  
- ✅ 自动翻译能正确检查黑白名单
- ✅ 白名单网站自动触发翻译
- ✅ 黑名单网站不会自动翻译
- ✅ 与最新的域名设置保持同步

## 测试建议

### 1. 黑白名单功能测试
1. 在设置页面添加网站到白名单
2. 访问该网站，确认 popup 中显示白名单状态
3. 确认页面自动翻译被触发
4. 将网站移动到黑名单
5. 刷新页面，确认不会自动翻译

### 2. 响应式更新测试
1. 打开 popup
2. 在设置页面修改当前网站的黑白名单状态  
3. 切换回 popup，确认状态已更新
4. 刷新页面，确认自动翻译行为符合预期

## 技术优势

### 1. 数据一致性
- 所有组件都使用相同的 IndexedDB 数据源
- 避免了数据不同步的问题

### 2. 实时性
- Hook 系统提供实时数据更新
- 设置变更立即反映到所有使用的地方

### 3. 性能优化
- IndexedDB 提供更高效的数据查询
- 减少不必要的数据转换

现在自动翻译功能应该能正确识别黑白名单并按预期工作了！
