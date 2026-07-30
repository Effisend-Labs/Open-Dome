import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Pressable } from 'react-native';
import { Image } from 'expo-image';
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

export default function QRApp({ verifiedToken }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  
  const [selectedWallet, setSelectedWallet] = useState('all');

  const userProfile = useMemo(() => {
    if (verifiedToken) {
      return parseJwt(verifiedToken);
    }
    return null;
  }, [verifiedToken]);

  const qrData = useMemo(() => {
    if (userProfile) {
      if (selectedWallet === 'all' && (userProfile.evm || userProfile.solana)) {
        return JSON.stringify({
          evm: userProfile.evm || '',
          solana: userProfile.solana || ''
        });
      } else if (selectedWallet === 'evm' && userProfile.evm) {
        return userProfile.evm;
      } else if (selectedWallet === 'solana' && userProfile.solana) {
        return userProfile.solana;
      }
    }
    return '';
  }, [userProfile, selectedWallet]);

  const qrImageUrl = qrData 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&color=${theme.isDark ? 'FFFFFF' : '000000'}&bgcolor=${theme.isDark ? '000000' : 'FFFFFF'}`
    : null;

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
    qrCard: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(24),
      padding: n(24),
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
      alignItems: 'center',
      justifyContent: 'center',
      ...(theme.shadow?.card || {}),
    },
    qrImage: {
      width: n(200),
      height: n(200),
      borderRadius: n(12),
      marginBottom: n(24),
    },
    selectorContainer: {
      flexDirection: 'row',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderRadius: n(12),
      padding: n(4),
      marginBottom: n(24),
      width: '100%',
    },
    selectorTab: {
      flex: 1,
      paddingVertical: n(8),
      alignItems: 'center',
      borderRadius: n(8),
    },
    selectorTabActive: {
      backgroundColor: theme.bg.panel,
      ...(theme.shadow?.card || {
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
      }),
    },
    selectorText: {
      fontSize: n(13),
      fontWeight: '600',
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    selectorTextActive: {
      color: theme.text.primary,
    },
    infoText: {
      fontSize: n(14),
      color: theme.text.secondary,
      textAlign: 'center',
      fontFamily: theme.typography?.fontFamily || defaultFont,
      lineHeight: n(20),
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: n(40),
    },
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>My QR Code</Text>
          <Text style={s.subtitle}>Scan to view connected crypto accounts</Text>
        </View>

        <View style={s.qrCard}>
          {userProfile ? (
            <>
              <View style={s.selectorContainer}>
                {['all', 'evm', 'solana'].map((tab) => (
                  <Pressable 
                    key={tab}
                    style={[s.selectorTab, selectedWallet === tab && s.selectorTabActive]}
                    onPress={() => setSelectedWallet(tab)}
                  >
                    <Text style={[s.selectorText, selectedWallet === tab && s.selectorTextActive]}>
                      {tab === 'all' ? 'All' : tab === 'evm' ? 'EVM' : 'Solana'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {qrImageUrl ? (
                <Image source={{ uri: qrImageUrl }} style={s.qrImage} contentFit="contain" />
              ) : (
                <View style={[s.qrImage, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="qr-code-outline" size={n(48)} color={theme.text.secondary} />
                  <Text style={[s.infoText, { marginTop: n(16) }]}>No {selectedWallet} address found.</Text>
                </View>
              )}
              
              <Text style={s.infoText}>
                {selectedWallet === 'all' 
                  ? 'This QR code contains your EVM and Solana wallet addresses.'
                  : `This QR code contains your ${selectedWallet === 'evm' ? 'EVM' : 'Solana'} wallet address.`}
              </Text>
            </>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="qr-code-outline" size={n(48)} color={theme.text.secondary} style={{ marginBottom: n(16) }} />
              <Text style={s.infoText}>Please sign in to generate your QR code.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
