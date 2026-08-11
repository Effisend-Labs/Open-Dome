import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'qrcode';
import { Ionicons } from '@expo/vector-icons';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';

const ethLogo = require('../assets/ether.png');
const solLogo = require('../assets/solana.png');

const QR_TABS = ['opendome', 'evm', 'solana'];

const TAB_LABELS = {
  opendome: 'OpenDome',
  evm: 'EVM',
  solana: 'Solana',
};

const TAB_DESCRIPTIONS = {
  opendome: 'Scan for OpenDome profile',
  evm: 'Scan for EVM address',
  solana: 'Scan for Solana address',
};

const buildQrPayloads = (userProfile) => {
  if (!userProfile) return {};

  const payloads = {};
  if (userProfile.username) {
    payloads.opendome = `opendome:user:${userProfile.username}`;
  }
  if (userProfile.evm) payloads.evm = userProfile.evm;
  if (userProfile.solana) payloads.solana = userProfile.solana;
  return payloads;
};

const generateQrImages = async (payloads, qrFg, qrBg) => {
  const images = {};
  await Promise.all(
    QR_TABS.map(async (tab) => {
      const data = payloads[tab];
      if (!data) {
        images[tab] = null;
        return;
      }
      images[tab] = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: { dark: `#${qrFg}`, light: `#${qrBg}` },
      });
    })
  );
  return images;
};

const formatAddress = (address) => {
  if (!address || address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

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

  const [selectedWallet, setSelectedWallet] = useState('opendome');
  const [copied, setCopied] = useState(false);
  const [qrImages, setQrImages] = useState({ opendome: null, evm: null, solana: null });

  const userProfile = useMemo(() => {
    if (verifiedToken) {
      return parseJwt(verifiedToken);
    }
    return null;
  }, [verifiedToken]);

  const qrFg = theme.isDark ? 'FFFFFF' : '000000';
  const qrBg = theme.isDark ? '000000' : 'FFFFFF';

  const qrPayloads = useMemo(
    () => buildQrPayloads(userProfile),
    [userProfile]
  );

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      if (!Object.keys(qrPayloads).length) {
        setQrImages({ opendome: null, evm: null, solana: null });
        return;
      }

      const images = await generateQrImages(qrPayloads, qrFg, qrBg);
      if (!cancelled) setQrImages(images);
    };

    preload();
    return () => {
      cancelled = true;
    };
  }, [qrPayloads, qrFg, qrBg]);

  const qrImageUrl = qrImages[selectedWallet] || null;

  const copyAddress = useMemo(() => {
    if (!userProfile || selectedWallet === 'opendome') return '';
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
      marginBottom: n(16),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: theme.isDark ? '#000000' : '#FFFFFF',
    },
    qrImage: {
      width: n(200),
      height: n(200),
    },
    qrImageHidden: {
      position: 'absolute',
      opacity: 0,
      pointerEvents: 'none',
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
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: n(16),
      paddingVertical: n(12),
      paddingHorizontal: n(14),
      borderRadius: n(12),
      backgroundColor: theme.bg.nested,
      borderWidth: 1,
      borderColor: theme.border.default,
      gap: n(10),
    },
    addressText: {
      flex: 1,
      fontSize: n(13),
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamilyCode || 'monospace',
    },
    copyIcon: {
      padding: n(4),
    },
    usernameLabel: {
      fontSize: n(18),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginBottom: n(12),
      textAlign: 'center',
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
          <Text style={s.title}>Receive</Text>
          <Text style={s.subtitle}>Share your OpenDome profile or addresses</Text>
        </View>

        <View style={s.qrCard}>
          {userProfile ? (
            <>
              <View style={s.selectorContainer}>
                {QR_TABS.map((tab) => (
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
                      {TAB_LABELS[tab]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {qrImageUrl ? (
                <View style={s.qrFrame}>
                  {QR_TABS.map((tab) =>
                    qrImages[tab] ? (
                      <Image
                        key={tab}
                        source={{ uri: qrImages[tab] }}
                        style={[
                          s.qrImage,
                          tab !== selectedWallet && s.qrImageHidden,
                        ]}
                        contentFit="contain"
                      />
                    ) : null
                  )}
                  {selectedWallet !== 'opendome' ? (
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
                    No {TAB_LABELS[selectedWallet] || selectedWallet} code available.
                  </Text>
                </View>
              )}

              {selectedWallet === 'opendome' && userProfile?.username ? (
                <Text style={s.usernameLabel}>@{userProfile.username}</Text>
              ) : null}

              {selectedWallet !== 'opendome' && copyAddress ? (
                <Pressable
                  style={s.addressRow}
                  onPress={handleCopyAddress}
                  accessibilityLabel="Copy address"
                  accessibilityRole="button"
                >
                  <Text style={s.addressText} numberOfLines={1}>
                    {formatAddress(copyAddress)}
                  </Text>
                  <View style={s.copyIcon}>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={n(18)}
                      color={copied ? theme.text.primary : theme.text.secondary}
                    />
                  </View>
                </Pressable>
              ) : null}

              <Text style={s.infoText}>{TAB_DESCRIPTIONS[selectedWallet]}</Text>
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
