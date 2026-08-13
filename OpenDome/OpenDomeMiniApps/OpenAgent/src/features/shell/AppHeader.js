import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

/** Host exit X is centered at the top of the iframe — keep this band empty. */
const HOST_CLEARANCE = Platform.OS === 'web' ? 52 : 44;

export function AppHeader({ tokens, left, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hostSlot} />
      <View style={styles.bar}>
        <View style={styles.side}>{left}</View>
        <View style={styles.sideRight}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 2 },
  hostSlot: { height: HOST_CLEARANCE },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
  },
  side: { flex: 1, alignItems: 'flex-start' },
  sideRight: { flex: 1, alignItems: 'flex-end' },
});
