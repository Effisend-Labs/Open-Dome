import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseInlines } from './parseMarkdown';
import { InlineText } from './InlineText';

export function StepList({ tokens, items }) {
  const list = items || [];

  return (
    <View style={styles.wrap}>
      {list.map((item, index) => {
        const last = index === list.length - 1;
        return (
          <View key={`${item.title}-${index}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.badge, { backgroundColor: tokens.ACCENT_SOFT }]}>
                <Text style={[styles.num, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]}>
                  {index + 1}
                </Text>
              </View>
              {last ? null : <View style={[styles.line, { backgroundColor: tokens.BORDER }]} />}
            </View>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: tokens.SURFACE,
                  borderColor: tokens.BORDER,
                  marginBottom: last ? 0 : 8,
                },
              ]}
            >
              {item.title ? (
                <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                  {item.title}
                </Text>
              ) : null}
              {item.body ? (
                <InlineText
                  tokens={tokens}
                  inlines={parseInlines(item.body)}
                  style={[styles.body, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: 28, alignItems: 'center' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 11, fontWeight: '700' },
  line: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  card: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 20 },
});
