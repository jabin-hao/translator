export async function googleTranslate(text: string, from: string, to: string): Promise<string> {
  const url = `https://translate.google.com/translate_a/single?client=webapp&sl=${from}&tl=${to}&hl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google翻译请求失败: ${res.status} ${errText}`)
  }
  
  const raw = await res.text()
  try {
    const data = JSON.parse(raw)
    return data[0][0][0]
  } catch {
    throw new Error('Google翻译返回内容不是JSON: ' + raw)
  }
} 