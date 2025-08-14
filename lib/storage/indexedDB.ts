/**
 * 通用IndexedDB操作工具
 * 提供统一的数据库操作接口，支持多个数据库和对象存储
 */

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: Array<{
    name: string;
    keyPath: string;
    indexes?: Array<{
      name: string;
      keyPath: string;
      unique?: boolean;
    }>;
  }>;
}

export interface QueryOptions {
  index?: string;
  direction?: 'next' | 'prev';
  limit?: number;
  offset?: number;
}

export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private config: IndexedDBConfig;

  constructor(config: IndexedDBConfig) {
    this.config = config;
  }

  // 初始化数据库
  async init(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._init();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        console.error(`打开数据库 ${this.config.dbName} 失败:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // 创建对象存储和索引
        this.config.stores.forEach(storeConfig => {
          let objectStore: IDBObjectStore;

          if (!db.objectStoreNames.contains(storeConfig.name)) {
            objectStore = db.createObjectStore(storeConfig.name, { 
              keyPath: storeConfig.keyPath 
            });
          } else {
            // 如果存储已存在，获取现有的存储进行索引更新
            objectStore = request.transaction!.objectStore(storeConfig.name);
          }

          // 创建索引
          if (storeConfig.indexes) {
            storeConfig.indexes.forEach(indexConfig => {
              if (!objectStore.indexNames.contains(indexConfig.name)) {
                objectStore.createIndex(
                  indexConfig.name, 
                  indexConfig.keyPath, 
                  { unique: indexConfig.unique || false }
                );
              }
            });
          }
        });
      };
    });
  }

  // 添加或更新数据
  async put<T>(storeName: string, data: T): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(data);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('保存数据失败:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('保存数据失败:', error);
        resolve(false);
      }
    });
  }

  // 批量添加数据
  async putBatch<T>(storeName: string, dataArray: T[]): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        let successCount = 0;
        let completedCount = 0;

        dataArray.forEach(data => {
          const request = objectStore.put(data);
          
          request.onsuccess = () => {
            successCount++;
            completedCount++;
            if (completedCount === dataArray.length) {
              resolve(successCount);
            }
          };

          request.onerror = () => {
            console.error('批量保存数据项失败:', request.error);
            completedCount++;
            if (completedCount === dataArray.length) {
              resolve(successCount);
            }
          };
        });

        if (dataArray.length === 0) {
          resolve(0);
        }
      } catch (error) {
        console.error('批量保存数据失败:', error);
        resolve(0);
      }
    });
  }

  // 获取单个数据
  async get<T>(storeName: string, key: any): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('获取数据失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('获取数据失败:', error);
        reject(error);
      }
    });
  }

  // 获取所有数据
  async getAll<T>(storeName: string, options?: QueryOptions): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        
        let source: IDBObjectStore | IDBIndex = objectStore;
        if (options?.index) {
          source = objectStore.index(options.index);
        }

        const request = source.getAll();

        request.onsuccess = () => {
          let results = request.result;
          
          // 应用分页和排序
          if (options?.offset || options?.limit) {
            const start = options.offset || 0;
            const end = options.limit ? start + options.limit : undefined;
            results = results.slice(start, end);
          }

          resolve(results);
        };

        request.onerror = () => {
          console.error('获取所有数据失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('获取所有数据失败:', error);
        reject(error);
      }
    });
  }

  // 使用游标查询数据
  async query<T>(
    storeName: string, 
    keyRange?: IDBKeyRange, 
    options?: QueryOptions
  ): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        
        let source: IDBObjectStore | IDBIndex = objectStore;
        if (options?.index) {
          source = objectStore.index(options.index);
        }

        const results: T[] = [];
        const direction = options?.direction || 'next';
        const limit = options?.limit;
        let count = 0;

        const request = source.openCursor(keyRange, direction);

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor && (!limit || count < limit)) {
            results.push(cursor.value);
            count++;
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => {
          console.error('查询数据失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('查询数据失败:', error);
        reject(error);
      }
    });
  }

  // 根据索引查询数据
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const index = objectStore.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          console.error('根据索引查询失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('根据索引查询失败:', error);
        reject(error);
      }
    });
  }

  // 删除数据
  async delete(storeName: string, key: any): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(key);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('删除数据失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('删除数据失败:', error);
        reject(error);
      }
    });
  }

  // 批量删除数据
  async deleteBatch(storeName: string, keys: any[]): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        let successCount = 0;
        let completedCount = 0;

        keys.forEach(key => {
          const request = objectStore.delete(key);
          
          request.onsuccess = () => {
            successCount++;
            completedCount++;
            if (completedCount === keys.length) {
              resolve(successCount);
            }
          };

          request.onerror = () => {
            console.error('批量删除数据项失败:', request.error, 'key:', key);
            completedCount++;
            if (completedCount === keys.length) {
              resolve(successCount);
            }
          };
        });

        if (keys.length === 0) {
          resolve(0);
        }
      } catch (error) {
        console.error('批量删除数据失败:', error);
        resolve(0);
      }
    });
  }

  // 清空对象存储
  async clear(storeName: string): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('清空数据失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('清空数据失败:', error);
        reject(error);
      }
    });
  }

  // 计数
  async count(storeName: string, keyRange?: IDBKeyRange): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.count(keyRange);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('计数失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('计数失败:', error);
        reject(error);
      }
    });
  }

  // 关闭数据库连接
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 预定义的数据库配置
export const DATABASE_CONFIGS = {
  // 用户数据数据库（收藏夹、自定义词库、黑白名单、翻译缓存等）
  USER_DATA: {
    dbName: 'UserData',
    version: 2,
    stores: [
      {
        name: 'favorites',
        keyPath: 'id',
        indexes: [
          { name: 'id', keyPath: 'id', unique: true },
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'sourceLanguage', keyPath: 'sourceLanguage', unique: false },
          { name: 'targetLanguage', keyPath: 'targetLanguage', unique: false }
        ]
      },
      {
        name: 'customDictionary',
        keyPath: 'id',
        indexes: [
          { name: 'id', keyPath: 'id', unique: true },
          { name: 'domain', keyPath: 'domain', unique: false },
          { name: 'original', keyPath: 'original', unique: false }
        ]
      },
      {
        name: 'domainSettings',
        keyPath: 'domain',
        indexes: [
          { name: 'domain', keyPath: 'domain', unique: true },
          { name: 'type', keyPath: 'type', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
      },
      {
        name: 'translationCache',
        keyPath: 'key',
        indexes: [
          { name: 'key', keyPath: 'key', unique: true },
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'accessCount', keyPath: 'accessCount', unique: false },
          { name: 'lastAccessed', keyPath: 'lastAccessed', unique: false }
        ]
      }
    ]
  } as IndexedDBConfig
};
