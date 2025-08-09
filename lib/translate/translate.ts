// 统一翻译服务
import {cacheManager} from "../cache/cache"
import {storageApi} from "~lib/utils/storage"
import {googleTranslate, googleTranslateBatch} from "~background/translate/google"
import {bingTranslate, bingTranslateBatch} from "~background/translate/bing"
import {deeplTranslate, deeplTranslateBatch} from "~background/translate/deepl"
import {yandexTranslate, yandexTranslateBatch} from "~background/translate/yandex"
import { TRANSLATION_CACHE_CONFIG_KEY } from "~lib/constants/settings"
import { findCustomTranslation } from "~lib/settings/siteTranslateSettings"

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
  yandex: yandexTranslate,
} as const;

// 检查缓存是否启用
async function isCacheEnabled(): Promise<boolean> {
  try {
    const enabled = await storageApi.get(TRANSLATION_CACHE_CONFIG_KEY);
    
    // 如果值为 null 或 undefined，设置默认值为 true 并返回
    if (enabled === null || enabled === undefined) {
      await storageApi.set(TRANSLATION_CACHE_CONFIG_KEY, true);
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
  options: TranslateOptions,
  host?: string
): Promise<TranslateResult> {
  try {
    const { from, to, engine, useCache = true } = options;
    
    // 1. 首先检查自定义词库
    try {
      const currentHost = host || (typeof window !== 'undefined' ? window.location.hostname : '');
      if (currentHost) {
        const customTranslation = await findCustomTranslation(currentHost, text.trim());
        if (customTranslation) {
          return {
            text,
            translation: customTranslation,
            engine: 'custom',
            from,
            to,
            cached: false,
          };
        }
      }
    } catch (error) {
      // 自定义词库查找失败，继续使用常规翻译
      console.error('自定义词库查找失败:', error);
    }
    
    // 2. 检查全局缓存开关和选项中的缓存开关
    const shouldUseCache = useCache && await isCacheEnabled();

    // 3. 如果启用缓存 先尝试从缓存获取
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

    // 4. 获取翻译引擎函数
    const translateFunction = TRANSLATE_ENGINES[engine as keyof typeof TRANSLATE_ENGINES];
    if (!translateFunction) {
      throw new Error(`不支持的翻译引擎: ${engine}`);
    }
    
    // 5. 尝试翻译，如果失败则自动回退到其他引擎
    let lastError: Error | null = null;
    const enginePriority = ['bing', 'google']; // 优先级顺序
    const currentEngineIndex = enginePriority.indexOf(engine);
    
    // 先尝试用户选择的引擎
    try {
      const translation = await Promise.race([
        translateFunction(text, from, to),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('翻译超时')), 30000)
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
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`${engine} 翻译失败:`, lastError.message);
    }
    
    // 6. 如果首选引擎失败，尝试回退到其他引擎
    for (const fallbackEngine of enginePriority) {
      if (fallbackEngine === engine) continue; // 跳过已经尝试过的引擎
      
      const fallbackFunction = TRANSLATE_ENGINES[fallbackEngine as keyof typeof TRANSLATE_ENGINES];
      if (!fallbackFunction) continue;
      
      try {
        const translation = await Promise.race([
          fallbackFunction(text, from, to),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('翻译超时')), 30000)
          )
        ]);

        // 如果启用缓存，保存到缓存（使用原始引擎名）
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
          engine: fallbackEngine, // 标记实际使用的引擎
          from,
          to,
          cached: false,
        };
      } catch (error) {
        console.warn(`${fallbackEngine} 引擎回退也失败:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    // 7. 所有引擎都失败了，抛出最后一个错误
    throw lastError || new Error('所有翻译引擎都不可用');
  } catch (error) {
    console.error('翻译服务调用失败:', error);
    // 返回错误结果而不是抛出异常
    return {
      text,
      translation: `翻译失败: ${error instanceof Error ? error.message : String(error)}`,
      engine: options.engine,
      from: options.from,
      to: options.to,
      cached: false,
    };
  }
}

// 批量翻译函数
export async function translateBatch(
  texts: string[],
  options: TranslateOptions,
  host?: string
): Promise<TranslateResult[]> {
  const { from, to, engine, useCache = true } = options;
  
  // 检查缓存开关
  const shouldUseCache = useCache && await isCacheEnabled();
  
  // 如果启用缓存，确保 IndexedDB 已初始化
  if (shouldUseCache) {
    await cacheManager.initDB();
  }

  //先查自定义词库和缓存，提高命中率
  const results: TranslateResult[] = [];
  const toTranslate: string[] = [];
  const toTranslateIndices: number[] = [];
  let customHitCount = 0;
  let cacheHitCount = 0;
  
  // 先查自定义词库，再查缓存，分离命中和未命中的文本
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    
    // 1. 首先检查自定义词库
    try {
      const currentHost = host || (typeof window !== 'undefined' ? window.location.hostname : '');
      if (currentHost) {
        const customTranslation = await findCustomTranslation(currentHost, text.trim());
        if (customTranslation) {
          results[i] = {
            text,
            translation: customTranslation,
            engine: 'custom',
            from,
            to,
            cached: false,
          };
          customHitCount++;
          continue;
        }
      }
    } catch (error) {
      // 自定义词库查找失败，继续查缓存
      console.error('自定义词库查找失败:', error);
    }
    
    // 2. 检查缓存
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
        cacheHitCount++;
        continue;
      }
    }
    
    // 3. 需要API翻译
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
      yandex: typeof yandexTranslateBatch === 'function' ? yandexTranslateBatch : undefined,
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
        results[toTranslateIndices[i]] = await translate(toTranslate[i], options, host);
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