import { Storage } from '@plasmohq/storage';
import { useEffect, useRef, useCallback } from 'react';
import { useImmer } from 'use-immer';

const storage = new Storage();

// 简化的存储API
export const storageApi = {
  // 读取配置
  async get(key: string) {
    return await storage.get(key);
  },
  
  // 保存配置
  async set(key: string, value: any) {
    return await storage.set(key, value);
  }
};

// 简化的useStorage Hook
export function useStorage<T = any>(key: string, defaultValue?: T) {
  const [value, setValue] = useImmer<T>(defaultValue as T);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    let mounted = true;

    // 初始化读取
    storageApi.get(key).then((val) => {
      if (mounted) {
        setValue(val === undefined ? defaultValueRef.current as T : (val as T));
      }
    });

    // 使用Plasmo Storage的原生watch功能
    storage.watch({
      [key]: (change) => {
        if (mounted) {
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
      // 直接保存到存储，让watch机制处理更新
      await storageApi.set(key, val);
    } catch (error) {
      console.error('Error setting storage value:', error);
    }
  }, [key]);

  return [value, setStorageValue] as const;
}