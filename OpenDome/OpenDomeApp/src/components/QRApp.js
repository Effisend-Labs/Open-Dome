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

const formatAddress = (address) => {
  if (!address) return null;
  if (address.length > 16) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }
  return address;
};

const TABS = [
  { id: 'all', label: 'All', icon: 'layers-outline' },
  { id: 'evm', label: 'EVM', icon: 'logo-ethereum' },
  { id: 'solana', label: 'Solana', icon: 'sunny-outline' },
];

function CornerMark({ position, color, size }) {
  const thickness = Math.max(2, size * 0.08);
  const length = size * 0.28;
  const base = {
    position: 'absolute',
    width: length,
    height: length,
    borderColor: color,
  };
  const styles = {
    tl: {
      ...base,
      top: 0,
      left: 0,
      borderTopWidth: thickness,
      borderLeftWidth: thickness,
      borderTopLeftRadius: thickness,
    },
    tr: {
      ...base,
      top: 0,
      right: 0,
      borderTopWidth: thickness,
      borderRightWidth: thickness,
      borderTopRightRadius: thickness,
    },
    bl: {
      ...base,
      bottom: 0,
      left: 0,
      borderBottomWidth: thickness,
      borderLeftWidth: thickness,
      borderBottomLeftRadius: thickness,
    },
    br: {
      ...base,
      bottom: 0,
      right: 0,
      borderBottomWidth: thickness,
      borderRightWidth: thickness,
      borderBottomRightRadius: thickness,
    },
  };
  return <View style={styles[position]} pointerEvents="none" />;
}

