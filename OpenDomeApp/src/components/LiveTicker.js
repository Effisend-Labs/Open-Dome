import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, space, type as typeTokens } from '../core/tokens';

/**
 * <LiveTicker /> — emits a high-end monospace timestamp that ticks once
 * per second. Mimics a luxury venue's digital signage.
 */
export default function LiveTicker({ timezone = 'Asia/Tokyo' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    timeZone: timezone,
  }).toUpperCase();

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    timeZone: timezone,
  });

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`Tokyo time ${dateStr} ${timeStr}`}>
      <Text style={styles.date}>{dateStr}</Text>
      <View style={styles.sep} />
      <Text style={styles.time}>{timeStr}</Text>
      <Text style={styles.tz}>JST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  date: {
    color: colors.text.muted,
    fontSize: typeTokens.micro,
    fontFamily: 'monospace',
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  time: {
    color: colors.text.primary,
    fontSize: typeTokens.micro,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  tz: {
    color: colors.text.disabled,
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sep: {
    width: 1, height: 8,
    backgroundColor: colors.border.glass,
  },
});
