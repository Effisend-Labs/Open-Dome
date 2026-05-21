import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

// Image Assets
import imgBase from '../assets/base.png';
import imgMon from '../assets/mon.png';
import imgSol from '../assets/sol.png';
import imgStrk from '../assets/strk.png';

const CHAIN_ASSETS = {
  base: { key: "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681", logo: imgBase, ticker: 'ETH', explorer: 'https://basescan.org/address/' },
  monad: { key: "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681", logo: imgMon, ticker: 'MON', explorer: 'https://explorer.monad.xyz/address/' },
  solana: { key: "FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u", logo: imgSol, ticker: 'SOL', explorer: 'https://solscan.io/account/' },
  starknet: { key: "0x559caafea358d824c9e397e45858129cb4b6f366857e8713b88f559e8502b5d", logo: imgStrk, ticker: 'STRK', explorer: 'https://starkscan.co/contract/' }
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

export default function WalletView({ theme, tokens }) {
  const isDark = theme === 'dark';
  const { blockchain } = useOpenDome({ blockchain: { evm: ['base', 'monad'] } });
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedChain, setCopiedChain] = useState(null);

  useEffect(() => {
    const fetchBalances = async () => {
      setLoading(true);
      try {
        const results = await blockchain.getBalances({
          base: CHAIN_ASSETS.base.key,
          monad: CHAIN_ASSETS.monad.key,
          solana: CHAIN_ASSETS.solana.key,
          starknet: CHAIN_ASSETS.starknet.key
        });
        setBalances(results);
      } catch (err) {
        console.error("Wallet Error", err);
      }
      setLoading(false);
    };
    fetchBalances();
  }, []);

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
        <Text style={{ color: tokens.FG, fontSize: 16, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace }}>PORTFOLIO</Text>
        <TouchableOpacity onPress={() => setBalances({})}>
          <Text style={{ color: tokens.NEON_PRIMARY, fontSize: 11, fontWeight: 'bold', fontFamily: GLOBAL_STYLES.monospace }}>REFRESH</Text>
        </TouchableOpacity>
      </View>

      {/* Main Data Feed */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: tokens.MUTED, fontSize: 12, fontWeight: GLOBAL_STYLES.heavy, fontFamily: GLOBAL_STYLES.monospace, letterSpacing: 1 }}>SYNCING...</Text>
          </View>
        ) : (
          Object.entries(balances).map(([chain, bal]) => (
            <View key={chain} style={{
              padding: 24,
              marginBottom: 16,
              backgroundColor: tokens.SURFACE,
              borderLeftWidth: 4,
              borderLeftColor: isDark ? tokens.NEON_WARNING : tokens.FG,
            }}>
              
              {/* Card Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image source={CHAIN_ASSETS[chain].logo} style={{ width: 16, height: 16, resizeMode: 'contain' }} />
                  <Text style={{ color: tokens.FG, fontSize: 12, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: 1, fontFamily: GLOBAL_STYLES.monospace }}>
                    {chain.toUpperCase()}
                  </Text>
                </View>
                
                {/* Clean Status Indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ 
                    width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.NEON_SUCCESS,
                    shadowColor: isDark ? tokens.NEON_SUCCESS : 'transparent', shadowRadius: 4, shadowOpacity: 0.8
                  }} />
                  <Text style={{ color: tokens.MUTED, fontSize: 9, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>ACTIVE</Text>
                </View>
              </View>

              {/* Balance Readout (Clean, no boxes) */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 24 }}>
                <Text style={{ color: tokens.FG, fontSize: 36, fontWeight: GLOBAL_STYLES.heavy, letterSpacing: -1, fontFamily: GLOBAL_STYLES.monospace }}>
                  {formatBalance(bal)}
                </Text>
                <Text style={{ fontSize: 14, color: tokens.MUTED, fontFamily: GLOBAL_STYLES.monospace, marginBottom: 6, fontWeight: 'bold' }}>
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
                <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: GLOBAL_STYLES.monospace }}>
                  {truncateAddress(CHAIN_ASSETS[chain].key)}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <TouchableOpacity onPress={() => handleCopy(chain, CHAIN_ASSETS[chain].key)}>
                    <Text style={{ color: copiedChain === chain ? tokens.NEON_SUCCESS : tokens.FG, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>
                      {copiedChain === chain ? 'COPIED' : 'COPY'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleOpenExplorer(CHAIN_ASSETS[chain].explorer, CHAIN_ASSETS[chain].key)}>
                    <Text style={{ color: tokens.FG, fontSize: 10, fontFamily: GLOBAL_STYLES.monospace, fontWeight: 'bold' }}>EXPLORER</Text>
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
