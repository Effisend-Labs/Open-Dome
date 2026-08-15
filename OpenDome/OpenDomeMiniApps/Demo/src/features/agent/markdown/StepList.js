import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InlineText } from './InlineText';
import { parseInlines } from './parseMarkdown';

export function StepList({ tokens, items, color }) {
  const fg = color || tokens.FG;

  return (
    <View style={styles.list}>
      {(items || []).map((item, index) => (
        <View key={`${item.title}-${index}`} style={styles.row}>
          <View style={[styles.badge, { borderColor: tokens.NEON_PRIMARY }]}>
            <Text style={[styles.number, { color: tokens.NEON_PRIMARY, fontFamily: tokens.font.mono }]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.copy}>
            {item.title ? (
              <Text style={[styles.title, { color: fg, fontFamily: tokens.font.primary }]}>
                {item.title}
              </Text>
            ) : null}
            {item.body ? (
              <InlineText
                tokens={tokens}
                inlines={parseInlines(item.body)}
                color={item.title ? tokens.MUTED : fg}
                style={[
                  styles.body,
                  {
                    color: item.title ? tokens.MUTED : fg,
                    fontFamily: tokens.font.primary,
                  },
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
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  number: { fontSize: 10, fontWeight: '700' },
  copy: { flex: 1, paddingTop: 1 },
  title: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, marginBottom: 3 },
  body: { fontSize: 13, lineHeight: 20, letterSpacing: -0.1 },
});