export default function QRApp({ verifiedToken }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  const [selectedWallet, setSelectedWallet] = useState('all');

  const userProfile = useMemo(() => {
    if (verifiedToken) return parseJwt(verifiedToken);
    return null;
  }, [verifiedToken]);

  const accent = theme.text?.accent || '#C8AA6E';
  const plateSize = n(236);
  const qrSize = n(196);

  const qrData = useMemo(() => {
    if (!userProfile) return '';
    if (selectedWallet === 'all' && (userProfile.evm || userProfile.solana)) {
      return JSON.stringify({
        evm: userProfile.evm || '',
        solana: userProfile.solana || '',
      });
    }
    if (selectedWallet === 'evm' && userProfile.evm) return userProfile.evm;
    if (selectedWallet === 'solana' && userProfile.solana) return userProfile.solana;
    return '';
  }, [userProfile, selectedWallet]);

  // Always dark modules on a light plate — scans reliably and looks intentional on dark UI.
  const qrImageUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&ecc=M&color=111111&bgcolor=FFFFFF&data=${encodeURIComponent(qrData)}`
    : null;

  const caption =
    selectedWallet === 'all'
      ? 'EVM + Solana addresses packed in one scan'
      : selectedWallet === 'evm'
        ? 'Ethereum / EVM address only'
        : 'Solana address only';

  const chips = useMemo(() => {
    if (!userProfile) return [];
    if (selectedWallet === 'all') {
      return [
        userProfile.evm && { label: 'EVM', value: formatAddress(userProfile.evm) },
        userProfile.solana && { label: 'SOL', value: formatAddress(userProfile.solana) },
      ].filter(Boolean);
    }
    if (selectedWallet === 'evm' && userProfile.evm) {
      return [{ label: 'EVM', value: formatAddress(userProfile.evm) }];
    }
    if (selectedWallet === 'solana' && userProfile.solana) {
      return [{ label: 'SOL', value: formatAddress(userProfile.solana) }];
    }
    return [];
  }, [userProfile, selectedWallet]);

  const defaultFont = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });
  const monoFont = theme.typography?.fontFamilyCode || Platform.select({
    ios: 'Menlo',
    web: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    default: 'monospace',
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
      alignItems: 'stretch',
    },
    header: {
      marginBottom: n(28),
    },
    title: {
      fontSize: n(32),
      fontWeight: '800',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: n(15),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginTop: n(6),
      lineHeight: n(21),
    },
    stage: {
      backgroundColor: theme.bg.card,
      borderRadius: theme.shape?.cardRadius ?? n(28),
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
      paddingTop: n(18),
      paddingBottom: n(22),
      paddingHorizontal: n(18),
      alignItems: 'center',
      overflow: 'hidden',
      ...(theme.shadow?.card || {}),
    },
    stageGlow: {
      position: 'absolute',
      top: -n(40),
      width: n(180),
      height: n(180),
      borderRadius: n(90),
      backgroundColor: accent,
      opacity: theme.isDark ? 0.12 : 0.08,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(8),
      marginBottom: n(18),
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    avatar: {
      width: n(28),
      height: n(28),
      borderRadius: n(14),
      backgroundColor: theme.bg.nested || 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handle: {
      fontSize: n(15),
      fontWeight: '700',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.2,
    },
    selectorContainer: {
      flexDirection: 'row',
      backgroundColor: theme.bg.nested || 'rgba(255,255,255,0.06)',
      borderRadius: n(14),
      padding: n(4),
      marginBottom: n(22),
      borderWidth: 1,
      borderColor: theme.border.subtle,
      width: '100%',
    },
    selectorTab: {
      flex: 1,
      paddingVertical: n(10),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: n(10),
      flexDirection: 'row',
      gap: n(5),
    },
    selectorTabActive: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.bg.card,
      ...(theme.shadow?.sm || {}),
    },
    selectorText: {
      fontSize: n(12),
      fontWeight: '600',
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    selectorTextActive: {
      color: theme.text.primary,
      fontWeight: '700',
    },
    plateWrap: {
      width: plateSize + n(28),
      height: plateSize + n(28),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: n(18),
    },
    plate: {
      width: plateSize,
      height: plateSize,
      borderRadius: n(28),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: accent,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: theme.isDark ? 0.35 : 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    qrImage: {
      width: qrSize,
      height: qrSize,
    },
    plateEmpty: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: theme.border.subtle,
      shadowOpacity: 0,
      elevation: 0,
    },
    emptyInner: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: n(16),
      gap: n(10),
    },
    emptyText: {
      fontSize: n(13),
      color: theme.text.secondary,
      textAlign: 'center',
      fontFamily: theme.typography?.fontFamily || defaultFont,
      lineHeight: n(18),
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: n(8),
      marginBottom: n(14),
      maxWidth: '100%',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(6),
      paddingVertical: n(7),
      paddingHorizontal: n(11),
      borderRadius: n(999),
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    chipDot: {
      width: n(6),
      height: n(6),
      borderRadius: n(3),
      backgroundColor: accent,
    },
    chipLabel: {
      fontSize: n(10),
      fontWeight: '800',
      letterSpacing: 0.6,
      color: accent,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    chipValue: {
      fontSize: n(12),
      color: theme.text.primary,
      fontFamily: monoFont,
    },
    caption: {
      fontSize: n(13),
      color: theme.text.secondary,
      textAlign: 'center',
      fontFamily: theme.typography?.fontFamily || defaultFont,
      lineHeight: n(18),
      maxWidth: n(260),
    },
    signedOut: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: n(48),
      gap: n(14),
    },
    signedOutIconWrap: {
      width: n(72),
      height: n(72),
      borderRadius: n(24),
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: theme.border.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: n(4),
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
          <Text style={s.subtitle}>
            Present this code to share your connected wallets instantly.
          </Text>
        </View>

        <View style={s.stage}>
          <View style={s.stageGlow} pointerEvents="none" />

          {userProfile ? (
            <>
              <View style={s.identityRow}>
                <View style={s.avatar}>
                  <Ionicons
                    name="person"
                    size={n(14)}
                    color={theme.text.secondary}
                  />
                </View>
                <Text style={s.handle}>
                  @{userProfile.username || 'opendome'}
                </Text>
              </View>

              <View style={s.selectorContainer}>
                {TABS.map((tab) => {
                  const active = selectedWallet === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      style={[s.selectorTab, active && s.selectorTabActive]}
                      onPress={() => setSelectedWallet(tab.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={tab.icon}
                        size={n(13)}
                        color={active ? theme.text.primary : theme.text.secondary}
                      />
                      <Text
                        style={[
                          s.selectorText,
                          active && s.selectorTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={s.plateWrap}>
                <CornerMark position="tl" color={accent} size={plateSize + n(28)} />
                <CornerMark position="tr" color={accent} size={plateSize + n(28)} />
                <CornerMark position="bl" color={accent} size={plateSize + n(28)} />
                <CornerMark position="br" color={accent} size={plateSize + n(28)} />

                <View style={[s.plate, !qrImageUrl && s.plateEmpty]}>
                  {qrImageUrl ? (
                    <Image
                      source={{ uri: qrImageUrl }}
                      style={s.qrImage}
                      contentFit="contain"
                      transition={200}
                    />
                  ) : (
                    <View style={s.emptyInner}>
                      <Ionicons
                        name="qr-code-outline"
                        size={n(40)}
                        color={theme.text.secondary}
                      />
                      <Text style={s.emptyText}>
                        No {selectedWallet === 'all' ? 'wallet' : selectedWallet}{' '}
                        address linked yet.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {chips.length > 0 ? (
                <View style={s.chipRow}>
                  {chips.map((chip) => (
                    <View key={chip.label} style={s.chip}>
                      <View style={s.chipDot} />
                      <Text style={s.chipLabel}>{chip.label}</Text>
                      <Text style={s.chipValue}>{chip.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={s.caption}>{caption}</Text>
            </>
          ) : (
            <View style={s.signedOut}>
              <View style={s.signedOutIconWrap}>
                <Ionicons
                  name="qr-code-outline"
                  size={n(32)}
                  color={accent}
                />
              </View>
              <Text style={s.handle}>Sign in required</Text>
              <Text style={s.caption}>
                Connect your passkey to generate a scannable wallet QR.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
