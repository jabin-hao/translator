import React, { createContext, useContext, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useThemeSettings } from '../settings/settings';
import { useImmer } from 'use-immer';

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
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 使用全局配置中的主题设置
  const { themeSettings, setThemeMode: updateThemeMode } = useThemeSettings();
  const themeMode = themeSettings?.mode || 'auto';

  // 如果主题设置还没有加载完成，显示加载状态
  if (!themeSettings) {
    return <div>Loading...</div>;
  }

  const [isDark, setIsDark] = useImmer(() => {
    // 初始化时计算一次
    if (themeMode === 'auto') {
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themeMode === 'dark';
  });

  // 监听主题模式变化
  useEffect(() => {
    if (themeMode === 'auto') {
      // 自动模式：根据系统偏好设置
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDark(mediaQuery.matches);
    } else {
      // 手动模式：直接设置
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode]);

  // 使用 useMemo 来避免重复计算主题配置
  const themeConfig = React.useMemo(() => ({
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
        colorText: isDark ? '#ffffff' : '#000000',
        colorSuccess: isDark ? '#52c41a' : '#52c41a',
        colorError: isDark ? '#ff4d4f' : '#ff4d4f',
        colorWarning: isDark ? '#faad14' : '#faad14',
        colorInfo: isDark ? '#1890ff' : '#1890ff',
      },
      Notification: {
        colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
      },
    },
  }), [isDark]);

  // 当主题模式变化时更新 isDark
  useEffect(() => {
    if (themeMode === 'auto') {
      const systemIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemIsDark);
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode]);

  // 将主题信息同步到 Shadow DOM 根元素
  useEffect(() => {
    // 查找当前的 Shadow DOM 容器 - 使用正确的ID
    const hostElement = document.getElementById('translator-csui');
    if (hostElement?.shadowRoot) {
      const shadowContainer = hostElement.shadowRoot.host as HTMLElement;
      if (shadowContainer) {
        if (isDark) {
          shadowContainer.setAttribute('data-theme', 'dark');
        } else {
          shadowContainer.setAttribute('data-theme', 'light');
        }
      }

      // 也设置到shadowRoot本身，如果需要的话
      const shadowRoot = hostElement.shadowRoot as any;
      if (shadowRoot.host) {
        if (isDark) {
          shadowRoot.host.setAttribute('data-theme', 'dark');
        } else {
          shadowRoot.host.setAttribute('data-theme', 'light');
        }
      }
    }

    // 同时设置到document.body作为备选
    if (isDark) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  // 监听系统主题变化，但只在 auto 模式下
  useEffect(() => {
    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const value: ThemeContextType = React.useMemo(() => ({
    themeMode,
    setThemeMode: updateThemeMode,
    isDark,
  }), [themeMode, updateThemeMode, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={themeConfig}
        getPopupContainer={(triggerNode) => {
          // 在Shadow DOM环境中，优先使用触发节点的父容器
          if (triggerNode) {
            return triggerNode.parentElement || document.body;
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
