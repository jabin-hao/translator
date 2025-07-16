export interface LanguageItem {
  label: string;      // 中文名
  abbr: string;       // 按钮缩写
  code: string;       // 统一内部 code
  google?: string;    // Google API code
  bing?: string;      // Bing API code
  deepl?: string;     // DeepL API code
  yandex?: string;    // Yandex API code
}

export const LANGUAGES: LanguageItem[] = [
  { label: '中文（简体）', abbr: '简中', code: 'zh-CN', google: 'zh-CN', bing: 'zh-Hans', deepl: 'ZH', yandex: 'zh' },
  { label: '中文（繁体）', abbr: '繁中', code: 'zh-TW', google: 'zh-TW', bing: 'zh-Hant', deepl: 'ZH', yandex: 'zh' },
  { label: '英语', abbr: '英', code: 'en', google: 'en', bing: 'en', deepl: 'EN', yandex: 'en' },
  { label: '日语', abbr: '日', code: 'ja', google: 'ja', bing: 'ja', deepl: 'JA', yandex: 'ja' },
  { label: '韩语', abbr: '韩', code: 'ko', google: 'ko', bing: 'ko', deepl: 'KO', yandex: 'ko' },
  { label: '法语', abbr: '法', code: 'fr', google: 'fr', bing: 'fr', deepl: 'FR', yandex: 'fr' },
  { label: '德语', abbr: '德', code: 'de', google: 'de', bing: 'de', deepl: 'DE', yandex: 'de' },
  { label: '西班牙语', abbr: '西', code: 'es', google: 'es', bing: 'es', deepl: 'ES', yandex: 'es' },
  { label: '俄语', abbr: '俄', code: 'ru', google: 'ru', bing: 'ru', deepl: 'RU', yandex: 'ru' },
  { label: '葡萄牙语', abbr: '葡', code: 'pt', google: 'pt', bing: 'pt', deepl: 'PT', yandex: 'pt' },
];

export const UI_LANGUAGES = [
  { label: '跟随浏览器', value: 'default' },
  ...LANGUAGES.map(l => ({ label: l.label, value: l.code }))
];

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
  const lang = navigator.language || 'zh-CN';
  if (lang.startsWith('zh')) return lang.includes('TW') ? 'zh-TW' : 'zh-CN';
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('pt')) return 'pt';
  return 'en';
}