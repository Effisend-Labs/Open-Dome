import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MintUserPicker from './MintUserPicker';
import MintPassPicker from './MintPassPicker';

const COLORS = {
  bg: '#09090b',
  surface: '#18181b',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
  accent: '#10b981',
};

/**
 * Mint screen body: searchable user picker + event/amenity pass picker + execute.
 */
export default function MintPanel({
  users,
  selectedUsers,
  onToggleUser,
  loadingUsers,
  loadError,
  collectionLabel,
  selectedPass,
  onSelectPass,
  network,
  onNetworkChange,
  amount,
  onAmountChange,
  onAssign,
  isAssigning,
  status,
}) {
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <MintUserPicker
        users={users}
        selectedIds={selectedUsers}
        onToggle={onToggleUser}
        loading={loadingUsers}
        error={loadError}
        collectionLabel={collectionLabel}
      />

      <MintPassPicker selected={selectedPass} onSelect={onSelectPass} />

      <TextInput
        style={s.input}
        placeholder="Network (base…)"
        placeholderTextColor={COLORS.muted}
        value={network}
        onChangeText={onNetworkChange}
        autoCapitalize="none"
      />
      <TextInput
        style={s.input}
        placeholder="Amount"
        placeholderTextColor={COLORS.muted}
        value={amount}
        onChangeText={onAmountChange}
        keyboardType="number-pad"
      />

      <TouchableOpacity
        style={[s.primaryBtn, isAssigning && { opacity: 0.6 }]}
        disabled={isAssigning}
        onPress={onAssign}
      >
        {isAssigning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.primaryBtnText}>Execute batch mint</Text>
        )}
      </TouchableOpacity>

      {status ? <Text style={s.status}>{status}</Text> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.fg,
    fontSize: 14,
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  status: {
    color: COLORS.accent,
    fontSize: 12,
    lineHeight: 16,
  },
});
