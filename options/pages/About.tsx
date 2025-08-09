import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';

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
    </SettingsPageContainer>
  );
};

export default About; 