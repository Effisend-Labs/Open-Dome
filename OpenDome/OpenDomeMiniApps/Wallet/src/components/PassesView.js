import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useOpenDome } from 'opendome';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_STYLES } from '../theme';

// Define the contract addresses to track on each network
const PASSES_CONFIG = {
  base: [
    // "0xYourContractAddressOnBase"
  ],
  arbitrum: [],
  optimism: [],
  mainnet: [],
  polygon: [],
  monad: [],
  solana: []
};

export default function PassesView({ theme, tokens, t, isDark }) {
  const { blockchain, user, isAuthorized } = useOpenDome();
  const [nfts, setNfts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const evmAddr = user?.evmAddress;
  // const solAddr = user?.solanaAddress; // Solana NFT fetching not implemented in evmAdapter

  const scanNFTs = useCallback(async () => {
    if (!isAuthorized || !evmAddr) return;
    setIsScanning(true);

    try {
      // Use the new getAllNFTs API which takes a JSON map of contracts
      const allNfts = await blockchain.getAllNFTs(evmAddr, PASSES_CONFIG);

      // Deduplicate
      const uniqueNftsMap = new Map();
      allNfts.forEach(nft => {
        const key = `${nft.network}-${nft.contractAddress}-${nft.tokenId}`;
        if (!uniqueNftsMap.has(key)) {
          uniqueNftsMap.set(key, nft);
        }
      });

      setNfts(Array.from(uniqueNftsMap.values()));
      setLastScan(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('[PassesView] Scan error:', err);
    }

    setIsScanning(false);
  }, [isAuthorized, evmAddr, blockchain]);

  useEffect(() => {
    scanNFTs();
    const interval = setInterval(scanNFTs, 60000);
    return () => clearInterval(interval);
  }, [scanNFTs]);

  if (!isAuthorized) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: tokens.BG }]}>
        <View style={[styles.lockIcon, { backgroundColor: tokens.SURFACE_ELEVATED, borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.BORDER }]}>
          <View style={{ width: 14, height: 10, borderRadius: 7, borderWidth: 2, borderColor: tokens.MUTED, marginBottom: -2 }} />
          <View style={{ width: 18, height: 12, borderRadius: 3, backgroundColor: tokens.MUTED }} />
        </View>
        <Text style={[styles.emptyTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          Authentication required
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listSection}>
          <View style={[styles.listHeader, { borderBottomColor: tokens.BORDER }]}>
            <Text style={[styles.listTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              Passes
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {!isScanning && lastScan && (
                <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, letterSpacing: 0.3 }}>
                  Synced {lastScan}
                </Text>
              )}
              <TouchableOpacity activeOpacity={0.6} onPress={scanNFTs}>
                <Text style={{ color: tokens.ACCENT, fontSize: 12, fontWeight: '500', fontFamily: tokens.font.primary }}>
                  {isScanning ? 'Syncing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {nfts.length === 0 && !isScanning ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: tokens.SURFACE_ELEVATED }]}>
                <Ionicons name="ticket-outline" size={24} color={tokens.FG_SECONDARY} />
              </View>
              <Text style={[styles.emptyText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                No passes found
              </Text>
            </View>
          ) : (
            <View>
              {nfts.map((nft, idx) => {
                const isLast = idx === nfts.length - 1;
                return (
                  <View 
                    key={`${nft.network}-${nft.tokenId}-${idx}`} 
                    style={[
                      styles.passRow, 
                      { borderBottomColor: tokens.BORDER, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }
                    ]}
                  >
                    {nft.image ? (
                      <Image source={{ uri: nft.image }} style={[styles.passImage, { backgroundColor: tokens.SURFACE_ELEVATED }]} resizeMode="cover" />
                    ) : (
                      <View style={[styles.passImage, { backgroundColor: tokens.SURFACE_ELEVATED, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="ticket-outline" size={20} color={tokens.MUTED} />
                      </View>
                    )}
                    
                    <View style={styles.passInfo}>
                      <Text style={[styles.passName, { color: tokens.FG, fontFamily: tokens.font.primary }]} numberOfLines={1}>
                        {nft.name || 'Unnamed Pass'}
                      </Text>
                      <Text style={[styles.passNetwork, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                        {nft.network.charAt(0).toUpperCase() + nft.network.slice(1)} Network
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={tokens.MUTED} />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  listSection: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent', // Match the list style but let the background flow
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.02)', // slight surface elevation for header
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  emptyIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  passImage: {
    width: 40,
    height: 40,
    borderRadius: 8, 
  },
  passInfo: {
    flex: 1,
    gap: 2,
  },
  passName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  passNetwork: {
    fontSize: 12,
  }
});
