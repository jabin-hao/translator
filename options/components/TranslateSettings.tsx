import React, { useEffect, useState } from 'react';
import { Card, Select, Switch, Divider, message, Input, Button, List, Modal, Checkbox, Tooltip, Radio } from 'antd';
import { Storage } from '@plasmohq/storage';
import { TRANSLATE_ENGINES, TTS_ENGINES } from '../../lib/engines';
import { useTranslation } from 'react-i18next';
import {
  setAutoTranslateEnabled,
  getDictConfig,
  setDictConfig,
  getCustomDict,
  setCustomDict,
  addAlwaysSite,
  addNeverSite,
  removeAlwaysSite,
  removeNeverSite,
  removeCustomDict
} from '../../lib/siteTranslateSettings';
import { DeleteOutlined } from '@ant-design/icons';
import { TRANSLATE_SETTINGS_KEY, SPEECH_KEY, DEEPL_API_KEY } from '../../lib/constants';
const { Option } = Select;

const storage = new Storage();

const TranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const [engine, setEngine] = useState('google');
  const [autoRead, setAutoRead] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [deeplApiKey, setDeeplApiKey] = useState('');
  const [deeplApiKeyInput, setDeeplApiKeyInput] = useState('');
  
  // 朗读引擎设置
  const [speechEngine, setSpeechEngine] = useState('edge');
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);

  // 网站自动翻译相关 state
  const [siteAutoEnabled, setSiteAutoEnabled] = useState(false);
  const [alwaysSites, setAlwaysSites] = useState<string[]>([]);
  const [neverSites, setNeverSites] = useState<string[]>([]);
  const [addHost, setAddHost] = useState('');
  const [addType, setAddType] = useState<'always'|'never'>('always');

  // 批量操作 Modal 状态
  const [showAllAlways, setShowAllAlways] = useState(false);
  const [showAllNever, setShowAllNever] = useState(false);

  // 在 state 区域补充
  const [selectedAlways, setSelectedAlways] = useState<string[]>([]);
  const [selectedNever, setSelectedNever] = useState<string[]>([]);

  const [pageTranslateMode, setPageTranslateMode] = useState<'translated'|'compare'>('translated');

  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictHost, setDictHost] = useState<string | null>(null);
  const [dictData, setDictData] = useState<{[k: string]: string}>({});
  const [dictAddKey, setDictAddKey] = useState('');
  const [dictAddValue, setDictAddValue] = useState('');

  useEffect(() => {
    // 读取翻译设置
    storage.get(TRANSLATE_SETTINGS_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoRead(!!(data as any)?.autoRead);
        setAutoTranslate((data as any)?.autoTranslate ?? false);
      }
    });
    
    // 读取朗读设置
    storage.get(SPEECH_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setSpeechEngine((data as any)?.engine || 'edge');
        setSpeechSpeed((data as any)?.speed ?? 1);
        setSpeechPitch((data as any)?.pitch ?? 1);
        setSpeechVolume((data as any)?.volume ?? 1);
      }
    });

    // 读取 DeepL API key
    storage.get(DEEPL_API_KEY).then((key) => {
      if (key && typeof key === 'string') {
        setDeeplApiKey(key);
        setDeeplApiKeyInput(key);
      }
    });

    // 初始化读取网站翻译设置
    getDictConfig().then(dict => {
      setSiteAutoEnabled(dict.autoTranslateEnabled ?? false);
      setAlwaysSites(dict.siteAlwaysList || []);
      setNeverSites(dict.siteNeverList || []);
      setPageTranslateMode(dict.pageTranslateMode === 'compare' ? 'compare' : 'translated');
    });
  }, []);

  useEffect(() => {
    // 保存翻译设置
    storage.set(TRANSLATE_SETTINGS_KEY, { engine, autoRead, autoTranslate });
  }, [engine, autoRead, autoTranslate]);

  useEffect(() => {
    // 保存朗读设置
    storage.set(SPEECH_KEY, { 
      engine: speechEngine, 
      speed: speechSpeed, 
      pitch: speechPitch, 
      volume: speechVolume 
    });
  }, [speechEngine, speechSpeed, speechPitch, speechVolume]);

  const handleEngineChange = (val: string) => {
    setEngine(val);
    message.success(t('翻译引擎已保存'));
  };

  const handleAutoReadChange = (checked: boolean) => {
    setAutoRead(checked);
    message.success(t('自动朗读设置已保存'));
  };

  const handleAutoTranslateChange = (checked: boolean) => {
    setAutoTranslate(checked);
    storage.set(TRANSLATE_SETTINGS_KEY, {
      engine,
      autoRead,
      autoTranslate: checked
    });
    message.success(t('自动翻译设置已保存'));
  };

  const handleSpeechEngineChange = (val: string) => {
    setSpeechEngine(val);
    message.success(t('朗读引擎已保存'));
  };

  const handleSpeechSpeedChange = (val: number) => {
    setSpeechSpeed(val);
    message.success(t('朗读速度已保存'));
  };

  const handleSpeechPitchChange = (val: number) => {
    setSpeechPitch(val);
    message.success(t('朗读音调已保存'));
  };

  const handleSpeechVolumeChange = (val: number) => {
    setSpeechVolume(val);
    message.success(t('朗读音量已保存'));
  };

  const handleDeeplApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeeplApiKeyInput(e.target.value);
  };

  const handleSaveDeeplApiKey = () => {
    if (!deeplApiKeyInput.trim()) {
      message.error(t('请输入 DeepL API Key'));
      return;
    }
    setDeeplApiKey(deeplApiKeyInput.trim());
    storage.set(DEEPL_API_KEY, deeplApiKeyInput.trim());
    message.success(t('DeepL API Key 已保存'));
  };

  const handleSiteAutoChange = async (checked: boolean) => {
    setSiteAutoEnabled(checked);
    await setAutoTranslateEnabled(checked);
    message.success(checked ? t('已开启网站自动翻译') : t('已关闭网站自动翻译'));
  };
  const handleRemoveAlways = async (host: string) => {
    console.log('remove always', host);
    await removeAlwaysSite(host);
    await removeCustomDict(host);
    const dict = await getDictConfig();
    console.log('after remove', dict.siteAlwaysList);
    setAlwaysSites(dict.siteAlwaysList || []);
    message.success(t('已移除白名单并清除词库'));
  };
  const handleRemoveNever = async (host: string) => {
    console.log('remove never', host);
    await removeNeverSite(host);
    const dict = await getDictConfig();
    setNeverSites(dict.siteNeverList || []);
    message.success(t('已移除黑名单'));
  };
  const handleAddHost = async () => {
    const host = addHost.trim();
    if (!host) return;
    if (addType === 'always') {
      await addAlwaysSite(host);
      const dict = await getDictConfig();
      setAlwaysSites(dict.siteAlwaysList || []);
      message.success(t('已加入白名单'));
    } else {
      await addNeverSite(host);
      const dict = await getDictConfig();
      setNeverSites(dict.siteNeverList || []);
      message.success(t('已加入黑名单'));
    }
    setAddHost('');
  };

  const handlePageTranslateModeChange = async (e) => {
    setPageTranslateMode(e.target.value);
    const dict = await getDictConfig();
    await setDictConfig({ ...dict, pageTranslateMode: e.target.value });
    message.success(t('整页翻译模式已保存'));
  };

  const handleEditDict = async (host: string) => {
    setDictHost(host);
    const dict = await getCustomDict(host) || {};
    setDictData(dict);
    setDictModalOpen(true);
  };

  const handleSaveDict = async () => {
    if (dictHost) {
      await setCustomDict(dictHost, dictData);
      setDictModalOpen(false);
      message.success('词库已保存');
    }
  };

  // 只展示最新5个（倒序）
  const alwaysSitesToShow = (alwaysSites || []).slice(-5).reverse();
  const neverSitesToShow = (neverSites || []).slice(-5).reverse();

  return (
    <Card
      title={t('翻译设置')}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 翻译引擎设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('翻译引擎')}：</b>
          <Select
            value={engine}
            onChange={handleEngineChange}
            style={{ width: 200, marginLeft: 16 }}
            size="middle"
          >
            {TRANSLATE_ENGINES.map(e => (
              <Option key={e.value} value={e.value} disabled={e.disabled}>
                {e.icon && <img src={e.icon} alt={e.label} style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6 }} />}
                {e.label}
              </Option>
            ))}
          </Select>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('选择用于翻译的默认引擎，支持多引擎兜底')}
          </div>
        </div>

        {/* DeepL API Key 设置 */}
        {engine === 'deepl' && (
          <div style={{ marginBottom: 24, marginLeft: 24 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>{t('DeepL API Key')}：</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input.Password
                value={deeplApiKeyInput}
                onChange={handleDeeplApiKeyInputChange}
                placeholder={t('请输入 DeepL API Key')}
                style={{ width: 400 }}
                size="middle"
              />
              <Button 
                type="primary" 
                onClick={handleSaveDeeplApiKey}
                size="middle"
              >
                {t('保存')}
              </Button>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {t('获取方式：访问 https://www.deepl.com/ 注册账号，在账户设置中找到 API 部分获取免费 API Key')}
            </div>
          </div>
        )}
        
        <Divider />
        
        {/* 自动翻译设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('划词自动翻译')}：</b>
          <Switch checked={autoTranslate} onChange={handleAutoTranslateChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('开启后划词将自动翻译，无需手动点击')}
          </div>
        </div>
        <Divider />
        
        {/* 自动朗读设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('自动朗读翻译结果')}：</b>
          <Switch checked={autoRead} onChange={handleAutoReadChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('翻译完成后自动朗读结果（如支持）')}
          </div>
        </div>

        {/* 朗读引擎设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('朗读引擎')}：</b>
          <Select
            value={speechEngine}
            onChange={handleSpeechEngineChange}
            style={{ width: 200, marginLeft: 16 }}
            size="middle"
          >
            {TTS_ENGINES.map(e => (
              <Option key={e.value} value={e.value} disabled={e.disabled}>
                {e.icon && <img src={e.icon} alt={e.label} style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6 }} />}
                {e.label}
              </Option>
            ))}
          </Select>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('选择用于朗读的默认引擎，Edge TTS 音质最佳，Google TTS 稳定，浏览器 TTS 无需网络')}
          </div>
        </div>
        
        {/* 朗读参数设置 */}
        <div style={{ marginBottom: 24, marginLeft: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>{t('朗读速度')}：</span>
            <Select
              value={speechSpeed}
              onChange={handleSpeechSpeedChange}
              style={{ width: 120, marginLeft: 8 }}
            >
              <Option value={0.5}>{t('0.5x')}</Option>
              <Option value={0.75}>{t('0.75x')}</Option>
              <Option value={1}>{t('1x')}</Option>
              <Option value={1.25}>{t('1.25x')}</Option>
              <Option value={1.5}>{t('1.5x')}</Option>
              <Option value={2}>{t('2x')}</Option>
            </Select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>{t('朗读音调')}：</span>
            <Select
              value={speechPitch}
              onChange={handleSpeechPitchChange}
              style={{ width: 120, marginLeft: 8 }}
            >
              <Option value={0.5}>{t('低音')}</Option>
              <Option value={0.75}>{t('中低音')}</Option>
              <Option value={1}>{t('正常')}</Option>
              <Option value={1.25}>{t('中高音')}</Option>
              <Option value={1.5}>{t('高音')}</Option>
            </Select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>{t('朗读音量')}：</span>
            <Select
              value={speechVolume}
              onChange={handleSpeechVolumeChange}
              style={{ width: 120, marginLeft: 8 }}
            >
              <Option value={0.25}>{t('25%')}</Option>
              <Option value={0.5}>{t('50%')}</Option>
              <Option value={0.75}>{t('75%')}</Option>
              <Option value={1}>{t('100%')}</Option>
            </Select>
          </div>
        </div>

        <Divider />

        {/* 网站自动翻译 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('网站自动翻译')}：</b>
          <Switch checked={siteAutoEnabled} onChange={handleSiteAutoChange} style={{ marginLeft: 16 }} />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{t('开启后，命中列表的网站将自动整页翻译')}</div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <b>{t('整页翻译模式')}：</b>
          <Radio.Group value={pageTranslateMode} onChange={handlePageTranslateModeChange} style={{ marginLeft: 16 }}>
            <Radio.Button value="translated">{t('全部译文')}</Radio.Button>
            <Radio.Button value="compare">{t('原文对照')}</Radio.Button>
          </Radio.Group>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{t('选择整页翻译时的显示方式：仅显示译文或原文与译文对照')}</div>
        </div>

        <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
          <Input
            value={addHost}
            onChange={e => setAddHost(e.target.value)}
            placeholder={t('输入域名，如 github.com')}
            style={{ width: 220 }}
          />
          <Select value={addType} onChange={v => setAddType(v)} style={{ width: 100 }}>
            <Option value="always">{t('白名单')}</Option>
            <Option value="never">{t('黑名单')}</Option>
          </Select>
          <Button onClick={handleAddHost}>{t('添加')}</Button>
        </div>

        {/* 白名单区域 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{t('网站翻译白名单')}：</div>
          <List
            size="small"
            bordered
            dataSource={alwaysSitesToShow}
            renderItem={host => (
              <List.Item
                actions={[
                  <Button size="small" type="link" onClick={() => handleEditDict(host)}>{t('自定义词库')}</Button>,
                  <Button size="small" type="link" danger onClick={() => handleRemoveAlways(host)}>{t('移除')}</Button>
                ]}
                style={{ alignItems: 'center' }}
              >
                <Tooltip title={host} placement="topLeft">
                  <div style={{
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{host}</div>
                </Tooltip>
              </List.Item>
            )}
            style={{ width: '25%', minWidth: 180, margin: '0 0 8px 0', borderRadius: 6 }}
          />
          {alwaysSites.length > 5 && (
            <Button size="small" type="link" onClick={() => setShowAllAlways(true)}>{t('查看全部')}</Button>
          )}
          <div style={{ fontSize: 13, color: '#888', marginTop: 8, marginBottom: 0 }}>{t('加入白名单的网站会自动整页翻译')}</div>
        </div>
        {/* 黑名单区域 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{t('网站翻译黑名单')}：</div>
          <List
            size="small"
            bordered
            dataSource={neverSitesToShow}
            renderItem={host => (
              <List.Item
                actions={[
                  <Button size="small" type="link" danger onClick={() => handleRemoveNever(host)}>{t('移除')}</Button>
                ]}
                style={{ alignItems: 'center' }}
              >
                <Tooltip title={host} placement="topLeft">
                  <div style={{
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{host}</div>
                </Tooltip>
              </List.Item>
            )}
            style={{ width: '25%', minWidth: 180, margin: '0 0 8px 0', borderRadius: 6 }}
          />
          {neverSites.length > 5 && (
            <Button size="small" type="link" onClick={() => setShowAllNever(true)}>{t('查看全部')}</Button>
          )}
          <div style={{ fontSize: 13, color: '#888', marginTop: 8, marginBottom: 0 }}>{t('加入黑名单的网站不会被自动整页翻译')}</div>
        </div>

        <Divider />

      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        {t('大部分设置会自动保存，DeepL API Key 需要点击保存按钮。')}
      </div>

      {/* 批量操作 Modal */}
      <Modal
        open={showAllAlways}
        title={t('全部白名单')}
        onCancel={() => { setShowAllAlways(false); setSelectedAlways([]); }}
        footer={[
          <Button key="selectAll" onClick={() => setSelectedAlways(selectedAlways.length === alwaysSites.length ? [] : alwaysSites)}>
            {selectedAlways.length === alwaysSites.length ? t('取消全选') : t('全选')}
          </Button>,
          <Button key="remove" danger disabled={selectedAlways.length === 0} onClick={async () => {
            for (const host of selectedAlways) await handleRemoveAlways(host);
            setSelectedAlways([]);
            setShowAllAlways(false);
            const dict = await getDictConfig();
            setAlwaysSites(dict.siteAlwaysList || []);
            setNeverSites(dict.siteNeverList || []);
          }}>{t('批量移除')}</Button>,
          <Button key="toNever" disabled={selectedAlways.length === 0} onClick={async () => {
            for (const host of selectedAlways) await addNeverSite(host);
            setSelectedAlways([]);
            setShowAllAlways(false);
            const dict = await getDictConfig();
            setAlwaysSites(dict.siteAlwaysList || []);
            setNeverSites(dict.siteNeverList || []);
          }}>{t('批量转移到黑名单')}</Button>
        ]}
      >
        <Checkbox.Group
          style={{ width: '100%' }}
          value={selectedAlways}
          onChange={v => setSelectedAlways(v as string[])}
        >
          <List
            dataSource={alwaysSites}
            style={{ maxHeight: 360, overflowY: 'auto', marginTop: 8, width: '100%' }}
            renderItem={host => (
              <List.Item>
                <Checkbox value={host}>{host}</Checkbox>
              </List.Item>
            )}
          />
        </Checkbox.Group>
      </Modal>

      <Modal
        open={showAllNever}
        title={t('全部黑名单')}
        onCancel={() => { setShowAllNever(false); setSelectedNever([]); }}
        footer={[
          <Button key="selectAll" onClick={() => setSelectedNever(selectedNever.length === neverSites.length ? [] : neverSites)}>
            {selectedNever.length === neverSites.length ? t('取消全选') : t('全选')}
          </Button>,
          <Button key="remove" danger disabled={selectedNever.length === 0} onClick={async () => {
            for (const host of selectedNever) await handleRemoveNever(host);
            setSelectedNever([]);
            setShowAllNever(false);
            const dict = await getDictConfig();
            setAlwaysSites(dict.siteAlwaysList || []);
            setNeverSites(dict.siteNeverList || []);
          }}>{t('批量移除')}</Button>,
          <Button key="toAlways" disabled={selectedNever.length === 0} onClick={async () => {
            for (const host of selectedNever) await addAlwaysSite(host);
            setSelectedNever([]);
            setShowAllNever(false);
            const dict = await getDictConfig();
            setAlwaysSites(dict.siteAlwaysList || []);
            setNeverSites(dict.siteNeverList || []);
          }}>{t('批量转移到白名单')}</Button>
        ]}
      >
        <Checkbox.Group
          style={{ width: '100%' }}
          value={selectedNever}
          onChange={v => setSelectedNever(v as string[])}
        >
          <List
            dataSource={neverSites}
            style={{ maxHeight: 360, overflowY: 'auto', marginTop: 8, width: '100%' }}
            renderItem={host => (
              <List.Item>
                <Checkbox value={host}>{host}</Checkbox>
              </List.Item>
            )}
          />
        </Checkbox.Group>
      </Modal>

      <Modal
        open={dictModalOpen}
        onCancel={() => setDictModalOpen(false)}
        onOk={handleSaveDict}
        title={dictHost ? `自定义词库 - ${dictHost}` : '自定义词库'}
        width={480}
        styles={{ body: { display: 'block' } }}
        cancelText="取消"
        okText="保存"
      >
        <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>
          你可以为该网站设置专属词典，优先替换翻译结果。原文需精确匹配，建议区分大小写。
        </div>
        {/* 词条列表 */}
        <List
          size="small"
          dataSource={Object.entries(dictData)}
          locale={{ emptyText: '暂无词条' }}
          style={{ maxHeight: 320, minHeight: 40, overflowY: 'auto', marginBottom: 12 }}
          renderItem={([k, v], idx) => (
            <List.Item
              style={{ padding: '4px 0', alignItems: 'center' }}
              actions={[
                <Tooltip title="删除">
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => {
                      const newDict = { ...dictData };
                      delete newDict[k];
                      setDictData(newDict);
                    }}
                  />
                </Tooltip>
              ]}
            >
              <Input
                value={k}
                disabled
                style={{ width: 120, marginRight: 8 }}
              />
              <Input
                value={v}
                onChange={e => {
                  const newDict = { ...dictData };
                  newDict[k] = e.target.value;
                  setDictData(newDict);
                }}
                style={{ flex: 1 }}
                placeholder="自定义译文"
              />
            </List.Item>
          )}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="原文"
            style={{ width: 120 }}
            value={dictAddKey}
            onChange={e => setDictAddKey(e.target.value)}
            onPressEnter={() => {
              const key = dictAddKey.trim();
              const value = dictAddValue.trim();
              if (!key || !value) return;
              if (dictData[key]) {
                message.warning('该原文已存在');
                return;
              }
              setDictData({ ...dictData, [key]: value });
              setDictAddKey('');
              setDictAddValue('');
            }}
          />
          <Input
            placeholder="自定义译文"
            style={{ flex: 1 }}
            value={dictAddValue}
            onChange={e => setDictAddValue(e.target.value)}
            onPressEnter={() => {
              const key = dictAddKey.trim();
              const value = dictAddValue.trim();
              if (!key || !value) return;
              if (dictData[key]) {
                message.warning('该原文已存在');
                return;
              }
              setDictData({ ...dictData, [key]: value });
              setDictAddKey('');
              setDictAddValue('');
            }}
          />
          <Button
            onClick={() => {
              const key = dictAddKey.trim();
              const value = dictAddValue.trim();
              if (!key || !value) return;
              if (dictData[key]) {
                message.warning('该原文已存在');
                return;
              }
              setDictData({ ...dictData, [key]: value });
              setDictAddKey('');
              setDictAddValue('');
            }}
          >
            添加
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default TranslateSettings; 