import 'antd/dist/reset.css';
import { useImmer } from 'use-immer';
import React, { useEffect } from 'react';
import { Menu, Button, Tooltip, Space, Avatar, Typography, App, Layout } from 'antd';
import Icon from '~lib/components/Icon';
import { useTheme } from '~lib/theme/theme';
import GeneralSettings from './pages/general/GeneralSettings';
import About from './pages/about/About';
import LanguageSettings from './pages/language/LanguageSettings';

import ShortcutSettings from './pages/shortcut/ShortcutSettings';
import CacheSettings from './pages/cache/CacheSettings';
import { useTranslation } from 'react-i18next';
import TextTranslateSettings from './pages/translate/TextTranslateSettings';
import PageTranslateSettings from './pages/translate/PageTranslateSettings';
import InputTranslateSettings from './pages/translate/InputTranslateSettings';
import SpeechSettings from './pages/translate/SpeechSettings';
import PdfTranslateSettings from './pages/translate/PdfTranslateSettings';
import SubtitleTranslateSettings from './pages/translate/SubtitleTranslateSettings';
import EngineSettings from './pages/engine/EngineSettings';
import FavoritesSettings from './pages/favorite/FavoritesSettings';

const { Title } = Typography;
const { Sider, Content, Header } = Layout;

const themeIconMap = {
  auto: <Icon name="brightness-auto" size={20} />,
  light: <Icon name="sun" size={20} />,
  dark: <Icon name="moon" size={20} />,
};
const themeTextMap = {
  auto: '跟随系统',
  light: '浅色',
  dark: '深色',
};
const themeOrder = ['auto', 'light', 'dark'];

