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
  } = useGuestLookup();

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
        <Text style={s.identityText} numberOfLines={1}>
          {currentUser?.name}
          {staffRole ? ` · ${staffRole}` : ''}
        </Text>
        <Text style={s.statsLine}>
          {stats.lookups} lookup{stats.lookups === 1 ? '' : 's'}
          {' · '}
          {stats.used} used
          {profile ? ` · ${passes.length} on guest` : ''}
        </Text>
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

      {error ? <Text style={s.bannerError}>{error}</Text> : null}
      {flash && !error ? <Text style={s.bannerOk}>{flash}</Text> : null}

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
          {passes.length ? 'Passes' : 'No passes'}
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
            <Text style={s.emptySub}>Nothing to check in for this guest.</Text>
          ) : !recent.length ? (
            <Text style={s.emptySub}>
              Scan a guest QR, or paste an @username or wallet.
            </Text>
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
  identity: { marginBottom: 16 },
  identityText: { color: COLORS.secondary, fontSize: 13 },
  statsLine: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  bannerError: { color: COLORS.danger, fontSize: 13, marginBottom: 10 },
  bannerOk: { color: COLORS.secondary, fontSize: 13, marginBottom: 10 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
  },
  emptySub: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 16,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  recentMeta: { flex: 1, minWidth: 0 },
  recentLabel: { color: COLORS.fg, fontWeight: '600', fontSize: 14 },
  recentSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
});
