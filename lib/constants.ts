// 存储相关常量统一管理
export const SPEECH_KEY = 'speech_settings';
export const DEEPL_API_KEY = 'deepl_api_key';
export const PAGE_LANG_KEY = 'pageTargetLang';
export const TEXT_LANG_KEY = 'textTargetLang';
export const FAVORITE_LANGS_KEY = 'favoriteLangs';
export const NEVER_LANGS_KEY = 'neverLangs';
export const ALWAYS_LANGS_KEY = 'alwaysLangs';
export const TRANSLATE_SETTINGS_KEY = 'translate_settings';
export const SITE_TRANSLATE_SETTINGS_KEY = 'site_translate_settings';
export const DICT_KEY = 'dict';
export const CACHE_KEY = 'translation_cache_enabled';
export const POPUP_SETTINGS_KEY = 'popup_settings';
export const PLUGIN_THEME_KEY = 'plugin_theme_mode';
export const CONTENT_THEME_KEY = 'content_theme_mode';
export const PROGRAMMING_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
  'scala', 'perl', 'lua', 'dart', 'objective-c', 'shell', 'bash', 'powershell', 'sql', 'html', 'css', 'json', 'yaml', 'xml',
  'r', 'matlab', 'groovy', 'elixir', 'clojure', 'haskell', 'fortran', 'assembly', 'erlang', 'f#', 'vb', 'visual basic', 'delphi'
];

export const CODE_FILE_SUFFIXES = [
  '.js', '.ts', '.jsx', '.tsx', '.c', '.cpp', '.h', '.hpp', '.py', '.java', '.go', '.rb', '.php', '.cs', '.swift', '.kt', '.m', '.sh', '.bat', '.pl', '.rs', '.dart', '.scala', '.lua', '.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.md', '.txt', '.csv', '.tsv', '.log', '.html', '.htm', '.css', '.scss', '.less', '.vue', '.svelte', '.lock', '.toml', '.gradle', '.make', '.mk', '.dockerfile', '.gitignore', '.gitattributes', '.env', '.config', '.properties', '.asm', '.sql', '.db', '.db3', '.sqlite', '.ps1', '.psm1', '.jsp', '.asp', '.aspx', '.vb', '.vbs', '.f90', '.f95', '.f03', '.f08', '.r', '.jl', '.groovy', '.erl', '.ex', '.exs', '.clj', '.cljs', '.edn', '.coffee', '.mjs', '.cjs', '.eslintrc', '.babelrc', '.npmrc', '.prettierrc', '.editorconfig', '.plist', '.crt', '.pem', '.key', '.csr', '.pub'
];

export const GITHUB_CODE_SELECTORS = [
  '.blob-wrapper',
  '.blob-code',
  '.blob-code-inner',
  '.blob-code-marker',
  '.blob-code-context',
  '.blob-code-addition',
  '.blob-code-deletion',
  '.blob-num',
  '.blob-num-addition',
  '.blob-num-deletion',
  '.blob-num-context',
  '.blob-num-hunk',
  '.CodeMirror',
  '.CodeMirror-line',
  '.CodeMirror-code',
  '.CodeMirror-lines',
  '.cm-editor',
  '.cm-content',
  '.cm-line',
  '.cm-scroller',
  '.js-file-line',
  '.js-line-number',
  '.monaco-editor',
  '.monaco-scrollable-element',
  '.view-lines',
  '.view-line',
  '.highlight-source',
  '.pl-token',
  '.pl-c',
  '.pl-s',
  '.pl-k',
  '.pl-v',
  '.pl-en',
  '.pl-pds',
  '.pl-smi',
  '.pl-smw',
  '.code-list',
  '.code-list-item',
  '.search-code-line',
  '.file-diff',
  '.diff-table',
];

export const GITHUB_CODE_CLASSES = [
  'highlight', 'blob-code', 'hljs', 'language-', 'editor', 'CodeMirror', 'monaco', 'blob-textarea',
  'react-blob', 'file-editor', 'js-blob', 'js-code', 'cm-content', 'blob-code-inner', 'blob-code-marker',
  'blob-code-context', 'blob-code-addition', 'blob-code-deletion', 'react-blob-textarea',
  'blob-wrapper', 'blob-num', 'file-diff', 'diff-table', 'js-file-line', 'js-line-number',
  'code-list', 'search-code-line', 'highlight-source', 'file-navigation', 'js-navigation-item', 'file-tree',
  'monaco-editor', 'view-lines', 'view-line',
  // Prism.js/高亮
  'token', 'keyword', 'string', 'comment', 'number', 'operator', 'punctuation',
  'function', 'class-name', 'variable', 'constant', 'boolean', 'regex',
  // 通用代码标识符
  'source-code', 'syntax-highlight', 'code-block', 'code-snippet', 'terminal',
  'console', 'shell', 'command-line', 'output'
];

export const EXCLUDE_TAGS = [
  'code', 'pre', 'samp', 'kbd', 'var', 'script', 'style', 'textarea', 'input'
];

export const DEFAULT_CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  maxSize: 2000
};

export const TRANSLATION_CACHE_CONFIG_KEY = 'translation_cache_config';

export const UI_LANG_KEY = 'uiLang';
export const SHORTCUT_SETTINGS_KEY = 'shortcut_settings';