const OptionsInner = () => {
  const { t } = useTranslation();
  
  // 使用 ThemeProvider 的 useTheme hook
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [selectedKey, setSelectedKey] = useImmer('general');
  const [openKeys, setOpenKeys] = useImmer<string[]>([]);

  // 确保翻译相关页面时，翻译菜单保持打开
  useEffect(() => {
    if (selectedKey.startsWith('translate-')) {
      setOpenKeys(draft => {
        if (!draft.includes('translate')) {
          draft.push('translate');
        }
        return draft;
      });
    }
  }, [selectedKey]);

  const handleThemeSwitch = () => {
    const idx = themeOrder.indexOf(themeMode);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setThemeMode(next as 'light' | 'dark' | 'auto');
  };

  const handleMenuClick = (e: { key: string }) => {
    // 如果点击的是"翻译设置"主菜单，默认跳转到划词翻译
    if (e.key === 'translate') {
      setSelectedKey('translate-text');
      setOpenKeys(['translate']); // 确保翻译菜单打开
    } else {
      setSelectedKey(e.key);
    }
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  const menuItems = [
    { key: 'general', icon: <Icon name="settings" size={22} />, label: t('通用设置') },
    { key: 'language', icon: <Icon name="language" size={22} />, label: t('语言设置') },
    { key: 'engine', icon: <Icon name="manufacturing" size={22} />, label: t('引擎设置') },
    {
      key: 'translate',
      icon: <Icon name="translate" size={22} />,
      label: t('翻译设置'),
      children: [
        { key: 'translate-text', icon: <Icon name="select-all" size={18} />, label: t('划词翻译') },
        { key: 'translate-page', icon: <Icon name="web" size={18} />, label: t('网页翻译') },
        { key: 'translate-input', icon: <Icon name="keyboard" size={18} />, label: t('输入翻译') },
        { key: 'translate-speech', icon: <Icon name="volume" size={18} />, label: t('朗读设置') },
        { key: 'translate-pdf', icon: <Icon name="book" size={18} />, label: t('PDF翻译') },
        { key: 'translate-subtitle', icon: <Icon name="edit" size={18} />, label: t('字幕翻译') },
      ]
    },
    { key: 'favorites', icon: <Icon name="favorite" size={22} />, label: t('收藏管理') },
    { key: 'cache', icon: <Icon name="storage" size={22} />, label: t('缓存管理') },
    { key: 'shortcut', icon: <Icon name="keyboard" size={22} />, label: t('快捷键设置') },
    { key: 'about', icon: <Icon name="info" size={22} />, label: t('关于') },
  ];

  let content = null;
  if (selectedKey === 'language') {
    content = <LanguageSettings />;
  } else if (selectedKey === 'general') {
    content = <GeneralSettings themeMode={themeMode} setThemeMode={setThemeMode} />;
  } else if (selectedKey === 'engine') {
    content = <EngineSettings />;
  } else if (selectedKey === 'translate-text') {
    content = <TextTranslateSettings />;
  } else if (selectedKey === 'translate-page') {
    content = <PageTranslateSettings />;
  } else if (selectedKey === 'translate-input') {
    content = <InputTranslateSettings />;
  } else if (selectedKey === 'translate-speech') {
    content = <SpeechSettings />;
  } else if (selectedKey === 'translate-pdf') {
    content = <PdfTranslateSettings />;
  } else if (selectedKey === 'translate-subtitle') {
    content = <SubtitleTranslateSettings />;
  } else if (selectedKey === 'favorites') {
    content = <FavoritesSettings />;
  } else if (selectedKey === 'cache') {
    content = <CacheSettings />;
  } else if (selectedKey === 'shortcut') {
    content = <ShortcutSettings />;
  } else if (selectedKey === 'about') {
    content = <About />;
  }

  return (
    <App>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 顶部导航栏 */}
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
                  justifyContent: 'center'
                }}
                icon={<Icon name="translate" size={32} style={{ color: '#2386e1' }} />}
              />
              <Title 
                level={3} 
                style={{ 
                  margin: 0, 
                  color: isDark ? '#ffffff' : '#1f1f1f',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}
              >
                {t('翻译助手')}
              </Title>
            </Space>
            
            <div style={{ flex: 1 }} />
            
            <Space size={8}>
              <Tooltip title={t('前往 GitHub 项目')} placement="bottom">
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={<Icon name="brand-github" size={20} />}
                  onClick={() => window.open('https://github.com/jabin-hao/translator', '_blank')}
                  style={{ 
                    color: isDark ? '#a6a6a6' : '#666666',
                    border: 'none'
                  }}
                />
              </Tooltip>
              
              <Tooltip title={`${t('当前主题')}：${themeTextMap[themeMode]}`} placement="bottom">
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={themeIconMap[themeMode]}
                  onClick={handleThemeSwitch}
                  style={{ 
                    color: isDark ? '#a6a6a6' : '#666666',
                    border: 'none'
                  }}
                />
              </Tooltip>
            </Space>
          </Header>

          <Layout>
            {/* 侧边栏 */}
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
                onOpenChange={handleOpenChange}
                items={menuItems.map(item => {
                  if (item.children) {
                    return {
                      key: item.key,
                      icon: item.icon,
                      label: item.label,
                      children: item.children.map(child => ({
                        key: child.key,
                        icon: child.icon,
                        label: child.label
                      }))
                    };
                  }
                  return {
                    key: item.key,
                    icon: item.icon,
                    label: item.label
                  };
                })}
                onClick={handleMenuClick}
                style={{ 
                  border: 'none', 
                  fontSize: 14,
                  fontWeight: 500,
                  height: '100%',
                  background: 'transparent'
                }}
              />
            </Sider>
            
            {/* 主内容区 */}
            <Layout style={{ marginLeft: 240 }}>
              <Content
                style={{
                  padding: 0,
                  background: isDark ? '#141414' : '#f5f5f5',
                  minHeight: 'calc(100vh - 64px)',
                  overflow: 'auto'
                }}
              >
                {content}
              </Content>
            </Layout>
          </Layout>
        </Layout>
      </App>
    );
  };

export default OptionsInner;