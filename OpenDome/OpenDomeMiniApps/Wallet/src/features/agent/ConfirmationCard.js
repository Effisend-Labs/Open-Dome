import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function openUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

export function ConfirmationCard({ confirmation, tokens, t }) {
  if (!confirmation) return null;

  const explorer = confirmation.explorer || {};
  const mintTxUrl =
    explorer.mintTxUrl ||
    confirmation.mintTxUrl ||
    (confirmation.mintTxHash
      ? `https://basescan.org/tx/${confirmation.mintTxHash}`
      : confirmation.txHash
        ? `https://basescan.org/tx/${confirmation.txHash}`
        : null);
  const paymentTxUrl =
    explorer.paymentTxUrl ||
    confirmation.paymentTxUrl ||
    (confirmation.paymentTxHash
      ? `https://basescan.org/tx/${confirmation.paymentTxHash}`
      : null);
  const inventoryUrl =
    explorer.tokenInventoryUrl ||
    confirmation.tokenInventoryUrl ||
    (confirmation.toAddress && confirmation.contractAddress
      ? `https://basescan.org/token/${confirmation.contractAddress}?a=${String(confirmation.toAddress).toLowerCase()}`
      : confirmation.toAddress
        ? `https://basescan.org/token/0x40c39F091a7c85D10B8C46762b59Df3eCd77630C?a=${String(confirmation.toAddress).toLowerCase()}`
        : null);

  return (
    <View style={[styles.card, { backgroundColor: tokens.SUCCESS_SOFT, borderColor: tokens.SUCCESS }]}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={20} color={tokens.SUCCESS} />
        <Text style={[styles.title, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
          {t?.agent?.confirmed || 'All set — reservations confirmed'}
        </Text>
      </View>

      <Text style={[styles.orderId, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
        {confirmation.orderId}
      </Text>

      {confirmation.reservations?.map((r, i) => (
        <View key={`${r.title}-${i}`} style={styles.row}>
          <Text style={[styles.slot, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>{r.slot}</Text>
          <Text style={[styles.itemTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{r.title}</Text>
          <Text style={[styles.place, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>{r.placeName}</Text>
        </View>
      ))}

      {confirmation.passes?.length ? (
        <View style={[styles.mintBox, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
          <Text style={[styles.mintLabel, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
            {t?.agent?.passesMinted || 'NFTS MINTED'}
          </Text>
          {confirmation.passes.map((p) => (
            <Text key={p.tokenId} style={[styles.mintLine, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
              Token #{p.tokenId} × {p.amount}
              {p.status === 'minted' ? '' : ` (${p.status})`}
            </Text>
          ))}

          {paymentTxUrl ? (
            <Pressable onPress={() => openUrl(paymentTxUrl)} hitSlop={6}>
              <Text style={[styles.link, { color: tokens.MUTED, fontFamily: tokens.font.mono }]} numberOfLines={1}>
                View payment on BaseScan →
              </Text>
            </Pressable>
          ) : null}
          {mintTxUrl ? (
            <Pressable onPress={() => openUrl(mintTxUrl)} hitSlop={6}>
              <Text style={[styles.link, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]} numberOfLines={1}>
                View mint on BaseScan →
              </Text>
            </Pressable>
          ) : null}
          {inventoryUrl ? (
            <Pressable onPress={() => openUrl(inventoryUrl)} hitSlop={6}>
              <Text style={[styles.link, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]} numberOfLines={1}>
                View NFT inventory →
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderId: {
    fontSize: 11,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  row: {
    marginBottom: 10,
  },
  slot: {
    fontSize: 10,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  place: {
    fontSize: 12,
    marginTop: 2,
  },
  mintBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mintLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  mintLine: {
    fontSize: 12,
    marginBottom: 2,
  },
  link: {
    fontSize: 11,
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});
