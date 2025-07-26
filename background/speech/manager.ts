import type { SpeechOptions, SpeechResult, SpeechService } from '../../lib/speech';
import { GoogleSpeechService } from './google';
import { BingSpeechService } from './bing';
import { LocalSpeechService } from './local';
import { Storage } from '@plasmohq/storage';

// 基础朗读服务接口
interface BaseSpeechService {
  name: SpeechService;
  speak(options: SpeechOptions): Promise<SpeechResult>;
  stop(): void;
}

// 朗读管理器
export class SpeechManager {
  private services: Map<SpeechService, BaseSpeechService> = new Map();
  private currentService: SpeechService = 'google';
  private currentAudio: HTMLAudioElement | null = null;
  private storage = new Storage();

  constructor() {
    this.services.set('google', new GoogleSpeechService());
    this.services.set('bing', new BingSpeechService());
    this.services.set('local', new LocalSpeechService());
    
    // 初始化时读取用户设置
    this.loadUserSettings();
  }

  // 加载用户设置
  private async loadUserSettings() {
    try {
      const settings = await this.storage.get('speech_settings');
      if (settings && typeof settings === 'object') {
        const { engine, speed, pitch, volume } = settings as any;
        if (engine && this.services.has(engine)) {
          this.currentService = engine;
        }
      }
    } catch (error) {
      console.error('加载朗读设置失败:', error);
    }
  }

  // 设置朗读服务
  setService(service: SpeechService): void {
    if (this.services.has(service)) {
      this.currentService = service;
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
      const settings = await this.storage.get('speech_settings');
      let userSettings = { speed: 1, pitch: 1, volume: 1 };
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
      
      const result = await service.speak(finalOptions);
      
      // Web Speech API 会自动播放，不需要额外的音频播放逻辑
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 停止朗读
  stop(): void {
    // 停止当前音频播放
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    // 停止当前服务
    const service = this.services.get(this.currentService);
    if (service) {
      service.stop();
    }
  }

  // 检查服务是否可用
  async checkServiceAvailability(service: SpeechService): Promise<boolean> {
    const speechService = this.services.get(service);
    if (!speechService) return false;
    
    try {
      const result = await speechService.speak({
        text: 'test',
        lang: 'en'
      });
      return result.success;
    } catch {
      return false;
    }
  }
}

// 创建全局朗读管理器实例
export const speechManager = new SpeechManager(); 