export async function bingTranslate(text: string, from: string, to: string): Promise<string> {
  const url = 'https://www.bing.com/ttranslatev3';
  const body = `fromLang=${from}&to=${to}&text=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) throw new Error('Bing 翻译请求失败');
  const data = await res.json();
  // 结果在 data[0].translations[0].text
  return data?.[0]?.translations?.[0]?.text || '';
} 