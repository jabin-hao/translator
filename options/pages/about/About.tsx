import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const About: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SettingsPageContainer
      title={t('关于')}
      description={t('插件信息和开发者信息')}
    >
      <SettingsGroup title={t('插件信息')} first>
        <SettingsItem
          label={t('插件名称')}
        >
          <span>{t('网页翻译插件')}</span>
        </SettingsItem>

        <SettingsItem
          label={t('插件功能')}
        >
          <span>{t('本插件用于网页划词翻译，支持多语言切换和自动翻译。')}</span>
        </SettingsItem>

        <SettingsItem
          label={t('版本')}
        >
          <span>0.0.0</span>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('开发者信息')}>
        <SettingsItem
          label={t('作者')}
        >
          <span>Bugbyebyebye</span>
        </SettingsItem>

        <SettingsItem
          label={t('开源地址')}
        >
          <a 
            href="https://github.com/Bugbyebyebye/translator" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--ant-color-primary)' }}
          >
            https://github.com/Bugbyebyebye/translator
          </a>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('使用帮助')}>
        <SettingsItem
          label={t('基本使用')}
        >
          <div style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>• {t('选中网页文字即可显示翻译图标，点击图标进行翻译')}</div>
            <div style={{ marginBottom: 4 }}>• {t('可在设置中配置自动翻译、快捷键等功能')}</div>
            <div style={{ marginBottom: 4 }}>• {t('支持多种翻译引擎：Google、DeepL、Bing等')}</div>
            <div style={{ marginBottom: 4 }}>• {t('可设置偏好语言和网站白名单/黑名单')}</div>
            <div style={{ marginBottom: 0 }}>• {t('所有配置可导出备份，方便在不同设备间同步')}</div>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('快捷键使用说明')}>
        <SettingsItem
          label={t('功能说明')}
        >
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ant-color-text-secondary)' }}>
            <p>• {t('选中文字后，双击 Ctrl 键即可快速翻译')}</p>
            <p>• {t('可以设置自定义快捷键替代默认的 Ctrl 双击')}</p>
            <p>• {t('自定义快捷键支持组合键，如 Ctrl+Shift+T')}</p>
            <p>• {t('关闭快捷键功能后，仍可通过点击翻译图标进行翻译')}</p>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('缓存功能说明')}>
        <SettingsItem
          label={t('功能说明')}
        >
          <div style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>• {t('翻译缓存可以显著提高重复翻译的速度')}</div>
            <div style={{ marginBottom: 4 }}>• {t('缓存会自动过期，确保翻译结果的时效性')}</div>
            <div style={{ marginBottom: 4 }}>• {t('缓存数据仅存储在本地，不会上传到服务器')}</div>
            <div style={{ marginBottom: 0 }}>• {t('清空缓存不会影响翻译功能，只是需要重新翻译')}</div>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('自定义词库说明')}>
        <SettingsItem
          label={t('功能说明')}
        >
          <div style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>• {t('你可以为网站设置专属词典，优先替换翻译结果')}</div>
            <div style={{ marginBottom: 4 }}>• {t('原文需精确匹配，建议区分大小写')}</div>
            <div style={{ marginBottom: 4 }}>• {t('自定义词库仅对对应网站生效')}</div>
            <div style={{ marginBottom: 0 }}>• {t('词库设置会同步保存到本地存储')}</div>
          </div>
        </SettingsItem>
      </SettingsGroup>
    </SettingsPageContainer>
  );
};

export default About; 