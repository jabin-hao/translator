// 统一翻译服务
import {storageApi} from "~lib/storage/storage"
import {googleTranslate, googleTranslateBatch} from "~background/translate/google"
import {bingTranslate, bingTranslateBatch} from "~background/translate/bing"
import {deeplTranslate, deeplTranslateBatch} from "~background/translate/deepl"
import {yandexTranslate, yandexTranslateBatch} from "~background/translate/yandex"
import { GLOBAL_SETTINGS_KEY } from "../settings/settings"
import type { GlobalSettings, CustomDictionaryEntry } from "../constants/types"
import { customDictionaryManager, translationCacheManager } from "../storage/chrome_storage"

// 创建字典查询的独立函数
async function getDictionaryByDomain(domain: string): Promise<CustomDictionaryEntry[]> {
  try {
    return await customDictionaryManager.getDictionaryByDomain(domain);
  } catch (error) {
    console.error('查询自定义字典失败:', error);
    return [];
  }
}

// 导入统一的类型定义
import type { TranslateOptions, TranslateResult } from '../constants/types';

// 翻译引擎函数映射
const TRANSLATE_ENGINE_FUNCTIONS = {
  google: googleTranslate,
  bing: bingTranslate,
  deepl: deeplTranslate,
  yandex: yandexTranslate,
} as const;

// 检查缓存是否启用
async function isCacheEnabled(): Promise<boolean> {
  try {
    // 从全局配置获取缓存启用状态
    const globalSettings = await storageApi.get(GLOBAL_SETTINGS_KEY) as unknown as GlobalSettings;
    
    if (globalSettings?.cache?.enabled !== undefined) {
      return globalSettings.cache.enabled;
    }

    return Boolean(true);
  } catch (error) {
    console.error('检查缓存启用状态失败:', error);
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
    
    // 1. 首先检查自定义词库（仅在客户端环境）
    if (typeof window !== 'undefined') {
      try {
        const currentHost = host || window.location.hostname;
        if (currentHost) {
          const customTranslation = await getDictionaryByDomain(currentHost);
          if (customTranslation && customTranslation.length > 0) {
            console.log(customTranslation[0].translation);
            return {
              text,
              translation: customTranslation[0].translation || '',
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
    }
    
    // 2. 检查全局缓存开关和选项中的缓存开关
    const shouldUseCache = useCache && await isCacheEnabled();

    // 3. 如果启用缓存 先尝试从缓存获取
    if (shouldUseCache) {
      const cachedTranslation = await translationCacheManager.get(text, from, to, engine);
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
    const translateFunction = TRANSLATE_ENGINE_FUNCTIONS[engine as keyof typeof TRANSLATE_ENGINE_FUNCTIONS];
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
          await translationCacheManager.set(text, translation, from, to, engine);
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
      
      const fallbackFunction = TRANSLATE_ENGINE_FUNCTIONS[fallbackEngine as keyof typeof TRANSLATE_ENGINE_FUNCTIONS];
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
            await translationCacheManager.set(text, translation, from, to, engine);
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
  
  // Chrome Storage API 不需要初始化

  //先查自定义词库和缓存，提高命中率
  const results: TranslateResult[] = [];
  const toTranslate: string[] = [];
  const toTranslateIndices: number[] = [];
  let customHitCount = 0;
  let cacheHitCount = 0;
  
  // 先查自定义词库，再查缓存，分离命中和未命中的文本
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    
    // 1. 首先检查自定义词库（仅在客户端环境）
    if (typeof window !== 'undefined') {
      try {
        const currentHost = host || window.location.hostname;
        if (currentHost) {
          const customTranslation = await getDictionaryByDomain(currentHost);
          if (customTranslation && customTranslation.length > 0) {
            results[i] = {
              text,
              translation: customTranslation[0].translation || '',
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
    }
    
    // 2. 检查缓存
    if (shouldUseCache) {
      const cached = await translationCacheManager.get(text, from, to, engine);
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
              await translationCacheManager.set(toTranslate[i], translations[i], from, to, engine);
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