import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, ActivityIndicator } from 'react-native';
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

export default function WalletApp({ verifiedToken }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();

  const userProfile = useMemo(() => {
    if (verifiedToken) {
      return parseJwt(verifiedToken);
    }
    return null;
  }, [verifiedToken]);

  const { nfts, isScanning } = useNFTScanner(userProfile?.evm);

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
          <Text style={s.title}>Passes</Text>
          <Text style={s.subtitle}>Your event passes & tickets</Text>
        </View>

        {!userProfile ? (
          <View style={s.emptyState}>
            <Ionicons name="ticket-outline" size={n(48)} color={theme.text.secondary} />
            <Text style={s.infoText}>Please sign in to view your passes.</Text>
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
