import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Host } from 'opendome';
import {
  FALLBACK_USD_BY_TICKER,
  priceForTicker,
} from 'opendome/src/tokenPrices.js';

const PRICE_TICKERS = ['ETH', 'SOL', 'AVAX', 'POL', 'USDC'];
const PRICE_POLL_MS = 15_000;

async function loadHostPrices(tickers = PRICE_TICKERS) {
  const body = await Host.tokenPrices({ tickers });
  return body?.prices || body;
}

const COLORS = {
  bg: '#09090b',
  surface: '#18181b',
  elevated: '#1f1f23',
  border: '#27272a',
  fg: '#fafafa',
  muted: '#a1a1aa',
  secondary: '#d4d4d8',
  primary: '#2563eb',
  accent: '#10b981',
  danger: '#ef4444',
  warn: '#f59e0b',
};

const CHAIN_META = {
  BASE: { color: '#0052FF', explorer: 'https://basescan.org/address/' },
  ARB: { color: '#28A0F0', explorer: 'https://arbiscan.io/address/' },
  OP: { color: '#FF0420', explorer: 'https://optimistic.etherscan.io/address/' },
  MATIC: { color: '#8247E5', explorer: 'https://polygonscan.com/address/' },
  AVAX: { color: '#E84142', explorer: 'https://snowtrace.io/address/' },
  ETH: { color: '#627EEA', explorer: 'https://etherscan.io/address/' },
  SOL: { color: '#9945FF', explorer: 'https://solscan.io/account/' },
};

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}···${addr.slice(-4)}`;
}

function formatBal(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0.00';
  if (n < 0.001) return '<0.001';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ChainGlyph({ chainKey, label }) {
  const color = CHAIN_META[chainKey]?.color || COLORS.primary;
  return (
    <View style={[s.glyph, { backgroundColor: `${color}22` }]}>
      <Text style={[s.glyphText, { color }]}>
        {(label || chainKey || '?').slice(0, 1)}
      </Text>
    </View>
  );
}

function AssetLine({ symbol, amount, usd, low }) {
  return (
    <View style={s.assetLine}>
      <View style={s.assetLeft}>
        <View style={s.assetDot}>
          <Text style={s.assetDotText}>{symbol.slice(0, 1)}</Text>
        </View>
        <View>
          <Text style={s.assetSym}>{symbol}</Text>
          {low ? <Text style={s.lowTag}>low</Text> : null}
        </View>
      </View>
      <View style={s.assetRight}>
        <Text style={[s.assetAmt, low && s.warnText]}>{formatBal(amount)}</Text>
        <Text style={s.assetUsd}>{formatUsd(usd)}</Text>
      </View>
    </View>
  );
}

function NetworkRow({ row, expanded, onToggle, priceOf }) {
  const meta = CHAIN_META[row.key] || {};
  const nativeVal = row.native?.value ?? 0;
  const usdcVal = row.usdc?.value ?? 0;
  const nativeSym = row.native?.symbol || 'ETH';
  const nativeUsd = nativeVal * priceOf(nativeSym);
  const usdcUsd = usdcVal * priceOf('USDC');
  const totalUsd = row.error ? 0 : nativeUsd + usdcUsd;
  const role = row.sponsored
    ? 'Sponsored'
    : row.key === 'SOL'
      ? 'Solana'
      : 'L1';
  const addr = row.address;
  const explorer = meta.explorer;

  return (
    <View style={s.netCard}>
      <TouchableOpacity style={s.netHead} onPress={onToggle} activeOpacity={0.7}>
        <ChainGlyph chainKey={row.key} label={row.label} />
        <View style={s.netInfo}>
          <Text style={s.netName}>{row.label}</Text>
          <Text style={s.netRole}>{role}</Text>
        </View>
        <View style={s.netRight}>
          {row.error ? (
            <Text style={s.netErrBadge}>RPC</Text>
          ) : (
            <Text style={s.netUsd}>{formatUsd(totalUsd)}</Text>
          )}
          {(row.native?.low || row.usdc?.low) && !row.error ? (
            <Text style={s.lowTag}>low</Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={18}
          color={COLORS.muted}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={s.netBody}>
          {row.error ? (
            <Text style={s.rowErr}>{row.error}</Text>
          ) : (
            <>
              <AssetLine
                symbol={nativeSym}
                amount={nativeVal}
                usd={nativeUsd}
                low={row.native?.low}
              />
              <AssetLine
                symbol="USDC"
                amount={usdcVal}
                usd={usdcUsd}
                low={row.usdc?.low}
              />
            </>
          )}

          {addr ? (
            <TouchableOpacity
              style={s.explorerBtn}
              onPress={() => {
                if (explorer) Linking.openURL(`${explorer}${addr}`);
              }}
              disabled={!explorer}
            >
              <Text style={s.explorerAddr}>{shortAddr(addr)}</Text>
              <Text style={s.explorerLink}>Explorer</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Full-screen merchant balances — Wallet-style chain rows for facilitator addresses.
 */
export default function MerchantBalancesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [prices, setPrices] = useState(FALLBACK_USD_BY_TICKER);

  const priceOf = useCallback(
    (ticker) => priceForTicker(prices, ticker),
    [prices],
  );

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [body, nextPrices] = await Promise.all([
        Host.merchantBalances(),
        loadHostPrices().catch(() => null),
      ]);
      setData(body);
      if (nextPrices) setPrices((prev) => ({ ...FALLBACK_USD_BY_TICKER, ...prev, ...nextPrices }));
      // Expand first chain with a low flag or error by default
      const first = (body.chains || []).find(
        (c) => c.error || c.native?.low || c.usdc?.low,
      );
      if (first) setExpanded({ [first.key]: true });
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

  useEffect(() => {
    const poll = async () => {
      try {
        const next = await loadHostPrices();
        if (next) {
          setPrices((prev) => ({ ...FALLBACK_USD_BY_TICKER, ...prev, ...next }));
        }
      } catch {
        /* keep last good */
      }
    };
    poll();
    const id = setInterval(poll, PRICE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const lowCount = useMemo(
    () =>
      data?.chains?.filter((c) => c.native?.low || c.usdc?.low).length || 0,
    [data],
  );

  const totalUsd = useMemo(() => {
    if (!data?.chains) return 0;
    return data.chains.reduce((sum, row) => {
      if (row.error) return sum;
      const n = row.native?.value ?? 0;
      const u = row.usdc?.value ?? 0;
      const sym = row.native?.symbol || 'ETH';
      return sum + n * priceOf(sym) + u * priceOf('USDC');
    }, 0);
  }, [data, priceOf]);

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.summary}>
        <Text style={s.summaryLabel}>Merchant portfolio</Text>
        <Text style={s.summaryUsd}>{formatUsd(totalUsd)}</Text>
        <Text style={s.summaryHint}>
          Native gas + USDC on facilitator addresses (read-only)
        </Text>
        {lowCount > 0 ? (
          <View style={s.warnBadge}>
            <Text style={s.warnBadgeText}>{lowCount} chain{lowCount === 1 ? '' : 's'} low</Text>
          </View>
        ) : null}
      </View>

      <View style={s.addrBlock}>
        {data?.evmAddress ? (
          <Text style={s.addrLine}>EVM · {shortAddr(data.evmAddress)}</Text>
        ) : (
          <Text style={s.addrLine}>EVM · not configured on host</Text>
        )}
        {data?.solanaAddress ? (
          <Text style={s.addrLine}>SOL · {shortAddr(data.solanaAddress)}</Text>
        ) : (
          <Text style={s.addrLine}>SOL · not configured on host</Text>
        )}
      </View>

      <View style={s.toolbar}>
        <Text style={s.sectionLabel}>
          {data?.chains?.length || 0} networks
        </Text>
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

      {loading && !data ? (
        <View style={s.loading}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={s.muted}>Reading chains…</Text>
        </View>
      ) : null}

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.list}>
        {(data?.chains || []).map((row) => (
          <NetworkRow
            key={row.key}
            row={row}
            expanded={Boolean(expanded[row.key])}
            onToggle={() => toggle(row.key)}
            priceOf={priceOf}
          />
        ))}
      </View>
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
  summary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  summaryUsd: {
    color: COLORS.fg,
    fontSize: 32,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    letterSpacing: -1,
  },
  summaryHint: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  warnBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  warnBadgeText: {
    color: COLORS.warn,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  addrBlock: { gap: 4, paddingHorizontal: 2 },
  addrLine: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  muted: { color: COLORS.muted, fontSize: 13 },
  error: { color: COLORS.danger, fontSize: 13 },
  list: { gap: 8 },
  netCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  netHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: { fontSize: 15, fontWeight: '800' },
  netInfo: { flex: 1, minWidth: 0 },
  netName: { color: COLORS.fg, fontSize: 15, fontWeight: '700' },
  netRole: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  netRight: { alignItems: 'flex-end', gap: 2, marginRight: 4 },
  netUsd: {
    color: COLORS.fg,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  netErrBadge: {
    color: COLORS.warn,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  netBody: {
    paddingLeft: 62,
    paddingRight: 14,
    paddingBottom: 14,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  rowErr: { color: COLORS.warn, fontSize: 12, lineHeight: 17 },
  assetLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assetDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetDotText: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  assetSym: { color: COLORS.fg, fontSize: 14, fontWeight: '600' },
  assetRight: { alignItems: 'flex-end' },
  assetAmt: {
    color: COLORS.fg,
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  assetUsd: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  warnText: { color: COLORS.warn },
  lowTag: {
    color: COLORS.warn,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  explorerBtn: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  explorerAddr: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  explorerLink: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
});
