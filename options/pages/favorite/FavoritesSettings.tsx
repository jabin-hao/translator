import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tooltip,
  message
} from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import type { FavoriteWord } from '~lib/constants/types';
import { useFavoritesData, useFavoritesSettings } from '~lib/settings/settings';
import { useTheme } from '~lib/theme/theme';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

const { Search } = Input;

const FavoritesSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { favoritesSettings, toggleEnabled } = useFavoritesSettings();
  const { favorites, deleteFavorite, clearFavorites, replaceFavorites } = useFavoritesData();

  const [searchText, setSearchText] = useState('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');

  const filteredFavorites = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return [...favorites]
      .filter((item) => {
        if (!keyword) {
          return true;
        }

        return (
          item.originalText.toLowerCase().includes(keyword) ||
          item.translatedText.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [favorites, searchText]);

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteFavorite(id);
      message[success ? 'success' : 'error'](
        success ? t('Favorite removed') : t('Failed to remove favorite')
      );
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      message.error(t('Failed to remove favorite'));
    }
  };

  const handleBatchDelete = async () => {
    try {
      const success = await clearFavorites();
      message[success ? 'success' : 'error'](
        success ? t('All favorites cleared') : t('Failed to clear favorites')
      );
    } catch (error) {
      console.error('Failed to clear favorites:', error);
      message.error(t('Failed to clear favorites'));
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(favorites, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `favorites_${new Date().toISOString().split('T')[0]}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success(t('Favorites exported'));
  };

  const handleImport = async () => {
    try {
      const importedData = JSON.parse(importText);

      if (!Array.isArray(importedData)) {
        message.error(t('Invalid import format'));
        return;
      }

      const validData: FavoriteWord[] = importedData
        .filter((item) => {
          const originalText = item.originalText || item.word;
          const translatedText = item.translatedText || item.translation;
          return originalText && translatedText;
        })
        .map((item) => ({
          id: item.id || `fav_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          originalText: item.originalText || item.word,
          translatedText: item.translatedText || item.translation,
          timestamp: item.timestamp || Date.now()
        }));

      await replaceFavorites([...favorites, ...validData]);
      setImportModalVisible(false);
      setImportText('');
      message.success(t('Imported {{count}} favorites', { count: validData.length }));
    } catch (error) {
      console.error('Failed to import favorites:', error);
      message.error(t('Failed to import favorites'));
    }
  };

  const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleString();

  return (
    <SettingsPageContainer title={t('Favorites')}>
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable favorites')}
          description={t('Allow saving words and phrases from translation results')}
        >
          <Switch checked={favoritesSettings.enabled} onChange={toggleEnabled} />
        </SettingsItem>
      </SettingsGroup>

      {favoritesSettings.enabled && (
        <SettingsGroup title={t('My favorites')}>
          <SettingsItem label={t('Search and manage')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Search
                placeholder={t('Search original or translated text')}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                style={{ width: 300 }}
                allowClear
              />

              <Space>
                <Button
                  icon={<Icon name="export" size={16} />}
                  onClick={handleExport}
                  disabled={favorites.length === 0}
                >
                  {t('Export favorites')}
                </Button>
                <Button
                  icon={<Icon name="import" size={16} />}
                  onClick={() => setImportModalVisible(true)}
                >
                  {t('Import favorites')}
                </Button>
                <Popconfirm
                  title={t('Clear all favorites?')}
                  onConfirm={handleBatchDelete}
                  okText={t('Confirm')}
                  cancelText={t('Cancel')}
                >
                  <Button danger disabled={favorites.length === 0}>
                    {t('Clear favorites')}
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
          </SettingsItem>

          <SettingsItem
            label={t('Favorite list')}
            description={t('Total {{total}}, showing {{shown}}', {
              total: favorites.length,
              shown: filteredFavorites.length
            })}
          >
            {filteredFavorites.length === 0 ? (
              <Empty
                description={
                  favorites.length === 0 ? t('No favorites yet') : t('No matching favorites')
                }
                style={{ margin: '40px 0' }}
              />
            ) : (
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
                dataSource={filteredFavorites}
                renderItem={(item) => (
                  <List.Item>
                    <Card
                      size="small"
                      hoverable
                      actions={[
                        <Tooltip key="delete" title={t('Delete')}>
                          <Popconfirm
                            title={t('Delete this favorite?')}
                            onConfirm={() => handleDelete(item.id)}
                            okText={t('Confirm')}
                            cancelText={t('Cancel')}
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<Icon name="delete" size={16} />}
                              style={{ color: '#ff4d4f' }}
                            />
                          </Popconfirm>
                        </Tooltip>
                      ]}
                      style={{
                        background: isDark ? '#1f1f1f' : '#ffffff',
                        border: `1px solid ${isDark ? '#424242' : '#e8e8e8'}`
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                          {item.originalText}
                        </div>
                        <div
                          style={{
                            color: isDark ? '#a6a6a6' : '#666666',
                            fontSize: 14,
                            marginBottom: 8
                          }}
                        >
                          {item.translatedText}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: isDark ? '#737373' : '#bfbfbf'
                        }}
                      >
                        {formatTimestamp(item.timestamp)}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </SettingsItem>

          <Modal
            title={t('Import favorites')}
            open={importModalVisible}
            onOk={handleImport}
            onCancel={() => setImportModalVisible(false)}
            okText={t('Import')}
            cancelText={t('Cancel')}
            width={600}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                {t('Paste exported favorites JSON here:')}
              </div>
              <Input.TextArea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={t('Paste JSON data...')}
                rows={10}
              />
            </div>
          </Modal>
        </SettingsGroup>
      )}
    </SettingsPageContainer>
  );
};

export default FavoritesSettings;
