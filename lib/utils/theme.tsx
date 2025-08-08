import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useStorage } from './storage';

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
  // 使用 useStorage hook 替换手动的存储操作
  const [themeMode, setThemeMode] = useStorage<ThemeMode>(storageKey, 'auto');
  const [isDark, setIsDark] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // 添加强制更新状态

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

  // 当主题模式变化时更新 isDark
  useEffect(() => {
    const newIsDark = calculateActualTheme(themeMode);
    setIsDark(newIsDark);
    setForceUpdate(prev => prev + 1); // 强制重新渲染
  }, [themeMode]);

  // 监听系统主题变化
  useEffect(() => {
    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const newIsDark = mediaQuery.matches;
        setIsDark(newIsDark);
        setForceUpdate(prev => prev + 1); // 强制重新渲染
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const value: ThemeContextType = {
    themeMode,
    setThemeMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        key={`theme-${themeMode}-${isDark}-${forceUpdate}`} // 使用key强制重新渲染
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
            colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
            colorBgLayout: isDark ? '#141414' : '#f5f5f5',
            colorBgElevated: isDark ? '#262626' : '#ffffff',
            colorBorder: isDark ? '#424242' : '#d9d9d9',
            colorText: isDark ? '#ffffff' : '#000000',
            colorTextSecondary: isDark ? '#a6a6a6' : '#666666',
            fontSizeHeading1: 18,
            fontSizeHeading2: 16,
            fontSizeHeading3: 14,
          },
          cssVar: true, // 启用CSS变量支持
          components: {
            Button: {
              colorPrimary: '#1890ff',
            },
            Input: {
              colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
              colorBorder: isDark ? '#424242' : '#d9d9d9',
            },
            Select: {
              colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
              colorBorder: isDark ? '#424242' : '#d9d9d9',
              colorText: isDark ? '#ffffff' : '#000000',
              colorTextPlaceholder: isDark ? '#a6a6a6' : '#999999',
              optionSelectedBg: isDark ? '#1668dc' : '#e6f7ff',
              optionActiveBg: isDark ? '#262626' : '#f5f5f5',
            },
            Card: {
              colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
              colorBorderSecondary: isDark ? '#424242' : '#f0f0f0',
            },
            Modal: {
              contentBg: isDark ? '#1f1f1f' : '#ffffff',
            },
            Tooltip: {
              colorBgSpotlight: isDark ? '#434343' : '#ffffff',
              colorTextLightSolid: isDark ? '#ffffff' : '#000000',
            },
            Popover: {
              colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
            },
            Dropdown: {
              colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
            },
            Message: {
              contentBg: isDark ? '#1f1f1f' : '#ffffff',
            },
            Notification: {
              colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
            },
          },
        }}
        getPopupContainer={(triggerNode) => {
          // 尝试找到 Shadow DOM 容器
          let container = triggerNode;
          while (container && container.parentNode) {
            if ((container.parentNode as any).host) {
              return container.parentNode as HTMLElement;
            }
            container = container.parentNode as HTMLElement;
          }
          return document.body;
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
