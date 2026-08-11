import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminFetch } from '../core/adminApi';

const COLORS = {
  bg: '#09090b',
  surface: '#18181b',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
  accent: '#10b981',
  danger: '#ef4444',
};

export default function Dashboard({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('base');
  const [isAssigning, setIsAssigning] = useState(false);
  const [status, setStatus] = useState('');

  const fetchUsers = async () => {
    const res = await adminFetch('/api/users');
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newAddress.trim()) return;
    await adminFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ address: newAddress.trim(), name: newName.trim() }),
    });
    setNewAddress('');
    setNewName('');
    fetchUsers();
  };

  const handleDelete = async (id) => {
    await adminFetch(`/api/users?id=${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const handleRole = async (id, role) => {
    await adminFetch('/api/users', {
      method: 'PUT',
      body: JSON.stringify({ id, role }),
    });
    fetchUsers();
  };

  const toggleUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedUsers.length || !ticketId || !amount) return;
    setIsAssigning(true);
    setStatus('');
    try {
      const res = await adminFetch('/api/assign', {
        method: 'POST',
        body: JSON.stringify({
          userIds: selectedUsers,
          ticketIds: [parseInt(ticketId, 10)],
          amounts: [parseInt(amount, 10)],
          network,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      setStatus(`Minted on ${network}: ${data.results?.[0]?.txHash || 'ok'}`);
      setSelectedUsers([]);
      setTicketId('');
      setAmount('');
      fetchUsers();
    } catch (e) {
      setStatus(e.message);
    }
    setIsAssigning(false);
  };

  const ticketCount = (u) =>
    u.tickets?.reduce?.((acc, t) => acc + t.amount, 0) ?? 0;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>
            <Ionicons name="finger-print" size={24} color={COLORS.primary} /> Server Bridge Admin
          </Text>
          <Text style={s.subtitle}>
            {currentUser.name} ({currentUser.role}) · real chain mints
          </Text>
        </View>
        {typeof onLogout === 'function' ? (
          <TouchableOpacity style={s.secondaryBtn} onPress={onLogout}>
            <Text style={s.secondaryBtnText}>Logout</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.subtitle}>Session via OpenDome</Text>
        )}
      </View>

      <View style={s.grid}>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardTitle}>User Database</Text>
          {users.map((u) => (
            <View key={u.id} style={s.row}>
              <TouchableOpacity onPress={() => toggleUser(u.id)} style={s.check}>
                <Ionicons
                  name={selectedUsers.includes(u.id) ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.rowName}>{u.name || 'Anonymous'}</Text>
                <Text style={s.rowAddr}>{u.address.slice(0, 10)}…{u.address.slice(-4)}</Text>
              </View>
              <Text style={s.badge}>{u.role}</Text>
              {currentUser.role === 'GOD' && u.role !== 'GOD' && u.role !== 'ADMIN' && (
                <TouchableOpacity onPress={() => handleRole(u.id, 'ADMIN')}>
                  <Text style={s.roleBtn}>ADMIN</Text>
                </TouchableOpacity>
              )}
              {(currentUser.role === 'GOD' || currentUser.role === 'ADMIN') &&
                u.role !== 'GOD' &&
                u.role !== 'ADMIN' &&
                u.role !== 'SCANNER' && (
                <TouchableOpacity onPress={() => handleRole(u.id, 'SCANNER')}>
                  <Text style={s.roleBtn}>SCANNER</Text>
                </TouchableOpacity>
              )}
              {u.role === 'SCANNER' &&
                (currentUser.role === 'GOD' || currentUser.role === 'ADMIN') && (
                <TouchableOpacity onPress={() => handleRole(u.id, 'USER')}>
                  <Text style={s.roleBtnMuted}>USER</Text>
                </TouchableOpacity>
              )}
              {u.role === 'ADMIN' && currentUser.role === 'GOD' && (
                <TouchableOpacity onPress={() => handleRole(u.id, 'USER')}>
                  <Text style={s.roleBtnMuted}>USER</Text>
                </TouchableOpacity>
              )}
              {u.role !== 'GOD' &&
                !(currentUser.role === 'ADMIN' && u.role === 'ADMIN') && (
                <TouchableOpacity onPress={() => handleDelete(u.id)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={s.side}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Register User</Text>
            <TextInput
              style={s.input}
              placeholder="Name"
              placeholderTextColor={COLORS.muted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={s.input}
              placeholder="0x… wallet address"
              placeholderTextColor={COLORS.muted}
              value={newAddress}
              onChangeText={setNewAddress}
            />
            <TouchableOpacity style={s.secondaryBtn} onPress={handleAddUser}>
              <Text style={s.secondaryBtnText}>Add to Database</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Batch Assign</Text>
            <Text style={s.hint}>{selectedUsers.length} users selected</Text>
            <TextInput
              style={s.input}
              placeholder="Network (base, arbitrum…)"
              placeholderTextColor={COLORS.muted}
              value={network}
              onChangeText={setNetwork}
            />
            <TextInput
              style={s.input}
              placeholder="Ticket ID"
              placeholderTextColor={COLORS.muted}
              value={ticketId}
              onChangeText={setTicketId}
              keyboardType="number-pad"
            />
            <TextInput
              style={s.input}
              placeholder="Amount"
              placeholderTextColor={COLORS.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[s.primaryBtn, isAssigning && { opacity: 0.6 }]}
              disabled={isAssigning}
              onPress={handleAssign}
            >
              {isAssigning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Execute Batch Mint</Text>
              )}
            </TouchableOpacity>
            {status ? <Text style={s.status}>{status}</Text> : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24, paddingBottom: 80, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.fg },
  subtitle: { color: COLORS.muted, marginTop: 4, fontSize: 13 },
  grid: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  side: { width: Platform.OS === 'web' ? 340 : '100%' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.fg, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  check: { padding: 4 },
  rowName: { color: COLORS.fg, fontWeight: '500' },
  rowAddr: { color: COLORS.muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
  badge: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  roleBtn: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBtnMuted: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    color: COLORS.fg,
    marginBottom: 10,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.fg, fontWeight: '500' },
  hint: { color: COLORS.muted, fontSize: 13, marginBottom: 8 },
  status: { color: COLORS.accent, fontSize: 12, marginTop: 10 },
});
