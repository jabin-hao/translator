// 导入统一的类型定义
import type { LanguageItem, UILanguageItem } from './types';

// 将微软 Edge TTS 的语言代码映射到通用语言代码
export const LANGUAGES: LanguageItem[] = [
  { code: 'zh-CN', label: '中文（简体）', abbr: '简', google: 'zh-CN', bing: 'zh-Hans', deepl: 'ZH', yandex: 'zh', tts: 'zh-Hans' },
  { code: 'zh-TW', label: '中文（繁体）', abbr: '繁', google: 'zh-TW', bing: 'zh-Hant', deepl: 'ZH', yandex: 'zh', tts: 'zh-Hant' },
  { code: 'en', label: '英语', abbr: 'EN', google: 'en', bing: 'en', deepl: 'EN', yandex: 'en', tts: 'en' },
  { code: 'ja', label: '日语', abbr: 'JA', google: 'ja', bing: 'ja', deepl: 'JA', yandex: 'ja', tts: 'ja' },
  { code: 'ko', label: '韩语', abbr: 'KO', google: 'ko', bing: 'ko', deepl: 'KO', yandex: 'ko', tts: 'ko' },
  { code: 'fr', label: '法语', abbr: 'FR', google: 'fr', bing: 'fr', deepl: 'FR', yandex: 'fr', tts: 'fr' },
  { code: 'de', label: '德语', abbr: 'DE', google: 'de', bing: 'de', deepl: 'DE', yandex: 'de', tts: 'de' },
  { code: 'es', label: '西班牙语', abbr: 'ES', google: 'es', bing: 'es', deepl: 'ES', yandex: 'es', tts: 'es' },
  { code: 'ru', label: '俄语', abbr: 'RU', google: 'ru', bing: 'ru', deepl: 'RU', yandex: 'ru', tts: 'ru' },
  { code: 'pt', label: '葡萄牙语', abbr: 'PT', google: 'pt', bing: 'pt', deepl: 'PT', yandex: 'pt', tts: 'pt' },
];

export const UI_LANGUAGES: UILanguageItem[] = LANGUAGES.map(l => ({ code: l.code, label: l.label }));
// 通用语言前缀到标准 code 的映射
const LANG_PREFIX_MAP: Record<string, string> = {
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-MO': 'zh-TW',
  'zh': 'zh-CN',
  'en': 'en',
  'ja': 'ja',
  'ko': 'ko',
  'fr': 'fr',
  'de': 'de',
  'es': 'es',
  'ru': 'ru',
  'pt': 'pt',
};

// 将浏览器语言或用户选择的语言映射到统一的标准语言代码
function mapToStandardLangCode(lang: string | undefined): string {
  if (!lang) return 'zh-CN';
  // 先精确匹配 UI_LANGUAGES
  const uiLang = UI_LANGUAGES.find(l => l.code === lang);
  if (uiLang) return uiLang.code;
  // 兼容常见前缀
  for (const prefix in LANG_PREFIX_MAP) {
    if (lang.startsWith(prefix)) return LANG_PREFIX_MAP[prefix];
  }
  return 'zh-CN';
}

// 获取指定引擎的API语言代码
export function getEngineLangCode(code: string, engine: string): string {
  const lang = LANGUAGES.find(l => l.code === code);
  if (!lang) return code;
  return (lang as any)[engine] || code;
}

// 获取缩写
export function getLangAbbr(code: string): string {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang?.abbr || code.toUpperCase();
}

// 获取浏览器语言的通用函数
export function getBrowserLang() {
  return mapToStandardLangCode(navigator.language || 'zh-CN');
}

// UI 语言 code 映射为 i18n 资源 key
export function mapUiLangToI18nKey(lang: string | undefined): string {
  return mapToStandardLangCode(lang);
}

// 获取 TTS 语言代码
export function getTTSLang(code: string): string {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang?.tts || code;
}