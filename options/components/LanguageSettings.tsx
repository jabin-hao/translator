import React, { useState } from 'react';
import { Card, Select, Button, List, Tag, Space, Divider, App } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Storage } from '@plasmohq/storage';
import { LANGUAGES, UI_LANGUAGES } from '../../lib/languages';
import { useTranslation } from 'react-i18next';

const storage = new Storage();

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
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  // 状态
  // const [uiLang, setUiLang] = useState('default'); // 删除
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
      const [/*ui,*/ page, text, fav, never, always] = await Promise.all([
        // getLocal('uiLang', 'default'), // 删除
        getLocal('pageTargetLang', 'zh-CN'),
        getLocal('textTargetLang', ''), // 默认空
        getLocal('favoriteLangs', []),
        getLocal('neverLangs', []),
        getLocal('alwaysLangs', [])
      ]);
      // setUiLang(ui); // 删除
      setPageTargetLang(page);
      // 划词翻译目标语言优先级：用户设置 > favoriteLangs[0] > 浏览器语言
      let textLang = text;
      if (!textLang) {
        if (fav && fav.length > 0) textLang = fav[0];
        else textLang = navigator.language.startsWith('zh') ? 'zh-CN' : (navigator.language.startsWith('en') ? 'en' : 'zh-CN');
      }
      setTextTargetLang(textLang);
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
    if (favoriteLangs.length >= 3) {
      message.warning('最多只能选择三种偏好语言');
      return;
    }
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
      title={t('语言设置')} 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 网页翻译目标语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('网页翻译目标语言')}：</b>
          <Select
            key={i18n.language}
            value={pageTargetLang}
            options={LANGUAGES.map(l => ({ label: t('lang.' + l.code), value: l.code }))}
            onChange={val => { setPageTargetLang(val); save('pageTargetLang', val); }}
            style={{ width: 200, marginLeft: 16 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('设置网页整体翻译的目标语言')}
          </div>
        </div>
        {/* 划词翻译目标语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('划词翻译目标语言')}：</b>
          <Select
            key={i18n.language}
            value={textTargetLang}
            options={LANGUAGES.map(l => ({ label: t('lang.' + l.code), value: l.code }))}
            onChange={val => { setTextTargetLang(val); save('textTargetLang', val); }}
            style={{ width: 200, marginLeft: 16 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('设置划词/输入翻译的默认目标语言')}
          </div>
        </div>
        <Divider />
        {/* 偏好语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('偏好语言')}：</b>
          <Space>
            <Select
              key={i18n.language}
              value={addFav}
              options={LANGUAGES.filter(l => !favoriteLangs.includes(l.code)).map(l => ({ label: t('lang.' + l.code), value: l.code }))}
              onChange={setAddFav}
              style={{ width: 160 }}
              placeholder={t('选择语言')}
              allowClear
            />
            <Button icon={<PlusOutlined />} onClick={handleAddFav} disabled={!addFav || favoriteLangs.length >= 3}>{t('添加')}</Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {favoriteLangs.map(lang => (
              <Tag 
                key={lang} 
                closable 
                onClose={() => handleRemoveFav(lang)}
                color="blue"
              >
                {t('lang.' + lang)}
              </Tag>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('你常用的目标语言，优先用于自动选择')}
          </div>
        </div>
        {/* 永不翻译语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('永不翻译这些语言')}：</b>
          <Space>
            <Select
              key={i18n.language}
              value={addNever}
              options={LANGUAGES.filter(l => !neverLangs.includes(l.code)).map(l => ({ label: t('lang.' + l.code), value: l.code }))}
              onChange={setAddNever}
              style={{ width: 160 }}
              placeholder={t('选择语言')}
              allowClear
            />
            <Button icon={<PlusOutlined />} onClick={handleAddNever} disabled={!addNever}>{t('添加')}</Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {neverLangs.map(lang => (
              <Tag 
                key={lang} 
                closable 
                onClose={() => handleRemoveNever(lang)}
                color="red"
              >
                {t('lang.' + lang)}
              </Tag>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('这些语言不会被自动翻译')}
          </div>
        </div>
        {/* 总是翻译语言 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('总是翻译这些语言')}：</b>
          <Space>
            <Select
              key={i18n.language}
              value={addAlways}
              options={LANGUAGES.filter(l => !alwaysLangs.includes(l.code)).map(l => ({ label: t('lang.' + l.code), value: l.code }))}
              onChange={setAddAlways}
              style={{ width: 160 }}
              placeholder={t('选择语言')}
              allowClear
            />
            <Button icon={<PlusOutlined />} onClick={handleAddAlways} disabled={!addAlways}>{t('添加')}</Button>
          </Space>
          <div style={{ marginTop: 8 }}>
            {alwaysLangs.map(lang => (
              <Tag 
                key={lang} 
                closable 
                onClose={() => handleRemoveAlways(lang)}
                color="green"
              >
                {t('lang.' + lang)}
              </Tag>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('这些语言会被自动翻译为你的目标语言')}
          </div>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        {t('所有设置均会自动保存，无需手动操作。')}
      </div>
    </Card>
  );
};

export default LanguageSettings; 