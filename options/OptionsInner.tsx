import 'antd/dist/reset.css';
import React, { useEffect, useState } from 'react';
import { App, Avatar, Button, Layout, Menu, Space, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import { useTheme } from '~lib/theme/theme';
import About from './pages/about/About';
import CacheSettings from './pages/cache/CacheSettings';
import EngineSettings from './pages/engine/EngineSettings';
import FavoritesSettings from './pages/favorite/FavoritesSettings';
import GeneralSettings from './pages/general/GeneralSettings';
import LanguageSettings from './pages/language/LanguageSettings';
import ShortcutSettings from './pages/shortcut/ShortcutSettings';
import InputTranslateSettings from './pages/translate/InputTranslateSettings';
import PageTranslateSettings from './pages/translate/PageTranslateSettings';
// import PdfTranslateSettings from './pages/translate/PdfTranslateSettings';
import SpeechSettings from './pages/translate/SpeechSettings';
// import SubtitleTranslateSettings from './pages/translate/SubtitleTranslateSettings';
import TextTranslateSettings from './pages/translate/TextTranslateSettings';

const { Title } = Typography;
const { Sider, Content, Header } = Layout;

const themeIconMap = {
  auto: <Icon name="brightness-auto" size={20} />,
  light: <Icon name="sun" size={20} />,
  dark: <Icon name="moon" size={20} />,
};

const themeOrder = ['auto', 'light', 'dark'] as const;

const OptionsInner = () => {
  const { t } = useTranslation();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const themeTextMap = {
    auto: t('Auto'),
    light: t('Light'),
    dark: t('Dark'),
  };
  const [selectedKey, setSelectedKey] = useState('general');
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    if (selectedKey.startsWith('translate-')) {
      setOpenKeys((current) =>
        current.includes('translate') ? current : [...current, 'translate']
      );
    }
  }, [selectedKey]);

  const handleThemeSwitch = () => {
    const index = themeOrder.indexOf(themeMode);
    const next = themeOrder[(index + 1) % themeOrder.length];
    setThemeMode(next);
  };

  const handleMenuClick = (event: { key: string }) => {
    if (event.key === 'translate') {
      setSelectedKey('translate-text');
      setOpenKeys(['translate']);
      return;
    }

    setSelectedKey(event.key);
  };

  const menuItems = [
    { key: 'general', icon: <Icon name="settings" size={22} />, label: t('General settings') },
    { key: 'language', icon: <Icon name="language" size={22} />, label: t('Language settings') },
    { key: 'engine', icon: <Icon name="manufacturing" size={22} />, label: t('Engine settings') },
    {
      key: 'translate',
      icon: <Icon name="translate" size={22} />,
      label: t('Translation settings'),
      children: [
        { key: 'translate-text', icon: <Icon name="select-all" size={18} />, label: t('Text translation') },
        { key: 'translate-page', icon: <Icon name="web" size={18} />, label: t('Page translation') },
        { key: 'translate-input', icon: <Icon name="keyboard" size={18} />, label: t('Input translation') },
        { key: 'translate-speech', icon: <Icon name="volume" size={18} />, label: t('Speech settings') },
        // { key: 'translate-pdf', icon: <Icon name="book" size={18} />, label: t('PDF translation') },
        // { key: 'translate-subtitle', icon: <Icon name="edit" size={18} />, label: t('Subtitle translation') },
      ],
    },
    { key: 'favorites', icon: <Icon name="favorite" size={22} />, label: t('Favorites') },
    { key: 'cache', icon: <Icon name="storage" size={22} />, label: t('Cache') },
    { key: 'shortcut', icon: <Icon name="keyboard" size={22} />, label: t('Shortcut settings') },
    { key: 'about', icon: <Icon name="info" size={22} />, label: t('About') },
  ];

  const contentMap: Record<string, React.ReactNode> = {
    general: <GeneralSettings themeMode={themeMode} setThemeMode={setThemeMode} />,
    language: <LanguageSettings />,
    engine: <EngineSettings />,
    'translate-text': <TextTranslateSettings />,
    'translate-page': <PageTranslateSettings />,
    'translate-input': <InputTranslateSettings />,
    'translate-speech': <SpeechSettings />,
    // 'translate-pdf': <PdfTranslateSettings />,
    // 'translate-subtitle': <SubtitleTranslateSettings />,
    favorites: <FavoritesSettings />,
    cache: <CacheSettings />,
    shortcut: <ShortcutSettings />,
    about: <About />,
  };

  return (
    <App>
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #1f1f1f 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
            borderBottom: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: isDark
              ? '0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.06)',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          <Space align="center" size={12}>
            <Avatar
              size={36}
              style={{
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              icon={<Icon name="translate" size={32} style={{ color: '#2386e1' }} />}
            />
            <Title
              level={3}
              style={{
                margin: 0,
                color: isDark ? '#ffffff' : '#1f1f1f',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              {t('Translator')}
            </Title>
          </Space>

          <div style={{ flex: 1 }} />

          <Space size={8}>
            <Tooltip title={t('Open GitHub project')} placement="bottom">
              <Button
                type="text"
                shape="circle"
                size="large"
                icon={<Icon name="brand-github" size={20} />}
                onClick={() =>
                  window.open('https://github.com/jabin-hao/translator', '_blank')
                }
                style={{
                  color: isDark ? '#a6a6a6' : '#666666',
                  border: 'none',
                }}
              />
            </Tooltip>

            <Tooltip title={`${t('Current theme')}: ${themeTextMap[themeMode]}`} placement="bottom">
              <Button
                type="text"
                shape="circle"
                size="large"
                icon={themeIconMap[themeMode]}
                onClick={handleThemeSwitch}
                style={{
                  color: isDark ? '#a6a6a6' : '#666666',
                  border: 'none',
                }}
              />
            </Tooltip>
          </Space>
        </Header>

        <Layout>
          <Sider
            width={240}
            style={{
              background: isDark ? '#1f1f1f' : '#ffffff',
              borderRight: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`,
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
              position: 'fixed',
              left: 0,
              top: 64,
              bottom: 0,
            }}
          >
            <Menu
              mode="inline"
              theme={isDark ? 'dark' : 'light'}
              selectedKeys={[selectedKey]}
              openKeys={openKeys}
              onOpenChange={setOpenKeys}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                height: '100%',
                background: 'transparent',
              }}
            />
          </Sider>

          <Layout style={{ marginLeft: 240 }}>
            <Content
              style={{
                padding: 0,
                background: isDark ? '#141414' : '#f5f5f5',
                minHeight: 'calc(100vh - 64px)',
                overflow: 'auto',
              }}
            >
              {contentMap[selectedKey] ?? null}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </App>
  );
};

export default OptionsInner;
