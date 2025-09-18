// 导入统一的类型定义
import type { TranslateEngineConfig, TTSEngineConfig } from './types';

// 翻译引擎统一配置
export const TRANSLATE_ENGINES: TranslateEngineConfig[] = [
    { label: 'Bing', value: 'bing', icon: 'brand-edge', description: '免费，支持多语言' },
    { label: 'Google', value: 'google', icon: 'brand-google', description: '免费，支持多语言' },
    { label: 'DeepL', value: 'deepl', icon: 'language', description: '高质量翻译，需要API密钥' },
    { label: 'Yandex', value: 'yandex', icon: 'brand-yandex', description: '俄语翻译效果好' },
];

// TTS引擎统一配置
export const TTS_ENGINES: TTSEngineConfig[] = [
    {
        value: 'google',
        label: 'Google TTS',
        description: '谷歌语音合成 (推荐，稳定可靠)',
        priority: 1
    },
    {
        value: 'browser',
        label: '浏览器内置',
        description: '使用浏览器内置的 Web Speech API',
        priority: 3
    }
];
