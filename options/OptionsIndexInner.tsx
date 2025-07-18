import 'antd/dist/reset.css';
import React, { useState, useEffect } from 'react';
import { Menu, Button, Tooltip, Space, Avatar, Typography, ConfigProvider, theme, App } from 'antd';
import { Icon } from '@iconify/react';
import { Storage } from '@plasmohq/storage';
import GeneralSettings from './components/GeneralSettings';
import About from './components/About';
import LanguageSettings from './components/LanguageSettings';
import PluginIcon from 'components/PluginIcon';
import TranslateSettings from './components/TranslateSettings';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const storage = new Storage();

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
const getActualTheme = (themeMode: string): 'light' | 'dark' => {
  if (themeMode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (themeMode === 'light' || themeMode === 'dark') return themeMode;
  return 'light';
};

async function getInitTheme() {
  try {
    const theme = await storage.get(THEME_KEY);
    if (theme) return theme;
  } catch {}
  return 'auto';
}

const OptionsIndexInner = () => {
  const { t, i18n } = useTranslation();
  const getInitialThemeMode = async () => {
    try {
      const theme = await storage.get(THEME_KEY);
      if (theme) return theme;
    } catch {}
    return 'auto';
  };
  const [themeMode, setThemeMode] = useState('auto');
  const [actualTheme, setActualTheme] = useState('light');
  const [selectedKey, setSelectedKey] = useState('general');

  useEffect(() => {
    // 初始化
    getInitialThemeMode().then(mode => {
      setThemeMode(mode);
      setActualTheme(getActualTheme(mode));
    });
    // 监听 Plasmo Storage 变化
    const handler = (val) => {
      if (val !== themeMode) {
        setThemeMode(val);
        setActualTheme(getActualTheme(val));
      }
    };
    storage.watch({ [THEME_KEY]: handler });
    return () => { storage.unwatch({ [THEME_KEY]: handler }); };
  }, [themeMode]);

  const handleThemeSwitch = async () => {
    const idx = themeOrder.indexOf(themeMode);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setThemeMode(next);
    setActualTheme(getActualTheme(next));
    await storage.set(THEME_KEY, next);
  };

  const menuItems = [
    { key: 'general', icon: <Icon icon="material-symbols:settings-outline" width={22} />, label: t('通用设置') },
    { key: 'language', icon: <Icon icon="material-symbols:language" width={22} />, label: t('语言设置') },
    { key: 'translate', icon: <Icon icon="material-symbols:g-translate" width={22} />, label: t('翻译设置') },
    { key: 'about', icon: <Icon icon="material-symbols:info-outline" width={22} />, label: t('关于') },
  ];

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
              <Text style={{ fontFamily: 'Segoe UI, HarmonyOS Sans, Arial', marginLeft: 2, color: actualTheme === 'dark' ? '#ffffff' : '#333333' }}>{t('翻译助手')}</Text>
            </Space>
            <div style={{ flex: 1 }} />
            <Space size={18} style={{ marginLeft: 'auto' }}>
              <Tooltip title={t('前往 GitHub 项目')}>
                <Button
                  type="text"
                  icon={<Icon icon="mdi:github" width={20} height={20} />}
                  onClick={() => window.open('https://github.com/Bugbyebyebye/translator', '_blank')}
                  style={{ color: actualTheme === 'dark' ? '#ffffff' : '#333333' }}
                />
              </Tooltip>
              <Tooltip title={`${t('当前主题')}：${themeTextMap[themeMode]}`}>
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
                items={menuItems}
                onClick={e => setSelectedKey(e.key)}
                style={{ border: 'none', fontSize: 15, fontWeight: 500, height: '100%' }}
              />
            </div>
            {/* 主内容区 */}
            <div style={{ flex: 1, minWidth: 0, background: actualTheme === 'dark' ? '#181818' : '#f8faff', padding: 0 }}>
              {content}
            </div>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
};

export default OptionsIndexInner; 