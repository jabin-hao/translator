import { storageApi } from '~lib/utils/storage';
import { useStorage } from '~lib/utils/storage';
import { DICT_KEY } from '../constants/settings';

// 自定义词库条目接口
export interface CustomDictEntry {
  id?: number; // 自动生成的主键
  host: string; // 网站域名
  originalText: string; // 原文
  customTranslation: string; // 自定义翻译
  timestamp?: number; // 创建时间戳
  lastUsed?: number; // 最后使用时间
}

// 简化的站点配置接口（不再包含customDicts）
export interface DictConfig {
  siteAlwaysList: string[];
  siteNeverList: string[];
  pageTranslateMode?: string;
  autoTranslateEnabled?: boolean;
}

const defaultDict: DictConfig = {
  siteAlwaysList: [],
  siteNeverList: [],
  autoTranslateEnabled: false
};

// React Hook 版本 - 用于组件中的响应式状态管理
export function useDictConfig() {
  return useStorage<DictConfig>(DICT_KEY, defaultDict);
}

// 自动翻译开关的单独hook
export function useAutoTranslateEnabled() {
  const [dictConfig, setDictConfig] = useDictConfig();
  
  const setAutoTranslateEnabled = async (enabled: boolean) => {
    await setDictConfig({ ...dictConfig, autoTranslateEnabled: enabled });
  };
  
  return [dictConfig.autoTranslateEnabled ?? false, setAutoTranslateEnabled] as const;
}

// 主要API - 推荐使用

export async function getDictConfig(): Promise<DictConfig> {
  const data = await storageApi.get(DICT_KEY);
  if (data && typeof data === 'object') {
    return { ...defaultDict, ...(data as DictConfig) };
  }
  return { ...defaultDict };
}

export async function setDictConfig(dict: DictConfig) {
  await storageApi.set(DICT_KEY, dict);
}

export async function addAlwaysSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  if (!dict.siteAlwaysList.map(h => h.trim()).includes(trimmedHost)) {
    dict.siteAlwaysList.push(trimmedHost);
    dict.siteNeverList = (dict.siteNeverList || []).filter(h => h.trim() !== trimmedHost);
    await setDictConfig(dict);
  }
}

export async function addNeverSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  if (!dict.siteNeverList.map(h => h.trim()).includes(trimmedHost)) {
    dict.siteNeverList.push(trimmedHost);
    dict.siteAlwaysList = (dict.siteAlwaysList || []).filter(h => h.trim() !== trimmedHost);
    await setDictConfig(dict);
  }
}

export async function removeAlwaysSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  dict.siteAlwaysList = (dict.siteAlwaysList || []).filter(h => h.trim() !== trimmedHost);
  await setDictConfig(dict);
  
  // 同时删除对应的自定义词库
  await deleteCustomDictByHost(trimmedHost);
}

export async function removeNeverSite(host: string) {
  const dict = await getDictConfig();
  const trimmedHost = host.trim();
  dict.siteNeverList = (dict.siteNeverList || []).filter(h => h.trim() !== trimmedHost);
  await setDictConfig(dict);
}

export async function getCustomDict(host: string) {
  // 临时兼容性实现，稍后会替换为IndexedDB
  console.warn('getCustomDict: 请迁移到新的IndexedDB实现');
  return {};
}

export async function setCustomDict(host: string, customDict: any) {
  // 临时兼容性实现，稍后会替换为IndexedDB
  console.warn('setCustomDict: 请迁移到新的IndexedDB实现');
}

export async function removeCustomDict(host: string) {
  // 临时兼容性实现，稍后会替换为IndexedDB
  console.warn('removeCustomDict: 请迁移到新的IndexedDB实现');
}

export async function setAutoTranslateEnabled(enabled: boolean) {
  const dict = await getDictConfig();
  await setDictConfig({ ...dict, autoTranslateEnabled: enabled });
}

// 支持路径匹配的工具函数
export function matchSiteList(list: string[], url: string): boolean {
  
  // 完整匹配
  if (list.includes(url)) {
    return true;
  }
  
  // 路径递减匹配
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    let path = u.pathname;

    while (path && path !== '/') {
      const test = u.hostname + path;
      if (list.includes(test)) {
        return true;
      }
      path = path.substring(0, path.lastIndexOf('/'));
    }
    
    // 主域名匹配
    const result = list.includes(u.hostname);
    return result;
  } catch (error) {
    // fallback: 只用字符串包含
    return list.some(item => {
      const match = url.startsWith(item);
      return match;
    });
  }
}

// ===== 新的 IndexedDB 自定义词库管理器 =====

