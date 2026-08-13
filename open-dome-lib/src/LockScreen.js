import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

/**
 * Shown when a mini-app is opened outside the OpenDome host iframe.
 */
export function OpenDomeLockScreen({
  title = 'OpenDome required',
  message = 'This mini-app only runs inside OpenDome or the Sandbox. Open it from the host app (app.opendome.xyz) or demo.opendome.xyz.',
}) {
  return (
    <View style={styles.root} accessibilityRole="alert">
      <Text style={styles.kicker}>LOCKED</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  kicker: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.select({
      ios: 'System',
      web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      default: 'sans-serif',
    }),
  },
  title: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
