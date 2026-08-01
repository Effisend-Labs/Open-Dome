import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme, THEMES, LANGUAGES } from '../providers/ThemeProvider';
import { locales } from '../core/locales';

export default function SettingsApp() {
  const { normalize: n } = useSmartSize();
  const { themeId, setTheme, language, setLanguagePreference, colors: activeTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const t = locales[language]?.settings || locales.en.settings;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const s = React.useMemo(() => useStyles(n, activeTheme), [n, activeTheme]);

  const renderSectionHeader = (title) => (
    <Text style={s.sectionHeader}>{title}</Text>
  );

  const renderOption = (key, label, isActive, onPress) => {
    return (
      <Pressable 
        key={key}
        style={[s.optionButton, isActive && s.optionButtonActive]} 
        onPress={onPress}
      >
        <Text style={[s.optionText, isActive && s.optionTextActive]}>{label}</Text>
        {isActive && (
          <Ionicons name="checkmark" size={n(18)} color={activeTheme.text.accent} style={s.checkIcon} />
        )}
      </Pressable>
    );
  };

  const langLabels = {
    [LANGUAGES.EN]: 'English',
    [LANGUAGES.ES]: 'Español',
    [LANGUAGES.JA]: '日本語 (Japanese)',
    [LANGUAGES.FR]: 'Français',
    [LANGUAGES.ZH_CN]: '简体中文 (Chinese Simplified)',
  };

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t.title}</Text>
        <Text style={s.headerSubtitle}>{t.subtitle}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={s.section}>
          {renderSectionHeader(t.themeSection)}
          <View style={s.cardGroup}>
            <Pressable 
              style={s.optionButton} 
              onPress={() => setThemeDropdownOpen(!themeDropdownOpen)}
            >
              <Text style={s.optionText}>{t.themes[themeId] || 'Select Theme'}</Text>
              <Ionicons name={themeDropdownOpen ? "chevron-up" : "chevron-down"} size={n(18)} color={activeTheme.text.secondary} />
            </Pressable>
            
            {themeDropdownOpen && Object.values(THEMES).map(themeKey => (
              renderOption(themeKey, t.themes[themeKey], themeId === themeKey, () => {
                setTheme(themeKey);
                setThemeDropdownOpen(false);
              })
            ))}
          </View>
        </View>

        <View style={s.section}>
          {renderSectionHeader(t.languageSection)}
          <View style={s.cardGroup}>
            <Pressable 
              style={s.optionButton} 
              onPress={() => setDropdownOpen(!dropdownOpen)}
            >
              <Text style={s.optionText}>{langLabels[language] || t.selectLanguage}</Text>
              <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={n(18)} color={activeTheme.text.secondary} />
            </Pressable>
            
            {dropdownOpen && Object.values(LANGUAGES).map(lang => (
              renderOption(lang, langLabels[lang], language === lang, () => {
                setLanguagePreference(lang);
                setDropdownOpen(false);
              })
            ))}
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.infoText}>
            {t.infoText}
          </Text>
        </View>

      </ScrollView>
    </Animated.View>
  );
}

const defaultFont = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  default: 'sans-serif',
});

const useStyles = (n, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg.canvas,
  },
  header: {
    paddingTop: n(60),
    paddingHorizontal: n(24),
    paddingBottom: n(24),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.subtle,
    backgroundColor: theme.bg.panel,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: n(28),
    fontWeight: '700',
    fontFamily: theme.typography?.fontFamily || defaultFont,
    letterSpacing: -0.5,
    marginBottom: n(4),
  },
  headerSubtitle: {
    color: theme.text.secondary,
    fontSize: n(15),
    fontWeight: '400',
    fontFamily: theme.typography?.fontFamily || defaultFont,
  },
  scrollContent: {
    paddingVertical: n(32),
    paddingHorizontal: n(24),
  },
  section: {
    marginBottom: n(32),
  },
  sectionHeader: {
    color: theme.text.secondary,
    fontSize: n(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: n(12),
    fontFamily: theme.typography?.fontFamily || defaultFont,
  },
  cardGroup: {
    backgroundColor: theme.bg.card,
    borderRadius: n(16),
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border.default,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: n(16),
    paddingHorizontal: n(20),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.subtle,
  },
  optionButtonActive: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  },
  optionText: {
    color: theme.text.primary,
    fontSize: n(16),
    fontWeight: '500',
    fontFamily: theme.typography?.fontFamily || defaultFont,
  },
  optionTextActive: {
    color: theme.text.accent,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: n(8),
  },
  infoSection: {
    marginTop: n(24),
    paddingHorizontal: n(8),
  },
  infoText: {
    color: theme.text.secondary,
    fontSize: n(13),
    lineHeight: n(18),
    fontFamily: theme.typography?.fontFamily || defaultFont,
    textAlign: 'center',
  }
});
