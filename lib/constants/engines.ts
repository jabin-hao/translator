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
    { label: 'DeepL', value: 'deepl', icon: deeplIcon },
    { label: 'Yandex', value: 'yandex', icon: yandexIcon, disabled: true },
];

// TTS引擎统一配置
export const TTS_ENGINES = [
    { label: 'Edge TTS', value: 'edge', icon: bingIcon, description: 'Microsoft Edge 文本转语音服务，音质最佳', disabled: false },
    { label: 'Google TTS', value: 'google', icon: googleIcon, description: 'Google 文本转语音服务，稳定可靠', disabled: false },
    { label: 'Browser TTS', value: 'browser', icon: null, description: '浏览器内置语音合成，无需网络', disabled: false },
];
