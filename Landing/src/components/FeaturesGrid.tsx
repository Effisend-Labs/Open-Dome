import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';

const FEATURES = [
  {
    title: 'Zero-Trust Security',
    subtitle: 'Server-verified handshakes, never client-side',
    description: 'The Host app verifies all users server-side before injecting credentials into the Mini-App container. Tokens are validated via the /api/verify endpoint against a server-side allowlist.',
    code: `const { isAuthorized, token, context } 
  = useOpenDome();
// context: username, theme, lang, wsJwt`,
    accent: '#0033A0',
    span: 2,
  },
  {
    title: 'Multi-Chain Web3',
    subtitle: 'One API across any EVM, Solana & Starknet',
    description: 'A unified blockchain interface that seamlessly routes across any EVM (Base, Monad, Ethereum, Arbitrum, etc), Solana, and Starknet. Fetch balances, sign transactions — zero chain-specific code required.',
    code: `const balances = await blockchain
  .getBalances({
    base: '0xA1b2...', solana: '3Kz...',
    starknet: '0x04a...'
  });`,
    accent: '#0033A0',
    span: 1,
  },
  {
    title: 'Real-Time Events',
    subtitle: 'MQTT-powered pub/sub messaging',
    description: 'A dedicated, secure channel for instant messaging between apps and the host. Low-latency MQTT broker with JWT-authenticated connections for real-time data syncing.',
    code: `Events.connect({ jwt: context.wsJwt });
Events.subscribe(
  'opendome/public/events',
  (data) => handleEvent(data)
);`,
    accent: '#0033A0',
    span: 1,
  },
  {
    title: 'Location Privacy',
    subtitle: 'GPS without invasive permissions',
    description: 'The Host safely proxies GPS data to the Mini-App. No direct device permissions needed — no scary iOS/Android prompts that cause users to abandon your app.',
    code: `// Automatically uses proxied location
// when available inside the Host
const { proxiedLocation } = useOpenDome();
const { latitude, longitude } = proxiedLocation;`,
    accent: '#0033A0',
    span: 2,
  },
];

export function FeaturesGrid() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <View style={styles.section} id="features">
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SDK Features</Text>
          <Text style={styles.title}>Enterprise-grade abstractions for modular apps</Text>
          <Text style={styles.subtitle}>
            Everything your Mini-App needs to securely communicate with the Host, access blockchain networks, 
            stream real-time data, and respect user privacy — through a single SDK.
          </Text>
        </View>

        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          {FEATURES.map((feature, index) => (
            <View 
              key={index} 
              style={[
                styles.card,
                isDesktop && feature.span === 2 && styles.cardWide,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.accentBar, { backgroundColor: feature.accent }]} />
                <View style={styles.cardTitles}>
                  <Text style={styles.cardTitle}>{feature.title}</Text>
                  <Text style={styles.cardSubtitle}>{feature.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>{feature.description}</Text>
              <View style={styles.codeBlock}>
                <View style={styles.codeHeader}>
                  <View style={styles.codeDots}>
                    <View style={[styles.codeDot, { backgroundColor: '#FF5F57' }]} />
                    <View style={[styles.codeDot, { backgroundColor: '#FFBD2E' }]} />
                    <View style={[styles.codeDot, { backgroundColor: '#28C840' }]} />
                  </View>
                  <Text style={styles.codeHeaderText}>example.js</Text>
                </View>
                <Text style={styles.codeText}>{feature.code}</Text>
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
    backgroundColor: '#F9F9F8',
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
    ...(Platform.OS === 'web' ? {
      display: 'grid' as any,
      gridTemplateColumns: 'repeat(2, 1fr)',
    } : {
      flexDirection: 'row',
      flexWrap: 'wrap',
    }),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.06)',
  },
  cardWide: {
    ...(Platform.OS === 'web' ? {
      gridColumn: 'span 2',
    } : {
      width: '100%',
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  accentBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
    marginTop: 2,
  },
  cardTitles: {
    gap: 4,
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0A0A0C',
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  codeBlock: {
    backgroundColor: '#0A0A0C',
    borderRadius: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 249, 248, 0.06)',
  },
  codeDots: {
    flexDirection: 'row',
    gap: 6,
  },
  codeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  codeHeaderText: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
  },
  codeText: {
    padding: 16,
    fontSize: 13,
    lineHeight: 22,
    color: '#A1A1A6',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
  },
});
