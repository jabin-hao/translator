import React from 'react';
import { useImmer } from 'use-immer';
import { Switch, List, Modal, Button, Input, message, Checkbox, Tooltip, Segmented, ConfigProvider, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  usePageTranslateSettings,
} from '~lib/settings/settings';
import type { CustomDictionaryEntry } from '~lib/constants/types';
import Icon from '~lib/components/Icon';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const PageTranslateSettings: React.FC = () => {
  const { t } = useTranslation();

  // 使用新的全局配置系统（包含基础设置、自定义词库、域名设置）
  const {
    pageTranslateSettings,
    toggleAutoTranslate,
    updatePageTranslateSettings,
    // 域名设置
    domainSettings,
    setDomainSetting,
    deleteDomainSetting,
    // 自定义词库
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    getDictionaryByDomain
  } = usePageTranslateSettings();

  // 添加站点相关状态
  const [addHost, setAddHost] = useImmer('');

  // 显示全部站点的Modal状态
  const [showAllAlways, setShowAllAlways] = useImmer(false);
  const [selectedAlways, setSelectedAlways] = useImmer<string[]>([]);

  // 自定义词库相关状态
  const [dictModalOpen, setDictModalOpen] = useImmer(false);
  const [dictHost, setDictHost] = useImmer<string>('');
  const [dictEntries, setDictEntries] = useImmer<CustomDictionaryEntry[]>([]);
  const [dictAddKey, setDictAddKey] = useImmer('');
  const [dictAddValue, setDictAddValue] = useImmer('');

  // 只保留白名单操作函数
  const alwaysList = domainSettings.filter(setting => setting.enabled);
  const addToAlwaysList = async (domain: string) => {
    await setDomainSetting({
      domain,
      enabled: true,
      type: 'whitelist',
    });
  };
  const removeFromAlwaysList = async (domain: string) => {
    await deleteDomainSetting(domain);
  };

  // 不再需要加载站点列表的useEffect，因为数据来自全局配置
  const handleSiteAutoChange = () => {
    toggleAutoTranslate();
  };

  const handlePageTranslateModeChange = async (value: string) => {
    try {
      await updatePageTranslateSettings({ mode: value as 'translated' | 'compare' });
      message.success(t('翻译模式已更新'));
    } catch (error) {
      message.error(t('保存失败'));
    }
  };

  const handleAddHost = async () => {
    if (!addHost.trim()) {
      message.error(t('请输入有效的域名'));
      return;
    }

    try {
      await addToAlwaysList(addHost.trim());
      message.success(t('已添加到白名单'));
      setAddHost('');
    } catch (error) {
      message.error(t('添加失败'));
    }
  };

  const handleRemoveAlways = async (host: string) => {
    try {
      await removeFromAlwaysList(host);
      message.success(t('已从白名单移除'));
    } catch (error) {
      message.error(t('移除失败'));
    }
  };


  const handleEditDict = async (host: string) => {
    setDictHost(host);
    setDictModalOpen(true);
    try {
      const entries = await getDictionaryByDomain(host);
      setDictEntries(entries);
    } catch (error) {
      console.error('Failed to load dict entries:', error);
      setDictEntries([]);
    }
  };

  const handleAddDictEntry = async () => {
    if (!dictAddKey.trim() || !dictAddValue.trim()) {
      message.error(t('请输入原文和译文'));
      return;
    }

    try {
      await addDictionaryEntry({
        domain: dictHost,
        original: dictAddKey.trim(),
        translation: dictAddValue.trim(),
        isActive: true
      });
      const entries = await getDictionaryByDomain(dictHost);
      setDictEntries(entries);
      setDictAddKey('');
      setDictAddValue('');
      message.success(t('词条已添加'));
    } catch (error) {
      message.error(t('添加词条失败'));
    }
  };

  const handleSaveDict = () => {
    setDictModalOpen(false);
    setDictHost('');
    setDictEntries([]);
    setDictAddKey('');
    setDictAddValue('');
  };

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
          onChange={setSelected}
        >
          <List
            size="small"
            dataSource={sites}
            style={{ maxHeight: 400, overflow: 'auto' }}
            renderItem={host => (
              <List.Item>
                <Checkbox value={host}>{host}</Checkbox>
              </List.Item>
            )}
          />
        </Checkbox.Group>
      </Modal>
    );

  // 显示部分站点列表
  const alwaysSitesToShow = alwaysList.map(setting => setting.domain).slice(0, 5);
  // 已移除黑名单相关逻辑

  return (
    <SettingsPageContainer title={t('网页翻译')} description={t('配置网页翻译的相关设置')}>
      {/* 网站自动翻译设置 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('网站自动翻译')}
          description={t('开启后，命中列表的网站将自动整页翻译')}
        >
          <Switch checked={pageTranslateSettings.autoTranslate} onChange={handleSiteAutoChange} />
        </SettingsItem>

        {/* 条件渲染：只有开启网站自动翻译时才显示下面的设置 */}
        {pageTranslateSettings.autoTranslate && (
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
                      itemColor: 'var(--ant-color-text)',
                      itemHoverBg: 'var(--ant-color-primary-bg)',
                      itemHoverColor: 'var(--ant-color-primary)',
                      trackBg: 'var(--ant-color-fill-quaternary)',
                    },
                  },
                }}
              >
                <Segmented
                  value={pageTranslateSettings.mode}
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
                <Button onClick={handleAddHost}>{t('添加到白名单')}</Button>
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
                  renderItem={(host: string) => (
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
                {alwaysList.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Button size="small" type="link" onClick={() => setShowAllAlways(true)}>
                      {t('查看全部')} ({alwaysList.length})
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
        sites={alwaysList.map(setting => setting.domain)}
        selected={selectedAlways}
        setSelected={setSelectedAlways}
        onClose={() => setShowAllAlways(false)}
        onBatchRemove={async (hosts) => {
          for (const host of hosts) await handleRemoveAlways(host);
        }}
      />

      {/* 已移除黑名单批量操作 Modal */}

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
                    icon={<Icon name="delete" size={16} />}
                    danger
                    onClick={async () => {
                      try {
                        await deleteDictionaryEntry(entry.id);
                        // 重新加载词库条目
                        if (dictHost) {
                          const entries = await getDictionaryByDomain(dictHost);
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
                value={entry.original}
                disabled
                style={{ width: 120, marginRight: 8 }}
              />
              <Input
                value={entry.translation}
                onChange={async (e) => {
                  const newTranslation = e.target.value;
                  try {
                    // 更新词条
                    await updateDictionaryEntry({
                      ...entry,
                      translation: newTranslation
                    });
                    // 重新加载词库条目
                    if (dictHost) {
                      const entries = await getDictionaryByDomain(dictHost);
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

export default PageTranslateSettings;