class CustomDictManager {
  private dbName = 'TranslatorCustomDict';
  private version = 1;
  private storeName = 'customDictEntries';
  private db: IDBDatabase | null = null;

  // 初始化数据库
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // 创建自定义词库存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
          
          // 创建索引
          store.createIndex('host', 'host', { unique: false });
          store.createIndex('originalText', 'originalText', { unique: false });
          store.createIndex('hostAndOriginal', ['host', 'originalText'], { unique: true });
        }
      };
    });
  }

  // 添加或更新自定义词库条目
  async addEntry(entry: Omit<CustomDictEntry, 'id' | 'timestamp'>): Promise<number> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('hostAndOriginal');
      
      // 先检查是否已存在
      const checkRequest = index.get([entry.host, entry.originalText]);
      
      checkRequest.onsuccess = () => {
        const existingEntry = checkRequest.result;
        
        if (existingEntry) {
          // 更新现有条目
          const updatedEntry: CustomDictEntry = {
            ...existingEntry,
            customTranslation: entry.customTranslation,
            lastUsed: Date.now()
          };
          
          const updateRequest = store.put(updatedEntry);
          updateRequest.onsuccess = () => resolve(updatedEntry.id!);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          // 添加新条目
          const newEntry: CustomDictEntry = {
            ...entry,
            timestamp: Date.now(),
            lastUsed: Date.now()
          };
          
          const addRequest = store.add(newEntry);
          addRequest.onsuccess = () => resolve(addRequest.result as number);
          addRequest.onerror = () => reject(addRequest.error);
        }
      };
      
      checkRequest.onerror = () => reject(checkRequest.error);
    });
  }

  // 获取指定网站的所有自定义词库
  async getEntriesByHost(host: string): Promise<CustomDictEntry[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('host');
      const request = index.getAll(host);
      
      request.onsuccess = () => {
        const entries = request.result;
        resolve(entries);
      };
      request.onerror = () => {
        console.error(`[CustomDictManager] 获取词库失败:`, request.error);
        reject(request.error);
      };
    });
  }

  // 查找自定义翻译
  async findCustomTranslation(host: string, originalText: string): Promise<string | null> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('hostAndOriginal');
      const request = index.get([host, originalText]);
      
      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          // 更新最后使用时间
          entry.lastUsed = Date.now();
          store.put(entry);
          resolve(entry.customTranslation);
        } else {
          // console.warn(`[CustomDictManager] 未找到自定义翻译: host="${host}", originalText="${originalText}"`);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error(`[CustomDictManager] 查找自定义翻译失败:`, request.error);
        reject(request.error);
      };
    });
  }

  // 删除自定义词库条目
  async deleteEntry(id: number): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 删除指定网站的所有自定义词库
  async deleteEntriesByHost(host: string): Promise<void> {
    const entries = await this.getEntriesByHost(host);
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      let completed = 0;
      let errors: any[] = [];
      
      if (entries.length === 0) {
        resolve();
        return;
      }
      
      entries.forEach(entry => {
        const request = store.delete(entry.id!);
        
        request.onsuccess = () => {
          completed++;
          if (completed === entries.length) {
            if (errors.length > 0) {
              reject(errors[0]);
            } else {
              resolve();
            }
          }
        };
        
        request.onerror = () => {
          errors.push(request.error);
          completed++;
          if (completed === entries.length) {
            reject(errors[0]);
          }
        };
      });
    });
  }

  // 获取统计信息
  async getStats(): Promise<{ totalEntries: number; entriesByHost: Record<string, number> }> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;
        const entriesByHost: Record<string, number> = {};
        
        entries.forEach(entry => {
          entriesByHost[entry.host] = (entriesByHost[entry.host] || 0) + 1;
        });
        
        resolve({
          totalEntries: entries.length,
          entriesByHost
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// 创建全局实例
const customDictManager = new CustomDictManager();

// 新的 API 函数
export async function addCustomDictEntry(host: string, originalText: string, customTranslation: string): Promise<number> {
  return customDictManager.addEntry({ host, originalText, customTranslation });
}

export async function getCustomDictEntries(host: string): Promise<CustomDictEntry[]> {
  return customDictManager.getEntriesByHost(host);
}

export async function findCustomTranslation(host: string, originalText: string): Promise<string | null> {
  return customDictManager.findCustomTranslation(host, originalText);
}

export async function deleteCustomDictEntry(id: number): Promise<void> {
  return customDictManager.deleteEntry(id);
}

export async function deleteCustomDictByHost(host: string): Promise<void> {
  return customDictManager.deleteEntriesByHost(host);
}

export async function getCustomDictStats(): Promise<{ totalEntries: number; entriesByHost: Record<string, number> }> {
  return customDictManager.getStats();
}