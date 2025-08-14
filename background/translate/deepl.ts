import {getEngineLangCode} from '~lib/constants/languages';
import {DEEPL_API_KEY} from '~lib/constants/settings';
import {storageApi} from "~lib/storage/storage";

// DeepL 免费网页接口（基于开源项目最佳实践优化）
async function deeplTranslateFree(text: string, from: string, to: string, retryCount = 0): Promise<string> {
  try {
    // 语言代码映射 - 参考开源项目的语言映射逻辑
    let sourceLang = from === 'auto' ? 'auto' : getEngineLangCode(from, 'deepl');
    let targetLang = getEngineLangCode(to, 'deepl');
    
    // DeepL 特殊语言代码处理 - 更符合DeepL官方标准
    if (targetLang === "pt") {
      targetLang = "PT-BR";
    } else if (targetLang === "zh" || targetLang === "zh-CN") {
      targetLang = "ZH";
    } else if (targetLang === "zh-TW") {
      targetLang = "ZH";
    } else if (targetLang.startsWith("en")) {
      targetLang = "EN-US";
    } else if (targetLang.startsWith("fr")) {
      targetLang = "FR";
    } else {
      targetLang = targetLang.toUpperCase();
    }

    if (sourceLang && sourceLang !== 'auto') {
      if (sourceLang === "pt") {
        sourceLang = "PT-BR";
      } else if (sourceLang === "zh" || sourceLang === "zh-CN") {
        sourceLang = "ZH";
      } else if (sourceLang === "zh-TW") {
        sourceLang = "ZH";
      } else if (sourceLang.startsWith("en")) {
        sourceLang = "EN-US";
      } else if (sourceLang.startsWith("fr")) {
        sourceLang = "FR";
      } else {
        sourceLang = sourceLang.toUpperCase();
      }
    }

    // 重试时添加指数退避延迟 - 学习开源项目的重试策略
    if (retryCount > 0) {
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 使用DeepL的免费网页接口 - 模拟真实浏览器行为
    const url = 'https://www2.deepl.com/jsonrpc';
    
    // 学习开源项目：添加更多随机性以避免检测
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 100000000) + timestamp % 1000000;
    
    const payload = {
      jsonrpc: "2.0",
      method: "LMT_handle_texts",
      params: {
        splitting: "newlines",
        lang: {
          source_lang_user_selected: sourceLang === 'auto' ? 'auto' : sourceLang,
          target_lang: targetLang
        },
        texts: [{
          text: text,
          requestAlternatives: 0
        }],
        timestamp: timestamp + Math.floor(Math.random() * 10000)  // 增加随机性范围
      },
      id: randomId
    };

    // 学习开源项目：使用更真实的浏览器请求头
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.deepl.com/translator',
        'Origin': 'https://www.deepl.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      // 学习开源项目：改进的错误处理和重试逻辑
      if (response.status === 429 && retryCount < 3) {
        console.warn(`DeepL 429错误，第${retryCount + 1}次重试...`);
        return await deeplTranslateFree(text, from, to, retryCount + 1);
      }
      if (response.status === 503 && retryCount < 2) {
        console.warn(`DeepL 503错误，第${retryCount + 1}次重试...`);
        return await deeplTranslateFree(text, from, to, retryCount + 1);
      }
      throw new Error(`DeepL 免费接口请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`DeepL 错误: ${data.error.message || data.error.code}`);
    }

    if (!data.result?.texts?.[0]?.text) {
      throw new Error('DeepL 返回数据格式错误');
    }

    return data.result.texts[0].text;
  } catch (error) {
    console.error('DeepL免费翻译错误:', error);
    throw error instanceof Error ? error : new Error('DeepL免费翻译失败');
  }
}

// DeepL 付费API接口（需要API Key）
async function deeplTranslateAPI(text: string, from: string, to: string): Promise<string> {
  try {
    // 从存储中获取 API key
    const apiKey = await storageApi.get(DEEPL_API_KEY);
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('请先在设置中配置 DeepL API Key');
    }
    
    // 语言代码映射
    let sourceLang = from === 'auto' ? undefined : getEngineLangCode(from, 'deepl');
    let targetLang = getEngineLangCode(to, 'deepl');
    
    // DeepL 特殊语言代码处理
    if (targetLang === "pt") {
      targetLang = "pt-BR";
    } else if (targetLang === "no") {
      targetLang = "nb";
    } else if (targetLang.startsWith("zh-")) {
      targetLang = "zh";
    } else if (targetLang.startsWith("fr-")) {
      targetLang = "fr";
    }

    // 处理源语言
    if (sourceLang) {
      if (sourceLang === "pt") {
        sourceLang = "pt-BR";
      } else if (sourceLang === "no") {
        sourceLang = "nb";
      } else if (sourceLang.startsWith("zh-")) {
        sourceLang = "zh";
      } else if (sourceLang.startsWith("fr-")) {
        sourceLang = "fr";
      }
    }
    
    // 判断是免费版还是付费版 API（通过key的后缀判断）
    const isFreeApi = apiKey.endsWith(':fx');
    const baseUrl = isFreeApi 
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';
    
    const params = new URLSearchParams();
    params.append("text", text);
    if (sourceLang) {
      params.append("source_lang", sourceLang);
    }
    params.append("target_lang", targetLang);
    
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!res.ok) {
      let errorMessage = `DeepL API 请求失败: ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
      } catch {
        const errorText = await res.text();
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      
      // 特殊错误处理
      if (res.status === 403) {
        errorMessage = 'DeepL API Key 无效或权限不足';
      } else if (res.status === 456) {
        errorMessage = 'DeepL API 使用量已达上限';
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await res.json();

    if (!data?.translations?.[0]?.text) {
      throw new Error('DeepL 返回数据格式错误: ' + JSON.stringify(data));
    }

    return data.translations[0].text;
  } catch (error) {
    console.error('DeepL API翻译错误:', error);
    throw error instanceof Error ? error : new Error('DeepL API翻译失败');
  }
}

// DeepL 主翻译函数（优先使用免费接口，失败时尝试API）
export async function deeplTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    // 检查输入
    if (!text || !text.trim()) {
      throw new Error('翻译文本不能为空');
    }

    // 首先尝试免费接口
    try {
      return await deeplTranslateFree(text, from, to);
    } catch (freeError) {
      console.warn('DeepL免费接口失败，尝试API接口:', freeError);
      
      // 检查是否有API Key
      const apiKey = await storageApi.get(DEEPL_API_KEY);
      if (apiKey && typeof apiKey === 'string') {
        // 有API Key时尝试API接口
        return await deeplTranslateAPI(text, from, to);
      } else {
        // 没有API Key时直接抛出免费接口的错误
        throw freeError;
      }
    }
  } catch (error) {
    console.error('DeepL翻译错误:', error);
    throw error instanceof Error ? error : new Error('DeepL翻译失败');
  }
}

// 批量翻译
export async function deeplTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  // 对于免费接口，使用并发调用
  return Promise.all(
    texts.map(async (text) => {
      try {
        return await deeplTranslate(text, from, to);
      } catch (error) {
        console.error('DeepL批量翻译单项失败:', error);
        return ''; // 单项失败返回空字符串
      }
    })
  );
}