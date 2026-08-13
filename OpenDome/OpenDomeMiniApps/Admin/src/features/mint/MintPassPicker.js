import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildPassCatalog } from './passCatalog';

const COLORS = {
  surface: '#18181b',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  primary: '#2563eb',
};

/**
 * Pick an event or amenity pass by name — stores tokenId for mint.
 */
export default function MintPassPicker({ selected, onSelect }) {
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');

  const catalog = useMemo(
    () => buildPassCatalog({ query, kind }),
    [query, kind],
  );

  const rows = useMemo(() => {
    if (kind === 'amenity') return catalog.amenities;
    if (kind === 'event') return catalog.events;
    return [...catalog.amenities, ...catalog.events];
  }, [catalog, kind]);

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Pass to mint</Text>
      <View style={s.kindRow}>
        {[
          { id: 'all', label: 'All' },
          { id: 'event', label: 'Events' },
          { id: 'amenity', label: 'Amenities' },
        ].map((opt) => {
          const active = kind === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.kindBtn, active && s.kindBtnActive]}
              onPress={() => setKind(opt.id)}
            >
              <Text style={[s.kindText, active && s.kindTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search event or amenity…"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {selected ? (
        <View style={s.selectedCard}>
          <Text style={s.selectedKind}>
            {selected.kind === 'event' ? 'Event' : 'Amenity'} · token {selected.tokenId}
          </Text>
          <Text style={s.selectedLabel} numberOfLines={2}>
            {selected.label}
          </Text>
          <Text style={s.selectedSub} numberOfLines={1}>
            {selected.subtitle}
          </Text>
        </View>
      ) : (
        <Text style={s.hint}>Select a pass below — no raw ticket IDs needed.</Text>
      )}

      <ScrollView
        style={s.list}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {rows.length === 0 ? (
          <Text style={s.empty}>No matches.</Text>
        ) : (
          rows.map((row) => {
            const active = selected?.key === row.key;
            return (
              <TouchableOpacity
                key={row.key}
                style={[s.row, active && s.rowActive]}
                onPress={() => onSelect(row)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel} numberOfLines={2}>
                    {row.label}
                  </Text>
                  <Text style={s.rowSub} numberOfLines={1}>
                    {row.kind === 'event' ? 'Event' : 'Amenity'} · {row.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? COLORS.primary : COLORS.muted}
                />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8, marginBottom: 4 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  kindBtnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(37,99,235,0.15)' },
  kindText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  kindTextActive: { color: COLORS.fg },
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
  selectedCard: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  selectedKind: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  selectedLabel: { color: COLORS.fg, fontSize: 14, fontWeight: '600' },
  selectedSub: { color: COLORS.muted, fontSize: 12 },
  hint: { color: COLORS.muted, fontSize: 12 },
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
  rowLabel: { color: COLORS.fg, fontSize: 13, fontWeight: '600' },
  rowSub: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  empty: { color: COLORS.muted, fontSize: 13, paddingVertical: 16, textAlign: 'center' },
});
