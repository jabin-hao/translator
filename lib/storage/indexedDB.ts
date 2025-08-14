/**
 * 通用IndexedDB操作工具
 * 提供统一的数据库操作接口，支持多个数据库和对象存储
 */

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: Array<{
    name: string;
    keyPath: string | string[];
    autoIncrement?: boolean;
    indexes?: Array<{
      name: string;
      keyPath: string | string[];
      unique?: boolean;
      multiEntry?: boolean;
    }>;
  }>;
}

export interface QueryOptions {
  index?: string;
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface BatchResult {
  successful: number;
  failed: number;
  total: number;
  errors: Error[];
}

/**
 * IndexedDB操作错误类
 */
export class IndexedDBError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: Error) {
    super(message);
    this.name = 'IndexedDBError';
  }
}

export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly config: IndexedDBConfig;
  private isDestroyed = false;

  constructor(config: IndexedDBConfig) {
    this.config = { ...config };
  }

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    if (this.isDestroyed) {
      throw new IndexedDBError('数据库管理器已销毁', 'init');
    }

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
      if (!('indexedDB' in window)) {
        reject(new IndexedDBError('浏览器不支持IndexedDB', 'init'));
        return;
      }

      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        const error = new IndexedDBError(
          `打开数据库 ${this.config.dbName} 失败`,
          'init',
          request.error || undefined
        );
        console.error(error);
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // 监听数据库意外关闭
        this.db.onclose = () => {
          console.warn(`数据库 ${this.config.dbName} 意外关闭`);
          this.db = null;
        };

        // 监听版本变更
        this.db.onversionchange = () => {
          console.warn(`数据库 ${this.config.dbName} 版本发生变更，将关闭连接`);
          this.close();
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const transaction = request.transaction!;

        try {
          this.handleUpgrade(db, transaction, event.oldVersion, event.newVersion || 0);
        } catch (error) {
          console.error('数据库升级失败:', error);
          reject(new IndexedDBError('数据库升级失败', 'upgrade', error as Error));
        }
      };
    });
  }

  /**
   * 处理数据库升级
   */
  private handleUpgrade(db: IDBDatabase, transaction: IDBTransaction, oldVersion: number, newVersion: number): void {
    console.log(`数据库 ${this.config.dbName} 从版本 ${oldVersion} 升级到 ${newVersion}`);

    this.config.stores.forEach(storeConfig => {
      let objectStore: IDBObjectStore;

      if (!db.objectStoreNames.contains(storeConfig.name)) {
        // 创建新的对象存储
        objectStore = db.createObjectStore(storeConfig.name, {
          keyPath: storeConfig.keyPath,
          autoIncrement: storeConfig.autoIncrement || false
        });
      } else {
        // 获取现有存储（只能在升级事务中访问）
        objectStore = transaction.objectStore(storeConfig.name);
      }

      // 创建或更新索引
      if (storeConfig.indexes) {
        storeConfig.indexes.forEach(indexConfig => {
          if (!objectStore.indexNames.contains(indexConfig.name)) {
            objectStore.createIndex(
              indexConfig.name,
              indexConfig.keyPath,
              {
                unique: indexConfig.unique || false,
                multiEntry: indexConfig.multiEntry || false
              }
            );
          }
        });
      }
    });
  }

  /**
   * 确保数据库已初始化并检查存储是否存在
   */
  private async ensureInitialized(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new IndexedDBError('数据库未初始化', 'ensureInitialized');
    }
    if (!this.db.objectStoreNames.contains(storeName)) {
      throw new IndexedDBError(`对象存储 "${storeName}" 不存在`, 'ensureInitialized');
    }
  }

  /**
   * 添加或更新单个数据
   */
  async put<T>(storeName: string, data: T): Promise<TransactionResult<IDBValidKey>> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(data);

        request.onsuccess = () => {
          resolve({ success: true, data: request.result });
        };

        request.onerror = () => {
          const error = new IndexedDBError('保存数据失败', 'put', request.error || undefined);
          resolve({ success: false, error });
        };

        transaction.onerror = () => {
          const error = new IndexedDBError('事务执行失败', 'put', transaction.error || undefined);
          resolve({ success: false, error });
        };
      });
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * 批量添加数据（优化版本，使用单个事务）
   */
  async putBatch<T>(storeName: string, dataArray: T[]): Promise<BatchResult> {
    if (dataArray.length === 0) {
      return { successful: 0, failed: 0, total: 0, errors: [] };
    }

    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        let successful = 0;
        let failed = 0;
        const errors: Error[] = [];
        let completed = 0;

        const checkComplete = () => {
          if (++completed === dataArray.length) {
            resolve({ successful, failed, total: dataArray.length, errors });
          }
        };

        dataArray.forEach((data, index) => {
          const request = objectStore.put(data);

          request.onsuccess = () => {
            successful++;
            checkComplete();
          };

          request.onerror = () => {
            failed++;
            errors.push(new IndexedDBError(
              `批量保存第 ${index + 1} 项失败`,
              'putBatch',
              request.error || undefined
            ));
            checkComplete();
          };
        });

        transaction.onerror = () => {
          const error = new IndexedDBError('批量保存事务失败', 'putBatch', transaction.error || undefined);
          resolve({ successful: 0, failed: dataArray.length, total: dataArray.length, errors: [error] });
        };
      });
    } catch (error) {
      return {
        successful: 0,
        failed: dataArray.length,
        total: dataArray.length,
        errors: [error as Error]
      };
    }
  }

  /**
   * 获取单个数据
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new IndexedDBError('获取数据失败', 'get', request.error || undefined));
        };
      });
    } catch (error) {
      throw new IndexedDBError('获取数据失败', 'get', error as Error);
    }
  }

  /**
   * 获取多个数据（优化版本，支持更灵活的查询）
   */
  async getAll<T>(storeName: string, options?: QueryOptions): Promise<T[]> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);

        let source: IDBObjectStore | IDBIndex = objectStore;
        if (options?.index) {
          if (!objectStore.indexNames.contains(options.index)) {
            reject(new IndexedDBError(`索引 "${options.index}" 不存在`, 'getAll'));
            return;
          }
          source = objectStore.index(options.index);
        }

        // 如果有分页需求，使用cursor更高效
        if (options?.offset || options?.limit) {
          this.getWithCursor<T>(source, undefined, options)
            .then(resolve)
            .catch(reject);
        } else {
          const request = source.getAll();

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = () => {
            reject(new IndexedDBError('获取所有数据失败', 'getAll', request.error || undefined));
          };
        }
      });
    } catch (error) {
      throw new IndexedDBError('获取所有数据失败', 'getAll', error as Error);
    }
  }

  /**
   * 使用游标查询数据（优化版本）
   */
  async query<T>(
    storeName: string,
    keyRange?: IDBKeyRange,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      await this.ensureInitialized(storeName);

      const transaction = this.db!.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);

      let source: IDBObjectStore | IDBIndex = objectStore;
      if (options?.index) {
        if (!objectStore.indexNames.contains(options.index)) {
          throw new IndexedDBError(`索引 "${options.index}" 不存在`, 'query');
        }
        source = objectStore.index(options.index);
      }

      return this.getWithCursor<T>(source, keyRange, options);
    } catch (error) {
      throw new IndexedDBError('查询数据失败', 'query', error as Error);
    }
  }

  /**
   * 使用游标获取数据的通用方法
   */
  private getWithCursor<T>(
    source: IDBObjectStore | IDBIndex,
    keyRange?: IDBKeyRange,
    options?: QueryOptions
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const direction = options?.direction || 'next';
      const limit = options?.limit;
      const offset = options?.offset || 0;

      let count = 0;
      let skipped = 0;

      const request = source.openCursor(keyRange, direction);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          // 处理偏移
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          // 检查是否达到限制
          if (limit && count >= limit) {
            resolve(results);
            return;
          }

          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new IndexedDBError('游标查询失败', 'getWithCursor', request.error || undefined));
      };
    });
  }

  /**
   * 根据索引查询数据
   */
  async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);

        if (!objectStore.indexNames.contains(indexName)) {
          reject(new IndexedDBError(`索引 "${indexName}" 不存在`, 'getByIndex'));
          return;
        }

        const index = objectStore.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(new IndexedDBError('根据索引查询失败', 'getByIndex', request.error || undefined));
        };
      });
    } catch (error) {
      throw new IndexedDBError('根据索引查询失败', 'getByIndex', error as Error);
    }
  }

  /**
   * 删除单个数据
   */
  async delete(storeName: string, key: IDBValidKey): Promise<TransactionResult<void>> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(key);

        request.onsuccess = () => {
          resolve({ success: true });
        };

        request.onerror = () => {
          const error = new IndexedDBError('删除数据失败', 'delete', request.error || undefined);
          resolve({ success: false, error });
        };
      });
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * 批量删除数据
   */
  async deleteBatch(storeName: string, keys: IDBValidKey[]): Promise<BatchResult> {
    if (keys.length === 0) {
      return { successful: 0, failed: 0, total: 0, errors: [] };
    }

    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);

        let successful = 0;
        let failed = 0;
        const errors: Error[] = [];
        let completed = 0;

        const checkComplete = () => {
          if (++completed === keys.length) {
            resolve({ successful, failed, total: keys.length, errors });
          }
        };

        keys.forEach((key, index) => {
          const request = objectStore.delete(key);

          request.onsuccess = () => {
            successful++;
            checkComplete();
          };

          request.onerror = () => {
            failed++;
            errors.push(new IndexedDBError(
              `批量删除第 ${index + 1} 项失败`,
              'deleteBatch',
              request.error || undefined
            ));
            checkComplete();
          };
        });

        transaction.onerror = () => {
          const error = new IndexedDBError('批量删除事务失败', 'deleteBatch', transaction.error || undefined);
          resolve({ successful: 0, failed: keys.length, total: keys.length, errors: [error] });
        };
      });
    } catch (error) {
      return {
        successful: 0,
        failed: keys.length,
        total: keys.length,
        errors: [error as Error]
      };
    }
  }

  /**
   * 清空对象存储
   */
  async clear(storeName: string): Promise<TransactionResult<void>> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onsuccess = () => {
          resolve({ success: true });
        };

        request.onerror = () => {
          const error = new IndexedDBError('清空数据失败', 'clear', request.error || undefined);
          resolve({ success: false, error });
        };
      });
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * 计数
   */
  async count(storeName: string, keyRange?: IDBKeyRange): Promise<number> {
    try {
      await this.ensureInitialized(storeName);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.count(keyRange);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new IndexedDBError('计数失败', 'count', request.error || undefined));
        };
      });
    } catch (error) {
      throw new IndexedDBError('计数失败', 'count', error as Error);
    }
  }

  /**
   * 检查数据库是否可用
   */
  get isAvailable(): boolean {
    return this.db !== null && !this.isDestroyed;
  }

  /**
   * 获取数据库信息
   */
  get info(): { name: string; version: number; stores: string[] } | null {
    if (!this.db) return null;
    return {
      name: this.db.name,
      version: this.db.version,
      stores: Array.from(this.db.objectStoreNames)
    };
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 销毁数据库管理器
   */
  destroy(): void {
    this.close();
    this.isDestroyed = true;
  }
}

