/**
 * 设置模块统一导出
 */

// 常量和配置
export * from './constants';

// 核心设置 Hook
export { useGlobalSettings } from './hooks/useGlobalSettings';

// 功能模块 Hooks
export { useThemeSettings } from './hooks/useThemeSettings';
export { useEngineSettings } from './hooks/useEngineSettings';
export { useTextTranslateSettings } from './hooks/useTextTranslateSettings';
export { useLanguageSettings } from './hooks/useLanguageSettings';
export { useInputTranslateSettings } from './hooks/useInputTranslateSettings';
export { useSpeechSettings } from './hooks/useSpeechSettings';
export { useCacheSettings } from './hooks/useCacheSettings';
export { useShortcutSettings } from './hooks/useShortcutSettings';
export { useFavoritesSettings } from './hooks/useFavoritesSettings';
export { usePageTranslateSettings } from './hooks/usePageTranslateSettings';