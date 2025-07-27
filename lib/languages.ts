export interface LanguageItem {
  label: string;      // 中文名
  abbr: string;       // 按钮缩写
  code: string;       // 统一内部 code（用于翻译）
  google?: string;    // Google API code
  bing?: string;      // Bing API code
  deepl?: string;     // DeepL API code
  yandex?: string;    // Yandex API code
  tts?: string;       // TTS 语音代码（全部用简写）
}

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

export const UI_LANGUAGES = LANGUAGES.map(l => ({ code: l.code, label: l.label }));

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

// 新增：获取 TTS 语音代码
export function getSpeechLang(code: string): string {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang?.speech || code;
}

// UI 语言 code 映射为 i18n 资源 key
export function mapUiLangToI18nKey(lang: string | undefined): string {
  const supported = ['zh', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt'];
  if (!lang) return 'zh';
  if (supported.includes(lang)) return lang;
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK') || lang.startsWith('zh-MO')) return 'zh-TW';
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('pt')) return 'pt';
  return 'zh';
}

export function getTTSLang(code: string): string {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang?.tts || code;
}