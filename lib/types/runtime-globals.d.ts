export {};

declare global {
  interface TranslationState {
    isPageTranslated: boolean;
    stopTranslation: (() => void) | null;
  }

  interface Window {
    __translationState?: TranslationState;
    __originalPageTextMap?: Map<Node, string>;
    __autoFullPageTranslated?: boolean;
    triggerInputTranslate?: () => void;
    callTranslateAPI?: (
      text: string,
      from: string,
      to: string,
      engine: string
    ) => Promise<{ result: string; engine: string }>;
  }
}
