export async function googleTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    console.log('Google翻译开始:', { text, from, to });
    
    const url = `https://translate.google.com/translate_a/single?client=webapp&sl=${from}&tl=${to}&hl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    
    const res = await fetch(url, { 
      credentials: 'omit',
      signal: AbortSignal.timeout(15000), // 15秒超时
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google翻译请求失败: ${res.status} ${errText}`);
    }
    
    const raw = await res.text();
    console.log('Google翻译响应:', raw.substring(0, 200) + '...');
    
    try {
      const data = JSON.parse(raw);
      const result = data[0][0][0];
      console.log('Google翻译完成:', result);
      return result;
    } catch (parseError) {
      throw new Error('Google翻译返回内容不是JSON: ' + raw.substring(0, 200));
    }
  } catch (error) {
    console.error('Google翻译错误:', error);
    throw error;
  }
} 