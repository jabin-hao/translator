import React, { useEffect, useState } from 'react';
import { Select, Switch, message, Input, Button, List, Modal, Checkbox, Tooltip, Radio, Segmented, ConfigProvider } from 'antd';
import { TRANSLATE_ENGINES, TTS_ENGINES } from '~lib/constants/engines';
import { useTranslation } from 'react-i18next';
import { useStorage } from '~lib/utils/storage';
import {
  addAlwaysSite,
  addNeverSite,
  removeAlwaysSite,
  removeNeverSite,
  useDictConfig,
  useAutoTranslateEnabled,
  // 新的自定义词库 API
  getCustomDictEntries,
  addCustomDictEntry,
  deleteCustomDictEntry,
  deleteCustomDictByHost
} from '~lib/settings/siteTranslateSettings';
import type { CustomDictEntry } from '~lib/settings/siteTranslateSettings';
import { DeleteOutlined } from '@ant-design/icons';
import { TRANSLATE_SETTINGS_KEY, SPEECH_KEY, DEEPL_API_KEY, YANDEX_API_KEY } from '~lib/constants/settings';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';
const { Option } = Select;

const TranslateSettings: React.FC = () => {
  const { t } = useTranslation();

  // 使用useStorage hooks管理设置
  const [translateSettings, setTranslateSettings] = useStorage(TRANSLATE_SETTINGS_KEY, {
    engine: 'google',
    autoRead: false,
    autoTranslate: false
  });

  const [speechSettings, setSpeechSettings] = useStorage(SPEECH_KEY, {
    engine: 'edge',
    speed: 1,
    pitch: 1,
    volume: 1
  });

  const [deeplApiKey, setDeeplApiKey] = useStorage(DEEPL_API_KEY, '');
  const [yandexApiKey, setYandexApiKey] = useStorage(YANDEX_API_KEY, '');

  // 网站自动翻译设置 - 使用专门的hooks
  const [dictConfig, setDictConfigState] = useDictConfig();
  const [siteAutoEnabled, setSiteAutoEnabled] = useAutoTranslateEnabled();

  // 本地UI状态（不需要持久化的状态）
  const [deeplApiKeyInput, setDeeplApiKeyInput] = useState(deeplApiKey || '');
  const [yandexApiKeyInput, setYandexApiKeyInput] = useState(yandexApiKey || '');
  
  // 朗读引擎设置 - 现在从useStorage获取

  // 从 dictConfig 提取值
  const alwaysSites = dictConfig?.siteAlwaysList ?? [];
  const neverSites = dictConfig?.siteNeverList ?? [];
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
  const [dictEntries, setDictEntries] = useState<CustomDictEntry[]>([]);
  const [dictAddKey, setDictAddKey] = useState('');
  const [dictAddValue, setDictAddValue] = useState('');

  // 同步DeepL输入框状态  
  useEffect(() => {
    setDeeplApiKeyInput(deeplApiKey || '');
  }, [deeplApiKey]);

  // 同步Yandex输入框状态  
  useEffect(() => {
    setYandexApiKeyInput(yandexApiKey || '');
  }, [yandexApiKey]);

  // 初始化页面翻译模式
  useEffect(() => {
    setPageTranslateMode((dictConfig?.pageTranslateMode || 'translated') as 'translated' | 'compare');
  }, [dictConfig?.pageTranslateMode]);

  const handleEngineChange = (val: string) => {
    setTranslateSettings({ ...translateSettings, engine: val });
    message.success(t('翻译引擎已保存')).then(() => {});
  };

  const handleAutoReadChange = (checked: boolean) => {
    setTranslateSettings({ ...translateSettings, autoRead: checked });
    message.success(t('自动朗读设置已保存')).then(() => {});
  };

  const handleAutoTranslateChange = (checked: boolean) => {
    setTranslateSettings({ ...translateSettings, autoTranslate: checked });
    message.success(t('自动翻译设置已保存')).then(() => {});
  };

  const handleSpeechEngineChange = (val: string) => {
    setSpeechSettings({ ...speechSettings, engine: val });
    
    // 根据引擎切换给出提示
    if (val === 'google') {
      message.info(t('已切换到Google TTS，注意：该引擎仅支持速度调节，不支持音调和音量设置'));
    } else if (val === 'browser') {
      message.info(t('已切换到Browser TTS，支持速度、音调和音量的完整调节'));
    }
    
    message.success(t('朗读引擎已保存')).then(() => {});
  };

  const handleSpeechSpeedChange = (val: number) => {
    setSpeechSettings({ ...speechSettings, speed: val });
    message.success(t('朗读速度已保存')).then(() => {});
  };

  const handleSpeechPitchChange = (val: number) => {
    // 只有支持pitch的引擎才保存此设置
    if (speechSettings.engine === 'google') {
      message.warning(t('Google TTS不支持音调设置'));
      return;
    }
    setSpeechSettings({ ...speechSettings, pitch: val });
    message.success(t('朗读音调已保存')).then(() => {});
  };

  const handleSpeechVolumeChange = (val: number) => {
    // 只有browser引擎支持volume
    if (speechSettings.engine !== 'browser') {
      message.warning(t('此TTS引擎不支持音量设置，仅Browser TTS支持'));
      return;
    }
    setSpeechSettings({ ...speechSettings, volume: val });
    message.success(t('朗读音量已保存')).then(() => {});
  };

  const handleDeeplApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeeplApiKeyInput(e.target.value);
  };

  const handleSaveDeeplApiKey = () => {
    setDeeplApiKey(deeplApiKeyInput.trim());
    if (deeplApiKeyInput.trim()) {
      message.success(t('DeepL API Key 已保存')).then(() => {});
    } else {
      message.success(t('DeepL API Key 已清除，将使用免费模式')).then(() => {});
    }
  };

  const handleYandexApiKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYandexApiKeyInput(e.target.value);
  };

  const handleSaveYandexApiKey = () => {
    setYandexApiKey(yandexApiKeyInput.trim());
    if (yandexApiKeyInput.trim()) {
      message.success(t('Yandex API Key 已保存')).then(() => {});
    } else {
      message.success(t('Yandex API Key 已清除，将使用免费模式')).then(() => {});
    }
  };

  const handleSiteAutoChange = async (checked: boolean) => {
    // 使用专门的hook来更新自动翻译开关
    await setSiteAutoEnabled(checked);
    message.success(checked ? t('已开启网站自动翻译') : t('已关闭网站自动翻译'));
  };
  
  const handleRemoveAlways = async (host: string) => {
    await removeAlwaysSite(host);
    await deleteCustomDictByHost(host);
    message.success(t('已移除白名单并清除词库'));
  };
  
  const handleRemoveNever = async (host: string) => {
    await removeNeverSite(host);
    message.success(t('已移除黑名单'));
  };
  
  const handleAddHost = async () => {
    const host = addHost.trim();
    if (!host) return;
    if (addType === 'always') {
      await addAlwaysSite(host);
      message.success(t('已加入白名单'));
    } else {
      await addNeverSite(host);
      message.success(t('已加入黑名单'));
    }
    setAddHost('');
  };

  const handlePageTranslateModeChange = async (value: 'translated' | 'compare') => {
    setPageTranslateMode(value);
    await setDictConfigState({ ...dictConfig, pageTranslateMode: value });
    message.success(t('整页翻译模式已保存'));
  };

  const handleEditDict = async (host: string) => {
    setDictHost(host);
    const entries = await getCustomDictEntries(host);
    setDictEntries(entries);
    setDictModalOpen(true);
  };

  const handleSaveDict = async () => {
    // 使用新的 IndexedDB API，不需要手动保存
    setDictModalOpen(false);
    message.success('词库已保存');
  };

  // 添加词条的通用函数
  const handleAddDictEntry = async () => {
    const key = dictAddKey.trim();
    const value = dictAddValue.trim();
    if (!key || !value || !dictHost) return;
    
    // 检查是否已存在
    const existingEntry = dictEntries.find(entry => entry.originalText === key);
    if (existingEntry) {
      message.warning('该原文已存在');
      return;
    }
    
    try {
      const id = await addCustomDictEntry(dictHost, key, value);
      // 重新加载词库条目
      const entries = await getCustomDictEntries(dictHost);
      setDictEntries(entries);
      setDictAddKey('');
      setDictAddValue('');
      message.success('词条已添加');
    } catch (error) {
      message.error('添加词条失败');
    }
  };

  // 只展示最新5个（倒序）
  const alwaysSitesToShow = (alwaysSites || []).slice(-5).reverse();
  const neverSitesToShow = (neverSites || []).slice(-5).reverse();

  // 批量操作的通用组件
  const BatchSiteModal: React.FC<{
    open: boolean;
    title: string;
    sites: string[];
    selected: string[];
    setSelected: (sites: string[]) => void;
    onClose: () => void;
    onBatchRemove: (hosts: string[]) => Promise<void>;
    onBatchTransfer?: (hosts: string[]) => Promise<void>;
    transferButtonText?: string;
  }> = ({
    open,
    title,
    sites,
    selected,
    setSelected,
    onClose,
    onBatchRemove,
    onBatchTransfer,
    transferButtonText
  }) => (
    <Modal
      open={open}
      title={title}
      onCancel={() => {
        onClose();
        setSelected([]);
      }}
      footer={[
        <Button key="selectAll" onClick={() => setSelected(selected.length === sites.length ? [] : sites)}>
          {selected.length === sites.length ? t('取消全选') : t('全选')}
        </Button>,
        <Button key="remove" danger disabled={selected.length === 0} onClick={async () => {
          await onBatchRemove(selected);
          setSelected([]);
          onClose();
        }}>{t('批量移除')}</Button>,
        ...(onBatchTransfer && transferButtonText ? [
          <Button key="transfer" disabled={selected.length === 0} onClick={async () => {
            await onBatchTransfer(selected);
            setSelected([]);
            onClose();
          }}>{transferButtonText}</Button>
        ] : [])
      ]}
    >
      <Checkbox.Group
        style={{ width: '100%' }}
        value={selected}
        onChange={v => setSelected(v as string[])}
      >
        <List
          dataSource={sites}
          style={{ maxHeight: 360, overflowY: 'auto', marginTop: 8, width: '100%' }}
          renderItem={host => (
            <List.Item>
              <Checkbox value={host}>{host}</Checkbox>
            </List.Item>
          )}
        />
      </Checkbox.Group>
    </Modal>
  );

  return (
    <SettingsPageContainer
      title={t('翻译设置')}
      description={t('配置翻译引擎、语音朗读和网站管理等设置')}
    >
      {/* 翻译引擎设置 */}
      <SettingsGroup title={t('翻译引擎')}>
        <SettingsItem
          label={t('翻译引擎')}
          description={t('选择用于翻译的默认引擎，支持多引擎兜底')}
        >
          <Select
            value={translateSettings.engine}
            onChange={handleEngineChange}
            style={{ width: 240 }}
            size="middle"
          >
            {TRANSLATE_ENGINES.map(e => (
              <Option key={e.value} value={e.value} disabled={e.disabled}>
                {e.icon && <img src={e.icon} alt={e.label} style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6 }} />}
                {e.label}
              </Option>
            ))}
          </Select>
        </SettingsItem>

        {/* DeepL API Key 设置 */}
        {translateSettings.engine === 'deepl' && (
          <SettingsItem
            label={t('DeepL API Key')}
            description={t('可选配置。DeepL支持免费使用，无需API Key。如需更稳定的服务，可访问 https://www.deepl.com/ 注册账号获取API Key')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input.Password
                value={deeplApiKeyInput}
                onChange={handleDeeplApiKeyInputChange}
                placeholder={t('可选：输入 DeepL API Key 以获得更稳定的服务')}
                style={{ width: 320 }}
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
          </SettingsItem>
        )}

        {/* Yandex API Key 设置 */}
        {translateSettings.engine === 'yandex' && (
          <SettingsItem
            label={t('Yandex API Key')}
            description={t('可选配置。Yandex支持免费使用，无需API Key。如需更稳定的服务，可访问 https://translate.yandex.com/developers 获取API Key')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input.Password
                value={yandexApiKeyInput}
                onChange={handleYandexApiKeyInputChange}
                placeholder={t('可选：输入 Yandex API Key 以获得更稳定的服务')}
                style={{ width: 320 }}
                size="middle"
              />
              <Button 
                type="primary" 
                onClick={handleSaveYandexApiKey}
                size="middle"
              >
                {t('保存')}
              </Button>
            </div>
          </SettingsItem>
        )}

        {/* Yandex API Key 设置 */}
        {translateSettings.engine === 'yandex' && (
          <SettingsItem
            label={t('Yandex API Key')}
            description={t('获取方式：访问 https://translate.yandex.com/developers 注册账号，创建应用并获取 API Key')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input.Password
                value={yandexApiKeyInput}
                onChange={handleYandexApiKeyInputChange}
                placeholder={t('请输入 Yandex API Key')}
                style={{ width: 320 }}
                size="middle"
              />
              <Button 
                type="primary" 
                onClick={handleSaveYandexApiKey}
                size="middle"
              >
                {t('保存')}
              </Button>
            </div>
          </SettingsItem>
        )}
      </SettingsGroup>
        
      {/* 自动翻译设置 */}
      <SettingsGroup title={t('自动翻译')}>
        <SettingsItem
          label={t('划词自动翻译')}
          description={t('开启后划词将自动翻译，无需手动点击')}
        >
          <Switch checked={translateSettings.autoTranslate} onChange={handleAutoTranslateChange} />
        </SettingsItem>
      </SettingsGroup>
        
      {/* 语音朗读设置 */}
      <SettingsGroup title={t('语音朗读')}>
        <SettingsItem
          label={t('自动朗读翻译结果')}
          description={t('翻译完成后自动朗读结果（如支持）')}
        >
          <Switch checked={translateSettings.autoRead} onChange={handleAutoReadChange} />
        </SettingsItem>

        <SettingsItem
          label={t('朗读引擎')}
          description={t('选择用于朗读的默认引擎，Google TTS 稳定可靠，浏览器 TTS 无需网络')}
        >
          <Select
            value={speechSettings.engine}
            onChange={handleSpeechEngineChange}
            style={{ width: 240 }}
            size="middle"
          >
            {TTS_ENGINES.map(e => (
              <Option key={e.name} value={e.name}>
                {e.label}
              </Option>
            ))}
          </Select>
        </SettingsItem>
        
        <SettingsItem
          label={t('朗读速度')}
        >
          <Select
            value={speechSettings.speed}
            onChange={handleSpeechSpeedChange}
            style={{ width: 120 }}
          >
            <Option value={0.5}>{t('0.5x')}</Option>
            <Option value={0.75}>{t('0.75x')}</Option>
            <Option value={1}>{t('1x')}</Option>
            <Option value={1.25}>{t('1.25x')}</Option>
            <Option value={1.5}>{t('1.5x')}</Option>
            <Option value={2}>{t('2x')}</Option>
          </Select>
        </SettingsItem>

        <SettingsItem
          label={t('朗读音调')}
          description={t('仅Browser TTS支持，Google TTS不支持此设置')}
        >
          <Select
            value={speechSettings.pitch}
            onChange={handleSpeechPitchChange}
            style={{ width: 120 }}
            disabled={speechSettings.engine === 'google'}
          >
            <Option value={0.5}>{t('低音')}</Option>
            <Option value={0.75}>{t('中低音')}</Option>
            <Option value={1}>{t('正常')}</Option>
            <Option value={1.25}>{t('中高音')}</Option>
            <Option value={1.5}>{t('高音')}</Option>
          </Select>
        </SettingsItem>

        <SettingsItem
          label={t('朗读音量')}
          description={t('仅Browser TTS支持，Google TTS不支持此设置')}
        >
          <Select
            value={speechSettings.volume}
            onChange={handleSpeechVolumeChange}
            style={{ width: 120 }}
            disabled={speechSettings.engine !== 'browser'}
          >
            <Option value={0.25}>{t('25%')}</Option>
            <Option value={0.5}>{t('50%')}</Option>
            <Option value={0.75}>{t('75%')}</Option>
            <Option value={1}>{t('100%')}</Option>
          </Select>
        </SettingsItem>
      </SettingsGroup>

      {/* 网站自动翻译设置 */}
      <SettingsGroup title={t('网站自动翻译')}>
        <SettingsItem
          label={t('网站自动翻译')}
          description={t('开启后，命中列表的网站将自动整页翻译')}
        >
          <Switch checked={siteAutoEnabled} onChange={handleSiteAutoChange} />
        </SettingsItem>

        {/* 条件渲染：只有开启网站自动翻译时才显示下面的设置 */}
        {siteAutoEnabled && (
          <>
            <SettingsItem
              label={t('整页翻译模式')}
              description={t('选择整页翻译时的显示方式：仅显示译文或原文与译文对照')}
            >
              <ConfigProvider
                theme={{
                  components: {
                    Segmented: {
                      itemSelectedBg: 'transparent',
                      itemSelectedColor: 'var(--ant-color-primary)',
                      itemHoverBg: 'var(--ant-color-primary-bg)',
                      itemHoverColor: 'var(--ant-color-primary)',
                      trackBg: 'var(--ant-color-fill-quaternary)',
                    },
                  },
                }}
              >
                <Segmented
                  value={pageTranslateMode}
                  onChange={handlePageTranslateModeChange}
                  options={[
                    { label: t('全部译文'), value: 'translated' },
                    { label: t('原文对照'), value: 'compare' }
                  ]}
                />
              </ConfigProvider>
            </SettingsItem>

            <SettingsItem
              label={t('添加网站')}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  value={addHost}
                  onChange={e => setAddHost(e.target.value)}
                  placeholder={t('输入域名，如 github.com')}
                  style={{ width: 240 }}
                />
                <Select value={addType} onChange={v => setAddType(v)} style={{ width: 100 }}>
                  <Option value="always">{t('白名单')}</Option>
                  <Option value="never">{t('黑名单')}</Option>
                </Select>
                <Button onClick={handleAddHost}>{t('添加')}</Button>
              </div>
            </SettingsItem>

            {/* 白名单区域 */}
            <SettingsItem
              label={t('网站翻译白名单')}
              description={t('加入白名单的网站会自动整页翻译')}
            >
              <div>
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
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{host}</div>
                      </Tooltip>
                    </List.Item>
                  )}
                  style={{ maxHeight: 200, overflow: 'auto' }}
                />
                {alwaysSites.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Button size="small" type="link" onClick={() => setShowAllAlways(true)}>
                      {t('查看全部')} ({alwaysSites.length})
                    </Button>
                  </div>
                )}
              </div>
            </SettingsItem>
            
            {/* 黑名单区域 */}
            <SettingsItem
              label={t('网站翻译黑名单')}
              description={t('加入黑名单的网站不会被自动整页翻译')}
            >
              <div>
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
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{host}</div>
                      </Tooltip>
                    </List.Item>
                  )}
                  style={{ maxHeight: 200, overflow: 'auto' }}
                />
                {neverSites.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Button size="small" type="link" onClick={() => setShowAllNever(true)}>
                      {t('查看全部')} ({neverSites.length})
                    </Button>
                  </div>
                )}
              </div>
            </SettingsItem>
          </>
        )}
      </SettingsGroup>

      {/* 批量操作 Modal - 使用通用组件 */}
      <BatchSiteModal
        open={showAllAlways}
        title={t('全部白名单')}
        sites={alwaysSites}
        selected={selectedAlways}
        setSelected={setSelectedAlways}
        onClose={() => setShowAllAlways(false)}
        onBatchRemove={async (hosts) => {
          for (const host of hosts) await handleRemoveAlways(host);
        }}
        onBatchTransfer={async (hosts) => {
          for (const host of hosts) await addNeverSite(host);
        }}
        transferButtonText={t('批量转移到黑名单')}
      />

      <BatchSiteModal
        open={showAllNever}
        title={t('全部黑名单')}
        sites={neverSites}
        selected={selectedNever}
        setSelected={setSelectedNever}
        onClose={() => setShowAllNever(false)}
        onBatchRemove={async (hosts) => {
          for (const host of hosts) await handleRemoveNever(host);
        }}
        onBatchTransfer={async (hosts) => {
          for (const host of hosts) await addAlwaysSite(host);
        }}
        transferButtonText={t('批量转移到白名单')}
      />

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
        {/* 词条列表 */}
        <List
          size="small"
          dataSource={dictEntries}
          locale={{ emptyText: '暂无词条' }}
          style={{ maxHeight: 320, minHeight: 40, overflowY: 'auto', marginBottom: 12 }}
          renderItem={(entry) => (
            <List.Item
              style={{ padding: '4px 0', alignItems: 'center' }}
              actions={[
                <Tooltip title="删除">
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={async () => {
                      try {
                        await deleteCustomDictEntry(entry.id!);
                        // 重新加载词库条目
                        if (dictHost) {
                          const entries = await getCustomDictEntries(dictHost);
                          setDictEntries(entries);
                        }
                        message.success('词条已删除');
                      } catch (error) {
                        message.error('删除词条失败');
                      }
                    }}
                  />
                </Tooltip>
              ]}
            >
              <Input
                value={entry.originalText}
                disabled
                style={{ width: 120, marginRight: 8 }}
              />
              <Input
                value={entry.customTranslation}
                onChange={async (e) => {
                  const newTranslation = e.target.value;
                  try {
                    // 更新词条
                    await addCustomDictEntry(entry.host, entry.originalText, newTranslation);
                    // 重新加载词库条目
                    if (dictHost) {
                      const entries = await getCustomDictEntries(dictHost);
                      setDictEntries(entries);
                    }
                  } catch (error) {
                    message.error('更新词条失败');
                  }
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
            onPressEnter={handleAddDictEntry}
          />
          <Input
            placeholder="自定义译文"
            style={{ flex: 1 }}
            value={dictAddValue}
            onChange={e => setDictAddValue(e.target.value)}
            onPressEnter={handleAddDictEntry}
          />
          <Button onClick={handleAddDictEntry}>
            添加
          </Button>
        </div>
      </Modal>
    </SettingsPageContainer>
  );
};

export default TranslateSettings;

