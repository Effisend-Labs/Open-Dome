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

  return (
    <View style={[styles.card, { backgroundColor: tokens.SUCCESS_SOFT, borderColor: tokens.SUCCESS }]}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={24} color={tokens.SUCCESS} />
        <Text style={[styles.title, { color: tokens.SUCCESS, fontFamily: tokens.font.primary }]}>
          {t?.agent?.confirmed || 'All set — reservations confirmed'}
        </Text>
      </View>

      <Text style={[styles.orderId, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
        {confirmation.orderId}
      </Text>

      {confirmation.reservations?.map((r, i) => (
        <View key={`${r.title}-${i}`} style={styles.row}>
          <Text style={[styles.slot, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>{r.slot}</Text>
          <Text style={[styles.itemTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{r.title}</Text>
          <Text style={[styles.place, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>{r.placeName}</Text>
        </View>
      ))}

      {confirmation.passes?.length ? (
        <View style={[styles.mintBox, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
          <Text style={[styles.mintLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            {t?.agent?.passesMinted || 'NFTs minted'}
          </Text>
          {confirmation.passes.map((p) => (
            <Text key={p.tokenId} style={[styles.mintLine, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              Token #{p.tokenId} × {p.amount}
              {p.status === 'minted' ? '' : ` (${p.status})`}
            </Text>
          ))}

          {mintTxUrl ? (
            <Pressable onPress={() => openUrl(mintTxUrl)} hitSlop={6}>
              <Text style={[styles.link, { color: tokens.ACCENT, fontFamily: tokens.font.primary }]} numberOfLines={1}>
                View mint on BaseScan →
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
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    flex: 1,
  },
  orderId: {
    fontSize: 15,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  row: {
    marginBottom: 14,
  },
  slot: {
    fontSize: 13,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  place: {
    fontSize: 14,
    marginTop: 3,
  },
  mintBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mintLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  mintLine: {
    fontSize: 15,
    marginBottom: 4,
  },
  link: {
    fontSize: 15,
    marginTop: 10,
    fontWeight: '600',
  },
});
