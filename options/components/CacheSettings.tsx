import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Modal, Switch, InputNumber, Divider, App } from 'antd';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { Storage } from '@plasmohq/storage';
import { cacheManager } from '../../lib/cache';
import { DEFAULT_CACHE_CONFIG } from '../../lib/constants';
import { sendToBackground } from '@plasmohq/messaging';

const { Text } = Typography;

const storage = new Storage();

const CacheSettings: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp(); // 使用App组件的message实例
  const [stats, setStats] = useState<{ count: number; size: number }>({ count: 0, size: 0 });
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CACHE_CONFIG);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  // 新增本地 state 保存输入值
  const [pendingConfig, setPendingConfig] = useState(DEFAULT_CACHE_CONFIG);

  // 加载缓存统计信息
  const loadStats = async () => {
    try {
      const stats = await cacheManager.getStats();
      setStats(stats);
      message.success(t('统计已刷新'));
    } catch (error) {
      message.error(t('刷新统计失败'));
    }
  };

  // 清空缓存
  const handleClearCache = async () => {
    Modal.confirm({
      title: t('确认清空缓存'),
      content: t('这将删除所有翻译缓存，确定要继续吗？'),
      okText: t('确定'),
      cancelText: t('取消'),
      onOk: async () => {
        setLoading(true);
        try {
          await cacheManager.clear();
          await loadStats();
          message.success(t('缓存已清空'));
        } catch (error) {
          message.error(t('清空缓存失败'));
          console.error('清空缓存失败:', error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 切换缓存开关
  const handleCacheToggle = async (enabled: boolean) => {
    setCacheEnabled(enabled);
    // 保存到Plasmo Storage
    await storage.set('translation_cache_enabled', enabled);
    message.success(enabled ? t('已启用翻译缓存') : t('已禁用翻译缓存'));
  };

  useEffect(() => {
    async function loadConfig() {
      let raw = await storage.get('translation_cache_config');
      let config: any = raw;
      if (typeof raw === 'string') {
        try {
          config = JSON.parse(raw);
        } catch {
          config = DEFAULT_CACHE_CONFIG;
        }
      }
      if (!config || typeof config.maxAge !== 'number') {
        config = DEFAULT_CACHE_CONFIG;
      }
      setConfig(config);
    }
    loadConfig();
    loadStats();
    // 加载缓存开关状态，如果未设置则默认为 true
    storage.get('translation_cache_enabled').then((enabled) => {
      if (enabled === null || enabled === undefined) {
        // 如果未设置，设置默认值为 true
        storage.set('translation_cache_enabled', true);
        setCacheEnabled(true);
      } else {
        setCacheEnabled(Boolean(enabled));
      }
    });
  }, []);

  // 加载配置时同步到 pendingConfig
  useEffect(() => {
    setPendingConfig(config);
  }, [config]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t('B')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('KB')}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('MB')}`;
  };

  return (
    <Card 
      title={t('缓存管理')} 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 缓存开关 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <b>{t('是否启用缓存')}：</b>
            <Switch checked={cacheEnabled} onChange={handleCacheToggle} style={{ marginLeft: 16 }} />
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('启用缓存可以加快重复翻译的速度')}
          </div>
        </div>
        
        <Divider />

        {/* 缓存统计 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <b>{t('缓存统计')}：</b>
            <Button 
              onClick={loadStats}
              icon={<Icon icon="material-symbols:refresh" />}
              style={{ marginLeft: 16 }}
            >
              {t('刷新统计')}
            </Button>
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('显示当前缓存的条目数和占用空间大小')}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
            <div style={{ marginRight: 24, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>{stats.count}</span>
              <span style={{ fontSize: 13, color: '#666', marginLeft: 4 }}>{t('条')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>{formatSize(stats.size)}</span>
            </div>
          </div>
        </div>

        <Divider />

        {/* 缓存配置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('缓存配置')}：</b>
          <div style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>{t('缓存有效期')}</Text>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                {t('超过此时间的缓存将被自动删除')}
              </div>
              <div style={{ marginTop: 4 }}>
                <InputNumber
                  min={1}
                  max={720}
                  value={pendingConfig.maxAge / (1000 * 60 * 60)}
                  onChange={value => {
                    if (value) setPendingConfig(pc => ({ ...pc, maxAge: value * 1000 * 60 * 60 }));
                  }}
                  addonAfter={t('小时')}
                  style={{ width: 120 }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 0 }}>
              <Text strong>{t('最大缓存条目数')}</Text>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                {t('达到此数量时将删除最旧的缓存')}
              </div>
              <div style={{ marginTop: 4 }}>
                <InputNumber
                  min={100}
                  max={10000}
                  value={pendingConfig.maxSize}
                  onChange={value => {
                    if (value) setPendingConfig(pc => ({ ...pc, maxSize: value }));
                  }}
                  style={{ width: 120 }}
                />
              </div>
            </div>
            <Button type="primary" style={{ marginTop: 16 }} onClick={async () => {
              setConfig(pendingConfig);
              await cacheManager.updateConfig(pendingConfig);
              await storage.set('translation_cache_config', pendingConfig);
              await sendToBackground({ name: 'handle', body: { service: 'cache', action: 'reschedule' } });
              message.success(t('缓存配置已保存'));
            }}>{t('保存')}</Button>
          </div>
        </div>

        <Divider />

        {/* 缓存操作 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <b>{t('缓存操作')}：</b>
            <Button 
              danger 
              onClick={handleClearCache}
              loading={loading}
              icon={<Icon icon="material-symbols:delete-outline" />}
              style={{ marginLeft: 16 }}
            >
              {t('清空所有缓存')}
            </Button>
          </div>
        </div>

        <Divider />

        {/* 缓存说明 */}
        <div style={{ marginBottom: 0 }}>
          <b>{t('缓存说明')}：</b>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            <div style={{ marginBottom: 4 }}>{t('• 翻译缓存可以显著提高重复翻译的速度')}</div>
            <div style={{ marginBottom: 4 }}>{t('• 缓存会自动过期，确保翻译结果的时效性')}</div>
            <div style={{ marginBottom: 4 }}>{t('• 缓存数据仅存储在本地，不会上传到服务器')}</div>
            <div style={{ marginBottom: 0 }}>{t('• 清空缓存不会影响翻译功能，只是需要重新翻译')}</div>
          </div>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        {t('所有设置均会自动保存，无需手动操作。')}
      </div>
    </Card>
  );
};

export default CacheSettings; 