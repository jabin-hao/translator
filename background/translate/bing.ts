import { getEngineLangCode } from '../../lib/languages';

// Edge API 方案，无需全局代理
export async function bingTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    // 统一微软API语言代码
    const fromMapped = getEngineLangCode(from, 'bing');
    const toMapped = getEngineLangCode(to, 'bing');
    
    console.log('Bing翻译开始:', { text, from: fromMapped, to: toMapped });
    
    // 获取 Edge Token
    const tokenResponse = await fetch('https://edge.microsoft.com/translate/auth', {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`获取 Edge Token 失败: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const token = await tokenResponse.text();
    console.log('获取到Edge Token');

    // 构造翻译请求，自动检测时不传 from
    let url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${toMapped}`;
    if (fromMapped && fromMapped !== 'auto' && fromMapped !== 'auto-detect') {
      url += `&from=${fromMapped}`;
    }
    
    const translateResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.bing.com'
      },
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(15000), // 15秒超时
    });
    
    if (!translateResponse.ok) {
      throw new Error(`翻译请求失败: ${translateResponse.status} ${translateResponse.statusText}`);
    }
    
    const data = await translateResponse.json();
    console.log('Bing翻译响应:', data);
    
    if (!Array.isArray(data) || !data[0]?.translations?.[0]?.text) {
      throw new Error('Bing Edge 翻译失败: ' + JSON.stringify(data));
    }
    
    const result = data[0].translations[0].text;
    console.log('Bing翻译完成:', result);
    return result;
  } catch (error) {
    console.error('Bing翻译错误:', error);
    throw error;
  }
} 