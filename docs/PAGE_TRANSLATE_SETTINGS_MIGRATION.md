# 网页翻译设置页面 IndexedDB 迁移总结

## 概述
已成功将 `options/pages/translate/PageTranslateSettings.tsx` 中的黑白名单和自定义词库功能从 Storage API 迁移到统一的 IndexedDB Hook 系统。

## 主要更改

### 1. 导入更新
```tsx
// 移除旧的自定义词库 API
- getCustomDictEntries,
- addCustomDictEntry,
- deleteCustomDictEntry,
- type CustomDictEntry

// 新增 IndexedDB Hooks
+ useCustomDictionary,
+ useDomainSettings,
+ type CustomDictionaryEntry,
+ type DomainSetting
```

### 2. Hook 使用更新

#### 域名设置（黑白名单）
```tsx
// 使用新的域名设置 Hook
const { 
  domainSettings, 
  setDomainSetting, 
  deleteDomainSetting 
} = useDomainSettings();

// 获取黑白名单数据
const alwaysList = domainSettings.filter(setting => setting.type === 'whitelist' && setting.enabled);
const neverList = domainSettings.filter(setting => setting.type === 'blacklist' && setting.enabled);
```

#### 自定义词库
```tsx
// 使用新的自定义词库 Hook
const { 
  dictionary, 
  addDictionaryEntry, 
  updateDictionaryEntry, 
  deleteDictionaryEntry,
  getDictionaryByDomain 
} = useCustomDictionary();
```

### 3. 功能函数重写

#### 黑白名单操作
```tsx
// 添加到白名单
const addToAlwaysList = async (domain: string) => {
  await setDomainSetting({
    domain,
    type: 'whitelist',
    enabled: true,
    notes: '用户手动添加'
  });
};

// 添加到黑名单
const addToNeverList = async (domain: string) => {
  await setDomainSetting({
    domain,
    type: 'blacklist',
    enabled: true,
    notes: '用户手动添加'
  });
};

// 从列表中移除
const removeFromAlwaysList = async (domain: string) => {
  await deleteDomainSetting(domain);
};
```

#### 自定义词库操作
```tsx
// 加载词库条目
const handleEditDict = async (host: string) => {
  const entries = await getDictionaryByDomain(host);
  setDictEntries(entries);
};

// 添加词库条目
const handleAddDictEntry = async () => {
  await addDictionaryEntry({
    domain: dictHost,
    original: dictAddKey.trim(),
    translation: dictAddValue.trim(),
    sourceLanguage: 'auto',
    targetLanguage: 'zh',
    isActive: true
  });
};

// 更新词库条目
await updateDictionaryEntry({
  ...entry,
  translation: newTranslation
});

// 删除词库条目
await deleteDictionaryEntry(entry.id);
```

### 4. 数据结构更新

#### 域名设置数据结构
```typescript
interface DomainSetting {
  domain: string;
  type: 'whitelist' | 'blacklist' | 'auto' | 'manual';
  enabled: boolean;
  targetLanguage?: string;
  timestamp: number;
  notes?: string;
}
```

#### 自定义词库数据结构
```typescript
interface CustomDictionaryEntry {
  id: string;
  domain: string;
  original: string;        // 原文
  translation: string;     // 译文
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  isActive: boolean;
}
```

### 5. UI 数据绑定更新

#### 黑白名单显示
```tsx
// 数据来源从 pageTranslateSettings 转换为 IndexedDB
- const alwaysSitesToShow = (pageTranslateSettings.alwaysList || []).slice(0, 5);
+ const alwaysSitesToShow = alwaysList.map(setting => setting.domain).slice(0, 5);

// Modal 数据绑定
- sites={pageTranslateSettings.alwaysList || []}
+ sites={alwaysList.map(setting => setting.domain)}
```

#### 自定义词库显示
```tsx
// 属性名称更新
- entry.originalText → entry.original
- entry.customTranslation → entry.translation
- entry.host → entry.domain
```

## 数据库架构

### UserData 数据库
- **domainSettings** 存储: 域名黑白名单设置
  - 主键: `domain`
  - 索引: `domain`, `type`, `timestamp`
  
- **customDictionary** 存储: 自定义词库条目
  - 主键: `id`
  - 索引: `id`, `domain`, `original`

## 优势

### 1. 性能提升
- IndexedDB 提供更高效的数据存储和查询
- 支持索引查询，按域名快速检索词库条目
- 减少存储API的同步开销

### 2. 数据完整性
- 更好的数据结构设计
- 支持事务操作
- 自动生成时间戳和ID

### 3. 架构统一
- 与收藏夹、翻译缓存使用相同的数据管理模式
- 一致的错误处理和状态管理
- 统一的 Hook 接口

### 4. 功能增强
- 支持复杂查询（按域名查询词库）
- 更丰富的域名设置选项
- 更好的数据扩展性

## 迁移完成状态

✅ **已完成**:
- 黑白名单功能完全迁移到 IndexedDB
- 自定义词库功能完全迁移到 IndexedDB
- 所有 UI 组件更新完成
- 编译错误全部解决

✅ **保持兼容**:
- 页面翻译开关等其他设置继续使用 storage hook
- 用户界面和操作流程无变化
- API 接口语义保持一致

## 后续优化建议

1. **数据迁移**: 可以考虑添加数据迁移逻辑，将现有的 Storage 数据导入到 IndexedDB
2. **性能优化**: 可以添加缓存机制减少数据库查询
3. **批量操作**: 可以优化批量添加/删除操作的性能
4. **搜索功能**: 利用 IndexedDB 的索引功能增强搜索体验

现在页面翻译设置已经成功使用统一的 IndexedDB Hook 接口来管理黑白名单和自定义词库数据！
