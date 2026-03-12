import React, { useEffect, useState } from 'react';
import { App, Button, InputNumber, Modal, Switch } from 'antd';
import { sendToBackground } from '@plasmohq/messaging';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import { cacheManager } from '~lib/cache/cache';
import { useCacheSettings, useTranslationCacheData } from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type CacheStatsState = {
  count: number;
  size: number;
  hitRate: number;
  totalRequests: number;
  hitCount: number;
};

const defaultStats: CacheStatsState = {
  count: 0,
  size: 0,
  hitRate: 0,
  totalRequests: 0,
  hitCount: 0
};

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const MS_PER_MONTH = MS_PER_DAY * 30;

const normalizeNumber = (value: number) => (Number.isFinite(value) && value >= 0 ? value : 0);

const CacheSettings: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { cacheSettings, updateCache, toggleEnabled } = useCacheSettings();
  const { getCacheStats, clearCache } = useTranslationCacheData();

  const [stats, setStats] = useState<CacheStatsState>(defaultStats);
  const [loading, setLoading] = useState(false);
  const [pendingConfig, setPendingConfig] = useState({
    maxAge: cacheSettings.maxAge,
    maxSize: cacheSettings.maxSize
  });

  const syncPendingConfig = () => {
    setPendingConfig({
      maxAge: cacheSettings.maxAge,
      maxSize: cacheSettings.maxSize
    });
  };

  const loadStats = async () => {
    try {
      const cacheStats = await getCacheStats();
      setStats({
        count: normalizeNumber(cacheStats.count),
        size: normalizeNumber(cacheStats.size),
        hitRate: normalizeNumber(cacheStats.hitRate),
        totalRequests: normalizeNumber(cacheStats.totalRequests),
        hitCount: normalizeNumber(cacheStats.hitCount)
      });
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      message.error(t('Failed to refresh statistics'));
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    syncPendingConfig();
  }, [cacheSettings.maxAge, cacheSettings.maxSize]);

  const handleClearCache = async () => {
    Modal.confirm({
      title: t('Confirm clearing cache'),
      content: t('This will remove all translation cache entries. Continue?'),
      okText: t('Confirm'),
      cancelText: t('Cancel'),
      onOk: async () => {
        setLoading(true);
        try {
          await clearCache();
          await loadStats();
          message.success(t('Cache cleared'));
        } catch (error) {
          console.error('Failed to clear cache:', error);
          message.error(t('Failed to clear cache'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCacheToggle = async (enabled: boolean) => {
    await toggleEnabled();
    message.success(enabled ? t('Cache enabled') : t('Cache disabled'));
  };

  const updatePendingMaxAge = (
    unit: 'months' | 'days' | 'hours',
    value: number | null,
    currentMaxAge: number
  ) => {
    if (value === null) {
      return;
    }

    const months = Math.floor(currentMaxAge / MS_PER_MONTH);
    const days = Math.floor((currentMaxAge % MS_PER_MONTH) / MS_PER_DAY);
    const hours = Math.floor((currentMaxAge % MS_PER_DAY) / MS_PER_HOUR);

    const nextMonths = unit === 'months' ? value : months;
    const nextDays = unit === 'days' ? value : days;
    const nextHours = unit === 'hours' ? value : hours;

    setPendingConfig((current) => ({
      ...current,
      maxAge: nextMonths * MS_PER_MONTH + nextDays * MS_PER_DAY + nextHours * MS_PER_HOUR
    }));
  };

  const formatSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return '0 B';
    }
    if (bytes < 1024) return `${bytes} ${t('B')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('KB')}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('MB')}`;
  };

  const months = Math.floor(pendingConfig.maxAge / MS_PER_MONTH);
  const days = Math.floor((pendingConfig.maxAge % MS_PER_MONTH) / MS_PER_DAY);
  const hours = Math.floor((pendingConfig.maxAge % MS_PER_DAY) / MS_PER_HOUR);
  const totalAgeParts = [
    months > 0 ? `${months}${t('Month')}` : '',
    days > 0 ? `${days}${t('Day')}` : '',
    hours > 0 ? `${hours}${t('Hour')}` : ''
  ].filter(Boolean);

  const handleSaveConfig = async () => {
    await updateCache(pendingConfig);
    await cacheManager.updateConfig(pendingConfig);
    await sendToBackground({
      name: 'handle' as never,
      body: { service: 'cache', action: 'reschedule' }
    });
    message.success(t('Cache settings saved'));
  };

  return (
    <SettingsPageContainer
      title={t('Cache settings')}
      description={t('Manage translation cache to improve repeated translation speed')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable cache')}
          description={t('Enable cache to speed up repeated translations')}
        >
          <Switch checked={cacheSettings.enabled} onChange={handleCacheToggle} />
        </SettingsItem>
      </SettingsGroup>

      {cacheSettings.enabled && (
        <>
          <SettingsGroup title={t('Cache statistics')}>
            <SettingsItem
              label={t('Current cache')}
              description={t('Show current cache entries and estimated storage size')}
            >
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>{stats.count}</span>
                    <span style={{ fontSize: 13, color: '#666', marginLeft: 4 }}>{t('Entries')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>{formatSize(stats.size)}</span>
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>{t('(Estimated)')}</span>
                  </div>
                  {stats.totalRequests > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 'bold', color: '#faad14' }}>
                        {stats.hitRate.toFixed(1)}%
                      </span>
                      <span style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>{t('Hit rate')}</span>
                    </div>
                  )}
                </div>
                {stats.totalRequests > 0 && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {t('Total requests: {{total}}, hits: {{hit}}', {
                      total: stats.totalRequests,
                      hit: stats.hitCount
                    })}
                  </div>
                )}
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Cache configuration')}>
            <SettingsItem
              label={t('Cache max age')}
              description={t('Entries older than this duration will be removed automatically')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InputNumber
                  min={0}
                  max={24}
                  value={months}
                  onChange={(value) => updatePendingMaxAge('months', value, pendingConfig.maxAge)}
                  addonAfter={t('Month')}
                  style={{ width: 120 }}
                />
                <InputNumber
                  min={0}
                  max={30}
                  value={days}
                  onChange={(value) => updatePendingMaxAge('days', value, pendingConfig.maxAge)}
                  addonAfter={t('Day')}
                  style={{ width: 120 }}
                />
                <InputNumber
                  min={0}
                  max={24}
                  value={hours}
                  onChange={(value) => updatePendingMaxAge('hours', value, pendingConfig.maxAge)}
                  addonAfter={t('Hour')}
                  style={{ width: 120 }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {`${t('Total')}: ${totalAgeParts.join(' ') || `0 ${t('Hour')}`}`}
              </div>
            </SettingsItem>

            <SettingsItem
              label={t('Max cache entries')}
              description={t('Oldest entries will be removed after this limit is reached')}
            >
              <InputNumber
                min={100}
                max={10000}
                value={pendingConfig.maxSize}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    setPendingConfig((current) => ({ ...current, maxSize: value }));
                  }
                }}
                style={{ width: 120 }}
              />
            </SettingsItem>

            <SettingsItem label={t('Save configuration')}>
              <Button onClick={handleSaveConfig}>{t('Save')}</Button>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Cache actions')}>
            <SettingsItem
              label={t('Clear cache')}
              description={t('Delete all translation cache entries')}
            >
              <Button
                danger
                onClick={handleClearCache}
                loading={loading}
                icon={<Icon name="delete" size={16} />}
              >
                {t('Clear all cache')}
              </Button>
            </SettingsItem>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default CacheSettings;
