import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isDarkTheme, onPrimaryColor } from '../../theme';
import { agentReplyText } from './agentReplyText';
import { MarkdownBody } from './markdown/MarkdownBody';
import { TypingDots } from './TypingDots';

function agentBubbleBg(tokens, theme) {
  const name = String(theme || '').toLowerCase();
  if (name === 'synthwave') return tokens.SURFACE;
  if (isDarkTheme(theme)) return '#262628';
  return tokens.SURFACE;
}

function formatTime(ts) {
  const d = new Date(parseInt(ts, 10));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AgentAvatar({ tokens, isSystem }) {
  return (
    <View style={[styles.avatar, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
      <Text style={{ fontSize: 12, color: isSystem ? tokens.NEON_DANGER : tokens.NEON_PRIMARY }}>
        {isSystem ? '!' : '✦'}
      </Text>
    </View>
  );
}

export function AgentMessage({ tokens, theme, username, msg, typing }) {
  const onPrimary = onPrimaryColor(theme);
  const isUser = msg?.role === 'user';
  const isSystem = msg?.role === 'system';
  const isAgent = !isUser && !isSystem;
  const content = typeof msg?.content === 'string' ? msg.content : agentReplyText(msg?.content);

  const bubbleBg = isUser
    ? tokens.NEON_PRIMARY
    : isSystem
      ? tokens.SURFACE
      : agentBubbleBg(tokens, theme);
  const bubbleFg = isUser ? onPrimary : isSystem ? tokens.NEON_DANGER : tokens.FG;
  const bubbleBorder = isSystem ? tokens.NEON_DANGER : isUser ? tokens.NEON_PRIMARY : tokens.BORDER;

  return (
    <View style={[styles.row, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
      {!isUser ? <AgentAvatar tokens={tokens} isSystem={isSystem} /> : null}

      <View style={[styles.col, { maxWidth: isUser ? '78%' : '82%' }]}>
        <View style={[styles.metaRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.sender, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            {isUser ? username || 'You' : isSystem ? 'System' : 'Agent'}
          </Text>
          {msg?.id && !typing ? (
            <Text style={[styles.time, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {formatTime(msg.id)}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleBg,
              borderColor: bubbleBorder,
              borderWidth: tokens.shape.border || 1,
              borderBottomRightRadius: isUser ? 4 : tokens.shape.cardRadius,
              borderBottomLeftRadius: isUser ? tokens.shape.cardRadius : 4,
            },
          ]}
        >
          {typing ? (
            <TypingDots color={tokens.NEON_PRIMARY} />
          ) : isAgent ? (
            <MarkdownBody tokens={tokens} text={content} color={bubbleFg} />
          ) : (
            <Text
              style={[
                styles.plain,
                {
                  color: bubbleFg,
                  fontFamily: isSystem ? tokens.font.mono : tokens.font.primary,
                },
              ]}
              selectable
            >
              {content}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  col: { flexShrink: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sender: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  time: { fontSize: 10, letterSpacing: 0.1, opacity: 0.8 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  plain: { fontSize: 14, lineHeight: 21, letterSpacing: -0.15 },
});
