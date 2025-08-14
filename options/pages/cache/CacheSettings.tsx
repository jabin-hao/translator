import React, { useState, useEffect } from 'react';
import { Button, Modal, Switch, InputNumber, App } from 'antd';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { produce } from 'immer';
import { useCacheSettings } from '~lib/settings/settingsHooks';
import { cacheManager } from '~lib/cache/cache';
import { sendToBackground } from '@plasmohq/messaging';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const CacheSettings: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  
  // 使用新的全局配置系统
  const { cacheSettings, updateCache, toggleEnabled } = useCacheSettings();
  
  const [stats, setStats] = useState<{ count: number; size: number }>({ count: 0, size: 0 });
  const [loading, setLoading] = useState(false);
  // 新增本地 state 保存输入值
  const [pendingConfig, setPendingConfig] = useState({
    maxAge: cacheSettings.maxAge,
    maxSize: cacheSettings.maxSize,
  });

  // 加载缓存统计信息
  const loadStats = async () => {
    try {
      const stats = await cacheManager.getStats();
      // 验证统计数据的有效性
      const validStats = {
        count: isNaN(stats.count) ? 0 : stats.count,
        size: isNaN(stats.size) ? 0 : stats.size
      };
      
      setStats(produce(() => validStats));
      message.success(t('统计已刷新'));
    } catch (error) {
      console.error('加载缓存统计失败:', error);
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
    await toggleEnabled();
    message.success(enabled ? t('已启用翻译缓存') : t('已禁用翻译缓存'));
  };

  useEffect(() => {
    // 只需要加载统计信息，配置由全局设置自动处理
    loadStats().then();
  }, []);

  // 加载配置时同步到 pendingConfig
  useEffect(() => {
    setPendingConfig({
      maxAge: cacheSettings.maxAge,
      maxSize: cacheSettings.maxSize,
    });
  }, [cacheSettings.maxAge, cacheSettings.maxSize]);

  const formatSize = (bytes: number) => {
    // 防护 NaN 值
    if (isNaN(bytes) || bytes < 0) {
      console.warn('formatSize received invalid value:', bytes);
      return '0 B';
    }
    if (bytes < 1024) return `${bytes} ${t('B')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('KB')}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('MB')}`;
  };

  return (
    <SettingsPageContainer
      title={t('缓存设置')}
      description={t('管理翻译缓存以提高翻译速度')}
    >
      {/* 缓存总开关 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('启用缓存')}
          description={t('启用缓存可以加快重复翻译的速度')}
        >
          <Switch checked={cacheSettings.enabled} onChange={handleCacheToggle} />
        </SettingsItem>
      </SettingsGroup>

      {/* 缓存详细设置 - 条件渲染 */}
      {cacheSettings.enabled && (
        <>
          <SettingsGroup title={t('缓存统计')}>
            <SettingsItem
              label={t('当前缓存')}
              description={t('显示当前缓存的条目数和占用空间大小')}
            >
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Button 
                    onClick={loadStats}
                    icon={<Icon icon="material-symbols:refresh" />}
                  >
                    {t('刷新统计')}
                  </Button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>{stats.count}</span>
                    <span style={{ fontSize: 13, color: '#666', marginLeft: 4 }}>{t('条')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>{formatSize(stats.size)}</span>
                  </div>
                </div>
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('缓存配置')}>
            <SettingsItem
              label={t('缓存有效期')}
              description={t('超过此时间的缓存将被自动删除')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const MS_PER_HOUR = 1000 * 60 * 60;
                  const MS_PER_DAY = MS_PER_HOUR * 24;
                  const MS_PER_MONTH = MS_PER_DAY * 30;
              const months = Math.floor(pendingConfig.maxAge / MS_PER_MONTH);
              const days = Math.floor((pendingConfig.maxAge % MS_PER_MONTH) / MS_PER_DAY);
              const hours = Math.floor((pendingConfig.maxAge % MS_PER_DAY) / MS_PER_HOUR);
              return (
                <>
                  <InputNumber
                    min={0}
                    max={24}
                    value={months}
                    onChange={value => {
                      if (value !== null) {
                        const newMaxAge = value * MS_PER_MONTH + days * MS_PER_DAY + hours * MS_PER_HOUR;
                        setPendingConfig(produce(draft => ({ ...draft, maxAge: newMaxAge })));
                      }
                    }}
                    addonAfter={t('月')}
                    style={{ width: 120 }}
                  />
                  <InputNumber
                    min={0}
                    max={30}
                    value={days}
                    onChange={value => {
                      if (value !== null) {
                        const newMaxAge = months * MS_PER_MONTH + value * MS_PER_DAY + hours * MS_PER_HOUR;
                        setPendingConfig(produce(draft => ({ ...draft, maxAge: newMaxAge })));
                      }
                    }}
                    addonAfter={t('天')}
                    style={{ width: 120 }}
                  />
                  <InputNumber
                    min={0}
                    max={24}
                    value={hours}
                    onChange={value => {
                      if (value !== null) {
                        const newMaxAge = months * MS_PER_MONTH + days * MS_PER_DAY + value * MS_PER_HOUR;
                        setPendingConfig(produce(draft => ({ ...draft, maxAge: newMaxAge })));
                      }
                    }}
                    addonAfter={t('小时')}
                    style={{ width: 120 }}
                  />
                </>
              );
            })()}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {(() => {
              const months = Math.floor(pendingConfig.maxAge / (1000 * 60 * 60 * 24 * 30));
              const days = Math.floor((pendingConfig.maxAge % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
              const hours = Math.floor((pendingConfig.maxAge % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const parts = [];
              if (months > 0) parts.push(`${months}${t('月')}`);
              if (days > 0) parts.push(`${days}${t('天')}`);
              if (hours > 0) parts.push(`${hours}${t('小时')}`);
              return parts.length > 0 ? `${t('总计')}: ${parts.join(' ')}` : `${t('总计')}: 0${t('小时')}`;
            })()}
          </div>
        </SettingsItem>

        <SettingsItem
          label={t('最大缓存条数')}
          description={t('达到此数量时将删除最旧的缓存')}
        >
          <InputNumber
            min={100}
            max={10000}
            value={pendingConfig.maxSize}
            onChange={value => {
              if (value) setPendingConfig(produce(draft => ({ ...draft, maxSize: value })));
            }}
            style={{ width: 120 }}
          />
        </SettingsItem>

        <SettingsItem
          label={t('保存配置')}
        >
          <Button 
            onClick={async () => {
              await updateCache(pendingConfig);
              await cacheManager.updateConfig(pendingConfig);
              await sendToBackground({ name: 'handle' as never, body: { service: 'cache', action: 'reschedule' } });
              message.success(t('缓存配置已保存'));
            }}
          >
            {t('保存')}
          </Button>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('缓存操作')}>
        <SettingsItem
          label={t('清空缓存')}
          description={t('删除所有翻译缓存数据')}
        >
          <Button 
            danger 
            onClick={handleClearCache}
            loading={loading}
            icon={<Icon icon="material-symbols:delete-outline" />}
          >
            {t('清空所有缓存')}
          </Button>
        </SettingsItem>
      </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default CacheSettings;

