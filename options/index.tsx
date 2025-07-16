import 'antd/dist/reset.css';
import React, { useState, useEffect } from 'react';
import { Menu, Button, Tooltip, Space, Avatar, Typography, ConfigProvider, theme, App } from 'antd';
import { Icon } from '@iconify/react';
import { Storage } from '@plasmohq/storage';
import GeneralSettings from './components/GeneralSettings';
import About from './components/About';
import LanguageSettings from './components/LanguageSettings';
import PluginIcon from 'components/PluginIcon';
import TranslateSettings from './components/TranslateSettings'; // 新增

const { Text } = Typography;

const storage = new Storage();

const menuItems = [
  {
    key: 'language',
    icon: <Icon icon="material-symbols:language" width={22} />,
    label: '语言设置',
  },
  {
    key: 'translate',
    icon: <Icon icon="material-symbols:g-translate" width={22} />, // 新增图标
    label: '翻译设置',
  },
  {
    key: 'general',
    icon: <Icon icon="material-symbols:settings-outline" width={22} />,
    label: '通用设置',
  },
  {
    key: 'about',
    icon: <Icon icon="material-symbols:info-outline" width={22} />,
    label: '关于',
  },
];

const THEME_KEY = 'plugin_theme_mode';
const themeIconMap = {
  auto: <Icon icon="material-symbols:brightness-auto-outline" width={24} height={24} />,
  light: <Icon icon="material-symbols:light-mode-outline" width={24} height={24} />,
  dark: <Icon icon="material-symbols:dark-mode-outline" width={24} height={24} />,
};
const themeTextMap = {
  auto: '自动',
  light: '日间',
  dark: '夜间',
};
const themeOrder = ['auto', 'light', 'dark'];

async function getInitTheme() {
  try {
    const theme = await storage.get(THEME_KEY);
    if (theme) return theme;
  } catch {}
  return 'auto';
}

// 获取实际主题
function getActualTheme(themeMode: string): 'light' | 'dark' {
  if (themeMode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return themeMode as 'light' | 'dark';
}

const OptionsIndex = () => {
  // 尝试同步从localStorage获取主题
  const getInitialThemeMode = () => {
    try {
      const local = window.localStorage.getItem(THEME_KEY);
      if (local) return local;
    } catch {}
    return 'auto';
  };
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [actualTheme, setActualTheme] = useState(() => getActualTheme(getInitialThemeMode()));
  const [selectedKey, setSelectedKey] = useState('language');

  // 只在themeMode变化或系统主题变化时更新actualTheme
  useEffect(() => {
    if (themeMode === 'auto') {
      const updateTheme = () => setActualTheme(getActualTheme('auto'));
      updateTheme();
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      setActualTheme(getActualTheme(themeMode));
    }
  }, [themeMode]);

  // 监听storage变化（多标签页同步）
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = e.newValue || 'auto';
        setThemeMode(next);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 切换主题
  const handleThemeSwitch = () => {
    const idx = themeOrder.indexOf(themeMode);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setThemeMode(next);
    window.localStorage.setItem(THEME_KEY, next);
  };

  let content = null;
  if (selectedKey === 'language') {
    content = <LanguageSettings />;
  } else if (selectedKey === 'general') {
    content = <GeneralSettings themeMode={themeMode} setThemeMode={setThemeMode} />;
  } else if (selectedKey === 'translate') {
    content = <TranslateSettings />;
  } else if (selectedKey === 'about') {
    content = <About />;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: actualTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorBgContainer: actualTheme === 'dark' ? '#1a1a1a' : '#ffffff',
          colorBgLayout: actualTheme === 'dark' ? '#141414' : '#f5f5f5',
          colorBgElevated: actualTheme === 'dark' ? '#2a2a2a' : '#ffffff',
          colorBorder: actualTheme === 'dark' ? '#404040' : '#d9d9d9',
          colorText: actualTheme === 'dark' ? '#ffffff' : '#333333',
          colorTextSecondary: actualTheme === 'dark' ? '#cccccc' : '#666666',
        }
      }}
    >
      <App>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          margin: 0,
          padding: 0
        }}>
          {/* 顶部栏 */}
          <div style={{
            height: 56,
            background: actualTheme === 'dark' 
              ? 'linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 100%)'
              : 'linear-gradient(90deg, #f5faff 0%, #e3f0ff 100%)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            borderBottom: `1px solid ${actualTheme === 'dark' ? '#404040' : '#e3f0ff'}`,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}>
            <Space style={{ fontWeight: 700, fontSize: 18, color: actualTheme === 'dark' ? '#ffffff' : '#333333', letterSpacing: 2 }}>
              <Avatar
                size={32}
                style={{ background: 'transparent', verticalAlign: 'middle' }}
                icon={<PluginIcon size={28} />}
              />
              <Text style={{ fontFamily: 'Segoe UI, HarmonyOS Sans, Arial', marginLeft: 2, color: actualTheme === 'dark' ? '#ffffff' : '#333333' }}>翻译助手</Text>
            </Space>
            <div style={{ flex: 1 }} />
            <Space size={18} style={{ marginLeft: 'auto' }}>
              <Tooltip title="前往 GitHub 项目">
                <Button
                  type="text"
                  icon={<Icon icon="mdi:github" width={20} height={20} />}
                  onClick={() => window.open('https://github.com/Bugbyebyebye/translator', '_blank')}
                  style={{ color: actualTheme === 'dark' ? '#ffffff' : '#333333' }}
                />
              </Tooltip>
              <Tooltip title={`当前主题：${themeTextMap[themeMode]}`}>
                <Button
                  type="text"
                  icon={themeIconMap[themeMode]}
                  onClick={handleThemeSwitch}
                  style={{ color: actualTheme === 'dark' ? '#ffffff' : '#333333' }}
                />
              </Tooltip>
            </Space>
          </div>

          <div style={{ display: 'flex', flex: 1 }}>
            {/* 侧边栏 */}
            <div style={{
              width: 200,
              background: actualTheme === 'dark' ? '#1a1a1a' : '#ffffff',
              borderRight: `1px solid ${actualTheme === 'dark' ? '#404040' : '#e3f0ff'}`,
            }}>
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                style={{
                  height: '100%',
                  borderRight: 0,
                  background: actualTheme === 'dark' ? '#1a1a1a' : '#ffffff',
                }}
                items={menuItems}
                onClick={({ key }) => setSelectedKey(key)}
              />
            </div>

            {/* 主内容区 */}
            <div style={{ 
              flex: 1, 
              background: actualTheme === 'dark' ? '#141414' : '#f5f5f5',
              margin: 0,
              padding: 0
            }}>
              {content}
            </div>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default OptionsIndex; 