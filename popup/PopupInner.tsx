import React, { useEffect, useMemo, useState } from 'react';
import { Button, Divider, message, Select, Space, Switch, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import EngineOptionLabel from '~lib/components/EngineOptionLabel';
import Icon from '~lib/components/Icon';
import ProviderBrandIcon from '~lib/components/ProviderBrandIcon';
import SelectOptionLabel from '~lib/components/SelectOptionLabel';
import { getProviderOption } from '~lib/constants/customEngines';
import { TRANSLATE_ENGINES } from '~lib/constants/engines';
import { getLocalizedLangLabel, LANGUAGES } from '~lib/constants/languages';
import type { DomainSetting, TranslateEngineType } from '~lib/constants/types';
import {
  useCacheSettings,
  useDomainSettingsData,
  useEngineSettings,
  useLanguageSettings,
  usePageTranslateSettings,
  useSpeechSettings,
  useTextTranslateSettings
} from '~lib/settings/settings';
import { useTheme } from '~lib/theme/theme';

const { Text, Title } = Typography;

const themeIconMap = {
  auto: <Icon name="brightness-auto" size={16} />,
  light: <Icon name="sun" size={16} />,
  dark: <Icon name="moon" size={16} />
};

const themeOrder = ['auto', 'light', 'dark'] as const;

const getActiveTab = () =>
  new Promise<chrome.tabs.Tab | undefined>((resolve) => {
    if (!chrome.tabs) {
      resolve(undefined);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });

const withActiveTab = async (
  callback: (tabId: number) => void | Promise<void>
) => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return;
  }

  await callback(tab.id);
};

const sendMessageToActiveTab = async (messageBody: Record<string, unknown>) => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return undefined;
  }

  return new Promise<unknown>((resolve) => {
    chrome.tabs.sendMessage(tab.id!, messageBody, (response) => {
      resolve(response);
    });
  });
};

const matchesDomainPattern = (pattern: string, domain: string) => {
  if (pattern === domain) {
    return true;
  }

  if (pattern.includes('*')) {
    return new RegExp(`^${pattern.replace(/\*/g, '.*')}$`).test(domain);
  }

  return domain.startsWith(pattern);
};

const isAlwaysTranslatedSite = (domainSettings: DomainSetting[], siteKey: string) =>
  !!siteKey &&
  domainSettings.some(
    (setting) => setting.enabled && matchesDomainPattern(setting.domain, siteKey)
  );

