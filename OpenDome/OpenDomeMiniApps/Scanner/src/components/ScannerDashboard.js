import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseScanQuery, scannerFetch } from '../core/scannerApi';
import { getStaffRoleFromUser } from '../core/staffAccess';
import { COLORS } from '../theme';
import QrCameraStage from '../features/scan/QrCameraStage';
import GuestProfileCard from '../features/passes/GuestProfileCard';
import PassCard from '../features/passes/PassCard';
import {
  loadRecentScans,
  pushRecentScan,
  clearRecentScans,
} from '../features/history/recentScans';

const DEFAULT_CONTRACT =
  process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';

const MODES = [
  { id: 'scan', label: 'Scan', icon: 'qr-code-outline' },
  { id: 'paste', label: 'Paste', icon: 'clipboard-outline' },
];

function confirmUse(passName) {
  return new Promise((resolve) => {
    const title = 'Use pass?';
    const message = `Burn one unit of "${passName}" on-chain? This cannot be undone.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Use', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

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
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingId, setUsingId] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [profile, setProfile] = useState(null);
  const [passes, setPasses] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ lookups: 0, used: 0 });

  useEffect(() => {
    loadRecentScans().then(setRecent);
  }, []);

  const parsed = useMemo(() => parseScanQuery(query), [query]);
  const canLookup =
    parsed.type !== 'empty' && parsed.type !== 'unknown' && !loading;

  const resetGuest = () => {
    setProfile(null);
    setPasses([]);
    setError('');
    setFlash('');
  };

  const lookup = useCallback(
    async (rawOverride) => {
      const raw = String(rawOverride ?? query).trim();
      const p = parseScanQuery(raw);
      setError('');
      setFlash('');
      setProfile(null);
      setPasses([]);

      if (p.type === 'empty' || p.type === 'unknown') {
        setError('Enter an OpenDome QR, @username, or wallet address');
        return;
      }

      setQuery(raw);
      setLoading(true);
      try {
        const data = await scannerFetch('/api/lookup', {
          token: hostToken,
          method: 'POST',
          body: { query: raw },
        });
        const nextProfile = data.profile || null;
        const nextPasses = Array.isArray(data.passes) ? data.passes : [];
        setProfile(nextProfile);
        setPasses(nextPasses);
        setStats((s) => ({ ...s, lookups: s.lookups + 1 }));
        setFlash(
          nextPasses.length
            ? `${nextPasses.length} pass${nextPasses.length === 1 ? '' : 'es'} found`
            : 'Guest found — no passes on record'
        );
        const label = nextProfile?.username
          ? `@${nextProfile.username}`
          : raw.length > 28
            ? `${raw.slice(0, 18)}…`
            : raw;
        const nextRecent = await pushRecentScan({
          query: raw,
          label,
          passCount: nextPasses.length,
        });
        setRecent(nextRecent);
        setCameraOn(false);
        setMode('paste');
      } catch (e) {
        setError(e.message || 'Lookup failed');
      } finally {
        setLoading(false);
      }
    },
    [hostToken, query]
  );

  const onQrDetected = useCallback(
    (value) => {
      setMode('paste');
      setCameraOn(false);
      setQuery(value);
      lookup(value);
    },
    [lookup]
  );

  const pasteClipboard = async () => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text?.trim()) {
          setQuery(text.trim());
          setMode('paste');
        }
      }
    } catch {
      setError('Clipboard permission denied');
    }
  };

  const usePass = async (pass) => {
    if (!profile?.evmAddress) {
      setError('Pass holder needs an EVM address to verify on-chain');
      return;
    }
    const ok = await confirmUse(pass.name || `Pass #${pass.tokenId}`);
    if (!ok) return;

    setUsingId(String(pass.tokenId));
    setError('');
    setFlash('');
    try {
      const data = await scannerFetch('/api/use', {
        token: hostToken,
        method: 'POST',
        body: {
          action: 'scanPass',
          network: 'base',
          contractAddress: DEFAULT_CONTRACT,
          tokenId: pass.tokenId,
          amount: 1,
          account: profile.evmAddress,
        },
      });
      setStats((s) => ({ ...s, used: s.used + 1 }));
      setFlash(`Verified · ${data.txHash?.slice(0, 12)}…`);
      const refreshed = await scannerFetch('/api/lookup', {
        token: hostToken,
        method: 'POST',
        body: { query: query.trim() },
      });
      setPasses(Array.isArray(refreshed.passes) ? refreshed.passes : []);
      setProfile(refreshed.profile || profile);
    } catch (e) {
      setError(e.message || 'Use failed');
    } finally {
      setUsingId(null);
    }
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
          <TouchableOpacity onPress={pasteClipboard} hitSlop={8}>
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
