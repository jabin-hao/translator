import React, { useState, useEffect } from 'react';
import { App } from 'antd';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '~i18n';
import i18n from '../i18n';
import { ThemeProvider } from '~lib/utils/theme';
import OptionsInner from './OptionsInner';
import { THEME_MODE_KEY } from '~lib/constants/settings';

const OptionsRoot = () => {
  const [i18nReady, setI18nReady] = useState(false);
  
  useEffect(() => {
    initI18n().then(() => {
      setI18nReady(true);
    }).catch(err => {
      console.error(err);
      setI18nReady(true); // 即使失败也要显示页面
    });
  }, []);
  
  if (!i18nReady) {
    return null;
  }
  
  return (
    <ThemeProvider storageKey={THEME_MODE_KEY}>
      <I18nextProvider i18n={i18n}>
        <App>
          <OptionsInner />
        </App>
      </I18nextProvider>
    </ThemeProvider>
  );
};

export default OptionsRoot;
