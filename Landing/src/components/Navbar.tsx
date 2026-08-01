import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, useWindowDimensions, Image as RNImage } from 'react-native';
import { Feather } from '@expo/vector-icons';

const LogoImage = require('../../assets/images/logo.png');

const NAV_ITEMS = [
  { label: 'Architecture', href: '#architecture' },
  { label: 'Features', href: '#features' },
  { label: 'Ecosystem', href: '#ecosystem' },
  { label: 'Get Started', href: '#get-started' },
];

export function Navbar() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (href: string) => {
    if (Platform.OS === 'web') {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMenuOpen(false);
  };

  return (
    <View
      style={styles.wrapper}
      accessibilityRole="banner"
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Pressable
          onPress={() => {
            if (Platform.OS === 'web') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          accessibilityRole="link"
          accessibilityLabel="Open-Dome home"
          style={styles.logoContainer}
        >
          <View style={styles.logoIcon}>
            <RNImage source={LogoImage} style={{ width: 28, height: 28 }} resizeMode="contain" />
          </View>
          <Text style={styles.logoText}>Open-Dome</Text>
        </Pressable>

        {/* Desktop Nav */}
        {isDesktop && (
          <View style={styles.navLinks} accessibilityRole="navigation">
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => handleNav(item.href)}
                style={({ pressed }) => [styles.navLink, pressed && styles.navLinkPressed]}
                accessibilityRole="link"
                accessibilityLabel={`Navigate to ${item.label}`}
              >
                <Text style={styles.navLinkText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Desktop CTA */}
        {isDesktop && (
          <Pressable
            onPress={() => {
              if (Platform.OS === 'web') window.open('https://github.com/Effisend-Labs/Open-Dome', '_blank');
            }}
            style={({ pressed }) => [styles.githubBtn, pressed && styles.githubBtnPressed]}
            accessibilityRole="link"
            accessibilityLabel="View Open-Dome on GitHub"
          >
            <Feather name="github" size={14} color="#F9F9F8" />
            <Text style={styles.githubBtnText}>GitHub</Text>
          </Pressable>
        )}

        {/* Mobile Hamburger */}
        {!isDesktop && (
          <Pressable
            onPress={() => setMenuOpen(!menuOpen)}
            style={styles.hamburger}
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            accessibilityState={{ expanded: menuOpen }}
          >
            <Feather name={menuOpen ? 'x' : 'menu'} size={20} color="#0A0A0C" />
          </Pressable>
        )}
      </View>

      {/* Mobile Menu Dropdown */}
      {!isDesktop && menuOpen && (
        <View style={styles.mobileMenu} accessibilityRole="navigation">
          {NAV_ITEMS.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => handleNav(item.href)}
              style={({ pressed }) => [styles.mobileNavLink, pressed && styles.mobileNavLinkPressed]}
              accessibilityRole="link"
            >
              <Text style={styles.mobileNavLinkText}>{item.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              if (Platform.OS === 'web') window.open('https://github.com/Effisend-Labs/Open-Dome', '_blank');
              setMenuOpen(false);
            }}
            style={({ pressed }) => [styles.mobileGithubBtn, pressed && styles.githubBtnPressed]}
            accessibilityRole="link"
          >
            <Feather name="github" size={14} color="#F9F9F8" />
            <Text style={styles.githubBtnText}>View on GitHub</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: 'rgba(249, 249, 248, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 10, 12, 0.06)',
    ...(Platform.OS === 'web' ? {
      position: 'sticky' as any,
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
  },
  inner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    height: 64,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0A0A0C',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navLink: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  navLinkPressed: {
    backgroundColor: 'rgba(10, 10, 12, 0.04)',
  },
  navLinkText: {
    fontSize: 14,
    color: '#4A4A4D',
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  githubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 8,
  },
  githubBtnPressed: {
    backgroundColor: '#1C1C1F',
    transform: [{ scale: 0.97 }],
  },
  githubBtnText: {
    color: '#F9F9F8',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileMenu: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 10, 12, 0.06)',
  },
  mobileNavLink: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  mobileNavLinkPressed: {
    backgroundColor: 'rgba(10, 10, 12, 0.04)',
  },
  mobileNavLinkText: {
    fontSize: 16,
    color: '#0A0A0C',
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  mobileGithubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 8,
    marginTop: 8,
  },
});
