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

const isExtensionPage = () =>
  typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:';

const parseRgb = (value: string) => {
  const match = value.match(/\d+(\.\d+)?/g);
  if (!match || match.length < 3) {
    return null;
  }

  return match.slice(0, 3).map(Number);
};

const getColorLuminance = (value: string) => {
  const rgb = parseRgb(value);
  if (!rgb) {
    return null;
  }

  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const resolveDarkModeFromColors = (backgroundColor?: string | null, textColor?: string | null) => {
  const backgroundLuminance = backgroundColor ? getColorLuminance(backgroundColor) : null;
  const textLuminance = textColor ? getColorLuminance(textColor) : null;

  if (backgroundLuminance !== null && textLuminance !== null) {
    if (backgroundLuminance < 0.38) {
      return true;
    }

    if (backgroundLuminance > 0.62) {
      return false;
    }

    if (textLuminance > 0.7 && backgroundLuminance < 0.55) {
      return true;
    }

    if (textLuminance < 0.3 && backgroundLuminance > 0.45) {
      return false;
    }
  }

  if (backgroundLuminance !== null) {
    return backgroundLuminance < 0.45;
  }

  return null;
};

const getPageDarkMode = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (isExtensionPage()) {
    return getSystemDarkMode();
  }

  const root = document.documentElement;
  const body = document.body;
  const themeHints = [
    root?.getAttribute('data-theme'),
    body?.getAttribute('data-theme'),
    root?.getAttribute('data-color-mode'),
    body?.getAttribute('data-color-mode'),
    root?.className,
    body?.className,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bdark\b/.test(themeHints)) {
    return true;
  }

  if (/\blight\b/.test(themeHints)) {
    return false;
  }

  const rootStyle = window.getComputedStyle(root);
  const bodyStyle = body ? window.getComputedStyle(body) : null;
  const colorScheme = `${rootStyle.colorScheme || ''} ${bodyStyle?.colorScheme || ''}`.toLowerCase();

  if (colorScheme.includes('dark')) {
    return true;
  }

  if (colorScheme.includes('light')) {
    return false;
  }

  const colorSignals = [
    {
      background: bodyStyle?.backgroundColor,
      text: bodyStyle?.color,
    },
    {
      background: rootStyle.backgroundColor,
      text: rootStyle.color,
    },
  ];

  for (const signal of colorSignals) {
    if (!signal.background || signal.background === 'transparent' || signal.background.includes(', 0)')) {
      continue;
    }

    const darkMode = resolveDarkModeFromColors(signal.background, signal.text);
    if (darkMode !== null) {
      return darkMode;
    }
  }

  return getSystemDarkMode();
};

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
    themeMode === 'auto'
      ? (isExtensionPage() ? getSystemDarkMode() : getPageDarkMode())
      : themeMode === 'dark'
  );

  useEffect(() => {
    if (themeMode !== 'auto') {
      setIsDark(themeMode === 'dark');
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateAutoTheme = () => {
      setIsDark(isExtensionPage() ? mediaQuery.matches : getPageDarkMode());
    };
    const handleChange = () => updateAutoTheme();
    const observer = new MutationObserver(() => updateAutoTheme());

    updateAutoTheme();
    mediaQuery.addEventListener('change', handleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode'],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode'],
      });
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, [themeMode]);

  useEffect(() => {
    const themeValue = isDark ? 'dark' : 'light';
    const hostElement = document.getElementById('translator-csui');

    hostElement?.setAttribute('data-theme', themeValue);
    hostElement?.shadowRoot?.host?.setAttribute('data-theme', themeValue);
  }, [isDark]);

  const themeConfig = useMemo(
    () => ({
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
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
