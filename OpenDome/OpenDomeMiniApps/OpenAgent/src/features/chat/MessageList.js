import React, { useRef } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { EmptyChat } from './EmptyChat';
import { MessageBubble } from './MessageBubble';

export function MessageList({ tokens, messages, isTyping, onStarter }) {
  const scrollRef = useRef(null);
  const empty = messages.length === 0 && !isTyping;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => {
        if (!empty) scrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      {empty ? <EmptyChat tokens={tokens} onPick={onStarter} /> : null}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} tokens={tokens} msg={msg} />
      ))}

      {isTyping ? (
        <Text style={[styles.typing, { color: tokens.MUTED }]}>Gemini is writing…</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, flexGrow: 1 },
  typing: { fontSize: 14, marginBottom: 8 },
});
