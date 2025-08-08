import { Storage } from '@plasmohq/storage';
import { useState, useEffect, useRef, useCallback } from 'react';

const storage = new Storage();

type Listener = (val: any) => void;
const listenerMap: Map<string, Set<Listener>> = new Map();

// 内部回调，转发给外部注册的监听器
storage.watch({
  // 监听所有key的变化，自动分发给对应的监听器
  '*': (change) => {
    for (const [key, val] of Object.entries(change)) {
      const listeners = listenerMap.get(key);
      if (listeners) {
        listeners.forEach((fn) => fn(val));
      }
    }
  }
});

// 读取
export const storageApi = {
  // 读取配置
  async get(key: string) {
    return await storage.get(key);
  },
  // 保存配置
  async set(key: string, value: any) {
    return await storage.set(key, value);
  },
  // 监听配置
  watch(key: string, listener: Listener) {
    let listeners = listenerMap.get(key);
    if (!listeners) {
      listeners = new Set<Listener>();
      listenerMap.set(key, listeners);
    }
    listeners.add(listener);
    // 返回一个取消监听的函数
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        listenerMap.delete(key);
      }
    };
  }
};

// 自定义配置Hook
export function useStorage<T = any>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T>(defaultValue as T);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    let mounted = true;

    // 初始化读取
    storageApi.get(key).then((val) => {
      if (mounted) setValue(val === undefined ? defaultValueRef.current as T : (val as T));
    });

    // 订阅变化
    const unwatch = storageApi.watch(key, (val) => {
      if (mounted) setValue(val);
    });

    return () => {
      mounted = false;
      unwatch();
    };
  }, [key]); // 移除 defaultValue 依赖

  // 修改存储的值
  const setStorageValue = useCallback((val: T) => {
    setValue(val);
    storageApi.set(key, val);
  }, [key]);

  return [value, setStorageValue] as const;
}