const PopupInner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const themeTextMap = {
    auto: t('Auto'),
    light: t('Light'),
    dark: t('Dark')
  };
  const { engineSettings, setDefaultEngine } = useEngineSettings();
  const { languageSettings, updateLanguages } = useLanguageSettings();
  const { cacheSettings, updateCache } = useCacheSettings();
  const { pageTranslateSettings, updatePageTranslateSettings } = usePageTranslateSettings();
  const { domainSettings, setDomainSetting, deleteDomainSetting } = useDomainSettingsData();
  const { textTranslateSettings, toggleEnabled: toggleTextTranslate } = useTextTranslateSettings();
  const { speechSettings, toggleEnabled: toggleSpeech } = useSpeechSettings();

  const [isPageTranslated, setIsPageTranslated] = useState(false);
  const [isPageTranslating, setIsPageTranslating] = useState(false);
  const [siteKey, setSiteKey] = useState('');

  const engine = engineSettings.default;
  const cacheEnabled = cacheSettings.enabled;
  const pageTargetLang = languageSettings.pageTarget;
  const textTargetLang = languageSettings.textTarget;
  const inputTargetLang = languageSettings.inputTarget;

  const alwaysTranslateCurrentSite = useMemo(
    () => isAlwaysTranslatedSite(domainSettings, siteKey),
    [domainSettings, siteKey]
  );
  const translateEngineOptions = useMemo(
    () => [
      ...TRANSLATE_ENGINES,
      ...engineSettings.customEngines
        .filter((customEngine) => customEngine.enabled)
        .map((customEngine) => ({
          value: customEngine.id,
          label: customEngine.name,
          provider:
            customEngine.provider ||
            (customEngine.type === 'llm' ? 'openai' : 'custom-api')
        }))
    ],
    [engineSettings.customEngines]
  );

  useEffect(() => {
    getActiveTab().then((tab) => {
      const url = tab?.url;
      if (!url) {
        return;
      }

      try {
        setSiteKey(new URL(url).hostname);
      } catch (error) {
        console.error('[Popup] URL parse failed:', error);
      }
    });
  }, []);

  useEffect(() => {
    const checkPageTranslationStatus = async () => {
      await withActiveTab((tabId) => {
        chrome.tabs.sendMessage(tabId, { type: 'CHECK_PAGE_TRANSLATED' }, (response) => {
          setIsPageTranslated(response?.translated === true);
        });
      });
    };

    // Poll instead of deriving from popup-local state so reopening the popup
    // reflects translation state that may have changed while the popup was closed.
    void checkPageTranslationStatus();
    const interval = setInterval(() => {
      void checkPageTranslationStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chrome?.runtime?.onMessage) {
      return;
    }

    const handler = (msg: { type?: string }) => {
      if (msg.type === 'FULL_PAGE_TRANSLATE_DONE') {
        setIsPageTranslating(false);
        setIsPageTranslated(true);
      }

      if (msg.type === 'RESTORE_ORIGINAL_PAGE_DONE') {
        setIsPageTranslating(false);
        setIsPageTranslated(false);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const handleEngineChange = async (value: string) => {
    await setDefaultEngine(value as TranslateEngineType);
    message.success(t('Translation engine saved'));
  };

  const handleSpeechToggle = async (checked: boolean) => {
    await toggleSpeech();
    message.success(checked ? t('Speech enabled') : t('Speech disabled'));
  };

  const handleTextTranslateToggle = async (checked: boolean) => {
    await toggleTextTranslate();
    message.success(checked ? t('Selection translation enabled') : t('Selection translation disabled'));
  };

  const handleCacheToggle = async (checked: boolean) => {
    await updateCache({ enabled: checked });
    message.success(checked ? t('Cache enabled') : t('Cache disabled'));
  };

  const handlePageLangChange = async (value: string) => {
    await updateLanguages({ pageTarget: value });
    message.success(t('Page target language saved'));
  };

  const handleTextLangChange = async (value: string) => {
    await updateLanguages({ textTarget: value });
    message.success(t('Text target language saved'));
  };

  const handleInputLangChange = async (value: string) => {
    await updateLanguages({ inputTarget: value });
    message.success(t('Input target language saved'));
  };

  const handleThemeSwitch = () => {
    const idx = themeOrder.indexOf(themeMode);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setThemeMode(next);
  };

  const handleSiteAutoTranslateChange = async (checked: boolean) => {
    await updatePageTranslateSettings({ autoTranslate: checked });
    message.success(checked ? t('Site auto-translate enabled') : t('Site auto-translate disabled'));
  };

  const handleAlways = async () => {
    if (!siteKey) {
      return;
    }

    try {
      if (alwaysTranslateCurrentSite) {
        await deleteDomainSetting(siteKey);
        message.success(t('Removed from always translate sites'));
        return;
      }

      await setDomainSetting({
        domain: siteKey,
        enabled: true,
        type: 'whitelist'
      });
      message.success(t('Added to always translate sites'));
    } catch (error) {
      console.error('[Popup] whitelist update failed:', error);
      message.error(
        alwaysTranslateCurrentSite
          ? t('Failed to remove site, please try again')
          : t('Failed to add site, please try again')
      );
    }
  };

  const handleFullPageTranslate = async () => {
    setIsPageTranslating(true);
    const response = (await sendMessageToActiveTab({
      type: 'FULL_PAGE_TRANSLATE',
      lang: pageTargetLang,
      engine
    })) as { success?: boolean; error?: string } | undefined;

    if (response?.success === false) {
      setIsPageTranslating(false);
      message.warning(
        response.error === 'Page language is excluded from translation'
          ? t('This page language is excluded from translation')
          : response.error === 'Page is already in the target language'
            ? t('This page is already in the target language')
          : response.error || t('Failed to translate current page')
      );
    }
  };

  const handleRestorePage = () => {
    void sendMessageToActiveTab({ type: 'RESTORE_ORIGINAL_PAGE' });
  };

  const langOptions = LANGUAGES.map((lang) => ({
    value: lang.code,
    label: getLocalizedLangLabel(lang.code, i18n.language)
  }));

  return (
    <div
      style={{
        width: '100%',
        height: 'auto',
        maxHeight: '600px',
        maxWidth: '400px',
        minWidth: 380,
        minHeight: 'auto',
        boxSizing: 'border-box',
        background: isDark ? '#1f1f1f' : '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '8px 16px 4px',
          borderBottom: 'none',
          background: isDark ? '#1f1f1f' : '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <Title level={5} style={{ margin: 0, fontWeight: 600, color: isDark ? '#ffffff' : '#000000' }}>
          {t('Quick settings')}
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip
            title={t('Open settings page')}
            placement="bottom"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          >
            <Button
              type="text"
              shape="circle"
              icon={<Icon name="settings" size={16} />}
              onClick={() => {
                chrome.runtime.openOptionsPage();
              }}
              style={{ border: 'none' }}
            />
          </Tooltip>
          <Tooltip
            title={`${t('Current theme')}: ${themeTextMap[themeMode]}`}
            placement="bottom"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          >
            <Button
              type="text"
              shape="circle"
              icon={themeIconMap[themeMode]}
              onClick={handleThemeSwitch}
              style={{ border: 'none' }}
            />
          </Tooltip>
        </div>
      </div>

      <div
        style={{
          padding: '0 16px 8px',
          background: isDark ? '#1f1f1f' : '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('Translation engine')}
            </Text>
            <Select
              value={engine}
              onChange={handleEngineChange}
              style={{ width: '100%' }}
              placeholder={t('Select translation engine')}
            >
              {translateEngineOptions.map((entry) => (
                <Select.Option
                  key={entry.value}
                  value={entry.value}
                  disabled={'disabled' in entry ? entry.disabled : undefined}
                >
                  {'provider' in entry ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <ProviderBrandIcon provider={entry.provider} size={16} />
                      <span>{entry.label}</span>
                      <span style={{ color: '#999999', fontSize: 12 }}>
                        {getProviderOption(entry.provider).label}
                      </span>
                    </span>
                  ) : (
                    <EngineOptionLabel
                      value={entry.value}
                      label={entry.label}
                      icon={entry.icon}
                    />
                  )}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('Target languages')}
            </Text>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px', marginBottom: 3, display: 'block' }}>
                  {t('Page translation')}
                </Text>
                <Select
                  value={pageTargetLang}
                  onChange={handlePageLangChange}
                  style={{ width: '100%' }}
                  placeholder={t('Select page target language')}
                >
                  {langOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      <SelectOptionLabel
                        label={option.label}
                      />
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '13px', marginBottom: 4, display: 'block' }}>
                  {t('Text translation')}
                </Text>
                <Select
                  value={textTargetLang}
                  onChange={handleTextLangChange}
                  style={{ width: '100%' }}
                  placeholder={t('Select text target language')}
                >
                  {langOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      <SelectOptionLabel
                        label={option.label}
                      />
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '13px', marginBottom: 4, display: 'block' }}>
                  {t('Input translation')}
                </Text>
                <Select
                  value={inputTargetLang}
                  onChange={handleInputLangChange}
                  style={{ width: '100%' }}
                  placeholder={t('Select input target language')}
                >
                  {langOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      <SelectOptionLabel
                        label={option.label}
                      />
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </Space>
          </div>

          <Divider style={{ margin: 0 }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('Features')}
            </Text>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('Enable text translation')}</Text>
                <Switch checked={textTranslateSettings.enabled} onChange={handleTextTranslateToggle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('Enable site auto-translate')}</Text>
                <Switch checked={pageTranslateSettings.autoTranslate} onChange={handleSiteAutoTranslateChange} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('Enable speech')}</Text>
                <Switch checked={speechSettings.enabled} onChange={handleSpeechToggle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('Enable translation cache')}</Text>
                <Switch checked={cacheEnabled} onChange={handleCacheToggle} />
              </div>
            </Space>
          </div>

          {pageTranslateSettings.autoTranslate && (
            <>
              <Divider style={{ margin: 0 }} />
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  {t('Site rules')}
                </Text>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Button
                    type={alwaysTranslateCurrentSite ? 'primary' : 'default'}
                    block
                    onClick={handleAlways}
                    style={{ borderRadius: 8 }}
                  >
                    {alwaysTranslateCurrentSite
                      ? t('Always translate enabled for this site')
                      : t('Always translate this site')}
                  </Button>
                </Space>
              </div>
            </>
          )}

          <div style={{ paddingTop: 4 }}>
            <Button
              type={isPageTranslated ? 'default' : 'primary'}
              icon={isPageTranslated ? <Icon name="reload" size={16} /> : <Icon name="translate" size={16} />}
              loading={isPageTranslating}
              onClick={isPageTranslated ? handleRestorePage : handleFullPageTranslate}
              block
              style={{ borderRadius: 8, height: 32, fontWeight: 500 }}
            >
              {isPageTranslated ? t('Show original page') : t('Translate current page')}
            </Button>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default PopupInner;
