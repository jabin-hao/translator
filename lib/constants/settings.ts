// 翻译设置相关常量
export const SITE_LANG_KEY = 'site_page_lang'; // 网页语言
export const SPEECH_KEY = 'speech_settings'; // 语音合成相关设置
export const DEEPL_API_KEY = 'deepl_api_key';
export const YANDEX_API_KEY = 'yandex_api_key';
export const PAGE_LANG_KEY = 'pageTargetLang'; // 网页翻译目标语言
export const TEXT_LANG_KEY = 'textTargetLang'; // 文本翻译目标语言
export const FAVORITE_LANGS_KEY = 'favoriteLangs'; // 常用语言
export const NEVER_LANGS_KEY = 'neverLangs'; // 永不翻译的语言
export const ALWAYS_LANGS_KEY = 'alwaysLangs'; // 始终翻译的
export const TRANSLATE_SETTINGS_KEY = 'translate_settings'; // 翻译相关设置
export const SITE_TRANSLATE_SETTINGS_KEY = 'site_translate_settings'; // 网页翻译相关设置
export const SHORTCUT_SETTINGS_KEY = 'shortcut_settings'; // 快捷键设置
export const DICT_KEY = 'dict'; // 字典相关设置

// popup页面相关设置
export const POPUP_SETTINGS_KEY = 'popup_settings';

// 主题相关常量
export const UI_LANG_KEY = 'uiLang'; // 界面语言
export const THEME_MODE_KEY = 'theme_mode';

// 缓存相关常量
export const CACHE_KEY = 'translation_cache_enabled';
export const TRANSLATION_CACHE_CONFIG_KEY = 'translation_cache_config';
export const DEFAULT_CACHE_CONFIG = {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天（1个月）
    maxSize: 2000
};