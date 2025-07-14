export async function googleTranslate(text: string, from: string, to: string): Promise<string> {
  // Google 网页端接口，from 可用 'auto'
  const url = `https://translate.google.com/translate_a/single?client=webapp&sl=${from}&tl=${to}&hl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('Google 翻译请求失败');
  const data = await res.json();
  // 结果在 data[0][0][0]
  return data?.[0]?.[0]?.[0] || '';
} 