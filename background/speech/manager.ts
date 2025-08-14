import type {SpeechOptions, SpeechResult, SpeechService} from '~lib/translate/speech';
import {LocalSpeechService} from './local';
import {GoogleSpeechService} from './google';
import {SPEECH_KEY} from '~lib/constants/settings';
import {storageApi} from "~lib/storage/storage";

// 基础朗读服务接口
interface BaseSpeechService {
    name: SpeechService;

    speak(options: SpeechOptions): Promise<SpeechResult>;

    stop(): void;
}

// 朗读管理器
export class SpeechManager {
    private services: Map<SpeechService, BaseSpeechService> = new Map();
    private currentService: SpeechService = 'google'; // 默认使用 Google TTS（更稳定）
    private currentAudio: HTMLAudioElement | null = null;

    constructor() {
        this.services.set('browser', new LocalSpeechService());
        this.services.set('google', new GoogleSpeechService());

        // 初始化时读取用户设置
        this.loadUserSettings().then(() => {});
    }

    // 加载用户设置
    private async loadUserSettings() {
        try {
            const settings = await storageApi.get(SPEECH_KEY);

            if (settings && typeof settings === 'object') {
                const {engine, speed, pitch, volume} = settings as any;
                if (engine && this.services.has(engine)) {
                    this.currentService = engine;
                }
            }
        } catch (error) {
            console.error('加载朗读设置失败:', error);
        }
    }

// 获取当前服务
    getCurrentService(): SpeechService {
        return this.currentService;
    }

// 朗读文本
    async speak(options: SpeechOptions): Promise<SpeechResult> {
        // 停止当前朗读
        this.stop();

        // 重新加载用户设置
        await this.loadUserSettings();

        const service = this.services.get(this.currentService);
        if (!service) {
            return {
                success: false,
                error: `Speech service '${this.currentService}' not found`
            };
        }

        try {
            // 获取用户设置的朗读参数
            const settings = await storageApi.get(SPEECH_KEY);

            let userSettings = {speed: 1, pitch: 1, volume: 1};
            if (settings && typeof settings === 'object') {
                const userSettingsData = settings as any;
                userSettings = {
                    speed: userSettingsData.speed ?? 1,
                    pitch: userSettingsData.pitch ?? 1,
                    volume: userSettingsData.volume ?? 1
                };
            }
            
            // 合并用户设置和传入的选项
            const finalOptions: SpeechOptions = {
                ...options,
                speed: options.speed ?? userSettings.speed,
                pitch: options.pitch ?? userSettings.pitch,
                volume: options.volume ?? userSettings.volume,
            };

            // 首先尝试用户选择的服务
            const result = await service.speak(finalOptions);
           
            // 如果首选服务成功，直接返回
            if (result.success) {
                return result;
            }

            // 如果是browser TTS且返回requiresBrowser标记，直接返回让content script处理
            if (result.requiresBrowser && result.error === 'browser_tts_required') {
                return result;
            }

            // 如果Google TTS失败，直接回退到Browser TTS
            if (this.currentService === 'google') {
                console.warn(`[Speech Manager] Google TTS 失败，尝试自动回退:`, result.error);
                
                return {
                    success: false,
                    error: 'browser_tts_required',
                    requiresBrowser: true
                };
            }

            // 如果首选服务失败，尝试其他服务作为fallback
            // 定义回退顺序：优先使用远程TTS，最后使用browser TTS
            const allServices = ['google', 'browser'];
            const fallbackOrder = allServices.filter(s => s !== this.currentService);

            for (const fallbackService of fallbackOrder) {
                const fallbackInstance = this.services.get(fallbackService as SpeechService);

                if (fallbackInstance) {
                    try {
                        const fallbackResult = await fallbackInstance.speak(finalOptions);

                        if (fallbackResult.success) {
                            return fallbackResult;
                        }

                        // 如果是browser TTS且返回requiresBrowser标记，也认为是成功的回退
                        if (fallbackResult.requiresBrowser && fallbackResult.error === 'browser_tts_required') {
                            return fallbackResult;
                        }
                    } catch (error) {
                        console.error(`[Speech Manager] ${fallbackService} 回退时出错:`, error);
                    }
                }
            }
            
            return {
                success: false,
                error: '所有TTS服务都不可用'
            };
        } catch (error) {
            console.error('TTS 服务调用失败:', error);
            return {success: false, error: error.message};
        }
    }

    // 停止朗读
    stop(): void {
        // 停止所有服务的朗读
        for (const service of this.services.values()) {
            service.stop();
        }

        // 停止当前音频播放
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    // 检查服务可用性
    async checkServiceAvailability(service: SpeechService): Promise<boolean> {
        return this.services.has(service);
    }
}

// 创建全局实例
export const speechManager = new SpeechManager(); 