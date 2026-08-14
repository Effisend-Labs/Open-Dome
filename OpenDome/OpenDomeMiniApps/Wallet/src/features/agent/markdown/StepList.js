import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InlineText } from './InlineText';
import { parseInlines } from './parseMarkdown';

export function StepList({ tokens, items }) {
  return (
    <View style={styles.list}>
      {(items || []).map((item, index) => (
        <View key={`${item.title}-${index}`} style={styles.row}>
          <View style={[styles.badge, { backgroundColor: tokens.ACCENT_SOFT }]}>
            <Text style={[styles.number, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]}>
              {index + 1}
            </Text>
          </View>
          <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
            {item.title ? (
              <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                {item.title}
              </Text>
            ) : null}
            {item.body ? (
              <InlineText
                tokens={tokens}
                inlines={parseInlines(item.body)}
                style={[
                  styles.body,
                  { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary },
                ]}
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  number: { fontSize: 11, fontWeight: '700' },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 20 },
});
