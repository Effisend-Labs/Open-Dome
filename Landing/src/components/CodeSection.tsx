import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';

const CODE_LINES = [
  { indent: 0, text: 'import { useOpenDome } from \'@effisend/open-dome\';', color: '#A1A1A6' },
  { indent: 0, text: '', color: 'transparent' },
  { indent: 0, text: 'export default function MyMiniApp() {', color: '#F9F9F8' },
  { indent: 1, text: 'const {', color: '#F9F9F8' },
  { indent: 2, text: 'isAuthorized,', color: '#6EE7B7' },
  { indent: 2, text: 'token,', color: '#6EE7B7' },
  { indent: 2, text: 'context,', color: '#6EE7B7' },
  { indent: 2, text: 'proxiedLocation,', color: '#6EE7B7' },
  { indent: 2, text: 'loading', color: '#6EE7B7' },
  { indent: 1, text: '} = useOpenDome();', color: '#F9F9F8' },
  { indent: 0, text: '', color: 'transparent' },
  { indent: 1, text: '// context includes: username, theme, lang, wsJwt', color: '#71717A' },
  { indent: 1, text: '// proxiedLocation: { latitude, longitude, accuracy }', color: '#71717A' },
  { indent: 0, text: '', color: 'transparent' },
  { indent: 1, text: 'if (loading) return <LoadingScreen />;', color: '#A1A1A6' },
  { indent: 1, text: 'if (!isAuthorized) return <UnauthorizedScreen />;', color: '#A1A1A6' },
  { indent: 0, text: '', color: 'transparent' },
  { indent: 1, text: 'return <App theme={context.theme} />;', color: '#93C5FD' },
  { indent: 0, text: '}', color: '#F9F9F8' },
];

export function CodeSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <View style={styles.section}>
      <View style={[styles.inner, !isDesktop && styles.innerMobile]}>
        {/* Left: Text */}
        <View style={[styles.textSide, !isDesktop && styles.textSideMobile]}>
          <Text style={styles.eyebrow}>Developer Experience</Text>
          <Text style={styles.title}>
            Months of infrastructure.{'\n'}One hook.
          </Text>
          <Text style={styles.subtitle}>
            The entire Open-Dome SDK is consumed through a single React hook. Authentication, context injection, 
            location proxying, and blockchain access — all available the moment your component mounts.
          </Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>1</Text>
              <Text style={styles.statLabel}>Hook to integrate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Config files needed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>~5min</Text>
              <Text style={styles.statLabel}>Time to integrate</Text>
            </View>
          </View>
        </View>

        {/* Right: Code */}
        <View style={[styles.codeSide, !isDesktop && styles.codeSideMobile]}>
          <View style={styles.codeWindow}>
            <View style={styles.codeWindowHeader}>
              <View style={styles.codeDots}>
                <View style={[styles.codeDot, { backgroundColor: '#FF5F57' }]} />
                <View style={[styles.codeDot, { backgroundColor: '#FFBD2E' }]} />
                <View style={[styles.codeDot, { backgroundColor: '#28C840' }]} />
              </View>
              <Text style={styles.codeFileName}>MyMiniApp.jsx</Text>
              <View style={styles.codeWindowSpacer} />
            </View>
            <View style={styles.codeBody}>
              {CODE_LINES.map((line, i) => (
                <View key={i} style={styles.codeLine}>
                  <Text style={styles.codeLineNumber}>{String(i + 1).padStart(2, ' ')}</Text>
                  <Text style={[styles.codeLineText, { color: line.color, paddingLeft: line.indent * 20 }]}>
                    {line.text || ' '}
                  </Text>
                </View>
              ))}
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 80,
  },
  innerMobile: {
    flexDirection: 'column',
    gap: 48,
  },
  textSide: {
    flex: 1,
    gap: 24,
    minWidth: 280,
  },
  textSideMobile: {
    minWidth: 0,
    width: '100%',
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
    fontSize: Platform.OS === 'web' ? 'clamp(2rem, 3.5vw, 2.8rem)' as any : 30,
    fontWeight: '700',
    color: '#0A0A0C',
    letterSpacing: -1,
    lineHeight: Platform.OS === 'web' ? '1.2em' as any : 36,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#4A4A4D',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0A0A0C',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  statLabel: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(10, 10, 12, 0.08)',
  },
  codeSide: {
    flex: 1.2,
    minWidth: 360,
  },
  codeSideMobile: {
    minWidth: 0,
    width: '100%',
  },
  codeWindow: {
    backgroundColor: '#0A0A0C',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(10, 10, 12, 0.1)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 24px 64px rgba(10, 10, 12, 0.15)',
    } : {
      elevation: 6,
    }),
  },
  codeWindowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249, 249, 248, 0.06)',
  },
  codeDots: {
    flexDirection: 'row',
    gap: 6,
  },
  codeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  codeFileName: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
  },
  codeWindowSpacer: {
    flex: 1,
  },
  codeBody: {
    padding: 20,
    gap: 0,
  },
  codeLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 22,
  },
  codeLineNumber: {
    width: 28,
    fontSize: 12,
    color: '#3A3A3D',
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    textAlign: 'right',
    marginRight: 16,
  },
  codeLineText: {
    fontSize: 13,
    lineHeight: 22,
    fontFamily: Platform.OS === 'web' ? "'JetBrains Mono', monospace" : 'System',
    flex: 1,
  },
});
