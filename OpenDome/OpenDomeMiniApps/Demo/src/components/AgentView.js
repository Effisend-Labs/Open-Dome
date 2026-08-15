import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Animated, Easing, Platform } from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES, onPrimaryColor } from '../theme';

const STARTERS = ['What can you do?', 'Tell me a joke', 'Explain Open-Dome'];

/** Host returns { response, modelLabel, ... } — never render that object in <Text>. */
function agentReplyText(res) {
  if (typeof res === 'string') return res;
  if (res && typeof res.response === 'string') return res.response;
  if (res?.data && typeof res.data.response === 'string') return res.data.response;
  return '';
}

function TypingDots({ color }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(dot, { toValue: 0, duration: 320, easing: Easing.in(Easing.ease), useNativeDriver: false }),
          Animated.delay(600 - delay),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 160).start();
    animate(dot3, 320).start();
  }, []);

  const dotStyle = (anim) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color,
    marginHorizontal: 2,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

function formatTime(ts) {
  const d = new Date(parseInt(ts, 10));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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
    setConversation(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await Agent.prompt(text);
      const responseText = agentReplyText(res) || 'No response received.';
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'agent', content: responseText };
      setConversation(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = { id: (Date.now() + 1).toString(), role: 'system', content: err.message };
      setConversation(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
        <Text style={{ fontSize: 22, color: tokens.NEON_PRIMARY }}>✦</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
        {t.agent?.workspace || 'Agent Workspace'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
        {t.agent?.helpText || 'Ask me anything — I can help with tasks, questions, and more.'}
      </Text>
      <View style={styles.chipCol}>
        {STARTERS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE, borderRadius: tokens.shape.buttonRadius }]}
            onPress={() => handleSend(chip)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMessage = (msg) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    return (
      <View
        key={msg.id}
        style={[
          styles.messageRow,
          { alignSelf: isUser ? 'flex-end' : 'flex-start' },
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
            <Text style={{ fontSize: 11, color: isSystem ? tokens.NEON_DANGER : tokens.NEON_PRIMARY }}>{isSystem ? '!' : '✦'}</Text>
          </View>
        )}

        <View style={{ flex: 1, maxWidth: '82%' }}>
          <View style={[styles.metaRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.senderLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {isUser ? (username || 'You') : isSystem ? 'System' : 'Agent'}
            </Text>
            <Text style={[styles.timeLabel, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
              {formatTime(msg.id)}
            </Text>
          </View>

          <View
            style={[
              styles.bubble,
              {
                backgroundColor: tokens.SURFACE,
                borderColor: isSystem ? tokens.NEON_DANGER : tokens.BORDER,
                borderWidth: tokens.shape.border,
                borderBottomRightRadius: isUser ? 4 : tokens.shape.cardRadius,
                borderBottomLeftRadius: isUser ? tokens.shape.cardRadius : 4,
              },
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                {
                  color: isSystem ? tokens.NEON_DANGER : tokens.FG,
                  fontFamily: isSystem ? tokens.font.mono : tokens.font.primary,
                },
              ]}
              selectable
            >
              {typeof msg.content === 'string' ? msg.content : agentReplyText(msg.content)}
            </Text>
          </View>
        </View>
      </View>
    );
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
                <Text style={[styles.statusText, { color: tokens.NEON_SUCCESS, fontFamily: tokens.font.mono }]}>ONLINE</Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
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
        {conversation.length === 0 ? renderEmptyState() : conversation.map(renderMessage)}

        {isTyping && (
          <View style={[styles.messageRow, { alignSelf: 'flex-start' }]}>
            <View style={[styles.avatar, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
              <Text style={{ fontSize: 11, color: tokens.NEON_PRIMARY }}>✦</Text>
            </View>
            <View style={{ maxWidth: '82%' }}>
              <Text style={[styles.senderLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary, marginBottom: 6 }]}>Agent</Text>
              <View style={[styles.bubble, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER, borderWidth: tokens.shape.border, borderBottomLeftRadius: 4 }]}>
                <TypingDots color={tokens.NEON_PRIMARY} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { borderTopColor: tokens.BORDER, backgroundColor: tokens.SURFACE }]}>
        <View style={[
          styles.inputWrap,
          {
            backgroundColor: tokens.BG,
            borderColor: inputFocused ? tokens.NEON_PRIMARY : tokens.BORDER,
            borderRadius: tokens.shape.buttonRadius,
          },
        ]}>
          <Text
            style={[
              styles.input,
              {
                fontFamily: tokens.font.primary,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                opacity: 0,
                zIndex: -1,
              }
            ]}
            onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
          >
            {prompt ? prompt + ' ' : ' '}
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
          <Text style={[styles.sendIcon, { color: canSend ? onPrimary : tokens.MUTED }]}>
            ➤
          </Text>
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
  header: { borderBottomWidth: 2 },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerSub: { fontSize: 10, marginTop: 4, letterSpacing: 0.2 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  clearBtnText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: GLOBAL_STYLES.heavy,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  chipCol: { width: '100%', maxWidth: 320, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
    maxWidth: '100%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  senderLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  timeLabel: { fontSize: 9, letterSpacing: 0.3 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  bubbleText: { fontSize: 14, lineHeight: 22, letterSpacing: -0.15 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
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
