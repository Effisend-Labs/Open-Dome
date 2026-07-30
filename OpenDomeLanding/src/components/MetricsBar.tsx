import React from 'react';
import { StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native';

const METRICS = [
  { value: '3+', label: 'Blockchain Networks', sublabel: 'Any EVM (Base, Monad...) · Solana · Starknet' },
  { value: 'HS512', label: 'JWT Security', sublabel: 'Server-side verification' },
  { value: 'MQTT', label: 'Real-Time Protocol', sublabel: 'Sub-millisecond latency' },
  { value: 'MIT', label: 'Open Source', sublabel: 'Free forever' },
];

export function MetricsBar() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.section}>
      <View style={[styles.inner, !isDesktop && styles.innerMobile]}>
        {METRICS.map((metric, index) => (
          <React.Fragment key={index}>
            {index > 0 && <View style={[styles.divider, !isDesktop && styles.dividerMobile]} />}
            <View style={[styles.metric, !isDesktop && styles.metricMobile]}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricSublabel}>{metric.sublabel}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    backgroundColor: '#0A0A0C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 249, 248, 0.04)',
  },
  inner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  metricMobile: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F9F9F8',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A1A1A6',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  metricSublabel: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: Platform.OS === 'web' ? "'Inter', sans-serif" : 'System',
  },
  divider: {
    width: 1,
    height: 64,
    backgroundColor: 'rgba(249, 249, 248, 0.08)',
  },
  dividerMobile: {
    width: '60%',
    height: 1,
    alignSelf: 'center',
  },
});
