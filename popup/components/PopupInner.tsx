import React, { useEffect, useState } from 'react';
import { produce } from 'immer';
import { Select, Switch, Divider, message, Button, Tooltip, Space, Typography } from 'antd';
import { TRANSLATE_ENGINES } from '~lib/constants/engines';
import { LANGUAGES } from '~lib/constants/languages';
import { useTranslation } from 'react-i18next';
import { ReloadOutlined, TranslationOutlined } from '@ant-design/icons';
import { Icon } from '@iconify/react';

// 使用新的全局配置系统
import { useTheme } from '~lib/utils/theme';
import {
  useGlobalSettings,
  useEngineSettings,
  usePageTranslateSettings,
  useThemeSettings,
  useTextTranslateSettings,
  useSpeechSettings
} from '~lib/utils/globalSettingsHooks';

const { Text, Title } = Typography;

const themeIconMap = {
  auto: <Icon icon="material-symbols:brightness-auto-outline" width={16} height={16} />,
  light: <Icon icon="material-symbols:light-mode-outline" width={16} height={16} />,
  dark: <Icon icon="material-symbols:dark-mode-outline" width={16} height={16} />,
};
const themeTextMap = {
  auto: '自动',
  light: '日间',
  dark: '夜间',
};
const themeOrder = ['auto', 'light', 'dark'];

