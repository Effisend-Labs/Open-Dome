import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Linking, Animated } from 'react-native';
import { useOpenDome } from 'opendome';
import { copyText } from '../features/receive/copyText';
import { GLOBAL_STYLES } from '../theme';
import SendModal from './SendModal';
import ReceiveModal from './ReceiveModal';
import { AuthRequiredPanel } from '../features/auth/AuthRequiredPanel';
import { useTokenUsdPrices } from '../features/prices/useTokenUsdPrices';
import { useSharedBalances } from '../features/wallet/useSharedBalances';

// Chain logos
import imgBase from '../assets/base.png';
import imgMon from '../assets/mon.png';
import imgSol from '../assets/sol.png';
import imgEth from '../assets/eth.png';
import imgUsdc from '../assets/usdc.png';
import imgAvax from '../assets/avax.png';
import imgPol from '../assets/pol.png';
import imgOp from '../assets/op.png';
import imgArb from '../assets/arb.png';

const TOKEN_ICONS = {
  ETH: imgEth,
  USDC: imgUsdc,
  AVAX: imgAvax,
  POL: imgPol,
  SOL: imgSol,
  MON: imgMon,
};

// ─── Chain Registry ────────────────────────────────────────────────────────────
// Each entry defines display metadata per network. The `type` field controls
// which address (evm / solana) is mapped. `color` is used for the fallback icon.
const CHAINS = {
  base:      { name: 'Base',      chain: 'Base',       ticker: 'ETH',  logo: imgBase, color: '#0052FF', type: 'evm',    explorer: 'https://basescan.org/address/' },
  arbitrum:  { name: 'Arbitrum',  chain: 'Arbitrum',   ticker: 'ETH',  logo: imgArb,    color: '#28A0F0', type: 'evm',    explorer: 'https://arbiscan.io/address/' },
  optimism:  { name: 'Optimism',  chain: 'Optimism',   ticker: 'ETH',  logo: imgOp,    color: '#FF0420', type: 'evm',    explorer: 'https://optimistic.etherscan.io/address/' },
  mainnet:   { name: 'Ethereum',  chain: 'Ethereum',   ticker: 'ETH',  logo: imgEth,    color: '#627EEA', type: 'evm',    explorer: 'https://etherscan.io/address/' },
  polygon:   { name: 'Polygon',   chain: 'Polygon',    ticker: 'POL',  logo: imgPol,    color: '#8247E5', type: 'evm',    explorer: 'https://polygonscan.com/address/' },
  avalanche: { name: 'Avalanche', chain: 'Avalanche',  ticker: 'AVAX', logo: imgAvax,    color: '#E84142', type: 'evm',    explorer: 'https://snowtrace.io/address/' },
  monad:     { name: 'Monad',     chain: 'Monad',      ticker: 'MON',  logo: imgMon,  color: '#836EF9', type: 'evm',    explorer: 'https://explorer.monad.xyz/address/' },
  solana:    { name: 'Solana',    chain: 'Solana',     ticker: 'SOL',  logo: imgSol,  color: '#9945FF', type: 'solana', explorer: 'https://solscan.io/account/' },
};

// USDC is shown as a separate featured row
const USDC_META = {
  name: 'USD Coin',
  ticker: 'USDC',
  color: '#2775CA',
};

const USDC_ADDRESSES = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatBalance = (bal) => {
  if (bal === 'error' || bal === undefined || bal === null) return '0.00';
  const num = parseFloat(bal);
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';
  if (num < 0.001) return '<0.001';
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
};

