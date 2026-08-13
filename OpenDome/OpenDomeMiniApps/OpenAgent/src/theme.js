import { Platform } from 'react-native';
import { boxShadow } from './utils/styleCompat';

export const GLOBAL_STYLES = {
  monospace: Platform.select({
    ios: 'Menlo',
    web: '"SF Mono", "Fira Code", "Courier New", monospace',
    default: 'monospace',
  }),
  sans: Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  }),
};

export const MINI_APP_THEMES = {
  light: {
    BG: '#F4F4F5',
    SURFACE: '#FFFFFF',
    SURFACE_ELEVATED: '#ECECEE',
    BORDER: 'rgba(0,0,0,0.08)',
    FG: '#111111',
    FG_SECONDARY: '#5C5C5C',
    MUTED: '#8A8A8A',
    ACCENT: '#1A73E8',
    ACCENT_SOFT: 'rgba(26, 115, 232, 0.10)',
    DANGER: '#C5221F',
    DANGER_SOFT: 'rgba(197, 34, 31, 0.08)',
    SUCCESS: '#188038',
    USDC: '#2775CA',
    USDC_SOFT: 'rgba(39, 117, 202, 0.10)',
    shape: { cardRadius: 20, buttonRadius: 14 },
    shadow: { card: boxShadow({ offsetY: 8, blur: 24, opacity: 0.06, elevation: 2 }) },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace },
  },
  dark: {
    BG: '#0E0E10',
    SURFACE: '#1A1A1D',
    SURFACE_ELEVATED: '#242428',
    BORDER: 'rgba(255,255,255,0.08)',
    FG: '#F2F2F3',
    FG_SECONDARY: '#A8A8AE',
    MUTED: '#6E6E76',
    ACCENT: '#8AB4F8',
    ACCENT_SOFT: 'rgba(138, 180, 248, 0.12)',
    DANGER: '#F28B82',
    DANGER_SOFT: 'rgba(242, 139, 130, 0.12)',
    SUCCESS: '#81C995',
    USDC: '#8AB4F8',
    USDC_SOFT: 'rgba(138, 180, 248, 0.12)',
    shape: { cardRadius: 20, buttonRadius: 14 },
    shadow: { card: {} },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace },
  },
};

MINI_APP_THEMES.pastel = MINI_APP_THEMES.light;
MINI_APP_THEMES.alpine = MINI_APP_THEMES.light;
