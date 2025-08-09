// @ts-ignore
import googleIcon from '../../assets/google.svg?url';
// @ts-ignore
import bingIcon from '../../assets/bing.svg?url';
// @ts-ignore
import deeplIcon from '../../assets/deepl.svg?url';
// @ts-ignore
import yandexIcon from '../../assets/yandex.svg?url';

// 翻译引擎统一配置
export const TRANSLATE_ENGINES = [
    { label: 'Bing', value: 'bing', icon: bingIcon },
    { label: 'Google', value: 'google', icon: googleIcon },
    { label: 'DeepL', value: 'deepl', icon: deeplIcon, disabled: true },
    { label: 'Yandex', value: 'yandex', icon: yandexIcon, disabled: true },
];

// TTS引擎统一配置
export const TTS_ENGINES = [
    {
        name: 'google',
        label: 'Google TTS',
        description: '谷歌语音合成 (推荐，稳定可靠)',
        priority: 1
    },
    {
        name: 'browser',
        label: '浏览器内置',
        description: '使用浏览器内置的 Web Speech API',
        priority: 3
    }
] as const;