// 预定义的数据库配置（增强版本）
export const DATABASE_CONFIGS = {
  // 用户数据数据库（收藏夹、自定义词库、黑白名单、翻译缓存等）
  USER_DATA: {
    dbName: 'UserData',
    version: 3,
    stores: [
      {
        name: 'favorites',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'sourceLanguage', keyPath: 'sourceLanguage', unique: false },
          { name: 'targetLanguage', keyPath: 'targetLanguage', unique: false },
          { name: 'languagePair', keyPath: ['sourceLanguage', 'targetLanguage'], unique: false }
        ]
      },
      {
        name: 'customDictionary',
        keyPath: 'id',
        indexes: [
          { name: 'domain', keyPath: 'domain', unique: false },
          { name: 'original', keyPath: 'original', unique: false },
          { name: 'domainOriginal', keyPath: ['domain', 'original'], unique: false }
        ]
      },
      {
        name: 'domainSettings',
        keyPath: 'domain',
        indexes: [
          { name: 'type', keyPath: 'type', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'typeTimestamp', keyPath: ['type', 'timestamp'], unique: false }
        ]
      },
      {
        name: 'translationCache',
        keyPath: 'key',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'accessCount', keyPath: 'accessCount', unique: false },
          { name: 'lastAccessed', keyPath: 'lastAccessed', unique: false },
          { name: 'frequencyScore', keyPath: ['accessCount', 'lastAccessed'], unique: false }
        ]
      }
    ]
  } as IndexedDBConfig,

  // 系统配置数据库
  SYSTEM_CONFIG: {
    dbName: 'SystemConfig',
    version: 1,
    stores: [
      {
        name: 'settings',
        keyPath: 'key',
        indexes: [
          { name: 'category', keyPath: 'category', unique: false },
          { name: 'updatedAt', keyPath: 'updatedAt', unique: false }
        ]
      },
      {
        name: 'logs',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'level', keyPath: 'level', unique: false },
          { name: 'source', keyPath: 'source', unique: false }
        ]
      }
    ]
  } as IndexedDBConfig
};

