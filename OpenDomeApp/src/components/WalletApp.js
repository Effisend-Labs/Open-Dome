import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';

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

  const userProfile = useMemo(() => {
    if (verifiedToken) {
      return parseJwt(verifiedToken);
    }
    return null;
  }, [verifiedToken]);

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
      marginBottom: n(32),
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
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
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
    }
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Wallets</Text>
          <Text style={s.subtitle}>Your connected web3 accounts</Text>
        </View>

        {userProfile ? (
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
          <View style={s.emptyState}>
            <Ionicons name="wallet-outline" size={n(48)} color={theme.text.secondary} />
            <Text style={s.infoText}>Please sign in to view your wallets.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
