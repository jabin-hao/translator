import React, { useState } from 'react';
import { Layout, Menu, Button, Tooltip, Space, Avatar, Typography } from 'antd';
import { Icon } from '@iconify/react';
import GeneralSettings from './components/GeneralSettings';
import About from './components/About';
import LanguageSettings from './components/LanguageSettings';
import PluginIcon from 'components/PluginIcon';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const menuItems = [
  {
    key: 'language',
    icon: <Icon icon="material-symbols:language" width={22} />, // 语言
    label: '语言设置',
  },
  {
    key: 'general',
    icon: <Icon icon="material-symbols:settings" width={22} />, // 设置
    label: '通用设置',
  },
  {
    key: 'about',
    icon: <Icon icon="material-symbols:info" width={22} />, // 关于
    label: '关于',
  },
];

const THEME_KEY = 'plugin_theme_mode';
const themeIconMap = {
  auto: <Icon icon="material-symbols:brightness-auto" width={24} height={24} />, // 自动
  light: <Icon icon="material-symbols:light-mode" width={24} height={24} />, // 日间
  dark: <Icon icon="material-symbols:dark-mode" width={24} height={24} />, // 夜间
};
const themeTextMap = {
  auto: '自动',
  light: '日间',
  dark: '夜间',
};
const themeOrder = ['auto', 'light', 'dark'];

function getInitTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) return raw;
  } catch {}
  return 'auto';
}

const OptionsIndex = () => {
  const [selectedKey, setSelectedKey] = useState('language');
  const [theme, setTheme] = useState(getInitTheme());

  // 切换主题
  const handleThemeSwitch = () => {
    const idx = themeOrder.indexOf(theme);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };

  let content = null;
  if (selectedKey === 'language') {
    content = <LanguageSettings />;
  } else if (selectedKey === 'general') {
    content = <GeneralSettings />;
  } else if (selectedKey === 'about') {
    content = <About />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 顶部栏 */}
      <Header style={{
        height: 56,
        background: 'linear-gradient(90deg, #f5faff 0%, #e3f0ff 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        borderBottom: '1px solid #e3f0ff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Space style={{ fontWeight: 700, fontSize: 18, color: '#2386e1', letterSpacing: 2 }}>
          <Avatar
            size={32}
            style={{ background: 'transparent', verticalAlign: 'middle' }}
            icon={<PluginIcon size={28} />}
          />
          <Text style={{ fontFamily: 'Segoe UI, HarmonyOS Sans, Arial', marginLeft: 2, color: '#2386e1' }}>翻译助手</Text>
        </Space>
        <div style={{ flex: 1 }} />
        <Space size={18} style={{ marginLeft: 'auto' }}>
          <Tooltip title="前往 GitHub 项目">
            <Button
              type="text"
              icon={<Icon icon="mdi:github" width={24} height={24} />}
              onClick={() => window.open('https://github.com/your-repo', '_blank')}
            />
          </Tooltip>
          <Tooltip title={`切换主题：${themeTextMap[theme]}`}>
            <Button
              type="text"
              icon={themeIconMap[theme]}
              onClick={handleThemeSwitch}
              style={{ fontSize: 22 }}
            />
          </Tooltip>
        </Space>
      </Header>
      <Layout>
        <Sider width={180} style={{ background: '#fff', borderRight: '1px solid #eee' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key as string)}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout>
          <Content style={{ padding: 32, background: '#f9f9f9', minHeight: 280 }}>
            {content}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default OptionsIndex; 