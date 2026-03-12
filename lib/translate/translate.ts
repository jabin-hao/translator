import { bingTranslate, bingTranslateBatch } from '~background/translate/bing';
import { deeplTranslate, deeplTranslateBatch } from '~background/translate/deepl';
import { googleTranslate, googleTranslateBatch } from '~background/translate/google';
import { yandexTranslate, yandexTranslateBatch } from '~background/translate/yandex';
import type { GlobalSettings, TranslateOptions, TranslateResult } from '~lib/constants/types';
import { GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import { customDictionaryManager, translationCacheManager } from '~lib/storage/chrome_storage';
import { storageApi } from '~lib/storage/storage';

type TranslateFunction = (text: string, from: string, to: string) => Promise<string>;
type BatchTranslateFunction = (texts: string[], from: string, to: string) => Promise<string[]>;

const TRANSLATE_TIMEOUT_MS = 30_000;
const FALLBACK_ENGINES = ['bing', 'google'] as const;

const TRANSLATE_ENGINE_FUNCTIONS: Record<string, TranslateFunction> = {
  google: googleTranslate,
  bing: bingTranslate,
  deepl: deeplTranslate,
  yandex: yandexTranslate,
};

const BATCH_TRANSLATE_ENGINE_FUNCTIONS: Record<string, BatchTranslateFunction | undefined> = {
  google: googleTranslateBatch,
  bing: bingTranslateBatch,
  deepl: deeplTranslateBatch,
  yandex: yandexTranslateBatch,
};

async function isCacheEnabled(): Promise<boolean> {
  try {
    const globalSettings = (await storageApi.get(GLOBAL_SETTINGS_KEY)) as GlobalSettings | undefined;
    return globalSettings?.cache?.enabled ?? true;
  } catch (error) {
    console.error('Failed to resolve cache settings:', error);
    return true;
  }
}

async function findCustomDictionaryTranslation(text: string, host?: string) {
  if (!host) {
    return null;
  }

  try {
    return await customDictionaryManager.findTranslation(host, text);
  } catch (error) {
    console.error('Failed to resolve custom dictionary translation:', error);
    return null;
  }
}

async function getCachedTranslation(
  text: string,
  from: string,
  to: string,
  engine: string,
  shouldUseCache: boolean
) {
  if (!shouldUseCache) {
    return null;
  }

  return translationCacheManager.get(text, from, to, engine);
}

async function saveTranslationCache(
  text: string,
  translation: string,
  from: string,
  to: string,
  engine: string,
  shouldUseCache: boolean
) {
  if (!shouldUseCache) {
    return;
  }

  try {
    await translationCacheManager.set(text, translation, from, to, engine);
  } catch (error) {
    console.error('Failed to write translation cache:', error);
  }
}

async function withTimeout<T>(task: Promise<T>) {
  return Promise.race([
    task,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Translation timed out')), TRANSLATE_TIMEOUT_MS)
    ),
  ]);
}

function assertValidTranslationResult(
  translation: string | null | undefined,
  engine: string
) {
  // Some engine adapters only log and return nothing on failure. Treat empty output
  // as a hard error so the fallback chain can continue to the next engine.
  if (typeof translation !== 'string' || !translation.trim()) {
    throw new Error(`Engine "${engine}" returned an empty translation result`);
  }

  return translation;
}

async function translateWithEngine(
  text: string,
  from: string,
  to: string,
  engine: string
) {
  const translateFunction = TRANSLATE_ENGINE_FUNCTIONS[engine];
  if (!translateFunction) {
    throw new Error(`Unsupported translation engine: ${engine}`);
  }

  const translation = await withTimeout(translateFunction(text, from, to));
  return assertValidTranslationResult(translation, engine);
}

function createResult(
  text: string,
  translation: string,
  from: string,
  to: string,
  engine: string,
  cached: boolean
): TranslateResult {
  return {
    text,
    translation,
    engine,
    from,
    to,
    cached,
  };
}

