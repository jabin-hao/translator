import { getEngineLangCode } from '../../lib/languages';

// Edge API 方案，无需全局代理
export async function bingTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    // 统一微软API语言代码
    const fromMapped = getEngineLangCode(from, 'bing');
    const toMapped = getEngineLangCode(to, 'bing');
    
    console.log('Bing翻译开始:', { text, from: fromMapped, to: toMapped });
    
    // 获取 Edge Token
    console.log('开始获取Edge Token...');
    const tokenResponse = await fetch('https://edge.microsoft.com/translate/auth', {
      method: 'GET',
      signal: AbortSignal.timeout(15000), // 增加到15秒超时
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('获取Edge Token失败:', tokenResponse.status, tokenResponse.statusText, errorText);
      throw new Error(`获取 Edge Token 失败: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const token = await tokenResponse.text();
    console.log('获取到Edge Token:', token.substring(0, 20) + '...');

    // 构造翻译请求，自动检测时不传 from
    let url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${toMapped}`;
    if (fromMapped && fromMapped !== 'auto' && fromMapped !== 'auto-detect') {
      url += `&from=${fromMapped}`;
    }
    
    console.log('翻译请求URL:', url);
    console.log('翻译请求体:', JSON.stringify([{ Text: text }]));
    
    const translateResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.bing.com'
      },
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(20000), // 增加到20秒超时
    });
    
    if (!translateResponse.ok) {
      const errorText = await translateResponse.text();
      console.error('翻译请求失败:', translateResponse.status, translateResponse.statusText, errorText);
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
    
    // 如果是网络错误，尝试使用Google翻译作为备选
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      console.log('Bing翻译网络错误，尝试使用Google翻译...');
      try {
        const { googleTranslate } = await import('./google');
        return await googleTranslate(text, from, to);
      } catch (googleError) {
        console.error('Google翻译也失败:', googleError);
        throw error; // 抛出原始错误
      }
    }
    
    throw error;
  }
} 