// 工厂函数，用于创建数据库管理器实例
export function createDBManager(config: IndexedDBConfig | keyof typeof DATABASE_CONFIGS): IndexedDBManager {
  const dbConfig = typeof config === 'string' ? DATABASE_CONFIGS[config] : config;
  return new IndexedDBManager(dbConfig);
}

// 数据库实用工具
export class DBUtils {
  /**
   * 检查浏览器是否支持IndexedDB
   */
  static isSupported(): boolean {
    return 'indexedDB' in window && indexedDB !== null;
  }

  /**
   * 删除整个数据库
   */
  static deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!DBUtils.isSupported()) {
        reject(new IndexedDBError('浏览器不支持IndexedDB', 'deleteDatabase'));
        return;
      }

      const deleteReq = indexedDB.deleteDatabase(dbName);

      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => reject(
        new IndexedDBError(`删除数据库 ${dbName} 失败`, 'deleteDatabase', deleteReq.error || undefined)
      );
      deleteReq.onblocked = () => console.warn(`删除数据库 ${dbName} 被阻塞，请关闭其他标签页`);
    });
  }

  /**
   * 获取数据库列表（仅在支持的浏览器中）
   */
  static async getDatabases(): Promise<IDBDatabaseInfo[]> {
    if (!DBUtils.isSupported() || !indexedDB.databases) {
      return [];
    }

    try {
      return await indexedDB.databases();
    } catch (error) {
      console.warn('获取数据库列表失败:', error);
      return [];
    }
  }
}