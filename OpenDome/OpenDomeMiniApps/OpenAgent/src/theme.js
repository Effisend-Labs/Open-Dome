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
    BG: '#FAFAFA',
    SURFACE: '#FFFFFF',
    SURFACE_ELEVATED: '#FFFFFF',
    BORDER: '#E8E8E8',
    FG: '#0A0A0A',
    FG_SECONDARY: '#525252',
    MUTED: '#8C8C8C',
    ACCENT: '#0052FF',
    ACCENT_SOFT: 'rgba(0, 82, 255, 0.08)',
    DANGER: '#DC2626',
    DANGER_SOFT: 'rgba(220, 38, 38, 0.06)',
    SUCCESS: '#00A878',
    shape: { cardRadius: 16, buttonRadius: 12 },
    shadow: { card: boxShadow({ offsetY: 2, blur: 12, opacity: 0.04, elevation: 1 }) },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace },
  },
  dark: {
    BG: '#0A0A0A',
    SURFACE: '#141414',
    SURFACE_ELEVATED: '#1A1A1A',
    BORDER: '#1F1F1F',
    FG: '#F5F5F5',
    FG_SECONDARY: '#A3A3A3',
    MUTED: '#525252',
    ACCENT: '#0052FF',
    ACCENT_SOFT: 'rgba(0, 82, 255, 0.12)',
    DANGER: '#EF4444',
    DANGER_SOFT: 'rgba(239, 68, 68, 0.10)',
    SUCCESS: '#00D897',
    shape: { cardRadius: 16, buttonRadius: 12 },
    shadow: { card: {} },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace },
  },
};

MINI_APP_THEMES.pastel = MINI_APP_THEMES.light;
MINI_APP_THEMES.alpine = MINI_APP_THEMES.light;
