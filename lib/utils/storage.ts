import { Storage } from '@plasmohq/storage';
import { useState, useEffect, useRef, useCallback } from 'react';

const storage = new Storage();

// 简化的存储API
export const storageApi = {
  // 读取配置
  async get(key: string) {
    return await storage.get(key);
  },
  
  // 保存配置
  async set(key: string, value: any) {
    // console.log(`StorageApi setting ${key}:`, value);
    return await storage.set(key, value);
  }
};

// 简化的useStorage Hook - 直接使用Plasmo Storage的watch
export function useStorage<T = any>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T>(defaultValue as T);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    let mounted = true;

    // 初始化读取
    storageApi.get(key).then((val) => {
      if (mounted) {
        console.log(`useStorage ${key} initial value:`, val);
        setValue(val === undefined ? defaultValueRef.current as T : (val as T));
      }
    });

    // 使用Plasmo Storage的原生watch功能
    storage.watch({
      [key]: (change) => {
        if (mounted) {
          // console.log(`useStorage ${key} received change:`, change);
          const newValue = change.newValue !== undefined ? change.newValue : change;
          setValue(newValue);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [key]);

  // 修改存储的值
  const setStorageValue = useCallback(async (val: T) => {
    try {
      // console.log(`useStorage setting value for key: ${key}`, val);
      // 直接保存到存储，让watch机制处理更新
      await storageApi.set(key, val);
    } catch (error) {
      console.error('Error setting storage value:', error);
    }
  }, [key]);

  return [value, setStorageValue] as const;
}