import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStaffRoleFromUser } from '../core/staffAccess';
import { COLORS } from '../theme';
import QrCameraStage from '../features/scan/QrCameraStage';
import useGuestLookup from '../features/scan/useGuestLookup';
import GuestProfileCard from '../features/passes/GuestProfileCard';
import PassCard from '../features/passes/PassCard';
import { clearRecentScans } from '../features/history/recentScans';

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

export default function ScannerDashboard({ hostToken, currentUser }) {
  const staffRole = getStaffRoleFromUser(currentUser, hostToken);
  const [mode, setMode] = useState('paste');
  const [cameraOn, setCameraOn] = useState(false);
  const {
    query,
    setQuery,
    parsed,
    canLookup,
    loading,
    usingId,
    error,
    flash,
    profile,
    passes,
    recent,
    setRecent,
    stats,
    lookup,
    usePass,
    resetGuest,
    pasteClipboard,
  } = useGuestLookup(hostToken);

  const onQrDetected = (value) => {
    setMode('paste');
    setCameraOn(false);
    setQuery(value);
    lookup(value);
  };

  const header = (
    <View style={s.chrome}>
      <View style={s.header}>
        <Image source={require('../assets/logo.png')} style={s.logo} />
        <View style={s.headerText}>
          <Text style={s.title}>Scanner</Text>
          <Text style={s.subtitle}>
            {currentUser?.name} · {String(staffRole || '').toUpperCase()}
          </Text>
        </View>
        <View style={s.livePill}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statVal}>{stats.lookups}</Text>
          <Text style={s.statLabel}>Lookups</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statVal}>{stats.used}</Text>
          <Text style={s.statLabel}>Used</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={s.statVal}>{passes.length}</Text>
          <Text style={s.statLabel}>On guest</Text>
        </View>
      </View>

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
            <Ionicons name="scan" size={28} color={COLORS.cyan} />
          </View>
          <Text style={s.cameraCtaTitle}>Open camera</Text>
          <Text style={s.cameraCtaSub}>
            Scan OpenDome user QR, EVM, or Solana address
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.muted} />
        <TextInput
          style={s.input}
          placeholder="opendome:user:… / @user / 0x… / Solana"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => lookup()}
        />
        {Platform.OS === 'web' ? (
          <TouchableOpacity
            onPress={async () => {
              await pasteClipboard();
              setMode('paste');
            }}
            hitSlop={8}
          >
            <Ionicons name="clipboard-outline" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        ) : null}
        {query ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              resetGuest();
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.typeRow}>
        <View
          style={[
            s.typePill,
            parsed.type !== 'empty' &&
              parsed.type !== 'unknown' &&
              s.typePillOk,
            parsed.type === 'unknown' && s.typePillBad,
          ]}
        >
          <Text style={s.typePillText}>{typeLabel(parsed.type)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.primaryBtn, !canLookup && { opacity: 0.45 }]}
        disabled={!canLookup}
        onPress={() => lookup()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={s.primaryText}>Look up passes</Text>
          </>
        )}
      </TouchableOpacity>

      {error ? (
        <View style={s.bannerError}>
          <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
          <Text style={s.bannerErrorText}>{error}</Text>
        </View>
      ) : null}
      {flash && !error ? (
        <View style={s.bannerOk}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
          <Text style={s.bannerOkText}>{flash}</Text>
        </View>
      ) : null}

      <GuestProfileCard
        profile={profile}
        passCount={passes.length}
        onClear={() => {
          resetGuest();
          setQuery('');
        }}
      />

      {profile ? (
        <Text style={s.sectionLabel}>
          Passes {passes.length ? `(${passes.length})` : ''}
        </Text>
      ) : null}
    </View>
  );

  const footer =
    !profile && recent.length > 0 ? (
      <View style={s.recentBlock}>
        <View style={s.recentHead}>
          <Text style={s.sectionLabel}>Recent</Text>
          <TouchableOpacity
            onPress={async () => setRecent(await clearRecentScans())}
          >
            <Text style={s.clearRecent}>Clear</Text>
          </TouchableOpacity>
        </View>
        {recent.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.recentRow}
            onPress={() => lookup(item.query)}
          >
            <Ionicons name="time-outline" size={16} color={COLORS.muted} />
            <View style={s.recentMeta}>
              <Text style={s.recentLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={s.recentSub}>
                {item.passCount} pass{item.passCount === 1 ? '' : 'es'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </View>
    ) : null;

  return (
    <View style={s.root}>
      <FlatList
        style={s.list}
        data={profile ? passes : []}
        keyExtractor={(item, i) => `${item.tokenId}-${i}`}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PassCard
            pass={item}
            busy={usingId === String(item.tokenId)}
            disabled={!profile?.evmAddress}
            onUse={() => usePass(item)}
          />
        )}
        ListEmptyComponent={
          profile ? (
            <View style={s.emptyBox}>
              <Ionicons name="ticket-outline" size={28} color={COLORS.muted} />
              <Text style={s.emptyTitle}>No passes</Text>
              <Text style={s.emptySub}>
                This guest has no passes to verify.
              </Text>
            </View>
          ) : !recent.length ? (
            <View style={s.emptyBox}>
              <Ionicons name="scan-outline" size={32} color={COLORS.cyan} />
              <Text style={s.emptyTitle}>Ready to verify</Text>
              <Text style={s.emptySub}>
                Scan a guest OpenDome QR or paste their @username / wallet.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  list: { flex: 1 },
  listContent: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 48 },
  chrome: { marginBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: COLORS.fg, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(0, 216, 151, 0.25)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  liveText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginBottom: 14,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { color: COLORS.fg, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modeBtnOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  modeText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  modeTextOn: { color: COLORS.fg },
  cameraCta: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.elevated,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  cameraCtaIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cameraCtaTitle: { color: COLORS.fg, fontSize: 16, fontWeight: '700' },
  cameraCtaSub: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: COLORS.fg, paddingVertical: 13, fontSize: 14 },
  typeRow: { marginTop: 10, marginBottom: 12 },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typePillOk: {
    borderColor: 'rgba(0, 82, 255, 0.35)',
    backgroundColor: COLORS.primarySoft,
  },
  typePillBad: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: COLORS.dangerSoft,
  },
  typePillText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  bannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bannerErrorText: { color: COLORS.danger, flex: 1, fontSize: 13 },
  bannerOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bannerOkText: { color: COLORS.accent, flex: 1, fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: { color: COLORS.fg, fontSize: 16, fontWeight: '700' },
  emptySub: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  recentBlock: { marginTop: 8 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearRecent: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 8,
  },
  recentMeta: { flex: 1, minWidth: 0 },
  recentLabel: { color: COLORS.fg, fontWeight: '600', fontSize: 14 },
  recentSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
});
