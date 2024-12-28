// Display
export const F2RN_UI_WIDTH_MIN = 308;

// Configs
export const F2RN_NODE_ATTRS = 'f2rn:attr:0010';
export const F2RN_COMP_PROPS = 'f2rn:props:0010';
export const F2RN_COMP_STYLES = 'f2rn:styles:0010';
export const F2RN_SETTINGS_USER = 'f2rn:user:1001';
export const F2RN_SETTINGS_PROJECT = 'f2rn:project:1001';
export const F2RN_PROJECT_RELEASE = 'f2rn:release:1001';

// Services
export const F2RN_EDITOR_NS = 'figma://preview/';
export const F2RN_STYLEGEN_API = 'https://f2rn.deno.dev';
export const F2RN_EXO_REPO_ZIP = 'https://codeload.github.com/kat-tax/exo/zip/refs/heads/master';
export const F2RN_EXO_PROXY_URL = 'https://cors-proxy.ult.workers.dev/?url=';
export const F2RN_SERVICE_URL = 'http://localhost:3000'; // https://figma-to-react-native.com
export const F2RN_PREVIEW_URL = 'http://localhost:5102'; // https://fig.run

// Vendors
export const SUPABASE_PROJECT_URL = 'http://localhost:54321';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const LOGTAIL_TOKEN = '3hRzjtVJTBk6BDFt3pSjjKam';
export const TIPTAP_APP = 'l89jn3k7';
export const YSWEET_URL = '...';

// Pages
export const PAGES_SPECIAL = {
  NAVIGATION: 'Navigation',
  LIBRARY: 'Library',
  ICONS: 'Icons',
  TESTS: 'Tests',
} as const;

// Variables
export const VARIABLE_COLLECTIONS = {
  // Main
  APP_CONFIG: 'App Config',
  BREAKPOINTS: 'Breakpoints',
  LOCALES: 'Locales',
  THEMES: 'Themes',
  FONTS: 'Fonts',
  // Scales
  SCALE_DISPLAY: '[Scale: Display]',
  SCALE_COLORS: '[Scale: Colors]',
  SCALE_FONTS: '[Scale: Fonts]',
  // State
  STATE_LOCAL: '[State: Local]',
  STATE_REDUX: '[State: Redux]',
} as const;
