import { getBrowserLang, LANGUAGES } from '~lib/constants/languages';

const normalizeMetaLanguage = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }

  return value.trim().replace(/_/g, '-').split(',')[0];
};

export const normalizePageLanguage = (value: string | null | undefined) => {
  const normalized = normalizeMetaLanguage(value);
  if (!normalized) {
    return '';
  }

  const exactMatch = LANGUAGES.find((language) => language.code === normalized);
  if (exactMatch) {
    return exactMatch.code;
  }

  const prefixMatch = LANGUAGES.find((language) => normalized.startsWith(language.code));
  if (prefixMatch) {
    return prefixMatch.code;
  }

  const baseMatch = LANGUAGES.find((language) => language.code.startsWith(`${normalized}-`));
  if (baseMatch) {
    return baseMatch.code;
  }

  return '';
};

export const detectPageLanguage = (
  doc: Document = document,
  options?: { fallbackToBrowser?: boolean }
) => {
  const candidates = [
    doc.documentElement.getAttribute('lang'),
    doc.body?.getAttribute('lang'),
    doc
      .querySelector('meta[http-equiv="content-language"]')
      ?.getAttribute('content'),
    doc.querySelector('meta[name="language"]')?.getAttribute('content'),
    doc.querySelector('meta[property="og:locale"]')?.getAttribute('content'),
    doc.querySelector('meta[name="og:locale"]')?.getAttribute('content'),
  ];

  for (const candidate of candidates) {
    const normalized = normalizePageLanguage(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (options?.fallbackToBrowser) {
    return normalizePageLanguage(getBrowserLang()) || '';
  }

  return '';
};

const matchSiteList = (list: string[], url: string): boolean =>
  list.some((item) => {
    if (item === url) {
      return true;
    }

    if (item.includes('*')) {
      return new RegExp(item.replace(/\*/g, '.*')).test(url);
    }

    return url.startsWith(item);
  });

export const resolvePageTranslationPolicy = ({
  alwaysLanguages = [],
  neverLanguages = [],
  whitelistedSites = [],
  targetLanguage = '',
}: {
  alwaysLanguages?: string[];
  neverLanguages?: string[];
  whitelistedSites?: string[];
  targetLanguage?: string;
}) => {
  const detectedLanguage = detectPageLanguage();
  const host = window.location.hostname;
  const path = window.location.pathname;
  const fullUrl = path === '/' ? host : `${host}${path}`;
  const isWhitelistedSite = matchSiteList(whitelistedSites, fullUrl);
  const isNeverTranslateLanguage = !!detectedLanguage && neverLanguages.includes(detectedLanguage);
  const isAlwaysTranslateLanguage = !!detectedLanguage && alwaysLanguages.includes(detectedLanguage);
  const isTargetLanguage = !!detectedLanguage && detectedLanguage === targetLanguage;
  const reason = isNeverTranslateLanguage
    ? 'excluded_language'
    : isTargetLanguage
      ? 'already_target_language'
      : null;

  return {
    detectedLanguage,
    isWhitelistedSite,
    isNeverTranslateLanguage,
    isAlwaysTranslateLanguage,
    isTargetLanguage,
    reason,
    canTranslatePage: !reason,
    shouldAutoTranslate:
      !reason && (isWhitelistedSite || isAlwaysTranslateLanguage),
  };
};
