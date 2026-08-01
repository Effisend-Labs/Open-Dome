import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const PILLARS: { number: string; icon: FeatherIconName; title: string; subtitle: string; description: string; tag: string }[] = [
  {
    number: '01',
    icon: 'terminal',
    title: 'The SDK',
    subtitle: 'The Engine',
    description: 'Months of infrastructure engineering, reduced to a single line of code. Developers drop our lightweight SDK into their Mini-App. Behind the scenes, it handles security handshakes, blockchain connections, and live event streaming automatically.',
    tag: 'open-dome-lib',
  },
  {
    number: '02',
    icon: 'monitor',
    title: 'The Sandbox',
    subtitle: 'The Proving Ground',
    description: 'A professional-grade testing laboratory. Load your Mini-App into the Sandbox to simulate exactly how it performs when interacting with an AI agent — test security injections, user profiles, themes, and real-time GPS tracking safely before deploying to production.',
    tag: 'opendome.expo.app',
  },
  {
    number: '03',
    icon: 'smartphone',
    title: 'Example Mini-App',
    subtitle: 'The Blueprint',
    description: 'A production-ready reference implementation featuring a multi-chain crypto wallet, live map using proxied GPS, and an interactive game powered by real-time MQTT. Fork this blueprint and have a working app by the afternoon.',
    tag: 'miniapp.expo.app',
  },
];

export function EcosystemSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <View style={styles.section} id="ecosystem">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Ecosystem</Text>
          <Text style={styles.title}>Three pillars. One complete development experience.</Text>
          <Text style={styles.subtitle}>
            Open-Dome isn't just an SDK — it's a complete ecosystem for building, testing, and shipping 
            modular applications for Agentic environments.
          </Text>
        </View>

        <View style={[styles.pillars, isDesktop && styles.pillarsDesktop]}>
          {PILLARS.map((pillar, index) => (
            <View key={index} style={styles.pillar}>
              <View style={styles.pillarTop}>
                <Text style={styles.pillarNumber}>{pillar.number}</Text>
                <View style={styles.pillarIconWrap}>
                  <Feather name={pillar.icon} size={20} color="#0033A0" />
                </View>
              </View>
              <View style={styles.pillarContent}>
                <Text style={styles.pillarSubtitle}>{pillar.subtitle}</Text>
                <Text style={styles.pillarTitle}>{pillar.title}</Text>
                <Text style={styles.pillarDescription}>{pillar.description}</Text>
              </View>
              <View style={styles.pillarTag}>
                <Text style={styles.pillarTagText}>{pillar.tag}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    backgroundColor: '#F2F2F0',
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 10, 12, 0.06)',
  },
  inner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
  },
  header: {
    maxWidth: 720,
    gap: 16,
    marginBottom: 80,
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
    fontSize: Platform.OS === 'web' ? 'clamp(2rem, 3.5vw, 3rem)' as any : 32,
    fontWeight: '700',
    color: '#0A0A0C',
    letterSpacing: -1,
    lineHeight: Platform.OS === 'web' ? '1.15em' as any : 38,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  pillars: {
    flexDirection: 'column',
    gap: 16,
  },
  pillarsDesktop: {
    flexDirection: 'row',
    gap: 16,
  },
  pillar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    gap: 24,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.06)',
    justifyContent: 'space-between',
  },
  pillarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pillarNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EBEBEA',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  pillarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 51, 160, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 51, 160, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarContent: {
    gap: 8,
    flex: 1,
  },
  pillarSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0033A0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  pillarTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A0A0C',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  pillarDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  pillarTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10, 10, 12, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.06)',
  },
  pillarTagText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
  },
});
