import React, { useEffect } from 'react';
import { useImmer } from 'use-immer';
import { List, Button, Input, message, Modal, Card, Tag, Space, Tooltip, Popconfirm, Select, Empty, Switch } from 'antd';
import Icon from '~lib/components/Icon';
import { useTranslation } from 'react-i18next';
import { useFavoritesSettings } from '~lib/settings/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { useTheme } from '~lib/theme/theme';

const { Search } = Input;
const { Option } = Select;

// 使用全局设置中的收藏单词接口
import type { GlobalSettings, FavoriteWord } from '~lib/constants/types';

const FavoritesSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  // 使用新的全局配置系统
  const { favoritesSettings, updateFavorites, toggleEnabled, deleteFavorite, clearFavorites } = useFavoritesSettings();
  const favorites = favoritesSettings.words;

  const [filteredFavorites, setFilteredFavorites] = useImmer<FavoriteWord[]>([]);
  const [searchText, setSearchText] = useImmer('');

  // 导入导出状态
  const [importModalVisible, setImportModalVisible] = useImmer(false);
  const [importText, setImportText] = useImmer('');

  // 过滤收藏列表
  useEffect(() => {
    let filtered = favorites;

    // 按搜索文本过滤
    if (searchText) {
      filtered = filtered.filter(item =>
        item.originalText.toLowerCase().includes(searchText.toLowerCase()) ||
        item.translatedText.toLowerCase().includes(searchText.toLowerCase())
      );
    }


    // 按时间排序（最新的在前）
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    setFilteredFavorites(filtered);
  }, [favorites, searchText]);

  // 删除收藏
  const handleDelete = async (id: string) => {
    try {
      const success = await deleteFavorite(id);
      if (success) {
        message.success(t('已删除收藏'));
      } else {
        message.error(t('删除失败'));
      }
    } catch (error) {
      console.error('删除收藏失败:', error);
      message.error(t('删除失败'));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      const success = await clearFavorites();
      if (success) {
        message.success(t('已清空所有收藏'));
      } else {
        message.error(t('清空失败'));
      }
    } catch (error) {
      console.error('清空收藏失败:', error);
      message.error(t('清空失败'));
    }
  };

  // 导出收藏
  const handleExport = () => {
    const data = JSON.stringify(favorites, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favorites_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(t('导出成功'));
  };

  // 导入收藏
  const handleImport = async () => {
    try {
      const importedData = JSON.parse(importText);
      if (Array.isArray(importedData)) {
        // 支持新旧格式，将旧格式转换为新格式
        const validData = importedData
          .filter(item => {
            const originalText = item.originalText || item.word;
            const translatedText = item.translatedText || item.translation;
            return originalText && translatedText;
          })
          .map(item => ({
            id: item.id || `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            originalText: item.originalText || item.word,
            translatedText: item.translatedText || item.translation,
            timestamp: item.timestamp || Date.now()
          }));

        const newFavorites = [...favorites, ...validData];
        await updateFavorites({ words: newFavorites });
        setImportModalVisible(false);
        setImportText('');
        message.success(t(`成功导入 ${validData.length} 个收藏`));
      } else {
        message.error(t('导入格式错误'));
      }
    } catch (error) {
      message.error(t('导入失败，请检查数据格式'));
    }
  };

  // 语言选择功能已移除，因为简化了数据结构

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <SettingsPageContainer title={t('收藏管理')}>
      {/* 收藏夹总开关 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('启用收藏夹')}
          description={t('开启后，可以收藏翻译的单词和短语')}
        >
          <Switch
            checked={favoritesSettings.enabled}
            onChange={toggleEnabled}
          />
        </SettingsItem>
      </SettingsGroup>

      {/* 收藏夹详细设置 - 条件渲染 */}
      {favoritesSettings.enabled && (
        <>
          <SettingsGroup title={t('我的收藏')}>
            {/* 搜索和过滤 */}
            <SettingsItem label={t('搜索和筛选')}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Search
                    placeholder={t('搜索原文或译文')}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                  />
                </Space>

                <Space>
                  <Button
                    icon={<Icon name="export" size={16} />}
                    onClick={handleExport}
                    disabled={favorites.length === 0}
                  >
                    {t('导出收藏')}
                  </Button>
                  <Button
                    icon={<Icon name="import" size={16} />}
                    onClick={() => setImportModalVisible(true)}
                  >
                    {t('导入收藏')}
                  </Button>
                  <Popconfirm
                    title={t('确定要清空所有收藏吗？')}
                    onConfirm={handleBatchDelete}
                    okText={t('确定')}
                    cancelText={t('取消')}
                  >
                    <Button danger disabled={favorites.length === 0}>
                      {t('清空收藏')}
                    </Button>
                  </Popconfirm>
                </Space>
              </Space>
            </SettingsItem>

            {/* 收藏列表 */}
            <SettingsItem
              label={t('收藏列表')}
              description={t(`共 ${favorites.length} 个收藏，显示 ${filteredFavorites.length} 个`)}
            >
              {filteredFavorites.length === 0 ? (
                <Empty
                  description={favorites.length === 0 ? t('暂无收藏') : t('没有匹配的结果')}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <List
                  grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
                  dataSource={filteredFavorites}
                  renderItem={item => (
                    <List.Item>
                      <Card
                        size="small"
                        hoverable
                        actions={[
                          <Tooltip title={t('删除')}>
                            <Popconfirm
                              title={t('确定要删除这个收藏吗？')}
                              onConfirm={() => handleDelete(item.id)}
                              okText={t('确定')}
                              cancelText={t('取消')}
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
                          <div style={{
                            color: isDark ? '#a6a6a6' : '#666666',
                            fontSize: 14,
                            marginBottom: 8
                          }}>
                            {item.translatedText}
                          </div>
                        </div>


                        <div style={{
                          fontSize: 12,
                          color: isDark ? '#737373' : '#bfbfbf'
                        }}>
                          {formatTimestamp(item.timestamp)}
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              )}
            </SettingsItem>



            {/* 导入模态框 */}
            <Modal
              title={t('导入收藏')}
              open={importModalVisible}
              onOk={handleImport}
              onCancel={() => setImportModalVisible(false)}
              okText={t('导入')}
              cancelText={t('取消')}
              width={600}
            >
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  {t('请粘贴从其他地方导出的收藏数据（JSON 格式）：')}
                </div>
                <Input.TextArea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={t('粘贴 JSON 数据...')}
                  rows={10}
                />
              </div>
            </Modal>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default FavoritesSettings;
