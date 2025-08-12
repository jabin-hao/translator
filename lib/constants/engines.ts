// @ts-ignore
import googleIcon from '../../assets/google.svg?url';
// @ts-ignore
import bingIcon from '../../assets/bing.svg?url';
// @ts-ignore
import deeplIcon from '../../assets/deepl.svg?url';
// @ts-ignore
import yandexIcon from '../../assets/yandex.svg?url';

// 翻译引擎接口
export interface TranslateEngine {
    label: string;
    value: string;
    icon: string;
    description: string;
    disabled?: boolean;
}

// 翻译引擎统一配置
export const TRANSLATE_ENGINES: TranslateEngine[] = [
    { label: 'Bing', value: 'bing', icon: bingIcon, description: '免费，支持多语言' },
    { label: 'Google', value: 'google', icon: googleIcon, description: '免费，支持多语言' },
    { label: 'DeepL', value: 'deepl', icon: deeplIcon, description: '高质量翻译，需要API密钥' },
    { label: 'Yandex', value: 'yandex', icon: yandexIcon, description: '俄语翻译效果好' },
];

// TTS引擎统一配置
export const TTS_ENGINES = [
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
] as const;
