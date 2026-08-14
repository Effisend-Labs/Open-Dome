import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

export function CreditsBadge({ tokens, label, status }) {
  return (
    <View style={styles.wrap}>
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={tokens.FG_SECONDARY} />
      ) : (
        <Text style={[styles.value, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 44, alignItems: 'flex-end' },
  value: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
});
