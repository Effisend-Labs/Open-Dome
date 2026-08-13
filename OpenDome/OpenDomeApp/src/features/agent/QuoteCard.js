import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { withUsdc } from './dayPlanCopy';

function formatItemUsd(amount) {
  if (amount > 0 && amount < 0.01) return amount.toFixed(4);
  return amount.toFixed(2);
}

export function QuoteCard({ quote, tokens, onSign, t, ctaLabel }) {
  if (!quote?.lineItems?.length) return null;

  return (
    <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <View style={[styles.badge, { backgroundColor: tokens.USDC_SOFT }]}>
        <Text style={[styles.badgeText, { color: tokens.USDC, fontFamily: tokens.font.mono }]}>
          {quote.testPricing
            ? (t?.agent?.quoteTestBadge || 'TEST QUOTE · $0.001/NFT')
            : (t?.agent?.quoteBadge || 'CHECKOUT QUOTE')}
        </Text>
      </View>

      {quote.lineItems.map((item) => (
        <View key={item.id} style={[styles.row, { borderBottomColor: tokens.BORDER }]}>
          <View style={styles.rowMain}>
            <Text style={[styles.itemTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {item.title}
            </Text>
            <Text style={[styles.itemSub, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {item.subtitle}
            </Text>
          </View>
          <Text style={[styles.price, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
            ${formatItemUsd(item.totalUsd)} USDC
          </Text>
        </View>
      ))}

      <View style={[styles.totalRow, { borderTopColor: tokens.BORDER }]}>
        <Text style={[styles.totalLabel, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          Total
        </Text>
        <Text style={[styles.totalValue, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
          {withUsdc(quote.totalLabel)}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onSign}
        style={[styles.cta, { backgroundColor: tokens.FG }]}
      >
        <Ionicons name="finger-print-outline" size={16} color={tokens.BG} />
        <Text style={[styles.ctaText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
          {ctaLabel || t?.agent?.signAndPay || 'Sign & pay'}
        </Text>
      </TouchableOpacity>
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowMain: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
