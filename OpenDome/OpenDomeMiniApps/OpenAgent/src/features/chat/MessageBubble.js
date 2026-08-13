import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openBaseScan, txExplorerUrl } from '../explorer/baseScan';

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
        <Text
          style={[
            styles.body,
            { color: isSystem ? tokens.DANGER : tokens.FG, fontFamily: tokens.font.primary },
          ]}
        >
          {msg.content}
        </Text>
        {msg.role === 'agent' && (msg.costLabel || explorer) ? (
          <Pressable
            onPress={() => explorer && openBaseScan(explorer)}
            disabled={!explorer}
            style={styles.receipt}
          >
            <Text style={[styles.meta, { color: tokens.MUTED }]}>
              {msg.costLabel ? `Paid ${msg.costLabel}` : 'Paid on Base'}
            </Text>
            {explorer ? (
              <Ionicons name="open-outline" size={12} color={tokens.MUTED} />
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 18, alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  agent: { maxWidth: '92%', paddingRight: 12 },
  body: { fontSize: 16, lineHeight: 23, letterSpacing: -0.15 },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  meta: { fontSize: 12 },
});
