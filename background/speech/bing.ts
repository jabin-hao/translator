import type { SpeechOptions, SpeechResult, SpeechService } from '../../lib/speech';

export class BingSpeechService {
  name: SpeechService = 'bing';

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, voice, speed = 1, pitch = 1, volume = 1 } = options;

      // 1. 获取 Edge Token
      const tokenRes = await fetch('https://edge.microsoft.com/translate/auth');
      if (!tokenRes.ok) throw new Error('获取 Edge Token 失败');
      const token = await tokenRes.text();

      // 2. 选择 voice
      const voiceName = voice || getDefaultVoice(lang);

      // 3. 构造 SSML（rate/pitch/volume 必须是百分比字符串）
      // Traduzir-paginas-web 默认 rate/pitch/volume 都是 0%/0%/100%
      const ssml = `
        <speak version='1.0' xml:lang='${lang}'>
          <voice xml:lang='${lang}' xml:gender='Female' name='${voiceName}'>
            <prosody rate='0%' pitch='0%' volume='100%'>
              ${text}
            </prosody>
          </voice>
        </speak>
      `;

      // 4. POST 到微软 TTS
      const ttsRes = await fetch(
        `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://www.bing.com'
          },
          body: ssml
        }
      );
      if (!ttsRes.ok) {
        const errText = await ttsRes.text().catch(() => '');
        throw new Error('Bing TTS 失败: ' + ttsRes.status + ' ' + errText);
      }

      // 5. 返回音频 blob url
      const audioBlob = await ttsRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        success: true,
        audioUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  stop(): void {}
}

// 推荐的 voice 选择函数，参考 Traduzir-paginas-web
function getDefaultVoice(lang: string) {
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