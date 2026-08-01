import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const PROBLEMS: { icon: FeatherIconName; title: string; description: string }[] = [
  {
    icon: 'shield-off',
    title: 'Insecure Agent-to-App Auth',
    description: 'How do you securely authorize an AI agent to act on behalf of a user in a third-party app without exposing credentials? Every team rebuilds this from scratch — badly.',
  },
  {
    icon: 'link',
    title: 'Multi-Blockchain Chaos',
    description: 'Supporting any EVM (Base, Monad, Ethereum, Arbitrum), Solana, and Starknet means three different SDKs, three codebases, and three potential points of failure. The fragmentation is expensive.',
  },
  {
    icon: 'alert-triangle',
    title: 'Invasive Device Permissions',
    description: 'Autonomous agents that request GPS, camera, or sensor access trigger alarming system prompts. Users abandon workflows that feel invasive, even when the intent is harmless.',
  },
];

export function ProblemSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>The Problem</Text>
          <Text style={styles.title}>Building Agentic infrastructure is expensive, slow, and insecure</Text>
          <Text style={styles.subtitle}>
            Agentic workflows — autonomous AI agents interacting with modular apps on behalf of users — are the future. 
            But every development team wastes months reinventing the same critical infrastructure.
          </Text>
        </View>

        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          {PROBLEMS.map((problem, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardIconContainer}>
                <Feather name={problem.icon} size={22} color="#0A0A0C" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{problem.title}</Text>
                <Text style={styles.cardDescription}>{problem.description}</Text>
              </View>
              <View style={styles.cardIndex}>
                <Text style={styles.cardIndexText}>{String(index + 1).padStart(2, '0')}</Text>
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
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  gridDesktop: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.06)',
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F2F2F0',
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0C',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  cardIndex: {
    alignSelf: 'flex-end',
  },
  cardIndexText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D4D4D8',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
  },
});