async function translateWithFallbacks(
  text: string,
  from: string,
  to: string,
  engine: string
) {
  // Keep the requested engine first, but fall back to a small stable set when it fails.
  const enginesToTry = [engine, ...FALLBACK_ENGINES.filter((item) => item !== engine)];
  let lastError: Error | null = null;

  for (const engineToTry of enginesToTry) {
    try {
      const translation = await translateWithEngine(text, from, to, engineToTry);
      return { translation, engine: engineToTry };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Translation failed with engine "${engineToTry}":`, lastError.message);
    }
  }

  throw lastError || new Error('All translation engines failed');
}

export async function translate(
  text: string,
  options: TranslateOptions,
  host?: string
): Promise<TranslateResult> {
  const { from, to, engine, useCache = true } = options;

  try {
    // Domain dictionary should win before cache/API so user overrides are always respected.
    const customEntry = await findCustomDictionaryTranslation(text, host);
    if (customEntry) {
      return createResult(text, customEntry.translation, from, to, 'custom', false);
    }

    const shouldUseCache = useCache && (await isCacheEnabled());
    const cachedTranslation = await getCachedTranslation(text, from, to, engine, shouldUseCache);

    if (cachedTranslation) {
      return createResult(text, cachedTranslation, from, to, engine, true);
    }

    // Cache storage stays keyed by the requested engine even if a fallback engine handled the call.
    const translated = await translateWithFallbacks(text, from, to, engine);
    await saveTranslationCache(
      text,
      translated.translation,
      from,
      to,
      engine,
      shouldUseCache
    );

    return createResult(
      text,
      translated.translation,
      from,
      to,
      translated.engine,
      false
    );
  } catch (error) {
    console.error('Translation service failed:', error);
    throw (error instanceof Error
      ? error
      : new Error(`Translation failed: ${String(error)}`));
  }
}

export async function translateBatch(
  texts: string[],
  options: TranslateOptions,
  host?: string
): Promise<TranslateResult[]> {
  const { from, to, engine, useCache = true } = options;
  const shouldUseCache = useCache && (await isCacheEnabled());
  const results: TranslateResult[] = new Array(texts.length);
  const pendingTexts: string[] = [];
  const pendingIndexes: number[] = [];

  for (let index = 0; index < texts.length; index += 1) {
    const text = texts[index];

    // Reuse the same precedence as single-translate: dictionary first, then cache, then API.
    const customEntry = await findCustomDictionaryTranslation(text, host);

    if (customEntry) {
      results[index] = createResult(text, customEntry.translation, from, to, 'custom', false);
      continue;
    }

    const cachedTranslation = await getCachedTranslation(text, from, to, engine, shouldUseCache);
    if (cachedTranslation) {
      results[index] = createResult(text, cachedTranslation, from, to, engine, true);
      continue;
    }

    pendingTexts.push(text);
    pendingIndexes.push(index);
  }

  if (pendingTexts.length === 0) {
    return results;
  }

  const batchTranslate = BATCH_TRANSLATE_ENGINE_FUNCTIONS[engine];

  if (batchTranslate) {
    try {
      // Only the unresolved texts reach the batch API to avoid redoing dictionary/cache hits.
      const translations = await withTimeout(batchTranslate(pendingTexts, from, to));

      // Batch adapters should either translate every unresolved item or fail fast;
      // partial empty results silently degrade whole-page and selection translation.
      if (
        !Array.isArray(translations) ||
        translations.length !== pendingTexts.length ||
        translations.some(
          (translation) => typeof translation !== 'string' || !translation.trim()
        )
      ) {
        throw new Error('Batch translation returned incomplete results');
      }

      for (let index = 0; index < pendingTexts.length; index += 1) {
        const originalIndex = pendingIndexes[index];
        const translation = translations[index] || '';

        results[originalIndex] = createResult(
          pendingTexts[index],
          translation,
          from,
          to,
          engine,
          false
        );

        await saveTranslationCache(
          pendingTexts[index],
          translation,
          from,
          to,
          engine,
          shouldUseCache
        );
      }

      return results;
    } catch (error) {
      console.error('Batch translation failed, falling back to per-item translate:', error);
    }
  }

  for (let index = 0; index < pendingTexts.length; index += 1) {
    results[pendingIndexes[index]] = await translate(pendingTexts[index], options, host);
  }

  return results;
}