const truncateAddress = (addr) => {
  if (!addr) return '';
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}···${addr.slice(-4)}`;
};

// ─── Fallback Chain Icon ───────────────────────────────────────────────────────

const ChainIcon = ({ chain, size = 36 }) => {
  const meta = CHAINS[chain];
  if (!meta) return null;

  if (meta.logo) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
        <Image source={meta.logo} style={{ width: size * 0.9, height: size * 0.9 }} resizeMode="contain" />
      </View>
    );
  }

  // Colored circle with first letter
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: meta.color + '18',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{ color: meta.color, fontSize: size * 0.4, fontWeight: '700', fontFamily: GLOBAL_STYLES.sans }}>
        {meta.chain[0]}
      </Text>
    </View>
  );
};

// ─── Network Accordion Row ───────────────────────────────────────────────────────

const NetworkRow = ({
  chainKey,
  balanceData,
  address,
  tokens,
  isDark,
  onCopy,
  copiedKey,
  expanded,
  onToggle,
  priceOf,
}) => {
  const meta = CHAINS[chainKey];
  if (!meta) return null;

  const nativeBal = parseFloat(balanceData?.native) || 0;
  const usdcBal = parseFloat(balanceData?.usdc) || 0;
  const nativePrice = priceOf(meta.ticker);
  const usdcPrice = priceOf('USDC');
  const combinedUsd = (nativeBal * nativePrice) + (usdcBal * usdcPrice);

  return (
    <View style={{ borderBottomColor: tokens.BORDER, borderBottomWidth: StyleSheet.hairlineWidth }}>
      {/* Network Header */}
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={onToggle}
        style={[styles.tokenRow, { borderBottomWidth: 0, paddingVertical: 16 }]}
      >
        <ChainIcon chain={chainKey} size={36} />
        
        <View style={styles.tokenInfo}>
          <Text style={[styles.tokenName, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            {meta.chain}
          </Text>
          <Text style={[styles.tokenChain, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontSize: 13 }]}>
            {meta.name} Network
          </Text>
        </View>

        <View style={styles.tokenBalance}>
          <Text style={[styles.balanceValue, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
            ${combinedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <Text style={{ color: tokens.MUTED, fontSize: 18, marginLeft: 8, transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
          ›
        </Text>
      </TouchableOpacity>

      {/* Expanded Assets */}
      {expanded && (
        <View style={{ paddingLeft: 56, paddingRight: 24, paddingBottom: 16, gap: 14 }}>
          {/* Native Asset */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {TOKEN_ICONS[meta.ticker] && (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tokens.SURFACE_ELEVATED, alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={TOKEN_ICONS[meta.ticker]} style={{ width: 20, height: 20 }} resizeMode="contain" />
                </View>
              )}
              <View>
                <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary, fontSize: 15, fontWeight: '600' }}>{meta.ticker}</Text>
                <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary, fontSize: 13 }}>${nativePrice.toLocaleString()}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: tokens.FG, fontFamily: tokens.font.mono, fontSize: 15 }}>{formatBalance(balanceData?.native)}</Text>
              <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.mono, fontSize: 13 }}>
                ${(nativeBal * nativePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* USDC Asset */}
          {USDC_ADDRESSES[chainKey] && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tokens.SURFACE_ELEVATED, alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={imgUsdc} style={{ width: 20, height: 20 }} resizeMode="contain" />
                </View>
                <View>
                  <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary, fontSize: 15, fontWeight: '600' }}>USDC</Text>
                  <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.primary, fontSize: 13 }}>
                    ${usdcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: tokens.FG, fontFamily: tokens.font.mono, fontSize: 15 }}>{formatBalance(balanceData?.usdc)}</Text>
                <Text style={{ color: tokens.MUTED, fontFamily: tokens.font.mono, fontSize: 13 }}>
                  ${(usdcBal * usdcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          )}

          {/* Explorer Link */}
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => Linking.openURL(meta.explorer + address)}
            style={{
              marginTop: 8,
              paddingTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: tokens.BORDER,
            }}
          >
            <Text style={{ color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontSize: 13, fontWeight: '500' }}>
              View on Explorer
            </Text>
            <Text style={{ color: tokens.MUTED, fontSize: 14 }}>↗</Text>
          </TouchableOpacity>

        </View>
      )}
    </View>
  );
};



// ─── Main Component ────────────────────────────────────────────────────────────

export default function WalletView({ theme, tokens, t, isDark, onGoToAccount }) {
  const { user, isAuthorized } = useOpenDome();
  const { priceOf } = useTokenUsdPrices();
  const { balances, loading, lastSync, refresh: fetchBalances } = useSharedBalances(isAuthorized);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [displayBalance, setDisplayBalance] = useState('0.00');
  const [expandedChains, setExpandedChains] = useState({});
  const balanceTarget = useRef(0);

  const evmAddr = user?.evmAddress || '';
  const solAddr = user?.solanaAddress || '';

  // Build address map for all chains
  const addressMap = {};
  Object.keys(CHAINS).forEach(key => {
    addressMap[key] = CHAINS[key].type === 'solana' ? solAddr : evmAddr;
  });

  const handleCopy = async (key, address) => {
    if (!address) return;
    try {
      await copyText(address);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleReceive = () => {
    setShowReceiveModal(true);
  };

  const chainKeys = Object.keys(CHAINS);
  const globalBalance = Object.entries(balances).reduce((sum, [chain, balObj]) => {
    if (!balObj || typeof balObj !== 'object') return sum;
    const meta = CHAINS[chain];
    const nBal = parseFloat(balObj.native) || 0;
    const uBal = parseFloat(balObj.usdc) || 0;
    const price = meta ? priceOf(meta.ticker) : 0;
    const combinedUsd = (nBal * price) + (uBal * priceOf('USDC'));
    return sum + combinedUsd;
  }, 0);

  // Count-up animation (dopamine banking — making digital money feel tangible)
  useEffect(() => {
    if (!isAuthorized || loading) return;
    const target = globalBalance;
    const startVal = balanceTarget.current;
    balanceTarget.current = target;
    const duration = 600;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setDisplayBalance(current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isAuthorized, loading, globalBalance]);

  // ── Not Authenticated ──────────────────────────────────────────────────────

  if (!isAuthorized) {
    return (
      <AuthRequiredPanel
        tokens={tokens}
        t={t}
        description={t?.authRequired?.portfolio}
        onSignIn={onGoToAccount}
      />
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────

  // Priority tiebreaker when USD value is zero on both chains
  const ZERO_PRIORITY = { base: 0, solana: 1, mainnet: 2, arbitrum: 3, optimism: 4, polygon: 5, avalanche: 6, monad: 7 };

  const getUsdValue = (chain) => {
    const meta = CHAINS[chain];
    const nBal = parseFloat(balances[chain]?.native) || 0;
    const uBal = parseFloat(balances[chain]?.usdc) || 0;
    return (nBal * priceOf(meta.ticker)) + (uBal * priceOf('USDC'));
  };

  const sortedChains = [...chainKeys].sort((a, b) => {
    const usdA = getUsdValue(a);
    const usdB = getUsdValue(b);
    if (usdA !== usdB) return usdB - usdA;
    return (ZERO_PRIORITY[a] ?? 99) - (ZERO_PRIORITY[b] ?? 99);
  });

  const activeChains = chainKeys.filter(k => (parseFloat(balances[k]?.native) || 0) + (parseFloat(balances[k]?.usdc) || 0) > 0).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.BG }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Portfolio Header ─────────────────────────────────────────────── */}
      <View style={[styles.portfolioHeader, { backgroundColor: tokens.BG }]}>
        <Text style={[styles.greeting, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {user?.username ? `gm, @${user.username}` : 'Portfolio'}
        </Text>

        <View style={styles.totalRow}>
          <Text style={[styles.totalBalance, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
            {loading ? '···' : `$${displayBalance}`}
          </Text>
          <Text style={{ color: tokens.MUTED, fontSize: 16, fontFamily: tokens.font.primary, fontWeight: '600' }}>USD</Text>
        </View>

        <Text style={[styles.totalSub, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {loading ? 'Syncing Gateway...' : `Unified Balance across ${chainKeys.length} chains`}
        </Text>

        {/* Action Pills */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionPill, { backgroundColor: tokens.ACCENT }]}
            onPress={() => setShowSendModal(true)}
          >
            <Text style={[styles.actionLabel, { color: '#FFFFFF', fontFamily: tokens.font.primary }]}>
              Send
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionPill, { backgroundColor: tokens.SURFACE_ELEVATED, borderWidth: 1, borderColor: tokens.BORDER }]}
            onPress={handleReceive}
          >
            <Text style={[styles.actionLabel, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {copiedKey === '_receive' ? 'Copied!' : 'Receive'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Token List ───────────────────────────────────────────────────── */}
      <View style={[styles.listSection, { backgroundColor: tokens.SURFACE }]}>
        <View style={[styles.listHeader, { borderBottomColor: tokens.BORDER }]}>
          <Text style={[styles.listTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            Assets
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!loading && (
              <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, letterSpacing: 0.3 }}>
                {activeChains}/{chainKeys.length} active
              </Text>
            )}
            <TouchableOpacity activeOpacity={0.6} onPress={fetchBalances}>
              <Text style={[styles.refreshBtn, { color: tokens.ACCENT, fontFamily: tokens.font.primary }]}>
                {loading ? 'Syncing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* Native tokens */}
        {sortedChains.map((chainKey) => (
          <NetworkRow
            key={chainKey}
            chainKey={chainKey}
            balanceData={balances[chainKey]}
            address={addressMap[chainKey]}
            tokens={tokens}
            isDark={isDark}
            onCopy={handleCopy}
            copiedKey={copiedKey}
            expanded={!!expandedChains[chainKey]}
            onToggle={() => setExpandedChains(prev => ({ ...prev, [chainKey]: !prev[chainKey] }))}
            priceOf={priceOf}
          />
        ))}
      </View>

      {/* ── Sync Footer ──────────────────────────────────────────────────── */}
      {lastSync && (
        <View style={styles.syncFooter}>
          <Text style={[styles.syncText, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
            Last synced {lastSync}
          </Text>
        </View>
      )}

      <SendModal 
        visible={showSendModal} 
        onClose={() => setShowSendModal(false)} 
        tokens={tokens} 
        isDark={isDark}
        solanaAddress={solAddr}
      />

      <ReceiveModal
        visible={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        tokens={tokens}
        isDark={isDark}
        evmAddress={evmAddr}
        solanaAddress={solAddr}
      />
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Empty / Not authenticated
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Portfolio Header
  portfolioHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  totalSub: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: -0.1,
  },

  // Action Pills
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Token List
  listSection: {
    marginHorizontal: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  refreshBtn: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Token Row
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  tokenInfo: {
    flex: 1,
    gap: 2,
  },
  tokenName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tokenChain: {
    fontSize: 12,
    letterSpacing: -0.1,
  },
  tokenBalance: {
    alignItems: 'flex-end',
    gap: 2,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  copyHint: {
    fontSize: 10,
    letterSpacing: 0.2,
  },

  // Sync Footer
  syncFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  syncText: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
