import { getEngineLangCode } from '../../lib/languages';
// Edge API 方案，无需全局代理
export async function bingTranslate(text: string, from: string, to: string): Promise<string> {
  // 统一微软API语言代码
  const fromMapped = getEngineLangCode(from, 'bing');
  const toMapped = getEngineLangCode(to, 'bing');
  // 获取 Edge Token
  const resToken = await fetch('https://edge.microsoft.com/translate/auth');
  if (!resToken.ok) throw new Error('获取 Edge Token 失败');
  const token = await resToken.text();

  // 构造翻译请求，自动检测时不传 from
  let url = `https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${toMapped}`;
  if (fromMapped && fromMapped !== 'auto' && fromMapped !== 'auto-detect') {
    url += `&from=${fromMapped}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://www.bing.com'
    },
    body: JSON.stringify([{ Text: text }])
  });
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]?.translations?.[0]?.text) {
    throw new Error('Bing Edge 翻译失败: ' + JSON.stringify(data));
  }
  return data[0].translations[0].text;
} 