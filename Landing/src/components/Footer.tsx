import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, useWindowDimensions, Image as RNImage } from 'react-native';

const LogoImage = require('../../assets/images/logo.png');

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'SDK Library', href: 'https://github.com/Effisend-Labs/Open-Dome/tree/main/open-dome-lib' },
      { label: 'Sandbox', href: 'https://sandbox.opendome.xyz/' },
      { label: 'Example Mini-App', href: 'https://demo.opendome.xyz' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub Repository', href: 'https://github.com/Effisend-Labs/Open-Dome' },
      { label: 'Technical Guide', href: 'https://github.com/Effisend-Labs/Open-Dome/blob/main/README.md' },
      { label: 'Architecture Reference', href: 'https://github.com/Effisend-Labs/Open-Dome/blob/main/AGENTS.md' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'MIT License', href: 'https://github.com/Effisend-Labs/Open-Dome/blob/main/LICENSE' },
    ],
  },
];

export function Footer() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.footer} accessibilityRole="contentinfo">
      <View style={styles.inner}>
        <View style={[styles.columns, !isDesktop && styles.columnsMobile]}>
          {/* Brand column */}
          <View style={[styles.brandColumn, !isDesktop && styles.brandColumnMobile]}>
            <View style={styles.brandRow}>
              <RNImage source={LogoImage} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={styles.brandName}>Open-Dome</Text>
            </View>
            <Text style={styles.brandDescription}>
              The infrastructure layer for the Agentic era. Built by Effisend Labs.
            </Text>
          </View>

          {/* Link columns */}
          <View style={[styles.linkColumns, !isDesktop && styles.linkColumnsMobile]}>
            {FOOTER_COLUMNS.map((column) => (
              <View key={column.title} style={styles.linkColumn}>
                <Text style={styles.columnTitle}>{column.title}</Text>
                <View style={styles.columnLinks}>
                  {column.links.map((link) => (
                    <Pressable
                      key={link.label}
                      onPress={() => {
                        if (Platform.OS === 'web') window.open(link.href, '_blank');
                      }}
                      style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
                      accessibilityRole="link"
                      accessibilityLabel={link.label}
                    >
                      <Text style={styles.footerLinkText}>{link.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.copyright}>© 2026 Effisend Labs. All rights reserved.</Text>
          <Text style={styles.builtWith}>Built with Expo & React Native Web</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    backgroundColor: '#0A0A0C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 249, 248, 0.04)',
  },
  inner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 32,
    gap: 48,
  },
  columns: {
    flexDirection: 'row',
    gap: 64,
  },
  columnsMobile: {
    flexDirection: 'column',
    gap: 40,
  },
  brandColumn: {
    flex: 1,
    gap: 16,
    maxWidth: 300,
  },
  brandColumnMobile: {
    maxWidth: '100%' as any,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    fontSize: 18,
    color: '#0033A0',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9F9F8',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  brandDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  linkColumns: {
    flex: 2,
    flexDirection: 'row',
    gap: 48,
  },
  linkColumnsMobile: {
    flexDirection: 'column',
    gap: 32,
  },
  linkColumn: {
    flex: 1,
    gap: 16,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1A6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  columnLinks: {
    gap: 4,
  },
  footerLink: {
    paddingVertical: 6,
    borderRadius: 4,
  },
  footerLinkPressed: {
    opacity: 0.7,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 249, 248, 0.06)',
    flexWrap: 'wrap',
    gap: 16,
  },
  copyright: {
    fontSize: 13,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  builtWith: {
    fontSize: 13,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
});
