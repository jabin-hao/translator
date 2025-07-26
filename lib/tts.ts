// lib/tts.ts

/**
 * 获取微软 Bing TTS 音频 blob url
 * @param text 朗读文本
 * @param lang 语言代码（如 zh-CN）
 * @param voice 可选，语音名称
 */
export async function bingTTSFetch(text: string, lang: string, voice?: string): Promise<string> {
  // 1. 获取 Edge Token
  const tokenRes = await fetch('https://edge.microsoft.com/translate/auth');
  if (!tokenRes.ok) throw new Error('获取 Edge Token 失败');
  const token = await tokenRes.text();

  // 2. 选择 voice
  const voiceName = voice || getDefaultVoice(lang);

  // 3. 构造 SSML
  const ssml = `
    <speak version='1.0' xml:lang='${lang}'>
      <voice xml:lang='${lang}' xml:gender='Female' name='${voiceName}'>
        <prosody rate='0%' pitch='0%' volume='100%'>
          ${text}
        </prosody>
      </voice>
    </speak>
  `;

  // 4. fetch 音频
  const ttsRes = await fetch(
    `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': navigator.userAgent,
        'Origin': location.origin
      },
      body: ssml
    }
  );
  if (!ttsRes.ok) {
    const errText = await ttsRes.text().catch(() => '');
    throw new Error('Bing TTS 失败: ' + ttsRes.status + ' ' + errText);
  }
  const audioBlob = await ttsRes.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  return audioUrl;
}

/**
 * 推荐的 voice 选择函数，参考 Traduzir-paginas-web
 */
export function getDefaultVoice(lang: string): string {
  if (lang.startsWith('zh')) return 'zh-CN-XiaoxiaoNeural';
  if (lang.startsWith('en')) return 'en-US-AriaNeural';
  if (lang.startsWith('ru')) return 'ru-RU-DariyaNeural';
  if (lang.startsWith('ja')) return 'ja-JP-NanamiNeural';
  if (lang.startsWith('ko')) return 'ko-KR-SunHiNeural';
  if (lang.startsWith('fr')) return 'fr-FR-DeniseNeural';
  if (lang.startsWith('de')) return 'de-DE-KatjaNeural';
  if (lang.startsWith('es')) return 'es-ES-ElviraNeural';
  return 'zh-CN-XiaoxiaoNeural';
}

/**
 * Google Translate TTS fetch
 */
export async function googleTTSFetch(text: string, lang: string): Promise<string> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  const ttsRes = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': navigator.userAgent,
      'Referer': 'https://translate.google.com/',
    }
  });
  if (!ttsRes.ok) {
    const errText = await ttsRes.text().catch(() => '');
    throw new Error('Google TTS 失败: ' + ttsRes.status + ' ' + errText);
  }
  const audioBlob = await ttsRes.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  return audioUrl;
}

/**
 * 统一 TTS 朗读，优先用 Google TTS，失败时自动 fallback 到 Web Speech API
 * @param text 朗读文本
 * @param lang 语言代码
 * @param showMessage 可选，消息提示函数
 */
export async function ttsSpeakWithFallback(text: string, lang: string, showMessage?: (type: string, msg: string) => void) {
  try {
    if (showMessage) showMessage('info', '正在获取朗读音频...');
    const audioUrl = await googleTTSFetch(text, lang);
    const audio = new Audio(audioUrl);
    window._bingTtsAudio = audio;
    audio.onended = () => {
      if (showMessage) showMessage('info', '朗读结束');
    };
    audio.onerror = (e) => {
      if (showMessage) showMessage('error', '音频播放失败');
    };
    audio.play();
    if (showMessage) showMessage('success', '朗读开始');
  } catch (err: any) {
    if (showMessage) showMessage('warning', 'Google TTS 失败，已切换到本地朗读');
    // fallback: Web Speech API
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.onend = () => {
      if (showMessage) showMessage('info', '朗读结束');
    };
    utter.onerror = (e) => {
      if (showMessage) showMessage('error', '本地朗读失败');
    };
    window.speechSynthesis.speak(utter);
  }
}

declare global {
  interface Window {
    _bingTtsAudio?: HTMLAudioElement | null;
  }
} 