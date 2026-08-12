import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseScanQuery, scannerFetch } from '../core/scannerApi';
import { getStaffRoleFromUser } from '../core/staffAccess';

const COLORS = {
  bg: '#09090b',
  surface: '#18181b',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
  accent: '#10b981',
  danger: '#ef4444',
  warn: '#f59e0b',
};

const DEFAULT_CONTRACT =
  process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';

function confirmUse(passName) {
  return new Promise((resolve) => {
    const title = 'Use pass?';
    const message = `Burn/verify "${passName}" on-chain? This cannot be undone.`;
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

export default function ScannerDashboard({ hostToken, currentUser }) {
  const staffRole = getStaffRoleFromUser(currentUser, hostToken);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingId, setUsingId] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState(null);
  const [passes, setPasses] = useState([]);

  const hint = useMemo(() => {
    const parsed = parseScanQuery(query);
    if (!query.trim()) return 'Paste opendome:user:…, @user, 0x…, or Solana address';
    if (parsed.type === 'opendome') return `OpenDome user @${parsed.value}`;
    if (parsed.type === 'evm') return 'EVM wallet';
    if (parsed.type === 'solana') return 'Solana wallet';
    return 'Unrecognized format';
  }, [query]);

  const lookup = async () => {
    setError('');
    setStatus('');
    setProfile(null);
    setPasses([]);
    const parsed = parseScanQuery(query);
    if (parsed.type === 'empty' || parsed.type === 'unknown') {
      setError('Enter an OpenDome QR payload, username, or wallet address');
      return;
    }
    setLoading(true);
    try {
      const data = await scannerFetch('/api/lookup', {
        token: hostToken,
        method: 'POST',
        body: { query: query.trim() },
      });
      setProfile(data.profile || null);
      setPasses(Array.isArray(data.passes) ? data.passes : []);
      setStatus(
        data.passes?.length
          ? `Found ${data.passes.length} pass(es)`
          : 'Profile found — no passes on record'
      );
    } catch (e) {
      setError(e.message || 'Lookup failed');
    } finally {
      setLoading(false);
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
    setStatus('');
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
      setStatus(`Used · tx ${data.txHash?.slice(0, 10)}…`);
      // Refresh list
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

  const renderPass = ({ item }) => {
    const busy = usingId === String(item.tokenId);
    return (
      <View style={s.card}>
        <View style={s.rowTop}>
          <Text style={s.passName} numberOfLines={1}>
            {item.name || `Pass #${item.tokenId}`}
          </Text>
          <Text style={s.badge}>×{item.amount ?? 1}</Text>
        </View>
        <Text style={s.meta} numberOfLines={2}>
          {item.description || `Token ID ${item.tokenId}`}
        </Text>
        <Text style={s.meta}>ID {item.tokenId}</Text>
        <TouchableOpacity
          style={[s.useBtn, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={() => usePass(item)}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={s.useText}>Verify & use</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Ionicons name="qr-code-outline" size={22} color={COLORS.primary} />
          <Text style={s.title}>Scanner</Text>
        </View>
        <Text style={s.subtitle}>
          {currentUser?.name} · {String(staffRole || '').toUpperCase()} · verifier
        </Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="scan-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={s.input}
          placeholder="opendome:user:… / @user / 0x… / Solana"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={lookup}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={s.hint}>{hint}</Text>

      <TouchableOpacity
        style={[s.primaryBtn, loading && { opacity: 0.6 }]}
        disabled={loading}
        onPress={lookup}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.primaryText}>Look up passes</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={s.error}>{error}</Text> : null}
      {status ? <Text style={s.status}>{status}</Text> : null}

      {profile ? (
        <View style={s.profile}>
          <Text style={s.profileName}>
            {profile.username ? `@${profile.username}` : 'Wallet holder'}
          </Text>
          {profile.evmAddress ? (
            <Text style={s.addr} numberOfLines={1}>
              EVM {profile.evmAddress.slice(0, 10)}…{profile.evmAddress.slice(-4)}
            </Text>
          ) : (
            <Text style={s.hint}>No EVM address — cannot burn on-chain</Text>
          )}
          {profile.solanaAddress ? (
            <Text style={s.addr} numberOfLines={1}>
              SOL {profile.solanaAddress.slice(0, 8)}…{profile.solanaAddress.slice(-4)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <FlatList
        style={s.list}
        data={passes}
        keyExtractor={(item, i) => `${item.tokenId}-${i}`}
        renderItem={renderPass}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          profile ? (
            <Text style={s.empty}>No passes to verify for this user.</Text>
          ) : (
            <Text style={s.empty}>Scan or paste a guest QR / wallet to begin.</Text>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 56, paddingHorizontal: 16 },
  header: { marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: COLORS.fg, fontSize: 20, fontWeight: '700' },
  subtitle: { color: COLORS.muted, marginTop: 6, fontSize: 13 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: COLORS.fg, paddingVertical: 12, fontSize: 14 },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 8, marginBottom: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  error: { color: COLORS.danger, fontSize: 13, marginBottom: 8 },
  status: { color: COLORS.accent, fontSize: 13, marginBottom: 8 },
  profile: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  profileName: { color: COLORS.fg, fontWeight: '700', fontSize: 16 },
  addr: {
    color: COLORS.muted,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    marginTop: 4,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  passName: { color: COLORS.fg, fontWeight: '600', flex: 1 },
  badge: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  useBtn: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  useText: { color: '#fff', fontWeight: '700' },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 28, fontSize: 14 },
});
