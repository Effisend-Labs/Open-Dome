import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';

function openLink(href) {
  const value = String(href || '').trim();
  if (!/^https?:\/\//i.test(value)) return;
  Linking.openURL(value).catch(() => {});
}

export function InlineText({ tokens, inlines, style }) {
  return (
    <Text style={style}>
      {(inlines || []).map((part, index) => {
        if (part.type === 'bold') {
          return (
            <Text key={index} style={[styles.bold, { color: tokens.FG }]}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'italic') {
          return (
            <Text key={index} style={styles.italic}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'link') {
          return (
            <Text
              key={index}
              accessibilityRole="link"
              onPress={() => openLink(part.href)}
              style={[styles.link, { color: tokens.ACCENT }]}
            >
              {part.text}
            </Text>
          );
        }
        if (part.type === 'code') {
          return (
            <Text
              key={index}
              style={[
                styles.code,
                {
                  color: tokens.FG,
                  backgroundColor: tokens.SURFACE_ELEVATED,
                  fontFamily: tokens.font.mono,
                },
              ]}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={index}>{part.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { fontWeight: '600', textDecorationLine: 'underline' },
  code: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
});
