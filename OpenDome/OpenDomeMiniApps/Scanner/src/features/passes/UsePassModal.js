import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
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
  const left = Math.max(0, max - amount);
  const confirmLabel = amount === 1 ? 'Use 1' : `Use ${amount}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{name}</Text>
          <Text style={s.sub}>
            {guestName ? `${guestName} · ` : ''}
            {max} available
          </Text>

          {max > 1 ? (
            <View style={s.qtyBlock}>
              <Text style={s.qtyLabel}>How many to use</Text>
              <View style={s.stepper}>
                <TouchableOpacity
                  style={s.stepBtn}
                  disabled={busy || amount <= 1}
                  onPress={() => setAmount((n) => clampAmount(n - 1, max))}
                >
                  <Text style={s.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepValue}>{amount}</Text>
                <TouchableOpacity
                  style={s.stepBtn}
                  disabled={busy || amount >= max}
                  onPress={() => setAmount((n) => clampAmount(n + 1, max))}
                >
                  <Text style={s.stepBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAmount(max)}
                  disabled={busy || amount === max}
                  hitSlop={8}
                >
                  <Text style={[s.useAll, amount === max && { opacity: 0.35 }]}>
                    Use all
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={s.remain}>{left} will remain</Text>
            </View>
          ) : null}

          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.actions}>
            <TouchableOpacity style={s.cancel} disabled={busy} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirm, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={() => onConfirm(amount)}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    zIndex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  title: { color: COLORS.fg, fontSize: 18, fontWeight: '600' },
  sub: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  qtyBlock: { marginTop: 20 },
  qtyLabel: { color: COLORS.secondary, fontSize: 13, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: COLORS.fg, fontSize: 20, lineHeight: 22 },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    color: COLORS.fg,
    fontSize: 20,
    fontWeight: '600',
  },
  useAll: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  remain: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 14, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  cancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.elevated,
  },
  cancelText: { color: COLORS.fg, fontSize: 15, fontWeight: '600' },
  confirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