const PopupInner: React.FC = () => {
  const { t } = useTranslation();
  const { themeMode, setThemeMode, isDark } = useTheme();
  
  // 使用新的全局配置系统
  const { settings, updateSettings } = useGlobalSettings();
  const { engineSettings, setDefaultEngine } = useEngineSettings();
  const { 
    pageTranslateSettings, 
    updatePageTranslateSettings,
    addToAlwaysList,
    addToNeverList,
    removeFromAlwaysList,
    removeFromNeverList,
    matchSiteList
  } = usePageTranslateSettings();
  const { themeSettings, updateTheme } = useThemeSettings();
  const { textTranslateSettings, toggleEnabled: toggleTextTranslate } = useTextTranslateSettings();
  const { speechSettings, toggleEnabled: toggleSpeech } = useSpeechSettings();
  
  // 从全局设置中提取值
  const engine = engineSettings.default;
  const cacheEnabled = settings.cache.enabled;
  const pageTargetLang = settings.languages.pageTarget;
  const textTargetLang = settings.languages.textTarget;
  
  const [isPageTranslated, setIsPageTranslated] = useState(false);
  const [isPageTranslating, setIsPageTranslating] = useState(false);

  // 网站管理相关状态
  const [siteKey, setSiteKey] = useState('');
  const [siteSettings, setSiteSettings] = useState({ always: false, never: false });

  // 获取当前 tab 的 host+path
  useEffect(() => {
    chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url;
      if (url) {
        try {
          const u = new URL(url);
          const host = u.hostname;
          const path = u.pathname;
          const key = path === '/' ? host : host + path;
          
          setSiteKey(produce(() => key));
          
          // 使用全局配置中的网站列表来检查匹配
          const isAlways = matchSiteList(pageTranslateSettings.alwaysList || [], key);
          const isNever = matchSiteList(pageTranslateSettings.neverList || [], key);
          
          setSiteSettings(produce((draft) => ({
            always: isAlways,
            never: isNever
          })));
        } catch (error) {
          console.error('[Popup] URL解析失败:', error);
        }
      }
    });
  }, []);

  // 检查当前页面是否已翻译
  useEffect(() => {
    const checkPageTranslationStatus = () => {
      chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { type: 'CHECK_PAGE_TRANSLATED' }, (res) => {
          setIsPageTranslated(produce(() => res?.translated === true));
        });
      });
    };
    
    // 立即检查一次
    checkPageTranslationStatus();
    
    // 定期检查（每2秒检查一次，确保能捕获自动翻译的状态变化）
    const interval = setInterval(checkPageTranslationStatus, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // 监听 content-script 的翻译完成/还原完成消息
  useEffect(() => {
    if (chrome?.runtime?.onMessage) {
      const handler = (msg, sender, sendResponse) => {
        if (msg.type === 'FULL_PAGE_TRANSLATE_DONE') {
          setIsPageTranslating(false);
          setIsPageTranslated(produce(() => true));
        }
        if (msg.type === 'RESTORE_ORIGINAL_PAGE_DONE') {
          setIsPageTranslating(false);
          setIsPageTranslated(produce(() => false));
        }
      };
      chrome.runtime.onMessage.addListener(handler);
      return () => chrome.runtime.onMessage.removeListener(handler);
    }
  }, []);

  const handleEngineChange = async (val: string) => {
    await setDefaultEngine(val);
    message.success(t('翻译引擎已保存'));
  };
  
  // 修改：启用朗读功能开关处理
  const handleSpeechToggle = async (checked: boolean) => {
    await toggleSpeech();
    message.success(checked ? t('已启用朗读功能') : t('已禁用朗读功能'));
  };

  // 修改：启用划词翻译开关处理
  const handleTextTranslateToggle = async (checked: boolean) => {
    await toggleTextTranslate();
    message.success(checked ? t('已启用划词翻译') : t('已禁用划词翻译'));
  };

  const handleCacheToggle = async (checked: boolean) => {
    await updateSettings({ cache: { enabled: checked } });
    message.success(checked ? t('已启用翻译缓存') : t('已禁用翻译缓存'));
  };
  
  const handlePageLangChange = async (val: string) => {
    await updateSettings({ languages: { pageTarget: val } });
    message.success(t('网页翻译目标语言已保存'));
  };
  
  const handleTextLangChange = async (val: string) => {
    await updateSettings({ languages: { textTarget: val } });
    message.success(t('划词翻译目标语言已保存'));
  };

  // 主题切换处理
  const handleThemeSwitch = () => {
    const idx = themeOrder.indexOf(themeMode);
    const next = themeOrder[(idx + 1) % themeOrder.length] as 'auto' | 'light' | 'dark';
    setThemeMode(next);
  };

  // 新增：网站自动翻译开关处理
  const handleSiteAutoTranslateChange = async (checked: boolean) => {
    // 使用全局配置的toggleAutoTranslate
    await updatePageTranslateSettings({ autoTranslateEnabled: checked });
    message.success(checked ? t('已开启网站自动翻译') : t('已关闭网站自动翻译'));
  };

  const handleAlways = async () => {
    if (!siteKey) return;
    if (siteSettings.always) {
      await removeFromAlwaysList(siteKey);
    } else {
      await addToAlwaysList(siteKey);
    }
    
    // 重新检查匹配状态
    const isAlways = matchSiteList(pageTranslateSettings.alwaysList || [], siteKey);
    const isNever = matchSiteList(pageTranslateSettings.neverList || [], siteKey);
    
    setSiteSettings({
      always: isAlways,
      never: isNever
    });
    message.success(siteSettings.always ? t('已移除总是翻译该网站') : t('已添加到总是翻译该网站'));
  };
  const handleNever = async () => {
    if (!siteKey) return;
    if (siteSettings.never) {
      await removeFromNeverList(siteKey);
    } else {
      await addToNeverList(siteKey);
    }
    
    // 重新检查匹配状态
    const isAlways = matchSiteList(pageTranslateSettings.alwaysList || [], siteKey);
    const isNever = matchSiteList(pageTranslateSettings.neverList || [], siteKey);
    
    setSiteSettings({
      always: isAlways,
      never: isNever
    });
    message.success(siteSettings.never ? t('已移除永不翻译该网站') : t('已添加到永不翻译该网站'));
  };

  // 按钮点击逻辑
  const handleFullPageTranslate = () => {
    setIsPageTranslating(true);
    chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.tabs.sendMessage(tabId, {
        type: 'FULL_PAGE_TRANSLATE',
        lang: pageTargetLang,
        engine
      });
    });
  };
  const handleRestorePage = () => {
    // 不要 setIsPageTranslating(true)
    chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.tabs.sendMessage(tabId, { type: 'RESTORE_ORIGINAL_PAGE' });
    });
  };

  // 语言选项（使用 languages.ts 中的配置）
  const langOptions = LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.label
  }));

  return (
    <div style={{
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
      flexDirection: 'column',
    }}>
      {/* 自定义标题栏 */}
      <div style={{
        padding: '8px 16px 4px',
        borderBottom: 'none',
        background: isDark ? '#1f1f1f' : '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600, color: isDark ? '#ffffff' : '#000000' }}>
          {t('快速设置')}
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip 
            title={t('打开输入翻译器')} 
            placement="bottom"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          >
            <Button
              type="text"
              shape="circle"
              icon={<Icon icon="material-symbols:translate" width={16} height={16} />}
              onClick={() => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  const tabId = tabs[0]?.id;
                  if (tabId) {
                    chrome.tabs.sendMessage(tabId, { type: 'SHOW_INPUT_TRANSLATOR' });
                  }
                });
              }}
              style={{ border: 'none' }}
            />
          </Tooltip>
          <Tooltip 
            title={t('打开设置页面')} 
            placement="bottom"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          >
            <Button
              type="text"
              shape="circle"
              icon={<Icon icon="material-symbols:settings-outline" width={16} height={16} />}
              onClick={() => {
                chrome.runtime.openOptionsPage();
              }}
              style={{ border: 'none' }}
            />
          </Tooltip>
          <Tooltip 
            title={`${t('当前主题')}：${themeTextMap[themeMode]}`} 
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
      
      {/* 内容区域 */}
      <div style={{
        padding: '0 16px 8px',
        background: isDark ? '#1f1f1f' : '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {/* 翻译引擎选择 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('翻译引擎')}
            </Text>
            <Select
              value={engine}
              onChange={handleEngineChange}
              style={{ width: '100%' }}
              placeholder={t('选择翻译引擎')}
            >
              {TRANSLATE_ENGINES.map(e => (
                <Select.Option key={e.value} value={e.value} disabled={e.disabled}>
                  {e.icon && <img src={e.icon} alt={e.label} style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 8 }} />}
                  {e.label}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 语言设置 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('目标语言设置')}
            </Text>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '12px', marginBottom: 3, display: 'block' }}>
                  {t('网页翻译语言')}
                </Text>
                <Select
                  value={pageTargetLang}
                  onChange={handlePageLangChange}
                  style={{ width: '100%' }}
                  placeholder={t('选择网页目标语言')}
                >
                  {langOptions.map(opt => (
                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '13px', marginBottom: 4, display: 'block' }}>
                  {t('划词翻译语言')}
                </Text>
                <Select
                  value={textTargetLang}
                  onChange={handleTextLangChange}
                  style={{ width: '100%' }}
                  placeholder={t('选择划词目标语言')}
                >
                  {langOptions.map(opt => (
                    <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                  ))}
                </Select>
              </div>
            </Space>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* 功能开关 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {t('功能设置')}
            </Text>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('启用划词翻译')}</Text>
                <Switch checked={textTranslateSettings.enabled} onChange={handleTextTranslateToggle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('网站自动翻译')}</Text>
                <Switch checked={pageTranslateSettings.autoTranslateEnabled} onChange={handleSiteAutoTranslateChange} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('启用朗读')}</Text>
                <Switch checked={speechSettings.enabled} onChange={handleSpeechToggle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>{t('启用翻译缓存')}</Text>
                <Switch checked={cacheEnabled} onChange={handleCacheToggle} />
              </div>
            </Space>
          </div>

          {/* 网站管理按钮 */}
          {pageTranslateSettings.autoTranslateEnabled && (
            <>
              <Divider style={{ margin: 0 }} />
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  {t('网站管理')}
                </Text>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Button
                    type={siteSettings.always ? 'primary' : 'default'}
                    block
                    onClick={handleAlways}
                    style={{ borderRadius: 8 }}
                  >
                    {siteSettings.always ? t('已设为总是翻译该网站') : t('总是翻译该网站')}
                  </Button>
                  <Button
                    type={siteSettings.never ? 'primary' : 'default'}
                    danger={siteSettings.never}
                    block
                    onClick={handleNever}
                    style={{ borderRadius: 8 }}
                  >
                    {siteSettings.never ? t('已设为永不翻译该网站') : t('永不翻译该网站')}
                  </Button>
                </Space>
              </div>
            </>
          )}

          {/* 主要操作按钮 */}
          <div style={{ paddingTop: 4 }}>
            <Button
              type={isPageTranslated ? 'default' : 'primary'}
              icon={isPageTranslated ? <ReloadOutlined /> : <TranslationOutlined />}
              loading={isPageTranslating}
              onClick={isPageTranslated ? handleRestorePage : handleFullPageTranslate}
              block
              style={{ borderRadius: 8, height: 32, fontWeight: 500 }}
            >
              {isPageTranslated ? t('显示原网页') : t('翻译当前网站')}
            </Button>
          </div>
        </Space>
      </div>
    </div>
    );
  };

export default PopupInner;

