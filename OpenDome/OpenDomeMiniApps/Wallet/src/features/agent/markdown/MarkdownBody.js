import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InlineText } from './InlineText';
import { parseInlines, parseMarkdown } from './parseMarkdown';
import { StepList } from './StepList';

const HEADING_SIZE = { 1: 22, 2: 18, 3: 16 };

function MarkdownBlock({ tokens, block }) {
  if (block.type === 'heading') {
    const size = HEADING_SIZE[block.level] || 15;
    return (
      <InlineText
        tokens={tokens}
        inlines={block.inlines}
        style={[
          styles.heading,
          { color: tokens.FG, fontFamily: tokens.font.primary, fontSize: size, lineHeight: size + 6 },
        ]}
      />
    );
  }

  if (block.type === 'steps') {
    return <StepList tokens={tokens} items={block.items} />;
  }

  if (block.type === 'bullets') {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={index} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: tokens.ACCENT }]} />
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
      <View style={[styles.codeBlock, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
        {block.lang ? (
          <Text style={[styles.language, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
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
    return <View style={[styles.rule, { backgroundColor: tokens.BORDER }]} />;
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
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${block.type}-${index}`} tokens={tokens} block={block} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  heading: { fontWeight: '700', letterSpacing: -0.3, marginTop: 4 },
  paragraph: { fontSize: 15, lineHeight: 24, letterSpacing: -0.2 },
  list: { gap: 8, paddingLeft: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
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
