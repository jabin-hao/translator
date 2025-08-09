import {getEngineLangCode} from '~lib/constants/languages';
import {YANDEX_API_KEY} from '~lib/constants/settings';
import {storageApi} from "~lib/utils/storage";

// Yandex 免费网页接口（基于开源项目最佳实践优化）
async function yandexTranslateFree(text: string, from: string, to: string): Promise<string> {
  try {
    // 学习开源项目：语言代码映射和处理
    let sourceLang = from === 'auto' ? 'auto' : getEngineLangCode(from, 'yandex');
    let targetLang = getEngineLangCode(to, 'yandex');
    
    // 学习开源项目：Yandex特殊语言代码处理
    const replacements = [
      { search: "zh-CN", replace: "zh" },
      { search: "zh-TW", replace: "zh" },
      { search: "fr-CA", replace: "fr" },
      { search: "pt", replace: "pt-BR" },
      { search: "pt-PT", replace: "pt" }
    ];
    
    replacements.forEach((r) => {
      if (targetLang === r.search) {
        targetLang = r.replace;
      }
      if (sourceLang === r.search) {
        sourceLang = r.replace;
      }
    });
    
    // 尝试直接使用API接口（学习开源项目的方法）
    try {
      return await yandexDirectTranslate(text, sourceLang, targetLang);
    } catch (directError) {
      console.warn('Yandex直接翻译失败，尝试获取SID:', directError);
      // 备用方法：获取SID后翻译
      return await yandexTranslateWithSID(text, sourceLang, targetLang);
    }
  } catch (error) {
    console.error('Yandex免费翻译错误:', error);
    throw error instanceof Error ? error : new Error('Yandex免费翻译失败');
  }
}

