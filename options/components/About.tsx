import React from 'react';
import { Card } from 'antd';
import { useTranslation } from 'react-i18next';

const About: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Card 
      title={t('关于')} 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{
        body:{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }
      }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <p>{t('本插件用于网页划词翻译，支持多语言切换和自动翻译。')}</p>
        <p>{t('作者')}：Bugbyebyebye</p>
        <p>{t('开源地址')}：<a href="https://github.com/Bugbyebyebye/translator" target="_blank" rel="noopener noreferrer">https://github.com/Bugbyebyebye/translator</a></p>
        <p>{t('版本')}：0.0.0</p>
      </div>
    </Card>
  );
};

export default About; 