// 统一翻译服务
import {cacheManager} from "../cache/cache"
import {Storage} from "@plasmohq/storage"
import {googleTranslate, googleTranslateBatch} from "~background/translate/google"
import {bingTranslate, bingTranslateBatch} from "~background/translate/bing"
import {deeplTranslate, deeplTranslateBatch} from "~background/translate/deepl"

export interface TranslateOptions {
  from: string;
  to: string;
  engine: string;
  useCache?: boolean;
}

export interface TranslateResult {
  text: string;
  translation: string;
  engine: string;
  from: string;
  to: string;
  cached: boolean;
}

// 翻译引擎映射
const TRANSLATE_ENGINES = {
  google: googleTranslate,
  bing: bingTranslate,
  deepl: deeplTranslate,
} as const;

// 检查缓存是否启用
async function isCacheEnabled(): Promise<boolean> {
  try {
    const storage = new Storage();
    const enabled = await storage.get('translation_cache_enabled');
    
    // 如果值为 null 或 undefined，设置默认值为 true 并返回
    if (enabled === null || enabled === undefined) {
      await storage.set('translation_cache_enabled', true);
      return true;
    }

    return Boolean(enabled);
  } catch (error) {
    return true; // 默认启用
  }
}

// 统一翻译函数
export async function translate(
  text: string, 
  options: TranslateOptions
): Promise<TranslateResult> {
  try {
    const { from, to, engine, useCache = true } = options;
    
    // 检查全局缓存开关和选项中的缓存开关
    const shouldUseCache = useCache && await isCacheEnabled();

    // 如果启用缓存 先尝试从缓存获取
    if (shouldUseCache) {
      // 确保 IndexedDB 已初始化
      await cacheManager.initDB();
      const cachedTranslation = await cacheManager.get(text, from, to, engine);
      if (cachedTranslation) {
        return {
          text,
          translation: cachedTranslation,
          engine,
          from,
          to,
          cached: true,
        };
      }
    }

    // 获取翻译引擎函数
    const translateFunction = TRANSLATE_ENGINES[engine as keyof typeof TRANSLATE_ENGINES];
    if (!translateFunction) {
      console.error(`不支持的翻译引擎: ${engine}`);
    }
    
    // 执行翻译，添加超时处理
    const translation = await Promise.race([
      translateFunction(text, from, to),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('翻译超时')), 30000) // 增加到30秒超时
      )
    ]);

    // 如果启用缓存，保存到缓存
    if (shouldUseCache) {
      try {
        await cacheManager.set(text, translation, from, to, engine);
      } catch (cacheError) {
        console.error('保存到缓存失败:', cacheError);
      }
    }

    return {
      text,
      translation,
      engine,
      from,
      to,
      cached: false,
    };
  } catch (error) {
    console.error(error);
  }
}

// 批量翻译函数
export async function translateBatch(
  texts: string[],
  options: TranslateOptions
): Promise<TranslateResult[]> {
  const { from, to, engine, useCache = true } = options;
  
  // 检查缓存开关
  const shouldUseCache = useCache && await isCacheEnabled();
  
  // 如果启用缓存，确保 IndexedDB 已初始化
  if (shouldUseCache) {
    await cacheManager.initDB();
  }

  //先查缓存，提高命中率
  const results: TranslateResult[] = [];
  const toTranslate: string[] = [];
  const toTranslateIndices: number[] = [];
  
  // 先查缓存，分离命中和未命中的文本
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (shouldUseCache) {
      const cached = await cacheManager.get(text, from, to, engine);
      if (cached) {
        results[i] = {
          text,
          translation: cached,
          engine,
          from,
          to,
          cached: true,
        };
        continue;
      }
    }
    toTranslate.push(text);
    toTranslateIndices.push(i);
  }
  
  // 只对未命中的文本调用翻译API
  if (toTranslate.length > 0) {
    // 批量API映射
    const batchEngines: Record<string, Function | undefined> = {
      google: typeof googleTranslateBatch === 'function' ? googleTranslateBatch : undefined,
      bing: typeof bingTranslateBatch === 'function' ? bingTranslateBatch : undefined,
      deepl: typeof deeplTranslateBatch === 'function' ? deeplTranslateBatch : undefined,
    };
    const batchFn = batchEngines[engine];
    if (batchFn) {
      try {
        const translations = await batchFn(toTranslate, from, to);
        // 批量翻译结果写入缓存
        if (shouldUseCache) {
          for (let i = 0; i < toTranslate.length; i++) {
            try {
              await cacheManager.set(toTranslate[i], translations[i], from, to, engine);
            } catch (cacheError) {
              console.error('批量翻译缓存写入失败:', cacheError);
            }
          }
        }
        // 回填结果
        toTranslateIndices.forEach((originalIdx, j) => {
          results[originalIdx] = {
            text: toTranslate[j],
            translation: translations[j] || '',
            engine,
            from,
            to,
            cached: false,
          };
        });
        return results;
      } catch (e) {
        console.error(e);
      }
    }
    // fallback: 单条循环
    for (let i = 0; i < toTranslate.length; i++) {
      try {
        results[toTranslateIndices[i]] = await translate(toTranslate[i], options);
      } catch (error) {
        results[toTranslateIndices[i]] = {
          text: toTranslate[i],
          translation: `翻译失败: ${error instanceof Error ? error.message : String(error)}`,
          engine,
          from,
          to,
          cached: false,
        };
      }
    }
  }
  
  return results;
}