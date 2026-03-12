import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme } from 'antd';

import { useThemeSettings } from '../settings/settings';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemDarkMode = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

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
  const { themeSettings, setThemeMode } = useThemeSettings();
  const themeMode = themeSettings.mode ?? 'auto';
  const [isDark, setIsDark] = useState(() =>
    themeMode === 'auto' ? getSystemDarkMode() : themeMode === 'dark'
  );

  useEffect(() => {
    if (themeMode !== 'auto') {
      setIsDark(themeMode === 'dark');
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDark(event.matches);
    };

    setIsDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  useEffect(() => {
    const themeValue = isDark ? 'dark' : 'light';
    const hostElement = document.getElementById('translator-csui');

    hostElement?.setAttribute('data-theme', themeValue);
    hostElement?.shadowRoot?.host?.setAttribute('data-theme', themeValue);
    document.body.setAttribute('data-theme', themeValue);
  }, [isDark]);

  const themeConfig = useMemo(
    () => ({
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
      cssVar: true,
      components: {
        Button: { colorPrimary: '#1890ff' },
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
        Modal: { contentBg: isDark ? '#1f1f1f' : '#ffffff' },
        Tooltip: {
          colorBgSpotlight: isDark ? '#434343' : '#ffffff',
          colorTextLightSolid: isDark ? '#ffffff' : '#000000',
        },
        Popover: { colorBgElevated: isDark ? '#1f1f1f' : '#ffffff' },
        Dropdown: { colorBgElevated: isDark ? '#1f1f1f' : '#ffffff' },
        Message: {
          contentBg: isDark ? '#1f1f1f' : '#ffffff',
          colorText: isDark ? '#ffffff' : '#000000',
          colorSuccess: '#52c41a',
          colorError: '#ff4d4f',
          colorWarning: '#faad14',
          colorInfo: '#1890ff',
        },
        Notification: {
          colorBgElevated: isDark ? '#1f1f1f' : '#ffffff',
        },
      },
    }),
    [isDark]
  );

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      isDark,
    }),
    [themeMode, setThemeMode, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={themeConfig}
        getPopupContainer={(triggerNode) => triggerNode?.parentElement ?? document.body}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
