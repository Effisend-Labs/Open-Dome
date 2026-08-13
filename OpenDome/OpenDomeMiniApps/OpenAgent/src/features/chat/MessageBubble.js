import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openBaseScan, txExplorerUrl } from '../explorer/baseScan';
import { MarkdownBody } from './markdown/MarkdownBody';

function PaymentReceipt({ tokens, label, explorer }) {
  return (
    <Pressable
      onPress={() => explorer && openBaseScan(explorer)}
      disabled={!explorer}
      style={[styles.receipt, { backgroundColor: tokens.USDC_SOFT }]}
    >
      <Ionicons name="checkmark-circle" size={14} color={tokens.SUCCESS} />
      <Text style={[styles.receiptText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
        {label ? `Paid ${label}` : 'Paid on Base'}
      </Text>
      {explorer ? <Ionicons name="open-outline" size={12} color={tokens.MUTED} /> : null}
    </Pressable>
  );
}

export function MessageBubble({ tokens, msg }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const explorer = msg.explorerUrl || txExplorerUrl(msg.paymentTxHash);

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View
        style={[
          isUser && [styles.bubble, { backgroundColor: tokens.SURFACE }],
          isSystem && [styles.bubble, { backgroundColor: tokens.DANGER_SOFT }],
          !isUser && !isSystem && styles.agent,
        ]}
      >
        {isUser || isSystem ? (
          <Text
            style={[
              styles.body,
              { color: isSystem ? tokens.DANGER : tokens.FG, fontFamily: tokens.font.primary },
            ]}
          >
            {msg.content}
          </Text>
        ) : (
          <MarkdownBody tokens={tokens} text={msg.content} />
        )}
        {msg.role === 'agent' && (msg.costLabel || explorer) ? (
          <PaymentReceipt tokens={tokens} label={msg.costLabel} explorer={explorer} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 18, alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  agent: { maxWidth: '100%', paddingRight: 4 },
  body: { fontSize: 16, lineHeight: 23, letterSpacing: -0.15 },
  receipt: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  receiptText: { fontSize: 12, fontWeight: '500' },
});
