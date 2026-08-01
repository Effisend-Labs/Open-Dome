import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

export function Hero() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <View style={styles.heroSection}>
      <View style={[styles.heroContent, !isDesktop && styles.heroContentMobile]}>
        <View style={[styles.heroTextContent, !isDesktop && styles.heroTextContentMobile]}>
          {/* Provenance badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Built for Tokyo Dome City</Text>
          </View>

          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>The Infrastructure Layer</Text>
            <Text style={styles.heroTitle}>
              for the{' '}
              <Text style={styles.highlight}>Agentic</Text>
              {' '}Era
            </Text>
          </View>

          <Text style={styles.heroSubtitle}>
            Open-Dome is the plug-and-play, enterprise-grade infrastructure suite that powers next-generation 
            Agentic workflows. Secure bridges for AI agents, multi-chain Web3, and real-time communication — reduced to a single SDK.
          </Text>

          <View style={styles.heroActions}>
            <Pressable 
              onPress={() => {
                if (Platform.OS === 'web') window.open('https://github.com/Effisend-Labs/Open-Dome', '_blank');
              }}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              accessibilityRole="link"
              accessibilityLabel="View Open-Dome on GitHub"
            >
              <Text style={styles.btnText}>View on GitHub</Text>
              <Feather name="arrow-right" size={15} color="#A1A1A6" />
            </Pressable>
            <Pressable 
              onPress={() => {
                if (Platform.OS === 'web') window.open('https://opendome.expo.app/', '_blank');
              }}
              style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
              accessibilityRole="link"
              accessibilityLabel="Launch the Open-Dome Sandbox"
            >
              <Text style={styles.btnOutlineText}>Launch Sandbox</Text>
            </Pressable>
          </View>

          {/* Tech badges */}
          <View style={styles.techRow}>
            <Text style={styles.techLabel}>Supports</Text>
            <View style={styles.techBadges}>
              {['Any EVM (Base, Monad...)', 'Solana', 'Starknet'].map((chain) => (
                <View key={chain} style={styles.techBadge}>
                  <Text style={styles.techBadgeText}>{chain}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Visual */}
        <View style={[styles.heroVisual, !isDesktop && styles.heroVisualMobile]}>
          <View style={styles.codeEditor}>
            <View style={styles.editorHeader}>
              <View style={styles.editorDots}>
                <View style={[styles.editorDot, { backgroundColor: '#FF5F57' }]} />
                <View style={[styles.editorDot, { backgroundColor: '#FFBD2E' }]} />
                <View style={[styles.editorDot, { backgroundColor: '#28C840' }]} />
              </View>
              <Text style={styles.editorTitle}>agent-workflow.ts</Text>
            </View>
            <View style={styles.editorBody}>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>1</Text>
                <Text style={styles.codeLine}>
                  <Text style={styles.codeKeyword}>import</Text> {'{'} Agent {'}'} <Text style={styles.codeKeyword}>from</Text> <Text style={styles.codeString}>'@effisend/open-dome'</Text>;
                </Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>2</Text>
                <Text style={styles.codeLine}></Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>3</Text>
                <Text style={styles.codeLine}>
                  <Text style={styles.codeComment}>// Prompt the Super-App's host agent</Text>
                </Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>4</Text>
                <Text style={styles.codeLine}>
                  <Text style={styles.codeKeyword}>const</Text> response = <Text style={styles.codeKeyword}>await</Text> Agent.<Text style={styles.codeFunction}>prompt</Text>(
                </Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>5</Text>
                <Text style={styles.codeLine}>
                  {'  '}<Text style={styles.codeString}>"Bridge 500 USDC to Base network"</Text>
                </Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>6</Text>
                <Text style={styles.codeLine}>
                  );
                </Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>7</Text>
                <Text style={styles.codeLine}></Text>
              </View>
              <View style={styles.codeLineRow}>
                <Text style={styles.lineNumber}>8</Text>
                <Text style={styles.codeLine}>
                  console.<Text style={styles.codeFunction}>log</Text>(<Text style={styles.codeString}>"Agent executed:"</Text>, response);
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.visualCaption}>
            <Text style={styles.visualCaptionText}>The Open-Dome Sandbox — test your Mini-App before deployment</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    minHeight: Platform.OS === 'web' ? '92vh' as any : 800,
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
  },
  heroContent: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 80,
  },
  heroContentMobile: {
    flexDirection: 'column' as any,
    gap: 56,
  },
  heroTextContent: {
    flex: 1,
    minWidth: 300,
    maxWidth: 620,
    gap: 28,
  },
  heroTextContentMobile: {
    maxWidth: '100%' as any,
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 51, 160, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 51, 160, 0.10)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0033A0',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0033A0',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  heroTitleContainer: {
    gap: 0,
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? 'clamp(2.5rem, 5vw, 4.5rem)' as any : 44,
    lineHeight: Platform.OS === 'web' ? '1.08em' as any : 48,
    letterSpacing: -2,
    fontWeight: '700',
    color: '#0A0A0C',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  highlight: {
    color: '#0033A0',
  },
  heroSubtitle: {
    fontSize: Platform.OS === 'web' ? 'clamp(1rem, 1.5vw, 1.2rem)' as any : 17,
    color: '#4A4A4D',
    lineHeight: Platform.OS === 'web' ? '1.7em' as any : 28,
    fontWeight: '400',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  btn: {
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  btnPressed: {
    backgroundColor: '#1C1C1F',
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    color: '#F9F9F8',
    fontWeight: '500',
    fontSize: 15,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  btnArrow: {
    color: '#A1A1A6',
    fontSize: 15,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.12)',
  },
  btnOutlinePressed: {
    backgroundColor: 'rgba(10, 10, 12, 0.03)',
    transform: [{ scale: 0.98 }],
  },
  btnOutlineText: {
    color: '#0A0A0C',
    fontWeight: '500',
    fontSize: 15,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  techLabel: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  techBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  techBadge: {
    backgroundColor: 'rgba(10, 10, 12, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.06)',
  },
  techBadgeText: {
    fontSize: 12,
    color: '#4A4A4D',
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  heroVisual: {
    flex: 1.3,
    minWidth: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  heroVisualMobile: {
    paddingLeft: 0,
    marginTop: 32,
    alignItems: 'center',
  },
  codeEditor: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#0A0A0C',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.1)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 24px 64px rgba(10, 10, 12, 0.16), 0 8px 24px rgba(10, 10, 12, 0.08)',
    } : {
      elevation: 10,
    }),
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 249, 248, 0.06)',
    backgroundColor: '#141416',
  },
  editorDots: {
    flexDirection: 'row',
    gap: 6,
  },
  editorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  editorTitle: {
    fontSize: 13,
    color: '#A1A1A6',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    marginLeft: 8,
  },
  editorBody: {
    padding: 24,
    backgroundColor: '#0A0A0C',
  },
  codeLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 24,
  },
  lineNumber: {
    width: 32,
    fontSize: 14,
    lineHeight: 24,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    userSelect: 'none' as any,
  },
  codeLine: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    color: '#F9F9F8',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    whiteSpace: 'pre' as any,
  },
  codeKeyword: {
    color: '#FF7B72',
  },
  codeString: {
    color: '#A5D6FF',
  },
  codeFunction: {
    color: '#D2A8FF',
  },
  codeComment: {
    color: '#8B949E',
    fontStyle: 'italic',
  },
  visualCaption: {
    alignSelf: 'center',
  },
  visualCaptionText: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
});
