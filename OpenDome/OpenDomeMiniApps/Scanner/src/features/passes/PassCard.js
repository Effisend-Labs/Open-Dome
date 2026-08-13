import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';

export default function PassCard({ pass, busy, disabled, onUse }) {
  const amount = Math.max(1, Math.floor(Number(pass.amount) || 1));
  return (
    <View style={s.card}>
      <View style={s.row}>
        {pass.image ? (
          <Image source={{ uri: pass.image }} style={s.thumb} />
        ) : (
          <View style={s.thumbFallback}>
            <Ionicons name="ticket-outline" size={22} color={COLORS.magenta} />
          </View>
        )}
        <View style={s.body}>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={1}>
              {pass.name || `Pass #${pass.tokenId}`}
            </Text>
            <View style={s.qty}>
              <Text style={s.qtyText}>×{amount}</Text>
            </View>
          </View>
          {pass.description ? (
            <Text style={s.desc} numberOfLines={2}>
              {pass.description}
            </Text>
          ) : null}
          <Text style={s.id}>
            {amount} remaining · ID {pass.tokenId}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.btn, (busy || disabled) && { opacity: 0.55 }]}
        disabled={busy || disabled}
        onPress={onUse}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Verify and use ${pass.name || pass.tokenId}`}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="shield-checkmark" size={17} color="#fff" />
            <Text style={s.btnText}>Verify & use</Text>
          </>
        )}
      </TouchableOpacity>
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
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.elevated },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 121, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: COLORS.fg, fontWeight: '700', fontSize: 15, letterSpacing: -0.2 },
  qty: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  qtyText: { color: '#7AA2FF', fontWeight: '800', fontSize: 12 },
  desc: { color: COLORS.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  id: { color: COLORS.secondary, fontSize: 11, marginTop: 6, fontWeight: '600' },
  btn: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#0A0A0A', fontWeight: '800', fontSize: 14 },
});
