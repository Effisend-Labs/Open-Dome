import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';

const ethLogo = require('../assets/ether.png');
const solLogo = require('../assets/solana.png');

const parseJwt = (t) => {
  if (!t) return null;
  try {
    const base64Url = t.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export default function QRApp({ verifiedToken }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();

  const [selectedWallet, setSelectedWallet] = useState('all');
  const [copied, setCopied] = useState(false);

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
          solana: userProfile.solana || '',
        });
      } else if (selectedWallet === 'evm' && userProfile.evm) {
        return userProfile.evm;
      } else if (selectedWallet === 'solana' && userProfile.solana) {
        return userProfile.solana;
      }
    }
    return '';
  }, [userProfile, selectedWallet]);

  const copyAddress = useMemo(() => {
    if (!userProfile || selectedWallet === 'all') return '';
    if (selectedWallet === 'evm') return userProfile.evm || '';
    if (selectedWallet === 'solana') return userProfile.solana || '';
    return '';
  }, [userProfile, selectedWallet]);

  useEffect(() => {
    setCopied(false);
  }, [selectedWallet]);

  const handleCopyAddress = useCallback(async () => {
    if (!copyAddress) return;
    await Clipboard.setStringAsync(copyAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [copyAddress]);

  // Higher ECC so a center logo still scans reliably.
  const qrFg = theme.isDark ? 'FFFFFF' : '000000';
  const qrBg = theme.isDark ? '000000' : 'FFFFFF';
  const qrImageUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&ecc=H&color=${qrFg}&bgcolor=${qrBg}&data=${encodeURIComponent(qrData)}`
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
    qrFrame: {
      width: n(220),
      height: n(220),
      borderRadius: n(16),
      marginBottom: n(24),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: theme.isDark ? '#000000' : '#FFFFFF',
    },
    qrImage: {
      width: n(200),
      height: n(200),
    },
    logoBadge: {
      position: 'absolute',
      minWidth: n(48),
      height: n(48),
      paddingHorizontal: n(8),
      borderRadius: n(12),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: n(4),
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
    },
    logoImage: {
      width: n(28),
      height: n(28),
    },
    selectorContainer: {
      flexDirection: 'row',
      backgroundColor: theme.bg.nested,
      borderRadius: n(12),
      padding: n(4),
      marginBottom: n(24),
      borderWidth: 1,
      borderColor: theme.border.default,
      width: '100%',
    },
    selectorTab: {
      flex: 1,
      paddingVertical: n(8),
      alignItems: 'center',
      borderRadius: n(8),
    },
    selectorTabActive: {
      backgroundColor: theme.bg.card,
      ...(theme.shadow?.sm || {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
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
    copyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: n(16),
      gap: n(8),
    },
    copyButton: {
      width: n(40),
      height: n(40),
      borderRadius: n(20),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg.nested,
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: n(40),
    },
  });

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                    style={[
                      s.selectorTab,
                      selectedWallet === tab && s.selectorTabActive,
                    ]}
                    onPress={() => setSelectedWallet(tab)}
                  >
                    <Text
                      style={[
                        s.selectorText,
                        selectedWallet === tab && s.selectorTextActive,
                      ]}
                    >
                      {tab === 'all' ? 'All' : tab === 'evm' ? 'EVM' : 'Solana'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {qrImageUrl ? (
                  <View style={s.qrFrame}>
                  <Image
                    source={{ uri: qrImageUrl }}
                    style={s.qrImage}
                    contentFit="contain"
                  />
                  {selectedWallet !== 'all' ? (
                    <View style={s.logoBadge}>
                      <Image
                        source={selectedWallet === 'solana' ? solLogo : ethLogo}
                        style={s.logoImage}
                        contentFit="contain"
                      />
                    </View>
                  ) : null}
                </View>
              ) : (
                <View
                  style={[
                    s.qrFrame,
                    {
                      backgroundColor: theme.isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={n(48)}
                    color={theme.text.secondary}
                  />
                  <Text style={[s.infoText, { marginTop: n(16) }]}>
                    No {selectedWallet} address found.
                  </Text>
                </View>
              )}

              <Text style={s.infoText}>
                {selectedWallet === 'all'
                  ? 'This QR code contains your EVM and Solana wallet addresses.'
                  : `This QR code contains your ${
                      selectedWallet === 'evm' ? 'EVM' : 'Solana'
                    } wallet address.`}
              </Text>

              {selectedWallet !== 'all' && copyAddress ? (
                <View style={s.copyRow}>
                  <Pressable
                    style={s.copyButton}
                    onPress={handleCopyAddress}
                    accessibilityLabel="Copy address"
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={n(20)}
                      color={copied ? theme.text.primary : theme.text.secondary}
                    />
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <View style={s.emptyState}>
              <Ionicons
                name="qr-code-outline"
                size={n(48)}
                color={theme.text.secondary}
                style={{ marginBottom: n(16) }}
              />
              <Text style={s.infoText}>
                Please sign in to generate your QR code.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