// 学习开源项目：直接API调用方法
async function yandexDirectTranslate(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const langPair = sourceLang === 'auto' ? targetLang : `${sourceLang}-${targetLang}`;
  
  const url = 'https://translate.yandex.net/api/v1/tr.json/translate?srv=tr-url-widget';
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('lang', langPair);
  params.append('format', 'html');
  params.append('id', `${Date.now()}-0-0`);  // 学习开源项目的ID格式
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://translate.yandex.net/',
      'Origin': 'https://translate.yandex.net'
    },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) {
    throw new Error(`Yandex直接翻译失败: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.code !== 200) {
    throw new Error(`Yandex翻译错误代码: ${data.code}`);
  }
  
  if (!data.text || !data.text[0]) {
    throw new Error('Yandex返回数据格式错误');
  }
  
  // 学习开源项目：处理HTML转义
  return data.text[0].replace(/<wbr>/g, '');
}

// 学习开源项目：获取SID的完整流程
async function yandexTranslateWithSID(text: string, sourceLang: string, targetLang: string): Promise<string> {
  // 学习开源项目：获取SID的方法
  let sid = await getYandexSID();
  
  const langPair = sourceLang === 'auto' ? targetLang : `${sourceLang}-${targetLang}`;
  
  const url = 'https://translate.yandex.net/api/v1/tr.json/translate?srv=tr-url-widget';
  const params = new URLSearchParams();
  params.append('id', `${sid}-0-0`);
  params.append('srv', 'tr-url-widget');
  params.append('text', text);
  params.append('lang', langPair);
  params.append('format', 'html');
  
  const response = await fetch(`${url}&${params.toString()}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://translate.yandex.net/',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    signal: AbortSignal.timeout(30000)
  });
  
  if (!response.ok) {
    throw new Error(`Yandex SID翻译失败: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.code !== 200) {
    throw new Error(`Yandex翻译失败: ${data.code}`);
  }
  
  if (!data.text || !data.text[0]) {
    throw new Error('Yandex返回数据格式错误');
  }
  
  return data.text[0].replace(/<wbr>/g, '');
}

// 学习开源项目：获取SID的方法
async function getYandexSID(): Promise<string> {
  const response = await fetch('https://translate.yandex.net/website-widget/v1/widget.js?widgetId=ytWidget&pageLang=es&widgetTheme=light&autoMode=false', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5'
    },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) {
    throw new Error('获取Yandex SID失败');
  }
  
  const jsText = await response.text();
  
  // 学习开源项目：正则表达式提取SID
  const sidMatch = jsText.match(/sid\:\s\'([0-9a-f\.]+)/);
  if (!sidMatch || !sidMatch[1] || sidMatch[1].length < 7) {
    throw new Error('无法从Yandex获取SID');
  }
  
  return sidMatch[1];
}

// 带token的Yandex翻译（备用方法 - 保持原有逻辑作为最后备用）
async function yandexTranslateWithToken(text: string, from: string, to: string): Promise<string> {
  // 语言代码映射
  const sourceLang = from === 'auto' ? 'auto' : getEngineLangCode(from, 'yandex');
  const targetLang = getEngineLangCode(to, 'yandex');
  
  // 获取翻译所需的token和sid
  const keysResponse = await fetch('https://translate.yandex.net', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!keysResponse.ok) {
    throw new Error('获取Yandex翻译页面失败');
  }
  
  const pageText = await keysResponse.text();
  
  // 提取SID
  const sidMatch = pageText.match(/"SID":"([^"]+)"/);
  if (!sidMatch) {
    throw new Error('无法获取Yandex SID');
  }
  const sid = sidMatch[1];
  
  // 构建翻译请求
  const translateUrl = 'https://translate.yandex.net/api/v1/tr.json/translate';
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('lang', sourceLang === 'auto' ? targetLang : `${sourceLang}-${targetLang}`);
  params.append('options', '4');
  
  const translateResponse = await fetch(translateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://translate.yandex.net/',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': `YASID=${sid}`
    },
    body: params.toString(),
    signal: AbortSignal.timeout(30000)
  });
  
  if (!translateResponse.ok) {
    throw new Error(`Yandex翻译请求失败: ${translateResponse.status}`);
  }
  
  const data = await translateResponse.json();
  
  if (data.code !== 200) {
    throw new Error(`Yandex翻译失败: ${data.code}`);
  }
  
  if (!data.text || !data.text[0]) {
    throw new Error('Yandex返回数据格式错误');
  }
  
  return data.text[0];
}

// Yandex API接口（需要API Key）
async function yandexTranslateAPI(text: string, from: string, to: string): Promise<string> {
  try {
    // 从存储中获取 API key
    const apiKey = await storageApi.get(YANDEX_API_KEY);
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('请先在设置中配置 Yandex API Key');
    }
    
    // 语言代码映射
    const sourceLang = from === 'auto' ? '' : getEngineLangCode(from, 'yandex');
    const targetLang = getEngineLangCode(to, 'yandex');
    
    // Yandex 特殊语言代码处理
    let langPair = targetLang;
    if (sourceLang && sourceLang !== 'auto') {
      langPair = `${sourceLang}-${targetLang}`;
    }
    
    const url = 'https://translate.yandex.net/api/v1.5/tr.json/translate';
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('text', text);
    params.append('lang', langPair);
    params.append('format', 'plain');
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!res.ok) {
      let errorMessage = `Yandex API 请求失败: ${res.status}`;
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
      if (res.status === 401) {
        errorMessage = 'Yandex API Key 无效';
      } else if (res.status === 402) {
        errorMessage = 'Yandex API 使用量已达上限';
      } else if (res.status === 404) {
        errorMessage = 'Yandex API 不支持该语言对';
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await res.json();

    // 检查响应格式
    if (data.code !== 200) {
      let errorMessage = 'Yandex 翻译失败';
      switch (data.code) {
        case 401:
          errorMessage = 'API Key 无效';
          break;
        case 402:
          errorMessage = 'API Key 被阻止';
          break;
        case 404:
          errorMessage = '已达到每日请求限制';
          break;
        case 413:
          errorMessage = '文本大小超过限制';
          break;
        case 422:
          errorMessage = '无法翻译该文本';
          break;
        case 501:
          errorMessage = '不支持该翻译方向';
          break;
        default:
          errorMessage = `未知错误 (代码: ${data.code})`;
      }
      throw new Error(errorMessage);
    }

    if (!data?.text?.[0]) {
      throw new Error('Yandex 返回数据格式错误: ' + JSON.stringify(data));
    }

    return data.text[0];
  } catch (error) {
    console.error('Yandex API翻译错误:', error);
    throw error instanceof Error ? error : new Error('Yandex API翻译失败');
  }
}

// Yandex 主翻译函数（优先使用免费接口，失败时尝试API）
export async function yandexTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    // 检查输入
    if (!text || !text.trim()) {
      throw new Error('翻译文本不能为空');
    }

    // 首先尝试免费接口
    try {
      return await yandexTranslateFree(text, from, to);
    } catch (freeError) {
      console.warn('Yandex免费接口失败，尝试API接口:', freeError);
      
      // 检查是否有API Key
      const apiKey = await storageApi.get(YANDEX_API_KEY);
      if (apiKey && typeof apiKey === 'string') {
        // 有API Key时尝试API接口
        return await yandexTranslateAPI(text, from, to);
      } else {
        // 没有API Key时直接抛出免费接口的错误
        throw freeError;
      }
    }
  } catch (error) {
    console.error('Yandex翻译错误:', error);
    throw error instanceof Error ? error : new Error('Yandex翻译失败');
  }
}

// 批量翻译
export async function yandexTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  // 对于免费接口，使用并发调用（限制并发数量避免被封）
  const batchSize = 3; // 限制并发数量
  const results: string[] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        try {
          return await yandexTranslate(text, from, to);
        } catch (error) {
          console.error('Yandex批量翻译单项失败:', error);
          return ''; // 单项失败返回空字符串
        }
      })
    );
    results.push(...batchResults);
    
    // 添加小延迟避免被限制
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
