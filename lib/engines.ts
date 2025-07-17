// @ts-ignore
import googleIcon from '../assets/google.svg?url';
// @ts-ignore
import bingIcon from '../assets/bing.svg?url';
// @ts-ignore
import deeplIcon from '../assets/deepl.svg?url';
// @ts-ignore
import yandexIcon from '../assets/yandex.svg?url';

// 翻译引擎统一配置
export const TRANSLATE_ENGINES = [
    { label: 'Bing', value: 'bing', icon: bingIcon },
    { label: 'Google', value: 'google', icon: googleIcon },
    { label: 'DeepL', value: 'deepl', icon: deeplIcon, disabled: true },
    { label: 'Yandex', value: 'yandex', icon: yandexIcon, disabled: true },
]; 