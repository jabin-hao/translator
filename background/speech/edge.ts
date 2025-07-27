import type { SpeechOptions, SpeechResult, SpeechService } from '../../lib/speech';
import { LANGUAGES } from '../../lib/languages';

export class EdgeSpeechService {
  name: SpeechService = 'edge';
  
  // 静态属性，用于存储认证信息
  private static lastRequestTime: number | null = null;
  private static IG: string | null = null;
  private static IID: string | null = null;
  private static key: number | null = null;
  private static token: string | null = null;
  private static notFound = false;
  private static promise: Promise<void> | null = null;

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    try {
      const { text, lang, voice, speed = 1, pitch = 1, volume = 1 } = options;

      // 1. 获取 Bing 认证信息
      await this.findAuth();

      // 2. 获取语音数据
      const languageData = this.getLanguageData(lang);
      if (!languageData) {
        throw new Error(`不支持的语言: ${lang}`);
      }

      // 3. 构造 SSML
      const ssml = `
        <speak version="1.0" xml:lang="${languageData.locale}">
          <voice xml:lang="${languageData.locale}" xml:gender="${languageData.gender}" name="${languageData.voice}">
            <prosody rate="${this.convertSpeedToPercentage(speed)}%" pitch="${pitch}">
              ${text}
            </prosody>
          </voice>
        </speak>
      `;

      console.log('Edge TTS 请求参数:', { text, lang, voiceName: languageData.voice, ssml });

      // 4. 构造请求参数
      const params = new URLSearchParams();
      params.append("ssml", ssml);
      params.append("token", EdgeSpeechService.token || '');
      params.append("key", (EdgeSpeechService.key || 0).toString());

      // 5. 发送请求
      const response = await fetch(
        `https://www.bing.com/tfettts?isVertical=1&&IG=${encodeURIComponent(EdgeSpeechService.IG || '')}&IID=${encodeURIComponent(EdgeSpeechService.IID || '')}.1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://www.bing.com',
            'Referer': 'https://www.bing.com/',
          },
          body: params.toString(),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Edge TTS 请求失败:', response.status, errorText);
        throw new Error(`Edge TTS 请求失败: ${response.status} ${errorText}`);
      }

      // 6. 返回音频数据
      const audioBlob = await response.blob();
      
      // 将 blob 转换为 base64 字符串
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode(...uint8Array));

      console.log('Edge TTS 成功生成音频');

      return {
        success: true,
        audioData: base64String,
        audioType: audioBlob.type || 'audio/mpeg'
      };
    } catch (error) {
      console.error('Edge TTS 错误:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  stop(): void {
    // Edge TTS 不需要特殊的停止逻辑
  }

  // 获取 Bing 认证信息（参考 Traduzir-paginas-web）
  private async findAuth(): Promise<void> {
    if (EdgeSpeechService.promise) return await EdgeSpeechService.promise;

    EdgeSpeechService.promise = new Promise(async (resolve) => {
      let updateBingAuth = false;
      if (EdgeSpeechService.lastRequestTime) {
        const date = new Date();
        if (EdgeSpeechService.IG) {
          date.setMinutes(date.getMinutes() - 30);
        } else if (EdgeSpeechService.notFound) {
          date.setMinutes(date.getMinutes() - 5);
        } else {
          date.setMinutes(date.getMinutes() - 2);
        }
        if (date.getTime() > EdgeSpeechService.lastRequestTime) {
          updateBingAuth = true;
        }
      } else {
        updateBingAuth = true;
      }

      if (updateBingAuth) {
        EdgeSpeechService.lastRequestTime = Date.now();

        try {
          const response = await fetch("https://www.bing.com/translator", {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const responseText = await response.text();
          
          if (!(responseText && responseText.length > 1)) {
            throw new Error("Not found");
          }

          const IG = responseText.match(/IG:"([^"]+)"/)?.[1];
          const IID = responseText.match(/data\-iid\="([^"]+)"/)?.[1];

          const abhStartText = "params_AbusePreventionHelper = [";
          const abhStartIndex = responseText.indexOf(abhStartText);
          if (abhStartIndex === -1) {
            throw new Error("Not found 2");
          }
          const abhEndIndex = responseText.indexOf("]", abhStartIndex);
          if (abhEndIndex === -1) {
            throw new Error("Not found 3");
          }
          const abhText = responseText.slice(
            abhStartIndex + abhStartText.length - 1,
            abhEndIndex + 1
          );
          const abh = JSON.parse(abhText);
          const key = abh[0];
          const token = abh[1];

          EdgeSpeechService.IG = IG || null;
          EdgeSpeechService.IID = IID || null;
          EdgeSpeechService.key = key || null;
          EdgeSpeechService.token = token || null;
          EdgeSpeechService.notFound = false;
          
          console.log('Bing 认证信息获取成功:', { IG, IID, key: key ? '***' : null, token: token ? '***' : null });
        } catch (e) {
          console.error('Bing 认证信息获取失败:', e);
          EdgeSpeechService.notFound = true;
        } finally {
          resolve();
        }
      } else {
        resolve();
      }
    });

    return await EdgeSpeechService.promise;
  }

  // 获取语言数据（参考 Traduzir-paginas-web）
  private getLanguageData(language: string) {
    console.log('getLanguageData 输入语言:', language);
    
    // 语言代码替换
    const replacements = [
      { search: "zh-CN", replace: "zh-Hans" },
      { search: "zh-TW", replace: "zh-Hant" },
    ];
    
    replacements.forEach((r) => {
      if (language === r.search) {
        language = r.replace;
      }
    });

    // 语言数据映射
    const languageData = [
      { language: 'zh-Hans', locale: 'zh-CN', gender: 'Female', voice: 'zh-CN-XiaoxiaoNeural' },
      { language: 'zh-Hant', locale: 'zh-CN', gender: 'Female', voice: 'zh-CN-XiaoxiaoNeural' },
      { language: 'en', locale: 'en-US', gender: 'Female', voice: 'en-US-AriaNeural' },
      { language: 'ja', locale: 'ja-JP', gender: 'Female', voice: 'ja-JP-NanamiNeural' },
      { language: 'ko', locale: 'ko-KR', gender: 'Female', voice: 'ko-KR-SunHiNeural' },
      { language: 'fr', locale: 'fr-FR', gender: 'Female', voice: 'fr-FR-DeniseNeural' },
      { language: 'de', locale: 'de-DE', gender: 'Female', voice: 'de-DE-KatjaNeural' },
      { language: 'es', locale: 'es-ES', gender: 'Female', voice: 'es-ES-ElviraNeural' },
      { language: 'ru', locale: 'ru-RU', gender: 'Female', voice: 'ru-RU-DariyaNeural' },
      { language: 'pt', locale: 'pt-PT', gender: 'Female', voice: 'pt-PT-FernandaNeural' }
    ];

    const result = languageData.find((data) => data.language === language);
    console.log('getLanguageData 找到的语言数据:', result);
    return result;
  }

  // 转换速度到百分比
  private convertSpeedToPercentage(speed: number): string {
    const percentage = Math.round((speed - 1) * 100);
    return percentage.toString();
  }

  // 获取支持的语言列表
  getSupportedLanguages(): string[] {
    return LANGUAGES.map(lang => lang.code);
  }

  // 检查语言是否支持
  isLanguageSupported(lang: string): boolean {
    return this.getSupportedLanguages().includes(lang);
  }
} 