import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { openBaseScan } from '../../explorer/baseScan';

function codeKind(text) {
  const value = String(text || '').trim();
  if (/^(HTTP\s*)?\d{3}(\b.*)?$/i.test(value) && /\b402\b/.test(value)) return 'status';
  if (/^\$?\d[\d.]*\s*USDC/i.test(value)) return 'amount';
  return 'code';
}

export function InlineText({ tokens, inlines, style }) {
  return (
    <Text style={style}>
      {(inlines || []).map((part, i) => {
        if (part.type === 'bold') {
          return (
            <Text key={i} style={[styles.bold, { color: tokens.FG }]}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'italic') {
          return (
            <Text key={i} style={styles.italic}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'link') {
          return (
            <Text
              key={i}
              onPress={() => openBaseScan(part.href)}
              style={[styles.link, { color: tokens.ACCENT }]}
            >
              {part.text}
            </Text>
          );
        }
        if (part.type === 'code') {
          const kind = codeKind(part.text);
          const chip =
            kind === 'status'
              ? { color: tokens.DANGER, backgroundColor: tokens.DANGER_SOFT }
              : kind === 'amount'
                ? { color: tokens.USDC, backgroundColor: tokens.USDC_SOFT }
                : { color: tokens.FG, backgroundColor: tokens.SURFACE_ELEVATED };
          return (
            <Text
              key={i}
              style={[styles.code, chip, { fontFamily: tokens.font.mono }]}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={i}>{part.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '600' },
  italic: { fontStyle: 'italic' },
  link: { fontWeight: '600' },
  code: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
});
