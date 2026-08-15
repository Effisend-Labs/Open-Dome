import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InlineText } from './InlineText';
import { parseInlines, parseMarkdown } from './parseMarkdown';
import { StepList } from './StepList';

const HEADING_SIZE = { 1: 18, 2: 16, 3: 15 };

function MarkdownBlock({ tokens, block, color }) {
  const fg = color || tokens.FG;

  if (block.type === 'heading') {
    const size = HEADING_SIZE[block.level] || 15;
    return (
      <InlineText
        tokens={tokens}
        inlines={block.inlines}
        color={fg}
        style={[
          styles.heading,
          { color: fg, fontFamily: tokens.font.primary, fontSize: size, lineHeight: size + 6 },
        ]}
      />
    );
  }

  if (block.type === 'steps') {
    return <StepList tokens={tokens} items={block.items} color={fg} />;
  }

  if (block.type === 'bullets') {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={index} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: tokens.NEON_PRIMARY }]} />
            <InlineText
              tokens={tokens}
              inlines={parseInlines(item)}
              color={fg}
              style={[styles.bulletText, { color: fg, fontFamily: tokens.font.primary }]}
            />
          </View>
        ))}
      </View>
    );
  }

  if (block.type === 'code') {
    return (
      <View style={[styles.codeBlock, { backgroundColor: tokens.BG, borderColor: tokens.BORDER }]}>
        {block.lang ? (
          <Text style={[styles.language, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
            {block.lang}
          </Text>
        ) : null}
        <Text style={[styles.codeText, { color: fg, fontFamily: tokens.font.mono }]}>
          {block.text}
        </Text>
      </View>
    );
  }

  if (block.type === 'hr') {
    return <View style={[styles.rule, { backgroundColor: tokens.BORDER }]} />;
  }

  return (
    <InlineText
      tokens={tokens}
      inlines={block.inlines}
      color={fg}
      style={[styles.paragraph, { color: fg, fontFamily: tokens.font.primary }]}
    />
  );
}

export function MarkdownBody({ tokens, text, color }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${block.type}-${index}`} tokens={tokens} block={block} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  heading: { fontWeight: '700', letterSpacing: -0.3 },
  paragraph: { fontSize: 14, lineHeight: 22, letterSpacing: -0.15 },
  list: { gap: 8, paddingLeft: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22 },
  codeBlock: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  language: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  codeText: { fontSize: 13, lineHeight: 18 },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
