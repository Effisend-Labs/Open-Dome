import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES, isDarkTheme } from '../theme';

import imgBase from '../assets/base.png';
import imgMon from '../assets/mon.png';
import imgSol from '../assets/sol.png';
import imgEth from '../assets/eth.png';
import imgAvax from '../assets/avax.png';
import imgPol from '../assets/pol.png';
import imgOp from '../assets/op.png';
import imgArb from '../assets/arb.png';

const CHAIN_ASSETS = {
  base: { logo: imgBase, ticker: 'ETH', explorer: 'https://basescan.org/address/' },
  monad: { logo: imgMon, ticker: 'MON', explorer: 'https://explorer.monad.xyz/address/' },
  solana: { logo: imgSol, ticker: 'SOL', explorer: 'https://solscan.io/account/' },
  arbitrum: { logo: imgArb, ticker: 'ETH', explorer: 'https://arbiscan.io/address/' },
  avalanche: { logo: imgAvax, ticker: 'AVAX', explorer: 'https://snowtrace.io/address/' },
  mainnet: { logo: imgEth, ticker: 'ETH', explorer: 'https://etherscan.io/address/' },
  polygon: { logo: imgPol, ticker: 'POL', explorer: 'https://polygonscan.com/address/' },
  optimism: { logo: imgOp, ticker: 'ETH', explorer: 'https://optimistic.etherscan.io/address/' }
};

const formatBalance = (bal) => {
  if (bal === 'error' || bal === undefined || bal === null) return '0.00';
  const num = parseFloat(bal);
  if (isNaN(num)) return '0.00';
  return parseFloat(num.toFixed(6)).toString();
};

const truncateAddress = (addr) => {
  if (!addr) return '';
  if (addr.length < 15) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const copyAddress = async (address) => {
  if (!address) return;
  try {
    await Clipboard.setStringAsync(address);
  } catch {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(address);
    }
  }
};

