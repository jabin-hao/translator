import React, { useState } from 'react';
import { Card, Select, Button, List, Tag, Space, Divider, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

// 简化版语言列表
const LANGUAGES = [
  { label: '中文（简体）', value: 'zh-CN' },
  { label: '中文（繁体）', value: 'zh-TW' },
  { label: '英语', value: 'en' },
  { label: '日语', value: 'ja' },
  { label: '韩语', value: 'ko' },
  { label: '法语', value: 'fr' },
  { label: '德语', value: 'de' },
  { label: '西班牙语', value: 'es' },
  { label: '俄语', value: 'ru' },
  { label: '葡萄牙语', value: 'pt' },
];

const UI_LANGUAGES = [
  { label: '跟随浏览器', value: 'default' },
  ...LANGUAGES
];

const getLocal = async (key, def) => {
  try {
    const value = await storage.get(key);
    if (value) return value;
  } catch {}
  return def;
};

const setLocal = async (key, val) => {
  await storage.set(key, val);
};

const LanguageSettings: React.FC = () => {
  // 状态
  const [uiLang, setUiLang] = useState('default');
  const [pageTargetLang, setPageTargetLang] = useState('zh-CN');
  const [textTargetLang, setTextTargetLang] = useState('zh-CN');
  const [favoriteLangs, setFavoriteLangs] = useState([]);
  const [neverLangs, setNeverLangs] = useState([]);
  const [alwaysLangs, setAlwaysLangs] = useState([]);
  const [addFav, setAddFav] = useState('');
  const [addNever, setAddNever] = useState('');
  const [addAlways, setAddAlways] = useState('');

  // 初始化数据
  React.useEffect(() => {
    const initData = async () => {
      const [ui, page, text, fav, never, always] = await Promise.all([
        getLocal('uiLang', 'default'),
        getLocal('pageTargetLang', 'zh-CN'),
        getLocal('textTargetLang', 'zh-CN'),
        getLocal('favoriteLangs', []),
        getLocal('neverLangs', []),
        getLocal('alwaysLangs', [])
      ]);
      
      setUiLang(ui);
      setPageTargetLang(page);
      setTextTargetLang(text);
      setFavoriteLangs(fav);
      setNeverLangs(never);
      setAlwaysLangs(always);
    };
    
    initData();
  }, []);

  // 保存到 storage
  const save = async (key, val) => {
    await setLocal(key, val);
    message.success('已保存');
  };

  // 偏好语言
  const handleAddFav = async () => {
    if (addFav && !favoriteLangs.includes(addFav)) {
      const next = [...favoriteLangs, addFav];
      setFavoriteLangs(next);
      await save('favoriteLangs', next);
      setAddFav('');
    }
  };
  const handleRemoveFav = async (lang) => {
    const next = favoriteLangs.filter(l => l !== lang);
    setFavoriteLangs(next);
    await save('favoriteLangs', next);
  };

  // 永不翻译
  const handleAddNever = async () => {
    if (addNever && !neverLangs.includes(addNever)) {
      const next = [...neverLangs, addNever];
      setNeverLangs(next);
      await save('neverLangs', next);
      setAddNever('');
    }
  };
  const handleRemoveNever = async (lang) => {
    const next = neverLangs.filter(l => l !== lang);
    setNeverLangs(next);
    await save('neverLangs', next);
  };

  // 总是翻译
  const handleAddAlways = async () => {
    if (addAlways && !alwaysLangs.includes(addAlways)) {
      const next = [...alwaysLangs, addAlways];
      setAlwaysLangs(next);
      await save('alwaysLangs', next);
      setAddAlways('');
    }
  };
  const handleRemoveAlways = async (lang) => {
    const next = alwaysLangs.filter(l => l !== lang);
    setAlwaysLangs(next);
    await save('alwaysLangs', next);
  };

  return (
    <Card 
      title="语言设置" 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 界面语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>扩展界面语言：</b>
          <Select
            value={uiLang}
            options={UI_LANGUAGES}
            onChange={val => { setUiLang(val); save('uiLang', val); }}
            style={{ width: 200, marginLeft: 16 }}
          />
        </div>
        <Divider />
        {/* 网页翻译目标语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>网页翻译目标语言：</b>
          <Select
            value={pageTargetLang}
            options={LANGUAGES}
            onChange={val => { setPageTargetLang(val); save('pageTargetLang', val); }}
            style={{ width: 200, marginLeft: 16 }}
          />
        </div>
        {/* 划词翻译目标语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>划词翻译目标语言：</b>
          <Select
            value={textTargetLang}
            options={LANGUAGES}
            onChange={val => { setTextTargetLang(val); save('textTargetLang', val); }}
            style={{ width: 200, marginLeft: 16 }}
          />
        </div>
        <Divider />
        {/* 偏好语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>偏好语言：</b>
          <Space>
            <Select
              value={addFav}
              options={LANGUAGES.filter(l => !favoriteLangs.includes(l.value))}
              onChange={setAddFav}
              style={{ width: 160 }}
              placeholder="选择语言"
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFav} disabled={!addFav}>添加</Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {favoriteLangs.map(lang => (
              <Tag 
                key={lang} 
                closable 
                onClose={() => handleRemoveFav(lang)}
                color="blue"
              >
                {LANGUAGES.find(l => l.value === lang)?.label || lang}
              </Tag>
            ))}
          </div>
        </div>
        {/* 永不翻译语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>永不翻译这些语言：</b>
          <Space>
            <Select
              value={addNever}
              options={LANGUAGES.filter(l => !neverLangs.includes(l.value))}
              onChange={setAddNever}
              style={{ width: 160 }}
              placeholder="选择语言"
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNever} disabled={!addNever}>添加</Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {neverLangs.map(lang => (
              <Tag 
                key={lang} 
                closable 
                onClose={() => handleRemoveNever(lang)}
                color="red"
              >
                {LANGUAGES.find(l => l.value === lang)?.label || lang}
              </Tag>
            ))}
          </div>
        </div>
        {/* 总是翻译语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>总是翻译这些语言：</b>
          <Space>
            <Select
              value={addAlways}
              options={LANGUAGES.filter(l => !alwaysLangs.includes(l.value))}
              onChange={setAddAlways}
              style={{ width: 160 }}
              placeholder="选择语言"
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAlways} disabled={!addAlways}>添加</Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {alwaysLangs.map(lang => (
              <Tag 
                key={lang} 
                closable 
                onClose={() => handleRemoveAlways(lang)}
                color="green"
              >
                {LANGUAGES.find(l => l.value === lang)?.label || lang}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LanguageSettings; 