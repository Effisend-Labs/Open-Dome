import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS } from '../../theme';

export default function PassCard({ pass, busy, disabled, onUse }) {
  const amount = Math.max(1, Math.floor(Number(pass.amount) || 1));
  return (
    <View style={s.row}>
      {pass.image ? (
        <Image source={{ uri: pass.image }} style={s.thumb} />
      ) : (
        <View style={s.thumbFallback}>
          <Text style={s.thumbLetter}>
            {(pass.name || 'P').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={s.body}>
        <Text style={s.title} numberOfLines={1}>
          {pass.name || `Pass #${pass.tokenId}`}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {amount} left
          {pass.description ? ` · ${pass.description}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={[s.btn, (busy || disabled) && { opacity: 0.4 }]}
        disabled={busy || disabled}
        onPress={onUse}
      >
        {busy ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={s.btnText}>Use</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.elevated },
  thumbFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLetter: { color: COLORS.secondary, fontSize: 15, fontWeight: '600' },
  body: { flex: 1, minWidth: 0 },
  title: { color: COLORS.fg, fontSize: 15, fontWeight: '600' },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
