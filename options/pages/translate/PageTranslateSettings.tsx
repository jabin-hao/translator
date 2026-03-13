import React, { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  ConfigProvider,
  Input,
  List,
  message,
  Modal,
  Segmented,
  Switch,
  Tooltip
} from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import type { CustomDictionaryEntry } from '~lib/constants/types';
import {
  useCustomDictionaryData,
  useDomainSettingsData,
  usePageTranslateSettings
} from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type BatchSiteModalProps = {
  open: boolean;
  title: string;
  sites: string[];
  selected: string[];
  setSelected: (sites: string[]) => void;
  onClose: () => void;
  onBatchRemove: (hosts: string[]) => Promise<void>;
};

const BatchSiteModal: React.FC<BatchSiteModalProps> = ({
  open,
  title,
  sites,
  selected,
  setSelected,
  onClose,
  onBatchRemove
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={title}
      onCancel={() => {
        onClose();
        setSelected([]);
      }}
      footer={[
        <Button
          key="selectAll"
          onClick={() => setSelected(selected.length === sites.length ? [] : sites)}
        >
          {selected.length === sites.length ? t('Clear selection') : t('Select all')}
        </Button>,
        <Button
          key="remove"
          danger
          disabled={selected.length === 0}
          onClick={async () => {
            await onBatchRemove(selected);
            setSelected([]);
            onClose();
          }}
        >
          {t('Remove selected')}
        </Button>
      ]}
    >
      <Checkbox.Group
        style={{ width: '100%' }}
        value={selected}
        onChange={(values) => setSelected(values as string[])}
      >
        <List
          size="small"
          dataSource={sites}
          style={{ maxHeight: 400, overflow: 'auto' }}
          renderItem={(host) => (
            <List.Item>
              <Checkbox value={host}>{host}</Checkbox>
            </List.Item>
          )}
        />
      </Checkbox.Group>
    </Modal>
  );
};

const PageTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { pageTranslateSettings, toggleAutoTranslate, updatePageTranslateSettings } =
    usePageTranslateSettings();
  const { domainSettings, setDomainSetting, deleteDomainSetting } = useDomainSettingsData();
  const {
    addDictionaryEntry,
    updateDictionaryEntry,
    deleteDictionaryEntry,
    getDictionaryByDomain
  } = useCustomDictionaryData();

  const [hostInput, setHostInput] = useState('');
  const [showAllSitesModal, setShowAllSitesModal] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictHost, setDictHost] = useState('');
  const [dictEntries, setDictEntries] = useState<CustomDictionaryEntry[]>([]);
  const [dictOriginal, setDictOriginal] = useState('');
  const [dictTranslation, setDictTranslation] = useState('');

  const whitelist = useMemo(
    () => domainSettings.filter((setting) => setting.enabled).map((setting) => setting.domain),
    [domainSettings]
  );

  const visibleSites = whitelist.slice(0, 5);

  const refreshDictionary = async (host: string) => {
    const entries = await getDictionaryByDomain(host);
    setDictEntries(entries);
  };

  const closeDictionaryModal = () => {
    setDictModalOpen(false);
    setDictHost('');
    setDictEntries([]);
    setDictOriginal('');
    setDictTranslation('');
  };

  const handlePageTranslateModeChange = async (value: string) => {
    try {
      await updatePageTranslateSettings({ mode: value as 'translated' | 'compare' });
      message.success(t('Page translation mode updated'));
    } catch (error) {
      console.error('Failed to update page translation mode:', error);
      message.error(t('Failed to save settings'));
    }
  };

  const handleAddHost = async () => {
    const domain = hostInput.trim();
    if (!domain) {
      message.error(t('Please enter a valid domain'));
      return;
    }

    try {
      await setDomainSetting({
        domain,
        enabled: true,
        type: 'whitelist'
      });
      setHostInput('');
      message.success(t('Site added to whitelist'));
    } catch (error) {
      console.error('Failed to add domain:', error);
      message.error(t('Failed to add site'));
    }
  };

  const handleRemoveSite = async (host: string) => {
    try {
      await deleteDomainSetting(host);
      message.success(t('Site removed from whitelist'));
    } catch (error) {
      console.error('Failed to remove domain:', error);
      message.error(t('Failed to remove site'));
    }
  };

  const handleOpenDictionary = async (host: string) => {
    setDictHost(host);
    setDictModalOpen(true);

    try {
      await refreshDictionary(host);
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      setDictEntries([]);
    }
  };

  const handleAddDictionaryEntry = async () => {
    const original = dictOriginal.trim();
    const translation = dictTranslation.trim();

    if (!original || !translation) {
      message.error(t('Please enter both original text and translation'));
      return;
    }

    try {
      await addDictionaryEntry({
        domain: dictHost,
        original,
        translation,
        isActive: true
      });
      await refreshDictionary(dictHost);
      setDictOriginal('');
      setDictTranslation('');
      message.success(t('Dictionary entry added'));
    } catch (error) {
      console.error('Failed to add dictionary entry:', error);
      message.error(t('Failed to add dictionary entry'));
    }
  };

  const handleUpdateDictionaryEntry = async (
    entry: CustomDictionaryEntry,
    translation: string
  ) => {
    try {
      await updateDictionaryEntry({
        ...entry,
        translation
      });
      await refreshDictionary(dictHost);
    } catch (error) {
      console.error('Failed to update dictionary entry:', error);
      message.error(t('Failed to update dictionary entry'));
    }
  };

  const handleDeleteDictionaryEntry = async (entryId: string) => {
    try {
      await deleteDictionaryEntry(entryId);
      await refreshDictionary(dictHost);
      message.success(t('Dictionary entry removed'));
    } catch (error) {
      console.error('Failed to remove dictionary entry:', error);
      message.error(t('Failed to remove dictionary entry'));
    }
  };

  return (
    <SettingsPageContainer
      title={t('Page translation')}
      description={t('Configure automatic page translation and site-specific dictionaries')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Automatic site translation')}
          description={t('Translate matched sites automatically')}
        >
          <Switch checked={pageTranslateSettings.autoTranslate} onChange={toggleAutoTranslate} />
        </SettingsItem>

        {pageTranslateSettings.autoTranslate && (
          <>
            <SettingsItem
              label={t('Page translation mode')}
              description={t('Choose how translated pages are displayed')}
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
                      trackBg: 'var(--ant-color-fill-quaternary)'
                    }
                  }
                }}
              >
                <Segmented
                  value={pageTranslateSettings.mode}
                  onChange={handlePageTranslateModeChange}
                  options={[
                    { label: t('Translated only'), value: 'translated' },
                    { label: t('Compare with original'), value: 'compare' }
                  ]}
                />
              </ConfigProvider>
            </SettingsItem>

            <SettingsItem label={t('Add site')}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  value={hostInput}
                  onChange={(event) => setHostInput(event.target.value)}
                  placeholder={t('Enter a domain, for example github.com')}
                  style={{ width: 240 }}
                />
                <Button onClick={handleAddHost}>{t('Add to whitelist')}</Button>
              </div>
            </SettingsItem>

            <SettingsItem
              label={t('Whitelisted sites')}
              description={t('Sites in this list will translate automatically')}
            >
              <div>
                <List
                  size="small"
                  bordered
                  dataSource={visibleSites}
                  renderItem={(host) => (
                    <List.Item
                      actions={[
                        <Button key="dict" size="small" type="link" onClick={() => void handleOpenDictionary(host)}>
                          {t('Custom dictionary')}
                        </Button>,
                        <Button
                          key="remove"
                          size="small"
                          type="link"
                          danger
                          onClick={() => void handleRemoveSite(host)}
                        >
                          {t('Remove')}
                        </Button>
                      ]}
                      style={{ alignItems: 'center' }}
                    >
                      <Tooltip title={host} placement="topLeft">
                        <div
                          style={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {host}
                        </div>
                      </Tooltip>
                    </List.Item>
                  )}
                  style={{ maxHeight: 200, overflow: 'auto' }}
                />
                {whitelist.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Button size="small" type="link" onClick={() => setShowAllSitesModal(true)}>
                      {t('View all')} ({whitelist.length})
                    </Button>
                  </div>
                )}
              </div>
            </SettingsItem>
          </>
        )}
      </SettingsGroup>

      <BatchSiteModal
        open={showAllSitesModal}
        title={t('All whitelisted sites')}
        sites={whitelist}
        selected={selectedSites}
        setSelected={setSelectedSites}
        onClose={() => setShowAllSitesModal(false)}
        onBatchRemove={async (hosts) => {
          for (const host of hosts) {
            await handleRemoveSite(host);
          }
        }}
      />

      <Modal
        open={dictModalOpen}
        onCancel={closeDictionaryModal}
        onOk={closeDictionaryModal}
        title={dictHost ? `${t('Custom dictionary')} - ${dictHost}` : t('Custom dictionary')}
        width={480}
        styles={{ body: { display: 'block' } }}
        cancelText={t('Cancel')}
        okText={t('Done')}
      >
        <List
          size="small"
          dataSource={dictEntries}
          locale={{ emptyText: t('No dictionary entries yet') }}
          style={{ maxHeight: 320, minHeight: 40, overflowY: 'auto', marginBottom: 12 }}
          renderItem={(entry) => (
            <List.Item
              style={{ padding: '4px 0', alignItems: 'center' }}
              actions={[
                <Tooltip key="delete" title={t('Delete')}>
                  <Button
                    size="small"
                    type="text"
                    icon={<Icon name="delete" size={16} />}
                    danger
                    onClick={() => void handleDeleteDictionaryEntry(entry.id)}
                  />
                </Tooltip>
              ]}
            >
              <Input value={entry.original} disabled style={{ width: 120, marginRight: 8 }} />
              <Input
                value={entry.translation}
                onChange={(event) => void handleUpdateDictionaryEntry(entry, event.target.value)}
                style={{ flex: 1 }}
                placeholder={t('Custom translation')}
              />
            </List.Item>
          )}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder={t('Original text')}
            style={{ width: 120 }}
            value={dictOriginal}
            onChange={(event) => setDictOriginal(event.target.value)}
            onPressEnter={() => void handleAddDictionaryEntry()}
          />
          <Input
            placeholder={t('Custom translation')}
            style={{ flex: 1 }}
            value={dictTranslation}
            onChange={(event) => setDictTranslation(event.target.value)}
            onPressEnter={() => void handleAddDictionaryEntry()}
          />
          <Button onClick={() => void handleAddDictionaryEntry()}>{t('Add')}</Button>
        </div>
      </Modal>
    </SettingsPageContainer>
  );
};

export default PageTranslateSettings;
