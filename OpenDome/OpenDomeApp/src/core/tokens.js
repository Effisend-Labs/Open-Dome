/**
 * OpenDomeApp — Design Tokens (Apple / Swiss Design System)
 *
 * Single source of truth for colors, spacing, typography, radii, shadows.
 * Focuses on high contrast, flush alignment, and subtle depth.
 */

import { Platform } from 'react-native';

const palette = {
  white: '#FFFFFF',
  offWhite: '#F5F5F7',
  grayLight: '#E5E5EA',
  grayMedium: '#C7C7CC',
  grayDark: '#8E8E93',
  graySecondary: '#86868B',
  darkSurface: '#1C1C1E',
  darkCard: '#2C2C2E',
  blackText: '#1D1D1F',
  black: '#000000',

  appleBlue: '#007AFF',
  appleGreen: '#34C759',
  appleRed: '#FF3B30',
  appleYellow: '#FFCC00',
};

export const colors = {
  bg: {
    canvas: palette.offWhite,
    card: palette.white,
    modal: palette.white,
    nested: palette.grayLight,
    overlay: 'rgba(0, 0, 0, 0.4)',
    darkConsole: palette.darkSurface,
    darkConsoleCard: palette.darkCard,
  },
  text: {
    primary: palette.blackText,
    secondary: palette.graySecondary,
    inverse: palette.white,
    muted: palette.grayDark,
    accent: palette.appleBlue,
  },
  border: {
    subtle: palette.grayLight,
    default: palette.grayMedium,
    focus: palette.appleBlue,
    dark: 'rgba(255, 255, 255, 0.1)',
  },
  brand: {
    primary: palette.appleBlue,
  },
  status: {
    success: palette.appleGreen,
    danger: palette.appleRed,
    warning: palette.appleYellow,
    info: palette.appleBlue,
  },
};

export const appAccents = {
  primary: palette.appleBlue,
  tdc: palette.appleBlue,
};

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 64,
};

export const radii = {
  none: 0,
  sm: 8,    // Inputs, small buttons
  md: 12,   // Inner cards
  lg: 16,   // Major layout panels
  pill: 999,
};

const systemFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

const codeFont = Platform.select({
  ios: 'Menlo',
  web: 'monospace',
  default: 'monospace',
});

export const type = {
  fontFamily: systemFont,
  fontFamilyCode: codeFont,
  micro: 10,
  small: 12,
  body: 14,
  base: 16,
  lead: 18,
  h3: 20,
  h2: 24,
  h1: 32,
  display: 40,
};

export const shadow = {
  none: Platform.select({
    web: { boxShadow: 'none' },
    default: { shadowOpacity: 0, elevation: 0 }
  }),
  sm: Platform.select({
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.03)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }
  }),
  md: Platform.select({
    web: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }
  }),
  lg: Platform.select({
    web: { boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.08)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 }
  }),
  massive: Platform.select({
    web: { boxShadow: '0px 32px 64px rgba(0, 0, 0, 0.15)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 32 }, shadowOpacity: 0.15, shadowRadius: 64, elevation: 20 }
  }),
};

export const springboardApps = [
  {
    id: "tdc",
    name: "TDC EVENTS",
    subtitle: "Tokyo Dome City schedule",
    meta: "12 EVENTS · 4 VENUES",
    accent: colors.brand.primary,
    happening: 3,
    url: typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1') ? 'http://localhost:8084/' : 'https://miniapp.expo.app/',
  },
  {
    id: "sandbox_app",
    name: "Sandbox",
    iconUrl: "https://miniapp.expo.app/favicon.ico",
    url: "https://miniapp.expo.app/",
  }
];
