import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import QrCameraStage from './QrCameraStage';

const MODES = [
  { id: 'scan', label: 'Scan', icon: 'qr-code-outline' },
  { id: 'paste', label: 'Paste', icon: 'clipboard-outline' },
];

function typeLabel(type) {
  if (type === 'opendome') return 'OpenDome user';
  if (type === 'evm') return 'EVM wallet';
  if (type === 'solana') return 'Solana wallet';
  if (type === 'empty') return 'Waiting for input';
  return 'Unrecognized';
}

export default function ScannerLookupPanel({
  mode,
  setMode,
  cameraOn,
  setCameraOn,
  query,
  setQuery,
  parsed,
  canLookup,
  loading,
  onLookup,
  onQrDetected,
  onPaste,
  onClear,
}) {
  return (
    <View style={s.wrap}>
      <View style={s.modeRow}>
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[s.modeBtn, on && s.modeBtnOn]}
              onPress={() => {
                setMode(m.id);
                setCameraOn(m.id === 'scan');
              }}
            >
              <Ionicons
                name={m.icon}
                size={16}
                color={on ? COLORS.fg : COLORS.muted}
              />
              <Text style={[s.modeText, on && s.modeTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'scan' && cameraOn ? (
        <QrCameraStage
          active={cameraOn}
          onDetected={onQrDetected}
          onClose={() => {
            setCameraOn(false);
            setMode('paste');
          }}
        />
      ) : null}

      {mode === 'scan' && !cameraOn ? (
        <TouchableOpacity
          style={s.cameraCta}
          onPress={() => setCameraOn(true)}
          activeOpacity={0.9}
        >
          <View style={s.cameraCtaIcon}>
            <Ionicons name="scan" size={22} color={COLORS.primary} />
          </View>
          <Text style={s.cameraCtaTitle}>Open camera</Text>
          <Text style={s.cameraCtaSub}>
            Scan an OpenDome QR, EVM, or Solana address
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.muted} />
        <TextInput
          style={s.input}
          placeholder="opendome:user:…  /  @user  /  0x…  /  Solana"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onLookup}
        />
        {Platform.OS === 'web' ? (
          <TouchableOpacity onPress={onPaste} hitSlop={8} accessibilityLabel="Paste">
            <Ionicons name="clipboard-outline" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        ) : null}
        {query ? (
          <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityLabel="Clear">
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.typeRow}>
        <View
          style={[
            s.typePill,
            parsed.type !== 'empty' && parsed.type !== 'unknown' && s.typePillOk,
            parsed.type === 'unknown' && s.typePillBad,
          ]}
        >
          <Text style={s.typePillText}>{typeLabel(parsed.type)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.primaryBtn, !canLookup && { opacity: 0.45 }]}
        disabled={!canLookup}
        onPress={onLookup}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.primaryText}>Look up</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: COLORS.elevated,
  },
  modeBtnOn: { backgroundColor: COLORS.primarySoft },
  modeText: { color: COLORS.muted, fontWeight: '600', fontSize: 13 },
  modeTextOn: { color: COLORS.fg },
  cameraCta: {
    borderRadius: 10,
    backgroundColor: COLORS.elevated,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  cameraCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cameraCtaTitle: { color: COLORS.fg, fontSize: 15, fontWeight: '600' },
  cameraCtaSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: COLORS.fg, paddingVertical: 11, fontSize: 14 },
  typeRow: { marginTop: 8, marginBottom: 10 },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.elevated,
  },
  typePillOk: { backgroundColor: COLORS.primarySoft },
  typePillBad: { backgroundColor: COLORS.dangerSoft },
  typePillText: { color: COLORS.secondary, fontSize: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
