/**
 * 数据管理组件示例
 * 展示如何使用新的IndexedDB hooks
 */

import React from 'react';
import { 
  useFavorites, 
  useCustomDictionary, 
  useDomainSettings,
  useTranslationCache
} from './storage/indexedHooks';

// 收藏夹管理组件示例
export function FavoritesExample() {
  const {
    favorites,
    loading,
    error,
    addFavorite,
    updateFavorite,
    deleteFavorite,
    searchFavorites,
  } = useFavorites();

  const handleAddFavorite = async () => {
    await addFavorite({
      word: 'hello',
      translation: '你好',
      sourceLanguage: 'en',
      targetLanguage: 'zh-CN',
    });
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h3>收藏夹 ({favorites.length})</h3>
      <button onClick={handleAddFavorite}>添加收藏</button>
      {favorites.map((favorite) => (
        <div key={favorite.id}>
          <span>{favorite.word} → {favorite.translation}</span>
          <button onClick={() => deleteFavorite(favorite.id)}>删除</button>
        </div>
      ))}
    </div>
  );
}

// 自定义词库管理组件示例
export function CustomDictionaryExample() {
  const {
    dictionary,
    loading,
    error,
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    getDictionaryByDomain,
    findTranslation,
  } = useCustomDictionary();

  const handleAddEntry = async () => {
    await addDictionaryEntry({
      domain: 'example.com',
      original: 'custom term',
      translation: '自定义术语',
      sourceLanguage: 'en',
      targetLanguage: 'zh-CN',
      isActive: true,
    });
  };

  const handleFindTranslation = async () => {
    const translation = await findTranslation('example.com', 'custom term');
    console.log('找到翻译:', translation);
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h3>自定义词库 ({dictionary.length})</h3>
      <button onClick={handleAddEntry}>添加词条</button>
      <button onClick={handleFindTranslation}>查找翻译</button>
      {dictionary.map((entry) => (
        <div key={entry.id}>
          <span>{entry.domain}: {entry.original} → {entry.translation}</span>
          <button onClick={() => deleteDictionaryEntry(entry.id)}>删除</button>
        </div>
      ))}
    </div>
  );
}

// 域名设置管理组件示例
export function DomainSettingsExample() {
  const {
    domainSettings,
    loading,
    error,
    setDomainSetting,
    deleteDomainSetting,
    isBlacklisted,
    isWhitelisted,
  } = useDomainSettings();

  const handleAddWhitelist = async () => {
    await setDomainSetting({
      domain: 'trusted-site.com',
      type: 'whitelist',
      enabled: true,
      targetLanguage: 'zh-CN',
    });
  };

  const handleAddBlacklist = async () => {
    await setDomainSetting({
      domain: 'blocked-site.com',
      type: 'blacklist',
      enabled: true,
    });
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h3>域名设置 ({domainSettings.length})</h3>
      <button onClick={handleAddWhitelist}>添加白名单</button>
      <button onClick={handleAddBlacklist}>添加黑名单</button>
      
      <div>
        <p>trusted-site.com 是否在白名单: {isWhitelisted('trusted-site.com') ? '是' : '否'}</p>
        <p>blocked-site.com 是否在黑名单: {isBlacklisted('blocked-site.com') ? '是' : '否'}</p>
      </div>
      
      {domainSettings.map((setting) => (
        <div key={setting.domain}>
          <span>{setting.domain} ({setting.type})</span>
          <button onClick={() => deleteDomainSetting(setting.domain)}>删除</button>
        </div>
      ))}
    </div>
  );
}

// 翻译缓存管理组件示例
export function TranslationCacheExample() {
  const {
    cache,
    loading,
    error,
    getCachedTranslation,
    setCachedTranslation,
    clearCache,
    getCacheStats,
  } = useTranslationCache();

  const handleGetCache = async () => {
    const translation = await getCachedTranslation('hello', 'en', 'zh-CN', 'google');
    console.log('缓存翻译:', translation);
  };

  const handleSetCache = async () => {
    await setCachedTranslation('hello', '你好', 'en', 'zh-CN', 'google');
  };

  const handleGetStats = () => {
    const stats = getCacheStats();
    console.log('缓存统计:', stats);
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h3>翻译缓存 ({cache.length})</h3>
      <button onClick={handleGetCache}>获取缓存</button>
      <button onClick={handleSetCache}>设置缓存</button>
      <button onClick={handleGetStats}>获取统计</button>
      <button onClick={clearCache}>清空缓存</button>
      
      {cache.slice(0, 10).map((entry) => (
        <div key={entry.key}>
          <span>{entry.originalText} → {entry.translatedText}</span>
          <small> (访问 {entry.accessCount} 次)</small>
        </div>
      ))}
    </div>
  );
}

// 综合示例组件
export function DataManagementExample() {
  return (
    <div>
      <h2>数据管理示例</h2>
      <FavoritesExample />
      <hr />
      <CustomDictionaryExample />
      <hr />
      <DomainSettingsExample />
      <hr />
      <TranslationCacheExample />
    </div>
  );
}
