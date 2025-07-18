import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Storage } from '@plasmohq/storage';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import pt from './locales/pt.json';

const storage = new Storage();

const detectLang = (lang: string | undefined) => {
  // 支持所有已翻译语言
  const supported = ['zh', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt'];
  if (lang && lang !== 'default') {
    if (supported.includes(lang)) return lang;
    // 兼容zh-CN/zh-SG/zh-HK/zh-MO
    if (lang === 'zh-TW' || lang === 'zh-HK' || lang === 'zh-MO') return 'zh-TW';
    if (lang === 'zh-CN' || lang === 'zh-SG' || lang === 'zh') return 'zh';
    const base = lang.split('-')[0];
    if (supported.includes(base)) return base;
  }
  // 浏览器语言
  const navLang = navigator.language.replace('_', '-');
  if (navLang === 'zh-TW' || navLang === 'zh-HK' || navLang === 'zh-MO') return 'zh-TW';
  if (navLang === 'zh-CN' || navLang === 'zh-SG' || navLang === 'zh') return 'zh';
  if (supported.includes(navLang)) return navLang;
  const base = navLang.split('-')[0];
  if (supported.includes(base)) return base;
  return 'zh';
};

export async function initI18n() {
  const uiLang = await storage.get('uiLang');
  const lang = detectLang(uiLang);
  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        zh: { translation: zh },
        'zh-TW': { translation: zhTW },
        en: { translation: en },
        ja: { translation: ja },
        ko: { translation: ko },
        fr: { translation: fr },
        de: { translation: de },
        es: { translation: es },
        ru: { translation: ru },
        pt: { translation: pt }
      },
      lng: lang,
      fallbackLng: 'zh',
      interpolation: { escapeValue: false }
    });
}

export default i18n; 