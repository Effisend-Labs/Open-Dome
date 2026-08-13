import { Platform } from 'react-native';

export const DARK_THEMES = ['dark', 'synthwave', 'deep_space'];

export function isDarkTheme(theme) {
  return DARK_THEMES.includes(String(theme || '').toLowerCase());
}

/** Text color that stays readable on `tokens.NEON_PRIMARY` fills. */
export function onPrimaryColor(theme) {
  const t = String(theme || '').toLowerCase();
  if (t === 'dark' || t === 'pastel' || t === 'synthwave') return '#000';
  return '#FFF';
}

export const GLOBAL_STYLES = {
  monospace: Platform.select({ ios: 'Menlo', web: '"Courier New", Courier, monospace', default: 'monospace' }),
  sans: Platform.select({ ios: 'System', web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif', default: 'sans-serif' }),
  rounded: Platform.select({ ios: 'Arial Rounded MT Bold', web: '"Nunito", "Quicksand", sans-serif', default: 'sans-serif' }),
  heavy: '900',
  letterSpacing: 2,
};

export const MINI_APP_THEMES = {
  light: {
    BG: '#FAF9F6',
    SURFACE: '#FFFFFF',
    BORDER: '#E5E5EA',
    FG: '#1A1A1A',
    MUTED: '#737373',
    NEON_PRIMARY: '#113264',
    NEON_DANGER: '#E2001A',
    NEON_WARNING: '#FFCC00',
    NEON_SUCCESS: '#008F11',
    shape: { cardRadius: 20, buttonRadius: 12, pillRadius: 24, border: 1 },
    shadow: { card: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 24, elevation: 1 } },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace }
  },
  dark: {
    BG: '#000000',
    SURFACE: '#121212',
    BORDER: '#2C2C2E',
    FG: '#EDEDED',
    MUTED: '#737373',
    NEON_PRIMARY: '#C8AA6E',
    NEON_DANGER: '#FF453A',
    NEON_WARNING: '#FFD60A',
    NEON_SUCCESS: '#32D74B',
    shape: { cardRadius: 20, buttonRadius: 12, pillRadius: 24, border: 1 },
    shadow: { card: { shadowOpacity: 0, elevation: 0 } },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace }
  },
  pastel: {
    BG: '#FFFDF7',
    SURFACE: '#FFFFFF',
    BORDER: '#F2E6E6',
    FG: '#333333',
    MUTED: '#888888',
    NEON_PRIMARY: '#AEC6CF',
    NEON_DANGER: '#FF9AA2',
    NEON_WARNING: '#FDFD96',
    NEON_SUCCESS: '#B5EAD7',
    shape: { cardRadius: 24, buttonRadius: 16, pillRadius: 24, border: 0 },
    shadow: { card: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 } },
    font: { primary: GLOBAL_STYLES.rounded, mono: GLOBAL_STYLES.monospace }
  },
  synthwave: {
    BG: '#120428',
    SURFACE: '#2B003B',
    BORDER: '#FF003C',
    FG: '#FFFFFF',
    MUTED: '#FF003C', // Using hot pink for muted text looks cool in synthwave
    NEON_PRIMARY: '#00F0FF',
    NEON_DANGER: '#FF003C',
    NEON_WARNING: '#FCEE09',
    NEON_SUCCESS: '#39FF14',
    shape: { cardRadius: 0, buttonRadius: 0, pillRadius: 0, border: 2 },
    shadow: { card: { shadowColor: '#00F0FF', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 0 } },
    font: { primary: GLOBAL_STYLES.monospace, mono: GLOBAL_STYLES.monospace }
  },
  alpine: {
    BG: '#D8E2E8',
    SURFACE: '#EBF0F3',
    BORDER: '#FFFFFF',
    FG: '#2C3E50',
    MUTED: '#5D6D7E',
    NEON_PRIMARY: '#3498DB',
    NEON_DANGER: '#E74C3C',
    NEON_WARNING: '#F1C40F',
    NEON_SUCCESS: '#2ECC71',
    shape: { cardRadius: 16, buttonRadius: 8, pillRadius: 16, border: 1 },
    shadow: { card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 1 } },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace }
  },
  deep_space: {
    BG: '#000000',
    SURFACE: '#1C1C1E',
    BORDER: '#2C2C2E',
    FG: '#FFFFFF',
    MUTED: '#8E8E93',
    NEON_PRIMARY: '#007AFF',
    NEON_DANGER: '#FF3B30',
    NEON_WARNING: '#FFCC00',
    NEON_SUCCESS: '#34C759',
    shape: { cardRadius: 16, buttonRadius: 10, pillRadius: 16, border: 0 },
    shadow: { card: { shadowOpacity: 0, elevation: 0 } },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace }
  }
};
