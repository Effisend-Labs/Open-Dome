import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseInlines, parseMarkdown } from './parseMarkdown';
import { InlineText } from './InlineText';
import { StepList } from './StepList';

const HEADING_SIZE = { 1: 22, 2: 18, 3: 16 };

function splitLead(inlines) {
  const first = inlines?.[0];
  if (first?.type !== 'bold') return null;
  const lead = String(first.text || '').replace(/:$/, '').trim();
  if (!lead || lead.length > 28) return null;
  const rest = inlines.slice(1);
  const next = rest[0]?.type === 'text' ? rest[0].text : '';
  if (!/^\s+(is|are|lets|means|—|–)\b/i.test(next)) return null;
  const trimmed =
    rest[0]?.type === 'text'
      ? [{ ...rest[0], text: rest[0].text.replace(/^\s+/, '') }, ...rest.slice(1)]
      : rest;
  return { lead, inlines: trimmed };
}

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

  const lead = splitLead(block.inlines);
  const paraStyle = [styles.paragraph, { color: tokens.FG, fontFamily: tokens.font.primary }];
  if (!lead) {
    return <InlineText tokens={tokens} inlines={block.inlines} style={paraStyle} />;
  }

  return (
    <View>
      <View style={[styles.leadChip, { backgroundColor: tokens.ACCENT_SOFT }]}>
        <Text style={[styles.leadText, { color: tokens.ACCENT, fontFamily: tokens.font.mono }]}>
          {lead.lead}
        </Text>
      </View>
      {lead.inlines.length ? (
        <InlineText tokens={tokens} inlines={lead.inlines} style={paraStyle} />
      ) : null}
    </View>
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
  leadChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  leadText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
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
