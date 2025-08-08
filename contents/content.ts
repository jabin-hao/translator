import {sendToBackground} from '@plasmohq/messaging';
import {getEngineLangCode, getTTSLang} from '~lib/constants/languages';
import {CACHE_KEY} from '~lib/constants/settings';
import {storageApi} from "~lib/utils/storage";

// 初始化默认设置
export async function initializeDefaultSettings() {
    try {
        // 检查并设置缓存默认值
        const cacheEnabled = await storageApi.get(CACHE_KEY);
        if (cacheEnabled === null || cacheEnabled === undefined) {
            await storageApi.set(CACHE_KEY, true);
        }
    } catch (error) {
        console.error('初始化默认设置失败:', error);
    }
}

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
                    useCache: true, // 启用缓存
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
                text,
                options: {
                    lang: ttsLang,
                },
            },
        });

        if (response.success && response.data) {
            return {
                success: true,
                audioData: response.data.audioData
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
