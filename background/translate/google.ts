let cachedKey: string | null = null;

async function getGoogleApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  
  // 备用key，使用 TextDecoder 解码字节数组（与 Traduzir-paginas-web-master 一致）
  const fallbackKey = new TextDecoder().decode(
    new Uint8Array([
      65, 73, 122, 97, 83, 121, 65, 84, 66, 88, 97, 106, 118, 122, 81,
      76, 84, 68, 72, 69, 81, 98, 99, 112, 113, 48, 73, 104, 101, 48,
      118, 87, 68, 72, 109, 79, 53, 50, 48,
    ])
  );
  
  try {
    const res = await fetch("https://translate.googleapis.com/_/translate_http/_/js/k=translate_http.tr.en_US.YusFYy3P_ro.O/am=AAg/d=1/exm=el_conf/ed=1/rs=AN8SPfq1Hb8iJRleQqQc8zhdzXmF9E56eQ/m=el_main");
    const text = await res.text();
    const match = text.match(/['"]x\-goog\-api\-key['"]\s*\:\s*['"](\w{39})['"]/i);
    if (match && match[1]) {
      cachedKey = match[1];
      return cachedKey;
    }
  } catch (e) {
    console.error('获取 Google API Key 失败:', e);
  }
  cachedKey = fallbackKey;
  return cachedKey;
}

export async function googleTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    const apiKey = await getGoogleApiKey();
    const url = "https://translate-pa.googleapis.com/v1/translateHtml";
    // 支持多句，单句也兼容
    const body = JSON.stringify([
      [Array.isArray(text) ? text : [text], from, to],
      "te"
    ]);
    const headers = {
      "Content-Type": "application/application/json+protobuf",
      "X-goog-api-key": apiKey
    };
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google翻译请求失败: ${res.status} ${errText}`);
    }
    const data = await res.json();
    // 返回第一个翻译结果
    if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]) {
      return data[0][0];
    }
    throw new Error("Google翻译返回内容异常: " + JSON.stringify(data));
  } catch (error) {
    console.error('Google翻译错误:', error);
    throw error;
  }
} 

export async function googleTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  try {
    const apiKey = await getGoogleApiKey();
    const url = "https://translate-pa.googleapis.com/v1/translateHtml";
    const body = JSON.stringify([
      [texts, from, to],
      "te"
    ]);
    const headers = {
      "Content-Type": "application/application/json+protobuf",
      "X-goog-api-key": apiKey
    };
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google批量翻译请求失败: ${res.status} ${errText}`);
    }
    const data = await res.json();
    // 返回批量翻译结果数组
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0];
    }
    throw new Error("Google批量翻译返回内容异常: " + JSON.stringify(data));
  } catch (error) {
    console.error('Google批量翻译错误:', error);
    throw error;
  }
} 