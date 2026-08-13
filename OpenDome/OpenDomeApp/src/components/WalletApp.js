import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSmartSize } from '../providers/smartProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useNFTScanner } from '../hooks/useNFTScanner';
import { fallbackCoverForEvent } from '../features/agent/eventCover';

/** Tokyo Dome thumbs are 752×564 with ~31px white letterbox baked in. */
const THUMB_CROP_ZOOM = 564 / (564 - 31 - 32);

function ensurePassCoverCss() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('od-pass-cover-css-v5')) return;
  const style = document.createElement('style');
  style.id = 'od-pass-cover-css-v5';
  style.textContent = `
    .od-pass-cover {
      overflow: hidden !important;
      position: relative !important;
      background: #111 !important;
    }
    .od-pass-cover--fill {
      width: 100% !important;
      aspect-ratio: 1 / 1 !important;
    }
    .od-pass-cover--cover {
      width: 100% !important;
      height: 100% !important;
      aspect-ratio: auto !important;
      position: absolute !important;
      inset: 0 !important;
    }
    .od-pass-cover > img {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      object-position: center !important;
      transform: translate(-50%, -50%) scale(${THUMB_CROP_ZOOM}) !important;
      transform-origin: center center !important;
      max-width: none !important;
      max-height: none !important;
    }
  `;
  document.head.appendChild(style);
}

/** Pass art — web uses raw img + zoom to crop baked-in JPEG letterbox. */
function PassCoverImage({ uri, style, variant = 'square' }) {
  const [side, setSide] = useState(0);
  const cover = variant === 'cover';

  useEffect(() => {
    ensurePassCoverCss();
  }, []);

  const box = cover
    ? { width: '100%', height: '100%' }
    : { width: '100%', aspectRatio: 1 };

  if (!uri) {
    return <View style={[{ backgroundColor: '#111' }, box, style]} />;
  }

  if (Platform.OS === 'web') {
    const className = cover
      ? 'od-pass-cover od-pass-cover--cover'
      : 'od-pass-cover od-pass-cover--fill';
    return React.createElement(
      'div',
      {
        className,
        style: { ...(style ? StyleSheet.flatten(style) : {}) },
      },
      React.createElement('img', {
        src: String(uri),
        alt: '',
        draggable: false,
        loading: 'lazy',
        decoding: 'async',
      })
    );
  }

  return (
    <View
      style={[
        {
          overflow: 'hidden',
          backgroundColor: '#111',
          alignItems: 'center',
          justifyContent: 'center',
        },
        box,
        style,
      ]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== side) setSide(w);
      }}
    >
      {side > 0 ? (
        <Image
          source={{ uri }}
          style={{
            width: side * THUMB_CROP_ZOOM,
            height: side * THUMB_CROP_ZOOM,
          }}
          contentFit="cover"
          contentPosition="center"
        />
      ) : null}
    </View>
  );
}

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
  } catch (e) {
    return null;
  }
};

function passSubtitle(nft) {
  if (nft?.description) return nft.description;
  if (nft?.network && !/server bridge/i.test(String(nft.network))) {
    return nft.network;
  }
  return nft?.chain || 'Base';
}

