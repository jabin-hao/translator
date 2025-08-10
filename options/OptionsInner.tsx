import 'antd/dist/reset.css';
import React, { useState, useEffect } from 'react';
import { Menu, Button, Tooltip, Space, Avatar, Typography, App, Layout } from 'antd';
import { Icon } from '@iconify/react';
import { useTheme } from '~lib/utils/theme';
import GeneralSettings from './pages/GeneralSettings';
import About from './pages/About';
import LanguageSettings from './pages/LanguageSettings';
import PluginIcon from '~contents/components/PluginIcon';
import TranslateSettings from './pages/TranslateSettings';
import ShortcutSettings from './pages/ShortcutSettings';
import CacheSettings from './pages/CacheSettings';
import { useTranslation } from 'react-i18next';
import TextTranslateSettings from './pages/translate/TextTranslateSettings';
import PageTranslateSettings from './pages/translate/PageTranslateSettings';
import InputTranslateSettings from './pages/translate/InputTranslateSettings';
import SpeechSettings from './pages/translate/SpeechSettings';

const { Title } = Typography;
const { Sider, Content, Header } = Layout;

const themeIconMap = {
  auto: <Icon icon="material-symbols:brightness-auto-outline" width={20} height={20} />,
  light: <Icon icon="material-symbols:light-mode-outline" width={20} height={20} />,
  dark: <Icon icon="material-symbols:dark-mode-outline" width={20} height={20} />,
};
const themeTextMap = {
  auto: '自动',
  light: '日间',
  dark: '夜间',
};
const themeOrder = ['auto', 'light', 'dark'];

const OptionsInner = () => {
  const { t } = useTranslation();
  
  // 使用 ThemeProvider 的 useTheme hook
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [selectedKey, setSelectedKey] = useState('general');
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // 确保翻译相关页面时，翻译菜单保持打开
  useEffect(() => {
    if (selectedKey.startsWith('translate-')) {
      setOpenKeys(prev => prev.includes('translate') ? prev : [...prev, 'translate']);
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
    { key: 'general', icon: <Icon icon="material-symbols:settings-outline" width={22} />, label: t('通用设置') },
    { key: 'language', icon: <Icon icon="material-symbols:language" width={22} />, label: t('语言设置') },
    {
      key: 'translate',
      icon: <Icon icon="material-symbols:g-translate" width={22} />,
      label: t('翻译设置'),
      children: [
        { key: 'translate-text', icon: <Icon icon="material-symbols:select-all" width={18} />, label: t('划词翻译') },
        { key: 'translate-page', icon: <Icon icon="material-symbols:web" width={18} />, label: t('网页翻译') },
        { key: 'translate-input', icon: <Icon icon="material-symbols:keyboard" width={18} />, label: t('输入翻译') },
        { key: 'translate-speech', icon: <Icon icon="material-symbols:volume-up" width={18} />, label: t('朗读设置') },
      ]
    },
    { key: 'cache', icon: <Icon icon="material-symbols:storage" width={22} />, label: t('缓存管理') },
    { key: 'shortcut', icon: <Icon icon="material-symbols:keyboard-outline" width={22} />, label: t('快捷键设置') },
    { key: 'about', icon: <Icon icon="material-symbols:info-outline" width={22} />, label: t('关于') },
  ];

  let content = null;
  if (selectedKey === 'language') {
    content = <LanguageSettings />;
  } else if (selectedKey === 'general') {
    content = <GeneralSettings themeMode={themeMode} setThemeMode={setThemeMode} />;
  } else if (selectedKey === 'translate') {
    content = <TranslateSettings />;
  } else if (selectedKey === 'translate-text') {
    content = <TextTranslateSettings />;
  } else if (selectedKey === 'translate-page') {
    content = <PageTranslateSettings />;
  } else if (selectedKey === 'translate-input') {
    content = <InputTranslateSettings />;
  } else if (selectedKey === 'translate-speech') {
    content = <SpeechSettings />;
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
                icon={<PluginIcon size={32} />}
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
                  icon={<Icon icon="mdi:github" width={20} height={20} />}
                  onClick={() => window.open('https://github.com/Bugbyebyebye/translator', '_blank')}
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