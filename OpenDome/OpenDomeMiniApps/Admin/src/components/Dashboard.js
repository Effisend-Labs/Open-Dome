import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminFetch, setHostJwt } from '../core/adminApi';
import { getClientRuntimeLabel } from '../core/runtimeLabel';
import MintPanel from '../features/mint/MintPanel';
import MerchantBalancesScreen from '../features/merchant/MerchantBalancesScreen';

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

const ROLE_OPTIONS = ['USER', 'ADMIN', 'SCANNER'];

const HOME_TILES = [
  {
    id: 'balances',
    title: 'Balances',
    subtitle: 'Merchant gas + USDC across L2s, Ethereum, and Solana',
    icon: 'wallet-outline',
  },
  {
    id: 'users',
    title: 'Users',
    subtitle: 'Search, change roles, or delete onboarded accounts',
    icon: 'people-outline',
  },
  {
    id: 'mint',
    title: 'Mint',
    subtitle: 'Pick an event or amenity, select guests, mint passes',
    icon: 'ticket-outline',
  },
];

function RolePicker({ value, onChange, disabled }) {
  return (
    <View style={s.rolePicker}>
      {ROLE_OPTIONS.map((role) => {
        const active = value === role;
        return (
          <TouchableOpacity
            key={role}
            disabled={disabled}
            style={[s.roleOpt, active && s.roleOptActive]}
            onPress={() => onChange(role)}
          >
            <Text style={[s.roleOptText, active && s.roleOptTextActive]}>{role}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ScreenHeader({ title, onBack, runtimeLabel, isDev }) {
  return (
    <View style={s.screenHeader}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={22} color={COLORS.fg} />
      </TouchableOpacity>
      <Text style={s.screenTitle}>{title}</Text>
      <View style={[s.envBadge, isDev ? s.envDev : s.envProd]}>
        <Text style={[s.envBadgeText, isDev ? s.envDevText : s.envProdText]}>
          {runtimeLabel}
        </Text>
      </View>
    </View>
  );
}

function parseUsersPayload(data) {
  if (Array.isArray(data)) {
    return { users: data, total: data.length, collection: '', env: '' };
  }
  const users = Array.isArray(data?.users) ? data.users : [];
  return {
    users,
    total: typeof data?.total === 'number' ? data.total : users.length,
    collection: data?.collection || '',
    env: data?.env || '',
  };
}

export default function Dashboard({ currentUser, hostToken }) {
  const runtimeLabel = getClientRuntimeLabel();
  const isDev = runtimeLabel === 'DEV';
  const collectionHint = isDev ? 'DevUsers' : 'Users';

  const [screen, setScreen] = useState('home');
  const [users, setUsers] = useState([]);
  const [collectionName, setCollectionName] = useState(collectionHint);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});
  const [bulkRole, setBulkRole] = useState('USER');
  const [savingRoles, setSavingRoles] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [selectedPass, setSelectedPass] = useState(null);
  const [amount, setAmount] = useState('1');
  const [network, setNetwork] = useState('base');
  const [isAssigning, setIsAssigning] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (hostToken) setHostJwt(hostToken);
  }, [hostToken]);

  const fetchUsers = useCallback(
    async () => {
      if (hostToken) setHostJwt(hostToken);
      setLoadingUsers(true);
      setLoadError('');
      try {
        const scope = screen === 'mint' ? 'mint' : 'roles';
        const res = await adminFetch(`/api/users?scope=${scope}`, { token: hostToken });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Failed to load users (${res.status})`);
        }
        const parsed = parseUsersPayload(data);
        setUsers(parsed.users);
        if (parsed.collection) setCollectionName(parsed.collection);
      } catch (e) {
        setUsers([]);
        setLoadError(e.message || 'Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    },
    [hostToken, screen],
  );

  useEffect(() => {
    if (screen === 'users' || screen === 'mint') {
      setSearch('');
      fetchUsers();
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, '');
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u.username || u.name || '')
        .toLowerCase()
        .replace(/^@/, '');
      const addr = String(u.address || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      return name.includes(q) || addr.includes(q) || id.includes(q);
    });
  }, [users, search]);

  const dirtyCount = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'GOD') return false;
      const draft = draftRoles[u.id];
      return draft && draft !== u.role;
    }).length;
  }, [users, draftRoles]);

  const goHome = () => {
    setScreen('home');
    setStatus('');
    setSelectedUsers([]);
    setSelectedPass(null);
  };

  const setDraftRole = (id, role) => {
    setDraftRoles((prev) => ({ ...prev, [id]: role }));
  };

  const applyBulkRoleToSelected = () => {
    if (!selectedUsers.length) return;
    setDraftRoles((prev) => {
      const next = { ...prev };
      selectedUsers.forEach((id) => {
        const u = users.find((x) => x.id === id);
        if (u && u.role !== 'GOD') next[id] = bulkRole;
      });
      return next;
    });
  };

  const handleSaveRoles = async () => {
    const updates = users
      .filter((u) => u.role !== 'GOD')
      .map((u) => ({ id: u.id, role: draftRoles[u.id] || u.role }))
      .filter((u) => {
        const original = users.find((x) => x.id === u.id);
        return original && u.role !== original.role;
      });

    const payload =
      updates.length > 0
        ? updates
        : selectedUsers
            .map((id) => {
              const u = users.find((x) => x.id === id);
              if (!u || u.role === 'GOD') return null;
              return { id, role: draftRoles[id] || bulkRole };
            })
            .filter(Boolean)
            .filter((u) => {
              const original = users.find((x) => x.id === u.id);
              return original && u.role !== original.role;
            });

    if (!payload.length) {
      setStatus('No role changes to save');
      return;
    }

    setSavingRoles(true);
    setStatus('');
    try {
      if (hostToken) setHostJwt(hostToken);
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        token: hostToken,
        body: JSON.stringify({ updates: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setDraftRoles({});
      setStatus(`Saved roles for ${payload.length} user(s)`);
      await fetchUsers();
    } catch (e) {
      setStatus(e.message);
    }
    setSavingRoles(false);
  };

  const confirmDelete = (username) =>
    new Promise((resolve) => {
      const title = 'Delete user?';
      const message = `Remove ${username} permanently? This cannot be undone.`;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
        resolve(window.confirm(`${title}\n\n${message}`));
        return;
      }
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });

  const handleDelete = async (id) => {
    const u = users.find((x) => x.id === id);
    if (!u || u.role === 'GOD') return;
    const ok = await confirmDelete(u.name || u.username || 'this user');
    if (!ok) return;
    setStatus('');
    try {
      if (hostToken) setHostJwt(hostToken);
      const res = await adminFetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token: hostToken,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setSelectedUsers((prev) => prev.filter((x) => x !== id));
      setStatus(`Deleted ${u.name}`);
      await fetchUsers();
    } catch (e) {
      setStatus(e.message);
    }
  };

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    const tokenId = selectedPass?.tokenId ?? (ticketId ? parseInt(ticketId, 10) : null);
    const qty = parseInt(amount, 10);
    if (!selectedUsers.length || !tokenId || !Number.isFinite(qty) || qty < 1) {
      setStatus('Select guests, a pass, and an amount ≥ 1');
      return;
    }
    setIsAssigning(true);
    setStatus('');
    try {
      if (hostToken) setHostJwt(hostToken);
      const res = await adminFetch('/api/assign', {
        method: 'POST',
        token: hostToken,
        body: JSON.stringify({
          userIds: selectedUsers,
          ticketIds: [tokenId],
          amounts: [qty],
          network,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      const label = selectedPass?.label || `token ${tokenId}`;
      setStatus(`Minted ${label} ×${qty} on ${network}: ${data.results?.[0]?.txHash || 'ok'}`);
      setSelectedUsers([]);
      setSelectedPass(null);
      setTicketId('');
      setAmount('1');
      fetchUsers();
    } catch (e) {
      setStatus(e.message);
    }
    setIsAssigning(false);
  };

  const renderUserRow = ({ item: u }) => {
    const isGod = u.role === 'GOD';
    const selected = selectedUsers.includes(u.id);
    const addr = u.address || '';
    return (
      <View style={s.row}>
        <TouchableOpacity
          onPress={() => toggleUser(u.id)}
          style={s.check}
          disabled={isGod && screen === 'users'}
        >
          <Ionicons
            name={selected ? 'checkbox' : 'square-outline'}
            size={22}
            color={isGod && screen === 'users' ? COLORS.muted : COLORS.primary}
          />
        </TouchableOpacity>
        <View style={s.rowBody}>
          <View style={s.rowTop}>
            <Text style={s.rowName} numberOfLines={1}>
              {u.name || 'Anonymous'}
            </Text>
            <Text style={s.badge}>{draftRoles[u.id] || u.role}</Text>
          </View>
          <Text style={s.rowAddr} numberOfLines={1}>
            {addr ? `${addr.slice(0, 8)}…${addr.slice(-4)}` : 'No EVM address'}
          </Text>
          {screen === 'users' && !isGod ? (
            <>
              <RolePicker
                value={draftRoles[u.id] || u.role}
                onChange={(role) => setDraftRole(u.id, role)}
              />
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(u.id)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                <Text style={s.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {screen === 'users' && isGod ? (
            <Text style={[s.hint, { marginBottom: 0, marginTop: 6 }]}>GOD — locked</Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (screen === 'home') {
    return (
      <ScrollView
        style={s.root}
        contentContainerStyle={s.homeContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.homeHeader}>
          <View style={s.titleRow}>
            <Ionicons name="finger-print" size={22} color={COLORS.primary} />
            <Text style={s.title}>Admin</Text>
            <View style={[s.envBadge, isDev ? s.envDev : s.envProd]}>
              <Text style={[s.envBadgeText, isDev ? s.envDevText : s.envProdText]}>
                {runtimeLabel}
              </Text>
            </View>
          </View>
          <Text style={s.subtitle}>
            {currentUser.name} · {currentUser.role} · {isDev ? 'DevUsers' : 'Users'}
          </Text>
        </View>

        <View style={s.tiles}>
          {HOME_TILES.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={s.tile}
              onPress={() => setScreen(tile.id)}
              activeOpacity={0.85}
            >
              <View style={s.tileIcon}>
                <Ionicons name={tile.icon} size={26} color={COLORS.primary} />
              </View>
              <View style={s.tileText}>
                <Text style={s.tileTitle}>{tile.title}</Text>
                <Text style={s.tileSub}>{tile.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (screen === 'balances') {
    return (
      <View style={s.root}>
        <View style={s.listChrome}>
          <ScreenHeader
            title="Balances"
            onBack={goHome}
            runtimeLabel={runtimeLabel}
            isDev={isDev}
          />
        </View>
        <MerchantBalancesScreen />
      </View>
    );
  }

  if (screen === 'mint') {
    return (
      <View style={s.root}>
        <View style={s.listChrome}>
          <ScreenHeader
            title="Mint"
            onBack={goHome}
            runtimeLabel={runtimeLabel}
            isDev={isDev}
          />
        </View>
        <MintPanel
          users={users}
          selectedUsers={selectedUsers}
          onToggleUser={toggleUser}
          loadingUsers={loadingUsers}
          loadError={loadError}
          collectionLabel={collectionName || collectionHint}
          selectedPass={selectedPass}
          onSelectPass={(pass) => {
            setSelectedPass(pass);
            setTicketId(String(pass.tokenId));
          }}
          network={network}
          onNetworkChange={setNetwork}
          amount={amount}
          onAmountChange={setAmount}
          onAssign={handleAssign}
          isAssigning={isAssigning}
          status={status}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.listChrome}>
        <ScreenHeader
          title="Users"
          onBack={goHome}
          runtimeLabel={runtimeLabel}
          isDev={isDev}
        />

        <Text style={s.collectionLine}>
          {collectionName || collectionHint} · {filteredUsers.length}
          {search.trim() ? ` of ${users.length}` : ''} user
          {filteredUsers.length === 1 ? '' : 's'}
        </Text>

        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Filter username or address…"
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.bulkBar}>
          <Text style={s.bulkLabel}>{selectedUsers.length} selected</Text>
          <RolePicker value={bulkRole} onChange={setBulkRole} />
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={applyBulkRoleToSelected}
            disabled={!selectedUsers.length}
          >
            <Text style={s.secondaryBtnText}>Apply to selected</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.primaryBtn, savingRoles && { opacity: 0.6 }]}
            disabled={savingRoles}
            onPress={handleSaveRoles}
          >
            {savingRoles ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>
                Save roles{dirtyCount ? ` (${dirtyCount})` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {status ? <Text style={s.status}>{status}</Text> : null}
        {loadError ? <Text style={s.error}>{loadError}</Text> : null}
      </View>

      {loadingUsers ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={s.list}
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserRow}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          ListEmptyComponent={
            <Text style={s.empty}>
              {users.length === 0
                ? `No users in ${collectionName || collectionHint}.`
                : 'No matches for this filter.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, width: '100%' },
  homeContent: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 48,
    width: '100%',
  },
  listChrome: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  homeHeader: { marginBottom: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.fg },
  subtitle: { color: COLORS.muted, marginTop: 6, fontSize: 13 },
  collectionLine: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  envBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  envDev: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  envProd: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  envBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  envDevText: { color: COLORS.warn },
  envProdText: { color: COLORS.accent },
  tiles: { gap: 12 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { flex: 1, minWidth: 0 },
  tileTitle: { color: COLORS.fg, fontSize: 17, fontWeight: '700' },
  tileSub: { color: COLORS.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    flex: 1,
    color: COLORS.fg,
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.fg,
    marginBottom: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.fg,
    paddingVertical: 12,
    fontSize: 14,
  },
  bulkBar: { gap: 8, marginBottom: 8 },
  bulkLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  rolePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  roleOpt: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleOptActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  roleOptText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  roleOptTextActive: { color: COLORS.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  check: { paddingTop: 2 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: { color: COLORS.fg, fontWeight: '600', flex: 1, minWidth: 0 },
  rowAddr: {
    color: COLORS.muted,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  deleteText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.fg,
    marginBottom: 0,
    fontSize: 14,
    width: '100%',
  },
  rowInputs: { flexDirection: 'row', gap: 8, width: '100%' },
  inputHalf: { flex: 1, minWidth: 0 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: { color: COLORS.fg, fontWeight: '500' },
  hint: { color: COLORS.muted, fontSize: 13, marginBottom: 8 },
  empty: { color: COLORS.muted, fontSize: 14, marginTop: 24, textAlign: 'center' },
  error: { color: COLORS.danger, fontSize: 13, marginBottom: 8 },
  status: {
    color: COLORS.accent,
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
});
