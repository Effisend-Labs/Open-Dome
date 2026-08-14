import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { USE_NATIVE_DRIVER } from '../../utils/styleCompat';

const SOLANA_RPC = 'https://public.rpc.solanavibestation.com';
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const EXPLORER_TX = 'https://solscan.io/tx/';

/**
 * Parses a Solana Pay URL.
 * Spec: solana:<RECIPIENT>?amount=<N>&spl-token=<MINT>&reference=<REF>
 */
export function parseSolanaPayUrl(url) {
  try {
    const withoutScheme = String(url || '').replace(/^solana:/i, '');
    const [recipientPart, queryString = ''] = withoutScheme.split('?');
    const recipient = recipientPart.split('&')[0];
    const params = {};
    queryString.split('&').forEach((part) => {
      if (!part) return;
      const eq = part.indexOf('=');
      if (eq < 0) return;
      params[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
    });
    return {
      recipient,
      amount: params.amount || '0.00',
      splToken: params['spl-token'] || null,
      reference: params.reference || null,
      label: params.label || null,
      message: params.message || null,
    };
  } catch {
    return {
      recipient: null,
      amount: '0.00',
      splToken: null,
      reference: null,
      label: null,
      message: null,
    };
  }
}

async function fetchLatestSignature(reference) {
  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [reference, { limit: 1 }],
    }),
  });
  const json = await response.json();
  return json?.result?.[0]?.signature || null;
}

/**
 * Effisend-style Solana Pay QR + confirmation poll, styled for OpenDome Wallet cards.
 */
export function SolanaPayQrCard({ paymentUrl, reference: referenceProp, tokens }) {
  const parsed = parseSolanaPayUrl(paymentUrl);
  const reference = referenceProp || parsed.reference;
  const [status, setStatus] = useState(reference ? 'pending' : 'error');
  const [txSig, setTxSig] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const amount = parsed.amount;
  const isUsdc = !parsed.splToken || parsed.splToken === SOLANA_USDC_MINT;
  const qrUri = paymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentUrl)}`
    : null;

  useEffect(() => {
    if (!reference || status !== 'pending') return undefined;
    let cancelled = false;
    let timer;

    const tick = async () => {
      try {
        const sig = await fetchLatestSignature(reference);
        if (!cancelled && sig) {
          setTxSig(sig);
          setStatus('success');
        }
      } catch {
        // retry next interval
      }
    };

    tick();
    timer = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reference, status]);

  useEffect(() => {
    if (status !== 'success') return;
    Animated.spring(fadeAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [status, fadeAnim]);

  if (!paymentUrl) return null;

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: tokens.USDC_SOFT }]}>
          <Text style={[styles.badgeText, { color: tokens.USDC, fontFamily: tokens.font.mono }]}>
            SOLANA PAY
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
            {amount}
          </Text>
          <Text style={[styles.token, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            {isUsdc ? 'USDC' : 'TOKEN'}
          </Text>
        </View>
      </View>

      {parsed.message ? (
        <Text style={[styles.message, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {parsed.message}
        </Text>
      ) : null}

      <View style={styles.stage}>
        {status !== 'success' ? (
          <View style={styles.center}>
            {qrUri ? (
              <View style={[styles.qrWrap, { borderColor: tokens.BORDER, backgroundColor: '#FFFFFF' }]}>
                <Image source={{ uri: qrUri }} style={styles.qr} />
              </View>
            ) : null}
            <View style={styles.statusRow}>
              {status === 'pending' ? (
                <ActivityIndicator size="small" color={tokens.ACCENT} />
              ) : (
                <Ionicons name="alert-circle-outline" size={16} color={tokens.DANGER} />
              )}
              <Text
                style={[
                  styles.statusText,
                  {
                    color: status === 'error' ? tokens.DANGER : tokens.MUTED,
                    fontFamily: tokens.font.primary,
                  },
                ]}
              >
                {status === 'error'
                  ? 'Missing payment reference'
                  : 'Awaiting on-chain confirmation…'}
              </Text>
            </View>
            <Text style={[styles.hint, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              Scan with Phantom to pay Solana USDC
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.center,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={72} color={tokens.SUCCESS} />
            <Text style={[styles.successTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              Payment confirmed
            </Text>
            {txSig ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => Linking.openURL(`${EXPLORER_TX}${txSig}`).catch(() => {})}
                style={styles.explorerBtn}
              >
                <Text style={[styles.explorerText, { color: tokens.ACCENT, fontFamily: tokens.font.primary }]}>
                  View on Explorer
                </Text>
                <Ionicons name="open-outline" size={14} color={tokens.ACCENT} />
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  amount: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  token: {
    fontSize: 13,
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  stage: {
    minHeight: 220,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrWrap: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  qr: {
    width: 180,
    height: 180,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
  },
  successTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  explorerBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explorerText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
