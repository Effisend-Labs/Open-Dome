import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminFetch } from '../../core/adminApi';

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

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function BalCell({ label, amount, symbol, low }) {
  return (
    <View style={s.balCell}>
      <Text style={s.balLabel}>{label}</Text>
      <Text style={[s.balValue, low && s.balLow]}>
        {amount != null ? amount : '—'}
        {symbol ? (
          <Text style={[s.balSym, low && s.balLow]}> {symbol}</Text>
        ) : null}
      </Text>
      {low ? <Text style={s.lowTag}>low</Text> : null}
    </View>
  );
}

function ChainRow({ row }) {
  const role = row.sponsored ? 'Sponsored' : row.key === 'SOL' ? 'User gas' : 'L1';
  return (
    <View style={[s.row, (row.native?.low || row.usdc?.low) && s.rowWarn]}>
      <View style={s.rowHead}>
        <Text style={s.chainName}>{row.label}</Text>
        <Text style={s.chainRole}>{role}</Text>
      </View>
      {row.error ? (
        <Text style={s.rowErr}>{row.error}</Text>
      ) : (
        <View style={s.balRow}>
          <BalCell
            label="Native"
            amount={row.native?.formatted}
            symbol={row.native?.symbol}
            low={row.native?.low}
          />
          <BalCell
            label="USDC"
            amount={row.usdc?.formatted}
            symbol="USDC"
            low={row.usdc?.low}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Home panel: merchant balances on every USDC-compatible chain.
 */
export default function MerchantBalancesPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/merchant-balances');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(body);
    } catch (e) {
      setError(e.message || 'Failed to load balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const lowCount =
    data?.chains?.filter((c) => c.native?.low || c.usdc?.low).length || 0;

  return (
    <View style={s.panel}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
          <Text style={s.title}>Merchant balances</Text>
          {lowCount > 0 ? (
            <View style={s.warnBadge}>
              <Text style={s.warnBadgeText}>{lowCount} low</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => load(true)}
          disabled={loading || refreshing}
          accessibilityLabel="Refresh balances"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.fg} />
          ) : (
            <Ionicons name="refresh" size={18} color={COLORS.fg} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>
        Facilitator gas (native) + USDC on L1 / L2 / Solana
      </Text>

      {data?.evmAddress ? (
        <Text style={s.addr}>EVM {shortAddr(data.evmAddress)}</Text>
      ) : null}
      {data?.solanaAddress ? (
        <Text style={s.addr}>SOL {shortAddr(data.solanaAddress)}</Text>
      ) : null}

      {loading && !data ? (
        <View style={s.loading}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={s.muted}>Reading chains…</Text>
        </View>
      ) : null}

      {error ? <Text style={s.error}>{error}</Text> : null}

      {data?.chains?.length ? (
        <View style={s.list}>
          {data.chains.map((row) => (
            <ChainRow key={row.key} row={row} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  title: { color: COLORS.fg, fontSize: 16, fontWeight: '700' },
  warnBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  warnBadgeText: {
    color: COLORS.warn,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  addr: {
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  muted: { color: COLORS.muted, fontSize: 13 },
  error: { color: COLORS.danger, fontSize: 13 },
  list: { gap: 8, marginTop: 4 },
  row: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: COLORS.bg,
  },
  rowWarn: {
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chainName: { color: COLORS.fg, fontWeight: '700', fontSize: 14 },
  chainRole: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  rowErr: { color: COLORS.warn, fontSize: 12 },
  balRow: { flexDirection: 'row', gap: 12 },
  balCell: { flex: 1, minWidth: 0 },
  balLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  balValue: { color: COLORS.fg, fontSize: 15, fontWeight: '600' },
  balSym: { color: COLORS.muted, fontSize: 12, fontWeight: '500' },
  balLow: { color: COLORS.warn },
  lowTag: {
    color: COLORS.warn,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
