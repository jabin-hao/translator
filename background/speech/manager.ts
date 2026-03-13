import type { SpeechOptions, SpeechResult, SpeechService } from '~lib/constants/speech';
import { SPEECH_KEY } from '~lib/settings/settings';
import { storageApi } from '~lib/storage/storage';

import { EdgeSpeechService } from './edge';
import { GoogleSpeechService } from './google';
import { LocalSpeechService } from './local';

interface BaseSpeechService {
  name: SpeechService;
  speak(options: SpeechOptions): Promise<SpeechResult>;
  stop(): void;
}

type StoredSpeechSettings = {
  engine?: SpeechService;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
};

function normalizeSpeechService(service?: SpeechService): SpeechService {
  return service === 'local' ? 'browser' : service || 'google';
}

export class SpeechManager {
  private services = new Map<SpeechService, BaseSpeechService>();
  private currentService: SpeechService = 'google';

  constructor() {
    const browserService = new LocalSpeechService();

    this.services.set('browser', browserService);
    this.services.set('local', browserService);
    this.services.set('google', new GoogleSpeechService());
    this.services.set('edge', new EdgeSpeechService());
    void this.loadUserSettings();
  }

  private async loadUserSettings() {
    try {
      const settings = (await storageApi.get<StoredSpeechSettings>(SPEECH_KEY)) || undefined;
      const requestedEngine = normalizeSpeechService(settings?.engine);

      if (this.services.has(requestedEngine)) {
        this.currentService = requestedEngine;
      }
    } catch (error) {
      console.error('Failed to load speech settings:', error);
    }
  }

  getCurrentService(): SpeechService {
    return this.currentService;
  }

  async speak(options: SpeechOptions): Promise<SpeechResult> {
    this.stop();
    await this.loadUserSettings();

    const service = this.services.get(this.currentService);
    if (!service) {
      return {
        success: false,
        error: `Speech service '${this.currentService}' not found`,
      };
    }

    try {
      const settings = (await storageApi.get<StoredSpeechSettings>(SPEECH_KEY)) || {};
      const finalOptions: SpeechOptions = {
        ...options,
        engine: this.currentService,
        voice: options.voice ?? settings.voice ?? '',
        speed: options.speed ?? settings.speed ?? 1,
        pitch: options.pitch ?? settings.pitch ?? 1,
        volume: options.volume ?? settings.volume ?? 1,
      };

      const result = await service.speak(finalOptions);
      if (result.success || (result.requiresBrowser && result.error === 'browser_tts_required')) {
        return result;
      }

      const fallbackOrder: SpeechService[] = ['edge', 'google', 'browser'].filter(
        (serviceName): serviceName is SpeechService => serviceName !== this.currentService
      );

      for (const fallbackService of fallbackOrder) {
        const fallbackInstance = this.services.get(fallbackService);
        if (!fallbackInstance) {
          continue;
        }

        try {
          const fallbackResult = await fallbackInstance.speak(finalOptions);
          if (
            fallbackResult.success ||
            (fallbackResult.requiresBrowser && fallbackResult.error === 'browser_tts_required')
          ) {
            return fallbackResult;
          }
        } catch (error) {
          console.error(`[SpeechManager] Fallback service "${fallbackService}" failed:`, error);
        }
      }

      return {
        success: false,
        error: result.error || 'No TTS service is available',
      };
    } catch (error) {
      console.error('Speech service invocation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  stop(): void {
    for (const service of this.services.values()) {
      service.stop();
    }
  }

  async checkServiceAvailability(service: SpeechService): Promise<boolean> {
    return this.services.has(normalizeSpeechService(service));
  }
}

export const speechManager = new SpeechManager();
