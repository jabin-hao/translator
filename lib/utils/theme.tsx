import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { getConfig, saveConfig } from './storage';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  storageKey: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, storageKey }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isDark, setIsDark] = useState(false);

  // 检测系统主题
  const getSystemTheme = (): boolean => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // 计算实际的主题模式
  const calculateActualTheme = (mode: ThemeMode): boolean => {
    if (mode === 'auto') {
      return getSystemTheme();
    }
    return mode === 'dark';
  };

  // 初始化主题
  useEffect(() => {
    const initTheme = async () => {
      try {
        const savedMode = await getConfig(storageKey, 'light') as ThemeMode;
        setThemeModeState(savedMode);
        setIsDark(calculateActualTheme(savedMode));
      } catch (error) {
        console.error('Failed to load theme:', error);
        setThemeModeState('light');
        setIsDark(false);
      }
    };

    initTheme();
  }, [storageKey]);

  // 监听系统主题变化
  useEffect(() => {
    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setIsDark(mediaQuery.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  // 设置主题模式
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await saveConfig(storageKey, mode);
      setThemeModeState(mode);
      setIsDark(calculateActualTheme(mode));
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const value: ThemeContextType = {
    themeMode,
    setThemeMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
            colorBgContainer: isDark ? '#141414' : '#ffffff',
            colorText: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.88)',
            colorTextSecondary: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
            colorBorder: isDark ? '#424242' : '#d9d9d9',
            colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
          },
          components: {
            Button: {
              colorPrimary: '#1890ff',
              algorithm: true,
            },
            Input: {
              algorithm: true,
            },
            Select: {
              algorithm: true,
            },
            Card: {
              algorithm: true,
            },
            Modal: {
              algorithm: true,
            },
            Tooltip: {
              algorithm: true,
            },
            Popover: {
              algorithm: true,
            },
            Dropdown: {
              algorithm: true,
            },
            Message: {
              algorithm: true,
            },
            Notification: {
              algorithm: true,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
