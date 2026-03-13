import { Storage } from '@plasmohq/storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hasExtensionContextBeenInvalidated,
  isExtensionContextInvalidatedError,
  logExtensionError,
} from '../utils/extensionContext';

const storage = new Storage();

export const storageApi = {
  async get<T = unknown>(key: string) {
    if (hasExtensionContextBeenInvalidated()) {
      return undefined;
    }

    try {
      return await storage.get<T>(key);
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        return undefined;
      }

      throw error;
    }
  },

  async set<T = unknown>(key: string, value: T) {
    if (hasExtensionContextBeenInvalidated()) {
      return;
    }

    try {
      return await storage.set(key, value);
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        return;
      }

      throw error;
    }
  },
};

export function useStorage<T>(key: string, defaultValue?: T) {
  const [value, setValue] = useState<T>(defaultValue as T);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    let mounted = true;
    if (hasExtensionContextBeenInvalidated()) {
      return () => {
        mounted = false;
      };
    }

    storageApi
      .get<T>(key)
      .then((storedValue) => {
        if (mounted) {
          setValue(storedValue === undefined ? (defaultValueRef.current as T) : storedValue);
        }
      })
      .catch((error) => {
        logExtensionError(`Failed to read storage key "${key}"`, error);
      });

    try {
      storage.watch({
        [key]: (change) => {
          if (hasExtensionContextBeenInvalidated()) {
            return;
          }

          if (mounted) {
            const newValue =
              change && typeof change === 'object' && 'newValue' in change
                ? (change.newValue as T)
                : (change as T);
            setValue(newValue);
          }
        },
      });
    } catch (error) {
      logExtensionError(`Failed to watch storage key "${key}"`, error);
    }

    return () => {
      mounted = false;
    };
  }, [key]);

  const setStorageValue = useCallback(
    async (nextValue: T) => {
      try {
        await storageApi.set(key, nextValue);
      } catch (error) {
        logExtensionError(`Error setting storage value for key "${key}"`, error);
      }
    },
    [key]
  );

  return [value, setStorageValue] as const;
}
