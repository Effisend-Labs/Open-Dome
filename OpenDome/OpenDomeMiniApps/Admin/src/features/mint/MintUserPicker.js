import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  surface: '#18181b',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
};

/**
 * Multi-select guests by username or address — search + checkbox list.
 */
export default function MintUserPicker({
  users = [],
  selectedIds = [],
  onToggle,
  loading = false,
  error = '',
  collectionLabel = 'Users',
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return users;
    return users.filter((u) => {
      const name = String(u.username || u.name || '')
        .toLowerCase()
        .replace(/^@/, '');
      const addr = String(u.address || '').toLowerCase();
      const id = String(u.id || '').toLowerCase();
      return name.includes(q) || addr.includes(q) || id.includes(q);
    });
  }, [users, query]);

  return (
    <View style={s.wrap}>
      <Text style={s.label}>
        {collectionLabel} · {filtered.length}
        {query.trim() ? ` of ${users.length}` : ''} user
        {filtered.length === 1 ? '' : 's'}
      </Text>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter username or address…"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={s.hint}>{selectedIds.length} selected for mint</Text>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
      ) : (
        <ScrollView
          style={s.list}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <Text style={s.empty}>
              {users.length === 0
                ? `No users in ${collectionLabel}.`
                : 'No matches for this filter.'}
            </Text>
          ) : (
            filtered.map((u) => {
              const selected = selectedIds.includes(u.id);
              const addr = u.address || '';
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[s.row, selected && s.rowActive]}
                  onPress={() => onToggle(u.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={COLORS.primary}
                  />
                  <View style={s.rowBody}>
                    <View style={s.rowTop}>
                      <Text style={s.rowLabel} numberOfLines={1}>
                        {u.name || u.username || 'Anonymous'}
                      </Text>
                      <Text style={s.badge}>{u.role}</Text>
                    </View>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {addr
                        ? `${addr.slice(0, 8)}…${addr.slice(-4)}`
                        : 'No EVM address'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 4 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: COLORS.fg, fontSize: 14, padding: 0 },
  hint: { color: COLORS.muted, fontSize: 12 },
  error: { color: '#ef4444', fontSize: 12 },
  list: { maxHeight: 220 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowActive: { backgroundColor: 'rgba(37,99,235,0.08)' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: { color: COLORS.fg, fontSize: 13, fontWeight: '600', flex: 1, minWidth: 0 },
  rowSub: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  badge: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  empty: { color: COLORS.muted, fontSize: 13, paddingVertical: 16, textAlign: 'center' },
});
