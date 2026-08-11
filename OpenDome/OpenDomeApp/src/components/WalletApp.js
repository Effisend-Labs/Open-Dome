import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useNFTScanner } from '../hooks/useNFTScanner';

const parseJwt = (t) => {
  if (!t) return null;
  try {
    const base64Url = t.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const formatAddress = (address) => {
  if (!address) return 'Not Available';
  if (address.length > 20) {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }
  return address;
};

export default function WalletApp({ verifiedToken }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  const [activeTab, setActiveTab] = useState('wallets'); // 'wallets' or 'passes'

  const userProfile = useMemo(() => {
    if (verifiedToken) {
      return parseJwt(verifiedToken);
    }
    return null;
  }, [verifiedToken]);

  // Only fetch passes when the user opens the Passes tab (never on Wallets).
  const { nfts, isScanning } = useNFTScanner(
    activeTab === 'passes' ? userProfile?.evm : null
  );

  const defaultFont = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      padding: n(24),
      paddingTop: n(40),
      paddingBottom: n(120),
    },
    header: {
      marginBottom: n(24),
    },
    title: {
      fontSize: n(32),
      fontWeight: '800',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: n(15),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginTop: n(4),
    },
    tabSwitcher: {
      flexDirection: 'row',
      backgroundColor: theme.bg.nested,
      borderRadius: n(12),
      padding: n(4),
      marginBottom: n(24),
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    tabButton: {
      flex: 1,
      paddingVertical: n(8),
      alignItems: 'center',
      borderRadius: n(8),
    },
    tabButtonActive: {
      backgroundColor: theme.bg.card,
      ...(theme.shadow?.sm || {
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1
      }),
    },
    tabText: {
      fontSize: n(14),
      fontWeight: '600',
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    tabTextActive: {
      color: theme.text.primary,
    },
    walletCard: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(24),
      padding: n(24),
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
      marginBottom: n(24),
      ...(theme.shadow?.card || {}),
    },
    walletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: n(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    walletLabel: {
      fontSize: n(16),
      fontWeight: '600',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginBottom: n(4),
    },
    walletSubtitle: {
      fontSize: n(12),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    walletAddress: {
      fontSize: n(13),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
      backgroundColor: theme.bg.nested,
      paddingHorizontal: n(8),
      paddingVertical: n(4),
      borderRadius: n(6),
      overflow: 'hidden',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: n(40),
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(24),
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
    },
    infoText: {
      fontSize: n(14),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginTop: n(16),
      textAlign: 'center',
    },
    nftGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    nftCard: {
      width: '48%',
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(16),
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
      marginBottom: n(16),
      overflow: 'hidden',
      ...(theme.shadow?.card || {}),
    },
    nftImage: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: theme.bg.elevated,
    },
    nftInfo: {
      padding: n(12),
    },
    nftName: {
      fontSize: n(14),
      fontWeight: '600',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginBottom: n(4),
    },
    nftNetwork: {
      fontSize: n(12),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: n(16),
    },
    loadingText: {
      marginLeft: n(8),
      color: theme.text.secondary,
      fontSize: n(14),
    }
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Wallet</Text>
          <Text style={s.subtitle}>Manage your assets & passes</Text>
        </View>

        <View style={s.tabSwitcher}>
          <TouchableOpacity 
            style={[s.tabButton, activeTab === 'wallets' && s.tabButtonActive]}
            onPress={() => setActiveTab('wallets')}
          >
            <Text style={[s.tabText, activeTab === 'wallets' && s.tabTextActive]}>Wallets</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tabButton, activeTab === 'passes' && s.tabButtonActive]}
            onPress={() => setActiveTab('passes')}
          >
            <Text style={[s.tabText, activeTab === 'passes' && s.tabTextActive]}>Passes</Text>
          </TouchableOpacity>
        </View>

        {!userProfile ? (
          <View style={s.emptyState}>
            <Ionicons name="wallet-outline" size={n(48)} color={theme.text.secondary} />
            <Text style={s.infoText}>Please sign in to view your {activeTab}.</Text>
          </View>
        ) : activeTab === 'wallets' ? (
          <View style={s.walletCard}>
            <View style={s.walletRow}>
              <View>
                <Text style={s.walletLabel}>Ethereum</Text>
                <Text style={s.walletSubtitle}>EVM Network</Text>
              </View>
              <Text style={s.walletAddress}>{formatAddress(userProfile.evm)}</Text>
            </View>
            
            <View style={[s.walletRow, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={s.walletLabel}>Solana</Text>
                <Text style={s.walletSubtitle}>Solana Network</Text>
              </View>
              <Text style={s.walletAddress}>{formatAddress(userProfile.solana)}</Text>
            </View>
          </View>
        ) : (
          <View>
            {isScanning && nfts.length === 0 && (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="small" color={theme.text.secondary} />
                <Text style={s.loadingText}>Scanning networks for passes...</Text>
              </View>
            )}
            
            {!isScanning && nfts.length === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="ticket-outline" size={n(48)} color={theme.text.secondary} />
                <Text style={s.infoText}>No passes found on configured networks.</Text>
              </View>
            )}
            
            {nfts.length > 0 && (
              <View style={s.nftGrid}>
                {nfts.map((nft, idx) => (
                  <View key={`${nft.contractAddress}-${nft.tokenId}-${idx}`} style={s.nftCard}>
                    {nft.image ? (
                      <View style={{ position: 'relative' }}>
                        <Image 
                          source={{ uri: nft.image }} 
                          style={s.nftImage} 
                          contentFit="cover"
                          transition={200}
                        />
                        {nft.amount > 1 && (
                          <View style={{
                            position: 'absolute',
                            top: n(8),
                            right: n(8),
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: n(8),
                            paddingVertical: n(4),
                            borderRadius: n(12)
                          }}>
                            <Text style={{ color: '#fff', fontSize: n(12), fontWeight: 'bold' }}>x{nft.amount}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={[s.nftImage, { alignItems: 'center', justifyContent: 'center', position: 'relative' }]}>
                        <Ionicons name="image-outline" size={n(24)} color={theme.text.secondary} />
                        {nft.amount > 1 && (
                          <View style={{
                            position: 'absolute',
                            top: n(8),
                            right: n(8),
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: n(8),
                            paddingVertical: n(4),
                            borderRadius: n(12)
                          }}>
                            <Text style={{ color: '#fff', fontSize: n(12), fontWeight: 'bold' }}>x{nft.amount}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={s.nftInfo}>
                      <Text style={s.nftName} numberOfLines={1}>{nft.name || 'Unnamed Pass'}</Text>
                      <Text style={s.nftNetwork}>{nft.network}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
