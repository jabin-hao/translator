import {sendToBackground} from '@plasmohq/messaging';
import {getEngineLangCode, getTTSLang} from '~lib/constants/languages';
import { GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import type { GlobalSettings } from '~lib/settings/settings';
import {storageApi} from "~lib/storage/storage";

// 修改翻译API调用，集成缓存功能
export async function callTranslateAPI(
    text: string,
    from: string,
    to: string,
    engine = 'bing'
): Promise<{ result: string, engine: string }> {
    const fromMapped = getEngineLangCode(from, engine);
    const toMapped = getEngineLangCode(to, engine);

    try {
        // 读取用户的缓存设置 - 从全局配置获取
        let cacheEnabled = true; // 默认启用缓存
        try {
            const globalSettings = await storageApi.get(GLOBAL_SETTINGS_KEY) as unknown as GlobalSettings;
            if (globalSettings?.cache?.enabled !== undefined) {
                cacheEnabled = globalSettings.cache.enabled;
            }
        } catch (error) {
            console.error('获取缓存设置失败:', error);
            // 保持默认值 true
        }

        // 使用通用消息处理器
        const response = await sendToBackground({
            name: "handle" as never,
            body: {
                service: 'translate',
                action: 'translate',
                text,
                options: {
                    from: fromMapped,
                    to: toMapped,
                    engine,
                    useCache: cacheEnabled, // 使用用户设置的缓存选项
                },
            },
        });

        if (response.success && response.data) {
            return {
                result: response.data.translation,
                engine: response.data.engine
            };
        } else {
            console.error(response.error);
            throw new Error(response.error || '翻译失败');
        }
    } catch (error) {
        console.error('翻译API调用失败:', error);
        throw error;
    }
}

// TTS API调用
export async function callTTSAPI(text: string, lang: string): Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }> {
    try {
        const ttsLang = getTTSLang(lang);
        
        const response = await sendToBackground({
            name: "handle" as never,
            body: {
                service: 'speech',
                action: 'speak',
                options: {
                    text,
                    lang: ttsLang,
                    // 注意：这里不需要传递speed、pitch、volume参数
                    // 因为background的语音管理器会自动从用户设置中读取这些参数
                },
            },
        });

        if (response.success && response.data) {
            // 如果 audioData 是 Uint8Array，转换为 ArrayBuffer
            let audioData = response.data.audioData;
            if (audioData && audioData.constructor === Uint8Array) {
                audioData = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
            }
            
            return {
                success: true,
                audioData: audioData
            };
        } else {
            return {
                success: false,
                error: response.error || 'TTS调用失败'
            };
        }
    } catch (error) {
        console.error('TTS API调用失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'TTS调用失败'
        };
    }
}

// 停止TTS
export async function stopTTSAPI(): Promise<void> {
    try {
        await sendToBackground({
            name: "handle" as never,
            body: {
                service: 'speech',
                action: 'stop',
            },
        });
    } catch (error) {
        console.error('停止TTS失败:', error);
    }
}
