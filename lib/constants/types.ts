/**
 * 统一的类型定义文件
 * 集中管理所有接口和类型，避免重复定义，提高维护性
 */

// ================================
// 基础类型定义
// ================================

/**
 * 翻译引擎类型
 */
export type TranslateEngineType = 'google' | 'deepl' | 'bing' | 'yandex';

/**
 * TTS引擎类型
 */
export type TTSEngineType = 'google' | 'local' | 'browser';

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * 翻译触发模式
 */
export type TriggerMode = 'auto' | 'hotkey';

/**
 * 页面翻译模式
 */
export type PageTranslateMode = 'translated' | 'compare';

/**
 * 自定义引擎类型
 */
export type CustomEngineType = 'api' | 'llm';

// ================================
// 语言相关接口
// ================================

/**
 * 语言项接口
 */
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

/**
 * UI语言项
 */
export interface UILanguageItem {
  code: string;
  label: string;
}

// ================================
// 翻译引擎相关接口
// ================================

/**
 * 翻译引擎配置接口
 */
export interface TranslateEngineConfig {
  label: string;
  value: string;
  icon: string;
  description: string;
  disabled?: boolean;
}

/**
 * TTS引擎配置
 */
export interface TTSEngineConfig {
  value: TTSEngineType;
  label: string;
  description: string;
  priority: number;
}

/**
 * 自定义翻译引擎接口
 */
export interface CustomEngine {
  id: string;
  name: string;
  type: CustomEngineType;
  apiUrl: string;
  apiKey: string;
  model?: string;
  prompt?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

// ================================
// 翻译相关接口
// ================================

/**
 * 翻译选项
 */
export interface TranslateOptions {
  from: string;
  to: string;
  engine: string;
  useCache?: boolean;
}

/**
 * 翻译结果
 */
export interface TranslateResult {
  text: string;
  translation: string;
  engine: string;
  from: string;
  to: string;
  cached: boolean;
}

// ================================
// 存储相关接口
// ================================

/**
 * 收藏单词
 */
export interface FavoriteWord {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: number;
}

/**
 * 自定义词典条目
 */
export interface CustomDictionaryEntry {
  id: string;
  domain: string;
  original: string;
  translation: string;
  isActive: boolean;
  timestamp: number;
}

/**
 * 域名设置
 */
export interface DomainSetting {
  domain: string;
  enabled: boolean;
  type: 'whitelist' | 'blacklist';
  timestamp: number;
}

/**
 * 翻译缓存条目
 */
export interface TranslationCacheEntry {
  id: string;
  key: string;
  text: string;
  translation: string;
  from: string;
  to: string;
  engine: string;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
}

// ================================
// 设置相关接口
// ================================

/**
 * 主题设置
 */
export interface ThemeSettings {
  mode: ThemeMode;
  uiLanguage: string;
}

/**
 * 翻译引擎设置
 */
export interface EngineSettings {
  default: TranslateEngineType;
  customEngines: CustomEngine[];
  apiKeys: {
    deepl: string;
    bing: string;
    yandex: string;
  };
}

/**
 * 划词翻译设置
 */
export interface TextTranslateSettings {
  enabled: boolean;
  showOriginal: boolean;
  selectTranslate: boolean;
  quickTranslate: boolean;
  pressKeyTranslate: boolean;
}

/**
 * 输入翻译设置
 */
export interface InputTranslateSettings {
  enabled: boolean;
  triggerMode: TriggerMode;
  autoTranslateDelay: number;
  minTextLength: number;
  enabledInputTypes: string[];
  excludeSelectors: string[];
  autoReplace: boolean;
}

/**
 * 页面翻译设置
 */
export interface PageTranslateSettings {
  enabled: boolean;
  mode: PageTranslateMode;
  autoTranslate: boolean;
}

/**
 * 语音设置
 */
export interface SpeechSettings {
  enabled: boolean;
  engine: TTSEngineType;
  speed: number;
  pitch: number;
  volume: number;
  autoPlay: boolean;
  voice: string;
}

/**
 * 语言设置
 */
export interface LanguageSettings {
  favorites: string[];
  never: string[];
  always: string[];
  pageTarget: string;
  textTarget: string;
  inputTarget: string;
}

/**
 * 快捷键设置
 */
export interface ShortcutSettings {
  enabled: boolean;
  toggleTranslate: string;
  pageTranslate: string;
  openInput: string;
  textTranslate: string;
  inputTranslate: string;
}

/**
 * 缓存设置
 */
export interface CacheSettings {
  enabled: boolean;
  maxAge: number;
  maxSize: number;
}

/**
 * 收藏夹设置
 */
export interface FavoritesSettings {
  enabled: boolean;
  words: FavoriteWord[];
  autoSave: boolean;
  maxSize: number;
}

/**
 * 全局设置接口
 */
export interface GlobalSettings {
  theme: ThemeSettings;
  engines: EngineSettings;
  textTranslate: TextTranslateSettings;
  inputTranslate: InputTranslateSettings;
  pageTranslate: PageTranslateSettings;
  speech: SpeechSettings;
  languages: LanguageSettings;
  shortcuts: ShortcutSettings;
  cache: CacheSettings;
  favorites: FavoritesSettings;
}

// ================================
// 工具类型
// ================================

/**
 * 深度部分类型，用于设置更新
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

/**
 * 主题选项
 */
export interface ThemeOption {
  label: string;
  value: ThemeMode;
}