function PassArt({ nft, theme, n, variant = 'square' }) {
  const cover = variant === 'cover';
  const box = cover
    ? { width: '100%', height: '100%' }
    : { width: '100%', aspectRatio: 1 };

  if (nft?.image) {
    return <PassCoverImage uri={String(nft.image)} variant={variant} />;
  }
  const fallback = fallbackCoverForEvent({
    category: nft?.category,
    placeName: nft?.placeName,
  });
  if (fallback) {
    return <Image source={fallback} style={box} contentFit="cover" />;
  }
  return (
    <View
      style={[
        box,
        { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
      ]}
    >
      <Ionicons name="ticket-outline" size={n(24)} color={theme.text.secondary} />
    </View>
  );
}

/** Dock footprint — keep in sync with main.js dockWrapper + dock padding. */
const dockFootprint = (n) => n(24) + n(32) + n(44);
/** Extra scroll clearance for the passes list (dock + breathing room). */
const dockClearance = (n) => dockFootprint(n) + n(20);

export default function WalletApp({ verifiedToken }) {
  const { normalize: n } = useSmartSize();
  const { colors: theme } = useTheme();
  const [selected, setSelected] = useState(null);

  const dockBand = dockClearance(n);
  const overlayBottom = dockFootprint(n);

  const userProfile = useMemo(() => {
    if (verifiedToken) return parseJwt(verifiedToken);
    return null;
  }, [verifiedToken]);

  const scanAddress =
    userProfile?.evm || userProfile?.evmAddress || userProfile?.address || null;
  const { nfts, isScanning } = useNFTScanner(scanAddress);

  const defaultFont = Platform.select({
    ios: 'System',
    web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    default: 'sans-serif',
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent', position: 'relative' },
    scrollContent: {
      padding: n(24),
      paddingTop: n(40),
      paddingBottom: dockBand,
    },
    header: { marginBottom: n(24) },
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
    nftImageSlot: {
      position: 'relative',
      width: '100%',
      aspectRatio: 4 / 3,
      overflow: 'hidden',
      backgroundColor: '#111',
    },
    nftInfo: { padding: n(12) },
    nftName: {
      fontSize: n(14),
      fontWeight: '600',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      marginBottom: n(4),
    },
    nftMeta: {
      fontSize: n(12),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    openHint: {
      marginTop: n(8),
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(4),
    },
    openHintText: {
      fontSize: n(11),
      fontWeight: '600',
      color: theme.text.primary,
      opacity: 0.7,
    },
    amountBadge: {
      position: 'absolute',
      top: n(8),
      right: n(8),
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingHorizontal: n(8),
      paddingVertical: n(4),
      borderRadius: n(12),
      zIndex: 2,
    },
    amountText: { color: '#fff', fontSize: n(12), fontWeight: 'bold' },
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
    },
    // Content band only — island is above WalletApp; dock floats below this inset.
    overlayHost: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: overlayBottom,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: '2%',
      zIndex: 50,
    },
    overlayBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.62)',
    },
    sheet: {
      backgroundColor: theme.bg.card,
      borderRadius: n(22),
      width: '96%',
      maxWidth: '96%',
      overflow: 'hidden',
      borderWidth: theme.border?.width ?? 1,
      borderColor: theme.border.default,
      ...(theme.shadow?.card || {}),
    },
    imageSection: {
      width: '100%',
      paddingHorizontal: '5%',
      paddingTop: '3%',
      alignItems: 'center',
    },
    imageWrap: {
      width: '68%',
      maxWidth: n(220),
      aspectRatio: 1,
      borderRadius: n(16),
      overflow: 'hidden',
      backgroundColor: '#111',
    },
    imageFallback: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111',
    },
    closeBtn: {
      position: 'absolute',
      top: n(10),
      right: n(10),
      width: n(30),
      height: n(30),
      borderRadius: n(15),
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    body: { paddingHorizontal: '5%', paddingTop: '3%', paddingBottom: '4%' },
    sheetTitle: {
      fontSize: n(17),
      fontWeight: '800',
      color: theme.text.primary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
      letterSpacing: -0.3,
      paddingRight: n(28),
      lineHeight: n(21),
    },
    sheetDesc: {
      marginTop: n(5),
      fontSize: n(13),
      lineHeight: n(18),
      color: theme.text.secondary,
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    amountPill: {
      alignSelf: 'flex-start',
      marginTop: n(8),
      paddingHorizontal: n(10),
      paddingVertical: n(5),
      borderRadius: n(999),
      backgroundColor: theme.bg.elevated || 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.border.default,
    },
    amountPillText: {
      color: theme.text.primary,
      fontSize: n(12),
      fontWeight: '700',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    metaBox: {
      marginTop: n(10),
      padding: n(12),
      borderRadius: n(14),
      backgroundColor: theme.bg.elevated || theme.bg.card,
      borderWidth: 1,
      borderColor: theme.border.default,
      gap: n(5),
    },
    kv: { flexDirection: 'row', justifyContent: 'space-between', gap: n(8) },
    k: {
      color: theme.text.secondary,
      fontSize: n(12),
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    v: {
      color: theme.text.primary,
      fontSize: n(12),
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
    explorerLinks: {
      marginTop: n(12),
      gap: n(8),
    },
    explorerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: n(10),
      paddingHorizontal: n(12),
      borderRadius: n(12),
      borderWidth: 1,
      borderColor: theme.border.default,
      backgroundColor: theme.bg.elevated || theme.bg.card,
    },
    explorerLinkText: {
      color: theme.text.primary,
      fontSize: n(13),
      fontWeight: '600',
      fontFamily: theme.typography?.fontFamily || defaultFont,
    },
  });

  const renderAmount = (nft) =>
    nft.amount > 1 ? (
      <View style={s.amountBadge}>
        <Text style={s.amountText}>x{nft.amount}</Text>
      </View>
    ) : null;

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
                <Text style={s.loadingText}>Loading your passes…</Text>
              </View>
            )}

            {!isScanning && nfts.length === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="ticket-outline" size={n(48)} color={theme.text.secondary} />
                <Text style={s.infoText}>No passes found yet.</Text>
              </View>
            )}

            {nfts.length > 0 && (
              <View style={s.nftGrid}>
                {nfts.map((nft, idx) => (
                  <Pressable
                    key={`${nft.contractAddress || 'pass'}-${nft.tokenId}-${idx}`}
                    style={({ pressed }) => [s.nftCard, pressed && { opacity: 0.88 }]}
                    onPress={() => setSelected(nft)}
                  >
                    <View style={s.nftImageSlot}>
                      <PassArt nft={nft} theme={theme} n={n} variant="cover" />
                      {renderAmount(nft)}
                    </View>
                    <View style={s.nftInfo}>
                      <Text style={s.nftName} numberOfLines={1}>
                        {nft.name || 'Unnamed Pass'}
                      </Text>
                      <Text style={s.nftMeta} numberOfLines={2}>
                        {passSubtitle(nft)}
                      </Text>
                      <View style={s.openHint}>
                        <Text style={s.openHintText}>Open</Text>
                        <Ionicons name="chevron-forward" size={n(12)} color={theme.text.primary} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {selected ? (
        <View style={s.overlayHost} pointerEvents="box-none">
          <Pressable style={s.overlayBackdrop} onPress={() => setSelected(null)} />
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={s.imageSection}>
              <View style={s.imageWrap}>
                <Pressable style={s.closeBtn} onPress={() => setSelected(null)} hitSlop={10}>
                  <Ionicons name="close" size={n(16)} color="#fff" />
                </Pressable>
                <PassArt nft={selected} theme={theme} n={n} variant="cover" />
              </View>
            </View>
            <View style={s.body}>
              <Text style={s.sheetTitle} numberOfLines={2}>
                {selected?.name || 'Pass'}
              </Text>
              {selected?.description ? (
                <Text style={s.sheetDesc} numberOfLines={1}>
                  {selected.description}
                </Text>
              ) : null}
              <View style={s.amountPill}>
                <Text style={s.amountPillText}>
                  {selected?.amount > 1
                    ? `${selected.amount} uses remaining`
                    : '1 use remaining'}
                </Text>
              </View>

              <View style={s.metaBox}>
                <View style={s.kv}>
                  <Text style={s.k}>Token ID</Text>
                  <Text style={s.v}>{selected?.tokenId ?? '—'}</Text>
                </View>
                <View style={s.kv}>
                  <Text style={s.k}>Network</Text>
                  <Text style={s.v}>{selected?.chain || 'Base'}</Text>
                </View>
                {(selected?.attributes || []).map((attr) => (
                  <View key={`${attr.trait_type}-${attr.value}`} style={s.kv}>
                    <Text style={s.k}>{attr.trait_type}</Text>
                    <Text style={s.v}>{attr.value}</Text>
                  </View>
                ))}
              </View>

              {(selected?.mintTxUrl ||
                selected?.explorer?.mintTxUrl ||
                selected?.tokenInventoryUrl ||
                selected?.explorer?.tokenInventoryUrl) && (
                <View style={s.explorerLinks}>
                  {(selected.mintTxUrl || selected.explorer?.mintTxUrl) && (
                    <Pressable
                      style={s.explorerLink}
                      onPress={() =>
                        Linking.openURL(
                          selected.mintTxUrl || selected.explorer.mintTxUrl,
                        ).catch(() => {})
                      }
                    >
                      <Text style={s.explorerLinkText}>Mint on BaseScan</Text>
                      <Ionicons
                        name="open-outline"
                        size={n(14)}
                        color={theme.text.primary}
                      />
                    </Pressable>
                  )}
                  {(selected.tokenInventoryUrl ||
                    selected.explorer?.tokenInventoryUrl) && (
                    <Pressable
                      style={s.explorerLink}
                      onPress={() =>
                        Linking.openURL(
                          selected.tokenInventoryUrl ||
                            selected.explorer.tokenInventoryUrl,
                        ).catch(() => {})
                      }
                    >
                      <Text style={s.explorerLinkText}>NFT inventory</Text>
                      <Ionicons
                        name="open-outline"
                        size={n(14)}
                        color={theme.text.primary}
                      />
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
