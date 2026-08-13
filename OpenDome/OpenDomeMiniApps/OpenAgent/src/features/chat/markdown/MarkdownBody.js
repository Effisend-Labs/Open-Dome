import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseInlines, parseMarkdown } from './parseMarkdown';
import { InlineText } from './InlineText';
import { StepList } from './StepList';

const HEADING_SIZE = { 1: 20, 2: 17, 3: 15 };

function Block({ tokens, block }) {
  if (block.type === 'heading') {
    const size = HEADING_SIZE[block.level] || 15;
    return (
      <InlineText
        tokens={tokens}
        inlines={block.inlines}
        style={[
          styles.heading,
          {
            fontSize: size,
            lineHeight: size + 6,
            color: tokens.FG,
            fontFamily: tokens.font.primary,
          },
        ]}
      />
    );
  }

  if (block.type === 'steps') {
    return <StepList tokens={tokens} items={block.items} />;
  }

  if (block.type === 'bullets') {
    return (
      <View style={styles.bullets}>
        {block.items.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: tokens.ACCENT }]} />
            <InlineText
              tokens={tokens}
              inlines={parseInlines(item)}
              style={[styles.bulletText, { color: tokens.FG, fontFamily: tokens.font.primary }]}
            />
          </View>
        ))}
      </View>
    );
  }

  if (block.type === 'code') {
    return (
      <View style={[styles.code, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
        {block.lang ? (
          <Text style={[styles.lang, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
            {block.lang}
          </Text>
        ) : null}
        <Text style={[styles.codeText, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
          {block.text}
        </Text>
      </View>
    );
  }

  if (block.type === 'hr') {
    return <View style={[styles.hr, { backgroundColor: tokens.BORDER }]} />;
  }

  return (
    <InlineText
      tokens={tokens}
      inlines={block.inlines}
      style={[styles.paragraph, { color: tokens.FG, fontFamily: tokens.font.primary }]}
    />
  );
}

export function MarkdownBody({ tokens, text }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  return (
    <View style={styles.stack}>
      {blocks.map((block, i) => (
        <Block key={`${block.type}-${i}`} tokens={tokens} block={block} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  heading: { fontWeight: '600', letterSpacing: -0.3, marginTop: 6 },
  paragraph: { fontSize: 16, lineHeight: 23, letterSpacing: -0.15 },
  bullets: { gap: 8, paddingLeft: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
  code: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lang: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  codeText: { fontSize: 13, lineHeight: 18 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
});
