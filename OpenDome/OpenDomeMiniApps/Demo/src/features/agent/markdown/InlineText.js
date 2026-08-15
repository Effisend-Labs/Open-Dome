import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';

function openLink(href) {
  const value = String(href || '').trim();
  if (!/^https?:\/\//i.test(value)) return;
  Linking.openURL(value).catch(() => {});
}

export function InlineText({ tokens, inlines, style, color }) {
  const fg = color || tokens.FG;

  return (
    <Text style={style} selectable>
      {(inlines || []).map((part, index) => {
        if (part.type === 'bold') {
          return (
            <Text key={index} style={[styles.bold, { color: fg }]}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'italic') {
          return (
            <Text key={index} style={[styles.italic, { color: fg }]}>
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
              style={[styles.link, { color: tokens.NEON_PRIMARY }]}
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
                  color: fg,
                  backgroundColor: tokens.BG,
                  fontFamily: tokens.font.mono,
                },
              ]}
            >
              {part.text}
            </Text>
          );
        }
        return (
          <Text key={index} style={{ color: fg }}>
            {part.text}
          </Text>
        );
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
