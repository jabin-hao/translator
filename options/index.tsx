import React, { useState, useEffect } from 'react';
import { initI18n } from '../i18n';
import OptionsIndexInner from './OptionsIndexInner';

const OptionsIndex = () => {
  const [i18nReady, setI18nReady] = useState(false);
  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);
  if (!i18nReady) return null;
  return <OptionsIndexInner />;
};

export default OptionsIndex; 