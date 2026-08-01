import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { colors as defaultColors } from '../core/tokens';

const ThemeContext = createContext();

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  PASTEL: 'pastel',
  SYNTHWAVE: 'synthwave',
  ALPINE: 'alpine',
  DEEP_SPACE: 'deep_space',
};

export const WALLPAPERS = {
  BLOBS: 'blobs',
  SOLID: 'solid',
  GRADIENT: 'gradient',
};

export const LANGUAGES = {
  EN: 'en',
  ES: 'es',
  JA: 'ja',
  FR: 'fr',
  ZH_CN: 'zh-CN',
};

const systemFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

export const THEME_PALETTES = {
  [THEMES.LIGHT]: {
    name: 'Minimalist Light',
    isDark: false,
    bg: {
      root: '#EBEBE9', // Slightly deeper stone/off-white for better contrast
      canvas: '#EBEBE9',
      panel: '#FFFFFF',
      card: '#FFFFFF',
      blob1: 'transparent',
      blob2: 'transparent',
    },
    text: {
      primary: '#1A1A1A', // Deep Graphite
      secondary: '#666666', // Darker muted stone for readability
      accent: '#0A2540', // Deeper Cobalt
    },
    border: {
      default: 'rgba(0,0,0,0.12)', // Increased visibility
      subtle: 'rgba(0,0,0,0.06)',
      width: 1,
    },
    shape: { cardRadius: 20, iconRadius: 14 },
    shadow: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 2 },
      icon: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 1 },
    },
    typography: { fontFamily: systemFont, textShadow: null },
    icons: { 
      overrideBg: '#FFFFFF', // Pure white icons to match cards and float above the stone background
      overrideColor: '#1A1A1A', // Graphite icons
      desaturate: false 
    }
  },
  [THEMES.DARK]: {
    name: 'Minimalist Dark',
    isDark: true,
    bg: {
      root: '#000000', // True OLED Black
      canvas: '#000000',
      panel: '#1C1C1E', // Higher elevation graphite (standard iOS dark mode)
      card: '#1C1C1E',
      blob1: 'transparent',
      blob2: 'transparent',
    },
    text: {
      primary: '#FFFFFF', // Crisper white
      secondary: '#8E8E93', // Lighter grey for better legibility on dark panels
      accent: '#C8AA6E', // Premium Muted Gold
    },
    border: {
      default: 'rgba(255,255,255,0.15)', // Highly visible crisp border
      subtle: 'rgba(255,255,255,0.08)',
      width: 1,
    },
    shape: { cardRadius: 20, iconRadius: 14 },
    shadow: {
      card: { shadowOpacity: 0, elevation: 0 }, // True flat dark mode relies on borders instead of shadows
      icon: { shadowOpacity: 0, elevation: 0 },
    },
    typography: { fontFamily: systemFont, textShadow: null },
    icons: { 
      overrideBg: '#1C1C1E', // Match elevated card color so the strong border frames it
      overrideColor: '#C8AA6E', // Muted Gold icons
      desaturate: false 
    }
  },
  [THEMES.PASTEL]: {
    name: 'Pastel Kawaii',
    isDark: false,
    bg: {
      root: '#F4EFE6', // Deeper, warmer cream to contrast against white cards
      canvas: '#F4EFE6',
      panel: '#FFFFFF',
      card: '#FFFFFF',
      blob1: 'rgba(255, 209, 220, 0.6)', // Peach/Pink blob
      blob2: 'rgba(174, 198, 207, 0.6)', // Pastel blue blob
    },
    text: {
      primary: '#333333',
      secondary: '#777777',
      accent: '#82A6B8', // Deeper pastel blue for legibility
      buttonText: '#333333', // Dark text on light pastel buttons
    },
    border: {
      default: 'rgba(0,0,0,0.08)', // Soft, visible border
      subtle: 'rgba(0,0,0,0.04)',
      width: 1,
    },
    shape: {
      cardRadius: 24,
      iconRadius: 18,
    },
    shadow: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
      icon: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
    },
    typography: {
      fontFamily: Platform.select({ ios: 'Arial Rounded MT Bold', web: '"Nunito", "Quicksand", sans-serif', default: 'sans-serif' }),
      textShadow: null,
    },
    icons: {
      desaturate: false,
      mapColors: {
        '#FF9500': '#FFD1DC', 
        '#34C759': '#B5EAD7', 
        '#FF2D55': '#FF9AA2', 
        '#AF52DE': '#C7CEEA', 
        '#5AC8FA': '#AEC6CF', 
        '#8E8E93': '#E2F0CB', 
        '#FFCC00': '#FDFD96', 
        '#007AFF': '#C7CEEA',
        '#FFFFFF': '#FFF0F5',
      }
    }
  },
  [THEMES.SYNTHWAVE]: {
    name: 'Synthwave Cyberpunk',
    isDark: true,
    bg: {
      root: '#120428',
      canvas: '#120428',
      panel: '#2B003B',
      card: '#000000',
      blob1: 'transparent',
      blob2: 'transparent',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#FF003C', // Hot pink secondary
      accent: '#00F0FF', // Neon cyan
    },
    border: {
      default: '#00F0FF',
      subtle: '#FF003C',
      width: 2,
    },
    shape: {
      cardRadius: 0,
      iconRadius: 0,
    },
    shadow: {
      card: { shadowColor: '#00F0FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 0 },
      icon: { shadowOpacity: 0, elevation: 0 },
    },
    typography: {
      fontFamily: Platform.select({ ios: 'Menlo', web: '"Courier New", Courier, monospace', default: 'monospace' }),
      textShadow: { textShadowColor: '#00F0FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
    },
    icons: {
      desaturate: false,
      overrideBg: 'transparent',
      overrideColor: '#00F0FF',
    }
  },
  [THEMES.ALPINE]: {
    name: 'Alpine Frost',
    isDark: false,
    bg: {
      root: '#D8E2E8',
      canvas: '#D8E2E8',
      panel: 'rgba(255, 255, 255, 0.4)',
      card: 'rgba(255, 255, 255, 0.6)',
      blob1: 'rgba(255,255,255,0.2)',
      blob2: 'rgba(255,255,255,0.1)',
    },
    text: {
      primary: '#2C3E50',
      secondary: '#5D6D7E',
      accent: '#3498DB',
    },
    border: {
      default: 'rgba(255, 255, 255, 0.8)',
      subtle: 'rgba(255, 255, 255, 0.4)',
      width: 1,
    },
    shape: {
      cardRadius: 16,
      iconRadius: 16,
    },
    shadow: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 1 },
      icon: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
    },
    typography: {
      fontFamily: systemFont,
      textShadow: null,
    },
    icons: {
      desaturate: true,
    }
  },
  [THEMES.DEEP_SPACE]: {
    name: 'Deep Space Minimalist',
    isDark: true,
    bg: {
      root: '#000000',
      canvas: '#000000',
      panel: '#1C1C1E',
      card: '#1C1C1E',
      blob1: 'rgba(255, 255, 255, 0.03)',
      blob2: 'rgba(255, 255, 255, 0.02)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#8E8E93',
      accent: '#0A84FF', // Slightly brighter iOS blue
      buttonText: '#FFFFFF', // White text on blue button
    },
    border: {
      default: 'rgba(255,255,255,0.15)', // Crisp visible border
      subtle: 'rgba(255,255,255,0.08)',
      width: 1,
    },
    shape: {
      cardRadius: 16,
      iconRadius: 16,
    },
    shadow: {
      card: { shadowOpacity: 0, elevation: 0 },
      icon: { shadowOpacity: 0, elevation: 0 },
    },
    typography: {
      fontFamily: systemFont,
      textShadow: null,
    },
    icons: {
      overrideBg: '#1C1C1E', // Match elevated card color
      desaturate: false,
    }
  }
};

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(THEMES.DEEP_SPACE);
  const [wallpaperId, setWallpaperId] = useState(WALLPAPERS.BLOBS);
  const [language, setLanguage] = useState(LANGUAGES.EN);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('opendome_theme_prefs');
        if (storedTheme) {
          const { theme, wallpaper, language: storedLang } = JSON.parse(storedTheme);
          if (THEME_PALETTES[theme]) setThemeId(theme);
          if (Object.values(WALLPAPERS).includes(wallpaper)) setWallpaperId(wallpaper);
          if (Object.values(LANGUAGES).includes(storedLang)) setLanguage(storedLang);
        }
      } catch (e) {
        console.error('Failed to load theme preferences', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const savePreferences = async (newTheme, newWallpaper, newLanguage) => {
    setThemeId(newTheme);
    setWallpaperId(newWallpaper);
    setLanguage(newLanguage);
    try {
      await AsyncStorage.setItem('opendome_theme_prefs', JSON.stringify({ 
        theme: newTheme, 
        wallpaper: newWallpaper,
        language: newLanguage 
      }));
    } catch (e) {
      console.error('Failed to save theme preferences', e);
    }
  };

  const setTheme = (newThemeId) => savePreferences(newThemeId, wallpaperId, language);
  const setWallpaper = (newWallpaperId) => savePreferences(themeId, newWallpaperId, language);
  const setLanguagePreference = (newLang) => savePreferences(themeId, wallpaperId, newLang);

  const activeTheme = THEME_PALETTES[themeId];

  return (
    <ThemeContext.Provider value={{ 
      themeId, 
      wallpaperId, 
      language,
      setTheme, 
      setWallpaper, 
      setLanguagePreference,
      colors: activeTheme,
      isLoaded 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
