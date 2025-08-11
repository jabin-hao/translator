import React, { useState, useEffect } from 'react';
import { List, Button, Input, message, Modal, Card, Tag, Space, Tooltip, Popconfirm, Select, Empty, Switch } from 'antd';
import { DeleteOutlined, EditOutlined, SearchOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useFavoritesSettings } from '~lib/utils/globalSettingsHooks';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';
import { useTheme } from '~lib/utils/theme';

const { Search } = Input;
const { Option } = Select;

// 使用全局设置中的收藏单词接口
import type { GlobalSettings } from '~lib/settings/globalSettings';
type FavoriteWord = GlobalSettings['favorites']['words'][0];

const FavoritesSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  // 使用新的全局配置系统
  const { favoritesSettings, updateFavorites, toggleEnabled } = useFavoritesSettings();
  const favorites = favoritesSettings.words;
  
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteWord[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  
  // 编辑模态框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWord, setEditingWord] = useState<FavoriteWord | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  // 导入导出状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');

  // 过滤收藏列表
  useEffect(() => {
    let filtered = favorites;
    
    // 按搜索文本过滤
    if (searchText) {
      filtered = filtered.filter(item => 
        item.word.toLowerCase().includes(searchText.toLowerCase()) ||
        item.translation.toLowerCase().includes(searchText.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // 按语言过滤
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(item => 
        item.sourceLanguage === selectedLanguage || item.targetLanguage === selectedLanguage
      );
    }
    
    // 按时间排序（最新的在前）
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    setFilteredFavorites(filtered);
  }, [favorites, searchText, selectedLanguage]);

  // 删除收藏
  const handleDelete = async (id: string) => {
    const newFavorites = favorites.filter(item => item.id !== id);
    await updateFavorites({ words: newFavorites });
    message.success(t('已删除收藏'));
  };

  // 批量删除
  const handleBatchDelete = async () => {
    await updateFavorites({ words: [] });
    message.success(t('已清空所有收藏'));
  };

  // 编辑收藏
  const handleEdit = (word: FavoriteWord) => {
    setEditingWord(word);
    setEditNote(word.notes || '');
    setEditTags(word.tags || []);
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingWord) return;
    
    const newFavorites = favorites.map(item => 
      item.id === editingWord.id 
        ? { ...item, notes: editNote, tags: editTags }
        : item
    );
    await updateFavorites({ words: newFavorites });
    setEditModalVisible(false);
    setEditingWord(null);
    message.success(t('已保存修改'));
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
        const validData = importedData.filter(item => 
          item.id && item.word && item.translation
        );
        await updateFavorites({ words: [...favorites, ...validData] });
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

  // 获取语言列表
  const languageOptions = Array.from(
    new Set([
      ...favorites.map(item => item.sourceLanguage),
      ...favorites.map(item => item.targetLanguage)
    ])
  ).filter(Boolean);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <SettingsPageContainer title={t('收藏管理')}>
      {/* 收藏夹总开关 */}
      <SettingsGroup title={t('收藏夹功能')} first>
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
                    placeholder={t('搜索原文、译文或备注')}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                  />
                  <Select
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                    style={{ width: 120 }}
                  >
                    <Option value="all">{t('所有语言')}</Option>
                    {languageOptions.map(lang => (
                      <Option key={lang} value={lang}>{lang}</Option>
                    ))}
                  </Select>
                </Space>
                
                <Space>
                  <Button
                    icon={<ExportOutlined />}
                    onClick={handleExport}
                    disabled={favorites.length === 0}
                  >
                    {t('导出收藏')}
                  </Button>
              <Button
                icon={<ImportOutlined />}
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
                      <Tooltip title={t('编辑')}>
                        <EditOutlined onClick={() => handleEdit(item)} />
                      </Tooltip>,
                      <Tooltip title={t('删除')}>
                        <Popconfirm
                          title={t('确定要删除这个收藏吗？')}
                          onConfirm={() => handleDelete(item.id)}
                          okText={t('确定')}
                          cancelText={t('取消')}
                        >
                          <DeleteOutlined />
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
                        {item.word}
                      </div>
                      <div style={{ 
                        color: isDark ? '#a6a6a6' : '#666666',
                        fontSize: 14,
                        marginBottom: 8
                      }}>
                        {item.translation}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="blue">
                        {item.sourceLanguage} → {item.targetLanguage}
                      </Tag>
                    </div>
                    
                    {item.tags && item.tags.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {item.tags.map(tag => (
                          <Tag key={tag} color="orange">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                    
                    {item.notes && (
                      <div style={{ 
                        fontSize: 12, 
                        color: isDark ? '#a6a6a6' : '#999999',
                        marginBottom: 8
                      }}>
                        {item.notes}
                      </div>
                    )}
                    
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

      {/* 编辑模态框 */}
      <Modal
        title={t('编辑收藏')}
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        okText={t('保存')}
        cancelText={t('取消')}
      >
        {editingWord && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {editingWord.word}
              </div>
              <div style={{ color: isDark ? '#a6a6a6' : '#666666' }}>
                {editingWord.translation}
              </div>
            </div>
            
            <div>
              <div style={{ marginBottom: 8 }}>备注：</div>
              <Input.TextArea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder={t('添加备注...')}
                rows={3}
              />
            </div>
            
            <div>
              <div style={{ marginBottom: 8 }}>标签：</div>
              <Select
                mode="tags"
                value={editTags}
                onChange={setEditTags}
                placeholder={t('添加标签...')}
                style={{ width: '100%' }}
              />
            </div>
          </Space>
        )}
      </Modal>

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
