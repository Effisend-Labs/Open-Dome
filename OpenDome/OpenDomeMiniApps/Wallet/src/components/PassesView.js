import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useOpenDome, OPENDOME_PASSES_CONFIG, OPENDOME_PASS_ADDRESS } from 'opendome';
import { Ionicons } from '@expo/vector-icons';
import { GLOBAL_STYLES } from '../theme';
import { AuthRequiredPanel } from '../features/auth/AuthRequiredPanel';

const PASSES_CONFIG = OPENDOME_PASSES_CONFIG;
const BASESCAN = 'https://basescan.org';

function inventoryUrlFor(nft, owner) {
  if (nft?.tokenInventoryUrl) return nft.tokenInventoryUrl;
  if (nft?.explorer?.tokenInventoryUrl) return nft.explorer.tokenInventoryUrl;
  const contract = nft?.contractAddress || OPENDOME_PASS_ADDRESS;
  if (!owner || !contract) return null;
  return `${BASESCAN}/token/${contract}?a=${String(owner).toLowerCase()}`;
}

export default function PassesView({ theme, tokens, t, isDark, onGoToAccount }) {
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
      <AuthRequiredPanel
        tokens={tokens}
        t={t}
        description={t?.authRequired?.passes}
        onSignIn={onGoToAccount}
      />
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
            <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, letterSpacing: 0.3 }}>
              {!isScanning && lastScan ? `Synced ${lastScan}` : ' '}
            </Text>
            <TouchableOpacity activeOpacity={0.6} onPress={scanNFTs}>
              <Text style={{ color: tokens.ACCENT, fontSize: 12, fontWeight: '500', fontFamily: tokens.font.primary }}>
                {isScanning ? 'Syncing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {nfts.length === 0 && !isScanning ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: tokens.SURFACE_ELEVATED }]}>
                <Ionicons name="images-outline" size={24} color={tokens.FG_SECONDARY} />
              </View>
              <Text style={[styles.emptyText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                Nothing here yet
              </Text>
            </View>
          ) : (
            <View>
              {nfts.map((nft, idx) => {
                const isLast = idx === nfts.length - 1;
                const exploreUrl = inventoryUrlFor(nft, evmAddr);
                return (
                  <TouchableOpacity
                    key={`${nft.network}-${nft.tokenId}-${idx}`}
                    activeOpacity={0.7}
                    onPress={() => exploreUrl && Linking.openURL(exploreUrl).catch(() => {})}
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
                        {nft.name || 'Unnamed NFT'}
                      </Text>
                      <Text style={[styles.passNetwork, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                        {(nft.network || 'base').charAt(0).toUpperCase() + (nft.network || 'base').slice(1)} · BaseScan
                      </Text>
                    </View>

                    <Ionicons name="open-outline" size={16} color={tokens.MUTED} />
                  </TouchableOpacity>
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
