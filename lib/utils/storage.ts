import {Storage} from '@plasmohq/storage';

const storage = new Storage();

// 基础配置操作
export const getConfig = async <T>(key: string, defaultValue?: T): Promise<T> => {
  try {
    const value = await storage.get(key);
    // @ts-ignore
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.error(`Failed to get config for key: ${key}`, error);
    return defaultValue;
  }
};

export const saveConfig = async <T>(key: string, value: T): Promise<void> => {
  try {
    await storage.set(key, value);
  } catch (error) {
    console.error(`Failed to save config for key: ${key}`, error);
    throw error;
  }
};

// 获取并监听配置变化的通用方法
export const getAndWatchConfig = async <T>(
  key: string,
  onChange: (value: T) => void,
  defaultValue?: T
): Promise<() => void> => {
  // 首先获取当前值
  const currentValue = await getConfig(key, defaultValue);
  if (currentValue !== undefined) {
    onChange(currentValue);
  }

  // 设置监听器
  // 返回取消监听的函数
  // @ts-ignore
  return storage.watch({
    [key]: (change) => {
      if (change.newValue !== undefined) {
        onChange(change.newValue);
      }
    }
  });
};