export default function WalletView({ theme, tokens, t }) {
  const isDark = isDarkTheme(theme);
  const { blockchain, user, isAuthorized } = useOpenDome();
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedChain, setCopiedChain] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const resolvedEvmAddress = user?.evmAddress || '';
  const resolvedSolanaAddress = user?.solanaAddress || '';

  const chainAddresses = {
    base: resolvedEvmAddress,
    monad: resolvedEvmAddress,
    arbitrum: resolvedEvmAddress,
    avalanche: resolvedEvmAddress,
    mainnet: resolvedEvmAddress,
    polygon: resolvedEvmAddress,
    optimism: resolvedEvmAddress,
    solana: resolvedSolanaAddress
  };

  const fetchBalances = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setFetchError(null);
    try {
      const filled = Object.fromEntries(
        Object.entries(chainAddresses).filter(([, addr]) => !!addr)
      );
      if (Object.keys(filled).length === 0) {
        setBalances({});
        setFetchError('NO_ADDRESSES');
        return;
      }
      if (!blockchain?.getBalances) {
        throw new Error('Blockchain adapter unavailable');
      }
      const results = await blockchain.getBalances(filled);
      setBalances(results && typeof results === 'object' ? results : {});
    } catch (err) {
      console.error('Wallet Error', err);
      setFetchError(err.message || 'SYNC_FAILED');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, resolvedEvmAddress, resolvedSolanaAddress, blockchain]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  if (!isAuthorized) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.BG, padding: 20, justifyContent: 'center' }}>
        <View style={{
          borderWidth: 2,
          borderColor: tokens.BORDER,
          backgroundColor: tokens.SURFACE,
          padding: 24,
          borderRadius: tokens.shape.cardRadius,
          ...tokens.shadow.card
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: GLOBAL_STYLES.heavy,
            color: tokens.FG,
            fontFamily: tokens.font.primary,
            marginBottom: 10
          }}>
            {t.wallet?.authRequired || 'AUTHENTICATION REQUIRED'}
          </Text>
          <Text style={{
            fontSize: 9,
            color: tokens.MUTED,
            fontFamily: tokens.font.mono,
            marginBottom: 20,
            lineHeight: 14
          }}>
            {t.wallet?.authDesc || 'PLEASE GO TO THE USER TAB AND CONNECT YOUR SECURE PASSPORT TO ACCESS WALLET BALANCES AND ADDRESSES.'}
          </Text>
        </View>
      </View>
    );
  }

  const handleCopy = async (chain, address) => {
    await copyAddress(address);
    setCopiedChain(chain);
    setTimeout(() => setCopiedChain(null), 2000);
  };

  const handleOpenExplorer = (explorerUrl, address) => {
    if (!explorerUrl || !address) return;
    Linking.openURL(`${explorerUrl}${address}`);
  };

  const chainRows = Object.entries(balances).filter(([chain]) => CHAIN_ASSETS[chain]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: tokens.font.primary }}>{t.wallet?.portfolio || 'PORTFOLIO'}</Text>
        <TouchableOpacity onPress={fetchBalances} disabled={loading}>
          <Text style={{ color: tokens.NEON_PRIMARY, fontSize: 11, fontWeight: 'bold', fontFamily: tokens.font.primary }}>
            {loading ? (t.wallet?.syncing || 'SYNCING...') : (t.wallet?.refresh || 'REFRESH')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: tokens.MUTED, fontSize: 12, fontWeight: GLOBAL_STYLES.heavy, fontFamily: tokens.font.mono, letterSpacing: 1 }}>{t.wallet?.syncing || 'SYNCING...'}</Text>
          </View>
        ) : fetchError ? (
          <View style={{ padding: 20, alignItems: 'center', borderWidth: tokens.shape.border, borderColor: tokens.NEON_DANGER, borderRadius: tokens.shape.cardRadius }}>
            <Text style={{ color: tokens.NEON_DANGER, fontSize: 10, fontFamily: tokens.font.mono, textAlign: 'center' }}>
              ERROR: {fetchError}
            </Text>
          </View>
        ) : chainRows.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center', borderWidth: tokens.shape.border, borderColor: tokens.BORDER, borderStyle: 'dashed', borderRadius: tokens.shape.cardRadius }}>
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono }}>NO BALANCES YET</Text>
          </View>
        ) : (
          chainRows.map(([chain, bal]) => {
            const asset = CHAIN_ASSETS[chain];
            const address = chainAddresses[chain];
            return (
              <View key={chain} style={{
                padding: 24,
                marginBottom: 16,
                backgroundColor: tokens.SURFACE,
                borderLeftWidth: 4,
                borderLeftColor: isDark ? tokens.NEON_WARNING : tokens.NEON_PRIMARY,
                borderRadius: tokens.shape.cardRadius,
                ...tokens.shadow.card
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {asset.logo ? (
                      <Image source={asset.logo} style={{ width: 16, height: 16, resizeMode: 'contain' }} />
                    ) : (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: tokens.MUTED }} />
                    )}
                    <Text style={{ color: tokens.FG, fontSize: 12, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: tokens.font.primary }}>
                      {chain.toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 6, height: 6, borderRadius: tokens.shape.pillRadius, backgroundColor: tokens.NEON_SUCCESS,
                      shadowColor: isDark ? tokens.NEON_SUCCESS : 'transparent', shadowRadius: 4, shadowOpacity: 0.8
                    }} />
                    <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>{t.wallet?.active || 'ACTIVE'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 24 }}>
                  <Text style={{ color: tokens.FG, fontSize: 36, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: -1, fontFamily: tokens.font.mono }}>
                    {formatBalance(bal)}
                  </Text>
                  <Text style={{ fontSize: 14, color: tokens.MUTED, fontFamily: tokens.font.mono, marginBottom: 6, fontWeight: 'bold' }}>
                    {asset.ticker}
                  </Text>
                </View>

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: tokens.BORDER,
                  paddingTop: 16
                }}>
                  <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono }}>
                    {truncateAddress(address)}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => handleCopy(chain, address)}>
                      <Text style={{ color: copiedChain === chain ? tokens.NEON_SUCCESS : tokens.FG, fontSize: 10, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>
                        {copiedChain === chain ? (t.wallet?.copied || 'COPIED') : (t.wallet?.copy || 'COPY')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleOpenExplorer(asset.explorer, address)}>
                      <Text style={{ color: tokens.FG, fontSize: 10, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>{t.wallet?.explorer || 'EXPLORER'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
