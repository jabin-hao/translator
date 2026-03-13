import type { LanguageItem, TranslateEngineType, UILanguageItem } from "./types"

const LANGUAGE_LABELS: Record<string, Record<string, string>> = {
  zh: {
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    en: "英语",
    ja: "日语",
    ko: "韩语",
    fr: "法语",
    de: "德语",
    es: "西班牙语",
    ru: "俄语",
    pt: "葡萄牙语",
  },
  en: {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    fr: "French",
    de: "German",
    es: "Spanish",
    ru: "Russian",
    pt: "Portuguese",
  },
}

export const LANGUAGES: LanguageItem[] = [
  {
    code: "zh-CN",
    label: "简体中文",
    abbr: "ZH",
    google: "zh-CN",
    bing: "zh-Hans",
    deepl: "ZH",
    yandex: "zh",
    tts: "zh-Hans",
  },
  {
    code: "zh-TW",
    label: "繁體中文",
    abbr: "ZH",
    google: "zh-TW",
    bing: "zh-Hant",
    deepl: "ZH",
    yandex: "zh",
    tts: "zh-Hant",
  },
  {
    code: "en",
    label: "English",
    abbr: "EN",
    google: "en",
    bing: "en",
    deepl: "EN",
    yandex: "en",
    tts: "en",
  },
  {
    code: "ja",
    label: "日本語",
    abbr: "JA",
    google: "ja",
    bing: "ja",
    deepl: "JA",
    yandex: "ja",
    tts: "ja",
  },
  {
    code: "ko",
    label: "한국어",
    abbr: "KO",
    google: "ko",
    bing: "ko",
    deepl: "KO",
    yandex: "ko",
    tts: "ko",
  },
  {
    code: "fr",
    label: "Français",
    abbr: "FR",
    google: "fr",
    bing: "fr",
    deepl: "FR",
    yandex: "fr",
    tts: "fr",
  },
  {
    code: "de",
    label: "Deutsch",
    abbr: "DE",
    google: "de",
    bing: "de",
    deepl: "DE",
    yandex: "de",
    tts: "de",
  },
  {
    code: "es",
    label: "Español",
    abbr: "ES",
    google: "es",
    bing: "es",
    deepl: "ES",
    yandex: "es",
    tts: "es",
  },
  {
    code: "ru",
    label: "Русский",
    abbr: "RU",
    google: "ru",
    bing: "ru",
    deepl: "RU",
    yandex: "ru",
    tts: "ru",
  },
  {
    code: "pt",
    label: "Português",
    abbr: "PT",
    google: "pt",
    bing: "pt",
    deepl: "PT",
    yandex: "pt",
    tts: "pt",
  },
]

export const UI_LANGUAGES: UILanguageItem[] = [
  { code: "zh-CN", label: "中文（简体）" },
  { code: "en", label: "English" },
]

const STANDARD_LANG_PREFIX_MAP: Record<string, string> = {
  "zh-CN": "zh-CN",
  "zh-SG": "zh-CN",
  "zh-TW": "zh-TW",
  "zh-HK": "zh-TW",
  "zh-MO": "zh-TW",
  zh: "zh-CN",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  ru: "ru",
  pt: "pt",
}

function mapToStandardLangCode(lang: string | undefined): string {
  if (!lang) {
    return "zh-CN"
  }

  const exactMatch = LANGUAGES.find((item) => item.code === lang)
  if (exactMatch) {
    return exactMatch.code
  }

  for (const [prefix, mappedCode] of Object.entries(STANDARD_LANG_PREFIX_MAP)) {
    if (lang.startsWith(prefix)) {
      return mappedCode
    }
  }

  return "zh-CN"
}

export function getEngineLangCode(code: string, engine: string): string {
  const lang = LANGUAGES.find((item) => item.code === code)
  if (!lang) {
    return code
  }

  if (!["google", "bing", "deepl", "yandex"].includes(engine)) {
    return code
  }

  return lang[engine as TranslateEngineType] || code
}

export function getLangAbbr(code: string): string {
  const lang = LANGUAGES.find((item) => item.code === code)
  return lang?.abbr || code.toUpperCase()
}

export function getLangLabel(code: string): string {
  const lang = LANGUAGES.find((item) => item.code === code)
  return lang?.label || code
}

export function getLocalizedLangLabel(
  code: string,
  uiLanguage: string | undefined,
): string {
  const i18nKey = mapUiLangToI18nKey(uiLanguage)
  return LANGUAGE_LABELS[i18nKey]?.[code] || getLangLabel(code)
}

export function getBrowserLang() {
  return mapToStandardLangCode(navigator.language || "zh-CN")
}

export function mapUiLangToI18nKey(lang: string | undefined): string {
  const normalized = mapToStandardLangCode(lang)
  return normalized === "en" ? "en" : "zh"
}

export function getTTSLang(code: string): string {
  const lang = LANGUAGES.find((item) => item.code === code)
  return lang?.tts || code
}
