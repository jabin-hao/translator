# 统一数据管理系统

本系统提供了基于IndexedDB的统一数据管理解决方案，支持翻译缓存、收藏夹、自定义词库和域名设置等功能。

## 架构概览

```
lib/
├── indexedDB.ts          # 通用IndexedDB操作工具
├── dataHooks.ts          # React数据管理Hooks
├── dataHooksExample.tsx  # 使用示例
└── cache/
    ├── cache.ts          # 原缓存系统（兼容性保留）
    └── newCache.ts       # 重构后的缓存系统
```

## 核心组件

### 1. IndexedDB管理器 (`indexedDB.ts`)

提供通用的IndexedDB操作接口：

```typescript
const dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);
await dbManager.init();

// 基本操作
await dbManager.put('storeName', data);
const data = await dbManager.get('storeName', key);
const allData = await dbManager.getAll('storeName');
const queryResult = await dbManager.getByIndex('storeName', 'indexName', value);
await dbManager.delete('storeName', key);
await dbManager.clear('storeName');
```

### 2. 数据管理Hooks (`dataHooks.ts`)

为React组件提供声明式的数据操作接口：

#### 收藏夹管理
```typescript
const {
  favorites,
  loading,
  error,
  addFavorite,
  updateFavorite,
  deleteFavorite,
  searchFavorites,
} = useFavorites();
```

#### 自定义词库管理
```typescript
const {
  dictionary,
  addDictionaryEntry,
  findTranslation,
  getDictionaryByDomain,
} = useCustomDictionary();
```

#### 域名设置管理
```typescript
const {
  domainSettings,
  setDomainSetting,
  isBlacklisted,
  isWhitelisted,
} = useDomainSettings();
```

#### 翻译缓存管理
```typescript
const {
  cache,
  getCachedTranslation,
  setCachedTranslation,
  clearCache,
  getCacheStats,
} = useTranslationCache();
```

## 数据库结构

### UserData数据库 (版本2)

#### 存储表：

1. **favorites** - 收藏夹
   - `id`: 主键
   - `word`: 原文
   - `translation`: 译文
   - `sourceLanguage`: 源语言
   - `targetLanguage`: 目标语言
   - `timestamp`: 时间戳
   - `tags`: 标签（可选）
   - `notes`: 备注（可选）

2. **customDictionary** - 自定义词库
   - `id`: 主键
   - `domain`: 域名
   - `original`: 原文
   - `translation`: 译文
   - `sourceLanguage`: 源语言
   - `targetLanguage`: 目标语言
   - `timestamp`: 时间戳
   - `isActive`: 是否激活

3. **domainSettings** - 域名设置
   - `domain`: 域名（主键）
   - `type`: 'whitelist' | 'blacklist' | 'auto' | 'manual'
   - `enabled`: 是否启用
   - `targetLanguage`: 目标语言（可选）
   - `timestamp`: 时间戳
   - `notes`: 备注（可选）

4. **translationCache** - 翻译缓存
   - `key`: 缓存键（主键）
   - `originalText`: 原文
   - `translatedText`: 译文
   - `detectedLanguage`: 检测语言
   - `timestamp`: 时间戳
   - `accessCount`: 访问次数
   - `lastAccessed`: 最后访问时间

## 使用方法

### 在React组件中使用

```typescript
import { useFavorites } from '~/lib/dataHooks';

function MyComponent() {
  const { favorites, addFavorite, loading } = useFavorites();

  const handleAdd = async () => {
    await addFavorite({
      word: 'hello',
      translation: '你好',
      sourceLanguage: 'en',
      targetLanguage: 'zh-CN',
    });
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <button onClick={handleAdd}>添加收藏</button>
      {favorites.map(item => (
        <div key={item.id}>{item.word} → {item.translation}</div>
      ))}
    </div>
  );
}
```

### 在非React环境中使用

```typescript
import { IndexedDBManager, DATABASE_CONFIGS } from '~/lib/indexedDB';

const dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);
await dbManager.init();

// 添加收藏
await dbManager.put('favorites', {
  id: 'unique-id',
  word: 'hello',
  translation: '你好',
  sourceLanguage: 'en',
  targetLanguage: 'zh-CN',
  timestamp: Date.now(),
});

// 查询收藏
const favorites = await dbManager.getAll('favorites');
```

## 迁移说明

### 从旧缓存系统迁移

新的缓存系统保持了与原系统的API兼容性：

```typescript
// 旧的方式仍然有效
import { cacheManager } from '~/lib/cache/cache';

// 新的方式（推荐在React组件中使用）
import { useTranslationCache } from '~/lib/dataHooks';
```

### 数据迁移

系统会自动处理数据库版本升级，旧数据会保持兼容。如需手动迁移：

1. 导出旧数据：使用原系统的导出功能
2. 清理旧数据库：可选，建议保留一段时间
3. 导入新系统：使用新hooks或API导入数据

## 性能优化

1. **索引优化**：所有查询字段都建立了索引
2. **批量操作**：支持批量插入和删除
3. **内存缓存**：React hooks提供内存缓存
4. **懒加载**：数据按需加载
5. **自动清理**：过期数据自动清理

## 错误处理

系统提供了完整的错误处理：

```typescript
const { data, loading, error } = useIndexedDBData('storeName');

if (error) {
  console.error('数据操作失败:', error);
  // 处理错误
}
```

## 开发指南

### 添加新的数据类型

1. 在`indexedDB.ts`中添加新的存储配置
2. 在`dataHooks.ts`中定义数据类型和hook
3. 更新数据库版本号
4. 编写迁移逻辑（如需要）

### 测试

使用提供的示例组件进行功能测试：

```typescript
import { DataManagementExample } from '~/lib/dataHooksExample';

// 在开发环境中渲染
<DataManagementExample />
```
