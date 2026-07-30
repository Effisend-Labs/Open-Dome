import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

// Image Assets
import imgBase from '../assets/base.png';
import imgMon from '../assets/mon.png';
import imgSol from '../assets/sol.png';

const CHAIN_ASSETS = {
  base: { key: "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681", logo: imgBase, ticker: 'ETH', explorer: 'https://basescan.org/address/' },
  monad: { key: "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681", logo: imgMon, ticker: 'MON', explorer: 'https://explorer.monad.xyz/address/' },
  solana: { key: "FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u", logo: imgSol, ticker: 'SOL', explorer: 'https://solscan.io/account/' }
};

const formatBalance = (bal) => {
  if (bal === 'error' || !bal) return '0.00';
  const num = parseFloat(bal);
  if (isNaN(num)) return '0.00';
  return parseFloat(num.toFixed(6)).toString();
};

const truncateAddress = (addr) => {
  if (!addr) return '';
  if (addr.length < 15) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export default function WalletView({ theme, tokens, t }) {
  const isDark = theme === 'dark';
  const { blockchain, user, isAuthorized } = useOpenDome({ blockchain: { evm: ['base', 'monad'] } });
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedChain, setCopiedChain] = useState(null);

  const resolvedEvmAddress = user?.evmAddress || "";
  const resolvedSolanaAddress = user?.solanaAddress || "";

  const chainAddresses = {
    base: resolvedEvmAddress,
    monad: resolvedEvmAddress,
    solana: resolvedSolanaAddress
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchBalances = async () => {
      setLoading(true);
      try {
        const results = await blockchain.getBalances({
          base: chainAddresses.base,
          monad: chainAddresses.monad,
          solana: chainAddresses.solana
        });
        setBalances(results);
      } catch (err) {
        console.error("Wallet Error", err);
      }
      setLoading(false);
    };
    fetchBalances();
  }, [isAuthorized]);

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
    await Clipboard.setStringAsync(address);
    setCopiedChain(chain);
    setTimeout(() => setCopiedChain(null), 2000);
  };

  const handleOpenExplorer = (explorerUrl, address) => {
    Linking.openURL(`${explorerUrl}${address}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG, padding: 20 }}>
      
      {/* Header Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: tokens.font.primary }}>{t.wallet?.portfolio || 'PORTFOLIO'}</Text>
        <TouchableOpacity onPress={() => setBalances({})}>
          <Text style={{ color: tokens.NEON_PRIMARY, fontSize: 11, fontWeight: 'bold', fontFamily: tokens.font.primary }}>{t.wallet?.refresh || 'REFRESH'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Data Feed */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: tokens.MUTED, fontSize: 12, fontWeight: GLOBAL_STYLES.heavy, fontFamily: tokens.font.mono, letterSpacing: 1 }}>{t.wallet?.syncing || 'SYNCING...'}</Text>
          </View>
        ) : (
          Object.entries(balances).map(([chain, bal]) => (
            <View key={chain} style={{
              padding: 24,
              marginBottom: 16,
              backgroundColor: tokens.SURFACE,
              borderLeftWidth: 4,
              borderLeftColor: isDark ? tokens.NEON_WARNING : tokens.NEON_PRIMARY,
              borderRadius: tokens.shape.cardRadius,
              ...tokens.shadow.card
            }}>
              
              {/* Card Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={CHAIN_ASSETS[chain].logo} style={{ width: 16, height: 16, resizeMode: 'contain' }} />
                  <Text style={{ color: tokens.FG, fontSize: 12, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: tokens.font.primary }}>
                    {chain.toUpperCase()}
                  </Text>
                </View>
                
                {/* Clean Status Indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ 
                    width: 6, height: 6, borderRadius: tokens.shape.pillRadius, backgroundColor: tokens.NEON_SUCCESS,
                    shadowColor: isDark ? tokens.NEON_SUCCESS : 'transparent', shadowRadius: 4, shadowOpacity: 0.8
                  }} />
                  <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>{t.wallet?.active || 'ACTIVE'}</Text>
                </View>
              </View>

              {/* Balance Readout (Clean, no boxes) */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 24 }}>
                <Text style={{ color: tokens.FG, fontSize: 36, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: -1, fontFamily: tokens.font.mono }}>
                  {formatBalance(bal)}
                </Text>
                <Text style={{ fontSize: 14, color: tokens.MUTED, fontFamily: tokens.font.mono, marginBottom: 6, fontWeight: 'bold' }}>
                  {CHAIN_ASSETS[chain].ticker}
                </Text>
              </View>

              {/* Minimal Address & Actions Footer */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: tokens.BORDER,
                paddingTop: 16
              }}>
                <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono }}>
                  {truncateAddress(chainAddresses[chain])}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <TouchableOpacity onPress={() => handleCopy(chain, chainAddresses[chain])}>
                    <Text style={{ color: copiedChain === chain ? tokens.NEON_SUCCESS : tokens.FG, fontSize: 10, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>
                      {copiedChain === chain ? (t.wallet?.copied || 'COPIED') : (t.wallet?.copy || 'COPY')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleOpenExplorer(CHAIN_ASSETS[chain].explorer, chainAddresses[chain])}>
                    <Text style={{ color: tokens.FG, fontSize: 10, fontFamily: tokens.font.primary, fontWeight: 'bold' }}>{t.wallet?.explorer || 'EXPLORER'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
