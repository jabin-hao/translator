import {getEngineLangCode} from '~lib/constants/languages';

// Edge API 方案，无需全局代理
export async function bingTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    // 统一微软API语言代码
    const fromMapped = getEngineLangCode(from, 'bing');
    const toMapped = getEngineLangCode(to, 'bing');

    // 获取 Edge Token
    const tokenResponse = await fetch('https://edge.microsoft.com/translate/auth', {
      method: 'GET',
      signal: AbortSignal.timeout(15000), // 增加到15秒超时
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('获取Edge Token失败:', tokenResponse.status, tokenResponse.statusText, errorText);
    }
    
    const token = await tokenResponse.text();

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
      signal: AbortSignal.timeout(20000), // 增加到20秒超时
    });
    
    if (!translateResponse.ok) {
      const errorText = await translateResponse.text();
      console.error('翻译请求失败:', translateResponse.status, translateResponse.statusText, errorText);
    }
    
    const data = await translateResponse.json();
    
    if (!Array.isArray(data) || !data[0]?.translations?.[0]?.text) {
      console.error('Bing Edge 翻译失败: ' + JSON.stringify(data));
    }

    return data[0].translations[0].text;
  } catch (error) {
    console.error('Bing翻译错误:', error);
  }
}

// export async function bingTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
//   // Bing API 不一定原生支持批量，这里循环调用 bingTranslate，保证顺序
//   const results: string[] = [];
//   for (const text of texts) {
//     try {
//       const result = await bingTranslate(text, from, to);
//       results.push(result);
//     } catch (e) {
//       results.push('');
//     }
//   }
//   return results;
// }
export async function bingTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  // 并发调用 bingTranslate，提升性能
  const promises = texts.map(text =>
    bingTranslate(text, from, to).catch(() => '')
  );
  return Promise.all(promises);
}