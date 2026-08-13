import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useOpenDome } from 'opendome';
import { Ionicons } from '@expo/vector-icons';
import { AuthRequiredPanel } from '../features/auth/AuthRequiredPanel';
import { useCircleNfts } from '../features/nfts/useCircleNfts';

function explorerLabel(nft) {
  const url = nft?.tokenInventoryUrl || '';
  if (url.includes('solscan')) return 'Solscan';
  if (url.includes('basescan')) return 'BaseScan';
  if (url.includes('etherscan') && url.includes('optimistic')) return 'OP Explorer';
  if (url.includes('arbiscan')) return 'Arbiscan';
  if (url.includes('polygonscan')) return 'Polygonscan';
  if (url.includes('snowtrace')) return 'Snowtrace';
  if (url.includes('etherscan')) return 'Etherscan';
  return nft?.chain || 'Explorer';
}

export default function PassesView({ tokens, t, onGoToAccount }) {
  const { isAuthorized } = useOpenDome();
  const { nfts, isScanning, error, lastScan, scan } = useCircleNfts(isAuthorized);

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
            <TouchableOpacity activeOpacity={0.6} onPress={scan}>
              <Text style={{ color: tokens.ACCENT, fontSize: 12, fontWeight: '500', fontFamily: tokens.font.primary }}>
                {isScanning ? 'Syncing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {error && !isScanning ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
                {error}
              </Text>
            </View>
          ) : nfts.length === 0 && !isScanning ? (
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
                const exploreUrl = nft.tokenInventoryUrl;
                return (
                  <TouchableOpacity
                    key={`${nft.blockchain}-${nft.contractAddress}-${nft.tokenId}-${idx}`}
                    activeOpacity={0.7}
                    onPress={() => exploreUrl && Linking.openURL(exploreUrl).catch(() => {})}
                    style={[
                      styles.passRow,
                      { borderBottomColor: tokens.BORDER, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth },
                    ]}
                  >
                    {nft.image ? (
                      <Image
                        source={{ uri: nft.image }}
                        style={[styles.passImage, { backgroundColor: tokens.SURFACE_ELEVATED }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.passImage, { backgroundColor: tokens.SURFACE_ELEVATED, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="ticket-outline" size={20} color={tokens.MUTED} />
                      </View>
                    )}

                    <View style={styles.passInfo}>
                      <Text style={[styles.passName, { color: tokens.FG, fontFamily: tokens.font.primary }]} numberOfLines={1}>
                        {nft.name || 'Unnamed NFT'}
                        {nft.amount > 1 ? ` ×${nft.amount}` : ''}
                      </Text>
                      <Text style={[styles.passNetwork, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
                        {nft.chain || 'Unknown'} · {explorerLabel(nft)}
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
    backgroundColor: 'transparent',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.02)',
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
  },
});
