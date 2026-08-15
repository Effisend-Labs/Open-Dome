import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES, onPrimaryColor } from '../theme';
import { AgentEmptyState } from '../features/agent/AgentEmptyState';
import { AgentMessage } from '../features/agent/AgentMessage';
import { agentReplyText } from '../features/agent/agentReplyText';

export default function AgentView({ tokens, theme, username, t }) {
  const onPrimary = onPrimaryColor(theme);
  const { Agent } = useOpenDome();
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? prompt).trim();
    if (!text || isTyping) return;

    setPrompt('');
    setInputHeight(48);

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setConversation((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await Agent.prompt(text);
      const responseText = agentReplyText(res) || 'No response received.';
      setConversation((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'agent', content: responseText },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'system', content: err.message },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const canSend = prompt.trim().length > 0 && !isTyping;

  return (
    <View style={[styles.root, { backgroundColor: tokens.BG }]}>
      <View style={[styles.header, { backgroundColor: tokens.SURFACE, borderBottomColor: tokens.BORDER }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                AGENT WORKSPACE
              </Text>
              <View style={[styles.statusPill, { backgroundColor: tokens.BG, borderColor: tokens.BORDER, borderWidth: tokens.shape.border }]}>
                <View style={[styles.statusDot, { backgroundColor: tokens.NEON_SUCCESS }]} />
                <Text style={[styles.statusText, { color: tokens.NEON_SUCCESS, fontFamily: tokens.font.primary }]}>
                  ONLINE
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {t.agent?.poweredBy || 'Powered by Gemini'}
            </Text>
          </View>

          {conversation.length > 0 && (
            <TouchableOpacity
              onPress={() => setConversation([])}
              style={[styles.clearBtn, { borderColor: tokens.BORDER, backgroundColor: tokens.BG, borderRadius: tokens.shape.buttonRadius }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearBtnText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>CLEAR</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, conversation.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {conversation.length === 0 ? (
          <AgentEmptyState tokens={tokens} t={t} onPick={handleSend} />
        ) : (
          conversation.map((msg) => (
            <AgentMessage key={msg.id} tokens={tokens} theme={theme} username={username} msg={msg} />
          ))
        )}

        {isTyping && (
          <AgentMessage tokens={tokens} theme={theme} username={username} msg={{ role: 'agent' }} typing />
        )}
      </ScrollView>

      <View style={[styles.inputBar, { borderTopColor: tokens.BORDER, backgroundColor: tokens.SURFACE }]}>
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: tokens.BG,
              borderColor: inputFocused ? tokens.NEON_PRIMARY : tokens.BORDER,
              borderRadius: tokens.shape.buttonRadius,
            },
          ]}
        >
          <Text
            style={[styles.input, styles.inputMirror, { fontFamily: tokens.font.primary }]}
            onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
          >
            {prompt ? `${prompt} ` : ' '}
          </Text>

          <TextInput
            ref={inputRef}
            style={[styles.input, { color: tokens.FG, fontFamily: tokens.font.primary, height: Math.max(48, Math.min(108, inputHeight)) }]}
            placeholder={t.agent?.placeholder || 'Ask anything…'}
            placeholderTextColor={tokens.MUTED}
            value={prompt}
            onChangeText={(text) => {
              setPrompt(text);
              if (!text) setInputHeight(48);
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            multiline
            showsVerticalScrollIndicator={false}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit
          />
        </View>

        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!canSend}
          activeOpacity={0.8}
          style={[
            styles.sendBtn,
            {
              backgroundColor: canSend ? tokens.NEON_PRIMARY : tokens.BG,
              borderColor: canSend ? tokens.NEON_PRIMARY : tokens.BORDER,
              borderRadius: tokens.shape.buttonRadius,
            },
          ]}
        >
          <Text style={[styles.sendIcon, { color: canSend ? onPrimary : tokens.MUTED }]}>➤</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'web' && (
        <style type="text/css">{`
          textarea::-webkit-scrollbar { display: none; }
          textarea { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { borderBottomWidth: 1 },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: { flex: 1 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: GLOBAL_STYLES.heavy,
    letterSpacing: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  headerSub: { fontSize: 11, marginTop: 4, letterSpacing: 0.1 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  clearBtnText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 48,
    maxHeight: 108,
    letterSpacing: -0.1,
  },
  inputMirror: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  sendBtn: {
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  sendIcon: { fontWeight: '700', fontSize: 18, marginLeft: 3 },
});
