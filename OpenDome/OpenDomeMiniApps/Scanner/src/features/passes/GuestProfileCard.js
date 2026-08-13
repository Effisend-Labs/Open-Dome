import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../theme';

function shortAddr(addr, head = 6, tail = 4) {
  if (!addr) return '';
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export default function GuestProfileCard({ profile, passCount, onClear }) {
  if (!profile) return null;
  const label = profile.username ? `@${profile.username}` : 'Guest';

  return (
    <View style={s.wrap}>
      <View style={s.top}>
        <View style={s.meta}>
          <Text style={s.name} numberOfLines={1}>
            {label}
          </Text>
          <Text style={s.sub}>
            {passCount} pass{passCount === 1 ? '' : 'es'}
            {profile.evmAddress ? ` · ${shortAddr(profile.evmAddress)}` : ' · no EVM wallet'}
          </Text>
        </View>
        {onClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={10} accessibilityLabel="Clear guest">
            <Text style={s.clear}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {!profile.evmAddress ? (
        <Text style={s.warn}>This guest has no EVM address, so passes can’t be used.</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 8, paddingTop: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flex: 1, minWidth: 0 },
  name: { color: COLORS.fg, fontSize: 16, fontWeight: '600' },
  sub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  clear: { color: COLORS.muted, fontSize: 13 },
  warn: { color: COLORS.warn, fontSize: 12, marginTop: 8 },
});
