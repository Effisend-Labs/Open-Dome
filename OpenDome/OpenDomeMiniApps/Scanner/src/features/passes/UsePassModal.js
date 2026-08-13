import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';

function clampAmount(value, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, max));
}

export default function UsePassModal({
  visible,
  pass,
  guestName,
  busy,
  error,
  onCancel,
  onConfirm,
}) {
  const max = Math.max(1, Math.floor(Number(pass?.amount) || 1));
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    if (visible) setAmount(1);
  }, [visible, pass?.tokenId]);

  if (!pass) return null;

  const name = pass.name || `Pass #${pass.tokenId}`;
  const remainingAfter = Math.max(0, max - amount);
  const burnLabel = amount === 1 ? 'Burn 1 unit' : `Burn ${amount} units`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={busy ? undefined : onCancel}
        />
        <View style={s.card}>
          <View style={s.badgeRow}>
            <Ionicons name="flame" size={12} color={COLORS.warn} />
            <Text style={s.badge}>On-chain burn</Text>
          </View>

          <Text style={s.title}>Use this pass?</Text>
          <Text style={s.subtitle}>
            {guestName ? `Verify ${guestName} and burn units from` : 'Burn units from'}{' '}
            <Text style={s.passName}>{name}</Text>. This cannot be undone.
          </Text>

          <View style={s.meta}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Pass</Text>
              <Text style={s.metaValue} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Token</Text>
              <Text style={s.metaMono}>{pass.tokenId}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Available</Text>
              <Text style={s.metaValue}>{max} unit{max === 1 ? '' : 's'}</Text>
            </View>
          </View>

          <Text style={s.stepperLabel}>Units to burn</Text>
          <View style={s.stepper}>
            <TouchableOpacity
              style={[s.stepBtn, amount <= 1 && s.stepBtnOff]}
              disabled={busy || amount <= 1}
              onPress={() => setAmount((n) => clampAmount(n - 1, max))}
              accessibilityLabel="Decrease burn amount"
            >
              <Ionicons name="remove" size={18} color={COLORS.fg} />
            </TouchableOpacity>
            <Text style={s.stepValue}>{amount}</Text>
            <TouchableOpacity
              style={[s.stepBtn, amount >= max && s.stepBtnOff]}
              disabled={busy || amount >= max}
              onPress={() => setAmount((n) => clampAmount(n + 1, max))}
              accessibilityLabel="Increase burn amount"
            >
              <Ionicons name="add" size={18} color={COLORS.fg} />
            </TouchableOpacity>
            {max > 1 ? (
              <TouchableOpacity
                style={s.allChip}
                disabled={busy || amount === max}
                onPress={() => setAmount(max)}
              >
                <Text style={s.allChipText}>All {max}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={s.remain}>
            {remainingAfter} remaining after this scan
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.actions}>
            <TouchableOpacity
              style={s.cancel}
              disabled={busy}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirm, busy && { opacity: 0.7 }]}
              disabled={busy}
              onPress={() => onConfirm(amount)}
              accessibilityRole="button"
              accessibilityLabel={burnLabel}
            >
              {busy ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color="#0A0A0A" />
                  <Text style={s.confirmText}>{burnLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    zIndex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  badge: {
    color: COLORS.warn,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.fg,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  passName: { color: COLORS.fg, fontWeight: '700' },
  meta: {
    marginTop: 16,
    backgroundColor: COLORS.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  metaValue: { color: COLORS.fg, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  metaMono: { color: COLORS.secondary, fontSize: 13, fontWeight: '700' },
  stepperLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: { opacity: 0.35 },
  stepValue: {
    minWidth: 36,
    textAlign: 'center',
    color: COLORS.fg,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  allChip: {
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(0, 82, 255, 0.28)',
  },
  allChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  remain: { color: COLORS.muted, fontSize: 12, marginTop: 8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: COLORS.danger, flex: 1, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: COLORS.fg, fontWeight: '700', fontSize: 14 },
  confirm: {
    flex: 1.4,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmText: { color: '#0A0A0A', fontWeight: '800', fontSize: 14 },
});
