import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';

function shortAddr(addr, head = 8, tail = 4) {
  if (!addr) return '';
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export default function GuestProfileCard({ profile, passCount, onClear }) {
  if (!profile) return null;
  const label = profile.username ? `@${profile.username}` : 'Wallet guest';

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={s.avatar}>
          <Ionicons name="person" size={20} color={COLORS.cyan} />
        </View>
        <View style={s.meta}>
          <Text style={s.name} numberOfLines={1}>
            {label}
          </Text>
          <Text style={s.sub}>
            {passCount} pass{passCount === 1 ? '' : 'es'} ready to verify
          </Text>
        </View>
        {onClear ? (
          <TouchableOpacity
            style={s.clear}
            onPress={onClear}
            hitSlop={10}
            accessibilityLabel="Clear guest"
          >
            <Ionicons name="close" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.rows}>
        {profile.evmAddress ? (
          <View style={s.row}>
            <Text style={s.label}>EVM</Text>
            <Text style={s.value} numberOfLines={1}>
              {shortAddr(profile.evmAddress, 10, 6)}
            </Text>
          </View>
        ) : (
          <View style={[s.row, s.warnRow]}>
            <Ionicons name="warning-outline" size={14} color={COLORS.warn} />
            <Text style={s.warnText}>No EVM address — on-chain use unavailable</Text>
          </View>
        )}
        {profile.solanaAddress ? (
          <View style={s.row}>
            <Text style={s.label}>SOL</Text>
            <Text style={s.value} numberOfLines={1}>
              {shortAddr(profile.solanaAddress, 8, 6)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0 },
  name: { color: COLORS.fg, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  sub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.elevated,
  },
  rows: { marginTop: 12, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  label: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    width: 36,
  },
  value: {
    flex: 1,
    color: COLORS.secondary,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
  },
  warnRow: { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
  warnText: { color: COLORS.warn, fontSize: 12, flex: 1 },
});
