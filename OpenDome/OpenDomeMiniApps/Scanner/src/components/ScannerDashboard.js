import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStaffRoleFromUser } from '../core/staffAccess';
import { COLORS } from '../theme';
import useGuestLookup from '../features/scan/useGuestLookup';
import ScannerLookupPanel from '../features/scan/ScannerLookupPanel';
import GuestProfileCard from '../features/passes/GuestProfileCard';
import PassCard from '../features/passes/PassCard';
import UsePassModal from '../features/passes/UsePassModal';
import { clearRecentScans } from '../features/history/recentScans';

export default function ScannerDashboard({ hostToken, currentUser }) {
  const staffRole = getStaffRoleFromUser(currentUser, hostToken);
  const [mode, setMode] = useState('paste');
  const [cameraOn, setCameraOn] = useState(false);
  const [pendingPass, setPendingPass] = useState(null);
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

  const guestName = profile?.username ? `@${profile.username}` : null;

  const header = (
    <View style={s.chrome}>
      <View style={s.hostSlot} />

      <View style={s.identity}>
        <Text style={s.kicker}>Scanner</Text>
        <Text style={s.identityText} numberOfLines={1}>
          {currentUser?.name} · {String(staffRole || '').toUpperCase()}
        </Text>
      </View>

      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statVal}>{stats.lookups}</Text>
          <Text style={s.statLabel}>Lookups</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>{stats.used}</Text>
          <Text style={s.statLabel}>Burned</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statVal}>{passes.length}</Text>
          <Text style={s.statLabel}>On guest</Text>
        </View>
      </View>

      <ScannerLookupPanel
        mode={mode}
        setMode={setMode}
        cameraOn={cameraOn}
        setCameraOn={setCameraOn}
        query={query}
        setQuery={setQuery}
        parsed={parsed}
        canLookup={canLookup}
        loading={loading}
        onLookup={() => lookup()}
        onQrDetected={onQrDetected}
        onPaste={async () => {
          await pasteClipboard();
          setMode('paste');
        }}
        onClear={() => {
          setQuery('');
          resetGuest();
        }}
      />

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
          <TouchableOpacity onPress={async () => setRecent(await clearRecentScans())}>
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
            onUse={() => setPendingPass(item)}
          />
        )}
        ListEmptyComponent={
          profile ? (
            <View style={s.emptyBox}>
              <Ionicons name="ticket-outline" size={28} color={COLORS.muted} />
              <Text style={s.emptyTitle}>No passes</Text>
              <Text style={s.emptySub}>This guest has no passes to verify.</Text>
            </View>
          ) : !recent.length ? (
            <View style={s.emptyBox}>
              <Ionicons name="scan-outline" size={28} color={COLORS.cyan} />
              <Text style={s.emptyTitle}>Ready to verify</Text>
              <Text style={s.emptySub}>
                Scan a guest OpenDome QR or paste their @username / wallet.
              </Text>
            </View>
          ) : null
        }
      />
      <UsePassModal
        visible={Boolean(pendingPass)}
        pass={pendingPass}
        guestName={guestName}
        busy={Boolean(pendingPass) && usingId === String(pendingPass?.tokenId)}
        error={pendingPass ? error : ''}
        onCancel={() => {
          if (!usingId) setPendingPass(null);
        }}
        onConfirm={async (amount) => {
          const ok = await usePass(pendingPass, amount);
          if (ok) setPendingPass(null);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 48 },
  chrome: { marginBottom: 4 },
  hostSlot: { height: 44 },
  identity: { marginBottom: 12 },
  kicker: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  identityText: { color: COLORS.secondary, fontSize: 13, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statVal: { color: COLORS.fg, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { color: COLORS.muted, fontSize: 10, marginTop: 2, fontWeight: '600' },
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
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
