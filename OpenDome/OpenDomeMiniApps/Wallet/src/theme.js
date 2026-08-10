import { Platform } from 'react-native';

export const GLOBAL_STYLES = {
  monospace: Platform.select({ ios: 'Menlo', web: '"SF Mono", "Fira Code", "Courier New", monospace', default: 'monospace' }),
  sans: Platform.select({ ios: 'System', web: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif', default: 'sans-serif' }),
  rounded: Platform.select({ ios: 'Arial Rounded MT Bold', web: '"Nunito", "Quicksand", sans-serif', default: 'sans-serif' }),
  heavy: '700',
  letterSpacing: 2,
};

export const MINI_APP_THEMES = {
  light: {
    BG: '#FAFAFA',
    SURFACE: '#FFFFFF',
    SURFACE_ELEVATED: '#FFFFFF',
    SURFACE_SUBTLE: '#F5F5F5',
    BORDER: '#E8E8E8',
    FG: '#0A0A0A',
    FG_SECONDARY: '#525252',
    MUTED: '#8C8C8C',
    ACCENT: '#0052FF',
    ACCENT_SOFT: 'rgba(0, 82, 255, 0.08)',
    USDC: '#2775CA',
    USDC_SOFT: 'rgba(39, 117, 202, 0.08)',
    SUCCESS: '#00A878',
    SUCCESS_SOFT: 'rgba(0, 168, 120, 0.08)',
    DANGER: '#DC2626',
    DANGER_SOFT: 'rgba(220, 38, 38, 0.06)',
    WARNING: '#D97706',
    shape: { cardRadius: 16, buttonRadius: 12, pillRadius: 999, border: 0 },
    shadow: { card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 } },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace }
  },
  dark: {
    BG: '#0A0A0A',
    SURFACE: '#141414',
    SURFACE_ELEVATED: '#1A1A1A',
    SURFACE_SUBTLE: '#111111',
    BORDER: '#1F1F1F',
    FG: '#F5F5F5',
    FG_SECONDARY: '#A3A3A3',
    MUTED: '#525252',
    ACCENT: '#0052FF',
    ACCENT_SOFT: 'rgba(0, 82, 255, 0.12)',
    USDC: '#2775CA',
    USDC_SOFT: 'rgba(39, 117, 202, 0.12)',
    SUCCESS: '#00D897',
    SUCCESS_SOFT: 'rgba(0, 216, 151, 0.10)',
    DANGER: '#EF4444',
    DANGER_SOFT: 'rgba(239, 68, 68, 0.10)',
    WARNING: '#F59E0B',
    shape: { cardRadius: 16, buttonRadius: 12, pillRadius: 999, border: 0 },
    shadow: { card: { shadowOpacity: 0, elevation: 0 } },
    font: { primary: GLOBAL_STYLES.sans, mono: GLOBAL_STYLES.monospace }
  },
  // Legacy aliases — map to the refined dark/light above
  synthwave: undefined,
  deep_space: undefined,
  pastel: undefined,
  alpine: undefined,
};

// Fallback: any unrecognized theme maps to dark
Object.keys(MINI_APP_THEMES).forEach(key => {
  if (!MINI_APP_THEMES[key]) MINI_APP_THEMES[key] = MINI_APP_THEMES.dark;
});
