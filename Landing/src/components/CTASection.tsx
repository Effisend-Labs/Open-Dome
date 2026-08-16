import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

export function CTASection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.section} id="get-started">
      <View style={styles.inner}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>Get Started</Text>
          <Text style={styles.title}>Start building on Open-Dome</Text>
          <Text style={styles.subtitle}>
            Whether you're connecting a Mini-App to an AI agent or building an autonomous workflow from scratch, 
            Open-Dome gives you the infrastructure to ship securely in minutes, not months.
          </Text>

          <View style={[styles.actions, !isDesktop && styles.actionsMobile]}>
            <Pressable
              onPress={() => {
                if (Platform.OS === 'web') window.open('https://github.com/Effisend-Labs/Open-Dome', '_blank');
              }}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              accessibilityRole="link"
              accessibilityLabel="View Open-Dome on GitHub"
            >
              <Text style={styles.primaryBtnText}>View on GitHub</Text>
              <Feather name="arrow-right" size={16} color="#A1A1A6" />
            </Pressable>

            <Pressable
              onPress={() => {
                if (Platform.OS === 'web') window.open('https://sandbox.opendome.xyz/', '_blank');
              }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              accessibilityRole="link"
              accessibilityLabel="Launch the Sandbox demo"
            >
              <Text style={styles.secondaryBtnText}>Launch Sandbox</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (Platform.OS === 'web') window.open('https://demo.opendome.xyz', '_blank');
              }}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              accessibilityRole="link"
              accessibilityLabel="View the Example Mini-App"
            >
              <Text style={styles.secondaryBtnText}>Example Mini-App</Text>
            </Pressable>
          </View>
        </View>

        {/* Minimal command bar */}
        <View style={styles.commandBar}>
          <Text style={styles.commandPrompt}>$</Text>
          <Text style={styles.commandText}>npm install @effisend/open-dome</Text>
          <Pressable
            style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
            onPress={() => {
              if (Platform.OS === 'web') navigator.clipboard.writeText('npm install @effisend/open-dome');
            }}
            accessibilityRole="button"
            accessibilityLabel="Copy install command"
          >
            <Feather name="copy" size={14} color="#A1A1A6" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    backgroundColor: '#F9F9F8',
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 10, 12, 0.06)',
  },
  inner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 56,
  },
  content: {
    alignItems: 'center',
    gap: 20,
    maxWidth: 640,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0033A0',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 'clamp(2rem, 4vw, 3.2rem)' as any : 34,
    fontWeight: '700',
    color: '#0A0A0C',
    letterSpacing: -1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#4A4A4D',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionsMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnPressed: {
    backgroundColor: '#1C1C1F',
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    color: '#F9F9F8',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  btnArrow: {
    color: '#A1A1A6',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingHorizontal: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.12)',
  },
  secondaryBtnPressed: {
    backgroundColor: 'rgba(10, 10, 12, 0.03)',
    transform: [{ scale: 0.98 }],
  },
  secondaryBtnText: {
    color: '#0A0A0C',
    fontWeight: '500',
    fontSize: 15,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  commandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0C',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.1)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(10, 10, 12, 0.08)',
    } : {
      elevation: 3,
    }),
  },
  commandPrompt: {
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    fontSize: 14,
  },
  commandText: {
    color: '#F9F9F8',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    fontSize: 14,
  },
  copyBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(249, 249, 248, 0.06)',
    marginLeft: 8,
  },
  copyBtnPressed: {
    backgroundColor: 'rgba(249, 249, 248, 0.12)',
  },
});
