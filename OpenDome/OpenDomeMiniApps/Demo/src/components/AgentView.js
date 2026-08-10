import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Animated, Easing, Platform } from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

// Animated dots for typing indicator
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

// Timestamp formatter
function formatTime(ts) {
  const d = new Date(parseInt(ts, 10));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AgentView({ tokens, theme, username, t }) {
  const isDark = theme === 'dark';
  const { Agent } = useOpenDome();
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Palette derived from tokens
  const palette = {
    headerBg: isDark ? 'rgba(18,18,18,0.85)' : 'rgba(255,255,255,0.92)',
    userBubble: isDark ? '#1A1D23' : '#EDF1F7',
    agentBubble: isDark ? 'rgba(200,170,110,0.08)' : 'rgba(17,50,100,0.05)',
    agentBorder: isDark ? 'rgba(200,170,110,0.18)' : 'rgba(17,50,100,0.12)',
    inputBg: isDark ? '#0C0C0E' : '#FFFFFF',
    inputBorder: isDark ? '#232326' : '#E2E2E7',
    inputFocusBorder: isDark ? tokens.NEON_PRIMARY : tokens.NEON_PRIMARY,
    sendActive: tokens.NEON_PRIMARY,
    sendInactive: isDark ? '#1C1C1E' : '#F0F0F5',
    emptyIcon: isDark ? 'rgba(200,170,110,0.12)' : 'rgba(17,50,100,0.06)',
    emptyIconBorder: isDark ? 'rgba(200,170,110,0.2)' : 'rgba(17,50,100,0.1)',
    statusDot: '#34C759',
    accentLine: tokens.NEON_PRIMARY,
  };

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text) return;

    setPrompt('');
    setInputHeight(48);

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setConversation(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await Agent.prompt(text);
      const responseText = res || 'No response received.';
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
      {/* Decorative icon */}
      <View style={[styles.emptyIconWrap, { backgroundColor: palette.emptyIcon, borderColor: palette.emptyIconBorder }]}>
        <Text style={{ fontSize: 28 }}>🧠</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
        {t.agent?.workspace || 'Agent Workspace'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {t.agent?.helpText || 'Ask me anything — I can help with tasks, questions, and more.'}
      </Text>
      {/* Suggestion chips */}
      <View style={styles.chipRow}>
        {['What can you do?', 'Tell me a joke', 'Explain Open-Dome'].map((chip, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, { borderColor: isDark ? '#2A2A2E' : '#E0E0E5', backgroundColor: isDark ? '#111113' : '#F7F7FA' }]}
            onPress={() => { setPrompt(chip); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>{chip}</Text>
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
        {/* Agent avatar */}
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(200,170,110,0.12)' : 'rgba(17,50,100,0.08)', borderColor: isDark ? 'rgba(200,170,110,0.2)' : 'rgba(17,50,100,0.12)' }]}>
            <Text style={{ fontSize: 12 }}>{isSystem ? '⚠' : '✦'}</Text>
          </View>
        )}

        <View style={{ flex: 1, maxWidth: '82%' }}>
          {/* Sender label + time */}
          <View style={[styles.metaRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.senderLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {isUser ? (username || 'You') : isSystem ? 'System' : 'Agent'}
            </Text>
            <Text style={[styles.timeLabel, { color: isDark ? '#3A3A3E' : '#C7C7CC', fontFamily: tokens.font.mono }]}>
              {formatTime(msg.id)}
            </Text>
          </View>

          {/* Bubble */}
          <View
            style={[
              styles.bubble,
              isUser
                ? {
                    backgroundColor: palette.userBubble,
                    borderBottomRightRadius: 4,
                  }
                : isSystem
                ? {
                    backgroundColor: isDark ? 'rgba(255,69,58,0.08)' : 'rgba(255,59,48,0.06)',
                    borderColor: isDark ? 'rgba(255,69,58,0.2)' : 'rgba(255,59,48,0.15)',
                    borderWidth: 1,
                    borderBottomLeftRadius: 4,
                  }
                : {
                    backgroundColor: palette.agentBubble,
                    borderColor: palette.agentBorder,
                    borderWidth: 1,
                    borderBottomLeftRadius: 4,
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
              {msg.content}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: tokens.BG }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: palette.headerBg, borderBottomColor: isDark ? '#1A1A1C' : '#EBEBF0' }]}>
        {/* Accent line */}
        <View style={[styles.accentLine, { backgroundColor: palette.accentLine }]} />

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
                {t.agent?.workspace || 'Agent'}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: isDark ? '#0D1F0D' : '#E8F8EC' }]}>
                <View style={[styles.statusDot, { backgroundColor: palette.statusDot }]} />
                <Text style={[styles.statusText, { color: palette.statusDot, fontFamily: tokens.font.mono }]}>ONLINE</Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
              {t.agent?.poweredBy || 'Powered by Gemini'}
            </Text>
          </View>

          {conversation.length > 0 && (
            <TouchableOpacity
              onPress={() => setConversation([])}
              style={[styles.clearBtn, { borderColor: isDark ? '#2A2A2E' : '#E0E0E5' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearBtnText, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Conversation ── */}
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
            <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(200,170,110,0.12)' : 'rgba(17,50,100,0.08)', borderColor: isDark ? 'rgba(200,170,110,0.2)' : 'rgba(17,50,100,0.12)' }]}>
              <Text style={{ fontSize: 12 }}>✦</Text>
            </View>
            <View style={{ maxWidth: '82%' }}>
              <Text style={[styles.senderLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary, marginBottom: 6 }]}>Agent</Text>
              <View style={[styles.bubble, { backgroundColor: palette.agentBubble, borderColor: palette.agentBorder, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
                <TypingDots color={tokens.NEON_PRIMARY} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Input Bar ── */}
      <View style={[styles.inputBar, { borderTopColor: isDark ? '#1A1A1C' : '#EBEBF0', backgroundColor: palette.headerBg }]}>
        <View style={[
          styles.inputWrap,
          {
            backgroundColor: palette.inputBg,
            borderColor: inputFocused ? palette.inputFocusBorder : palette.inputBorder,
          },
        ]}>
          {/* Hidden text element to perfectly measure the natural height of the text without glitches */}
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
            placeholderTextColor={isDark ? '#4A4A4E' : '#A8A8AD'}
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
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!prompt.trim() || isTyping}
          activeOpacity={0.8}
          style={[
            styles.sendBtn,
            {
              backgroundColor: !prompt.trim() || isTyping ? palette.sendInactive : palette.sendActive,
              borderColor: !prompt.trim() || isTyping ? palette.inputBorder : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.sendIcon,
              {
                color: !prompt.trim() || isTyping ? tokens.MUTED : (isDark ? '#000' : '#FFF'),
              },
            ]}
          >
            ➤
          </Text>
        </TouchableOpacity>
      </View>
      
      {Platform.OS === 'web' && (
        <style type="text/css">{`
          textarea::-webkit-scrollbar {
            display: none;
          }
          textarea {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* Header */
  header: {
    borderBottomWidth: 1,
    paddingTop: 0,
  },
  accentLine: {
    height: 2,
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {},
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Conversation */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Messages */
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
    maxWidth: '100%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
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
  senderLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  timeLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.15,
  },

  /* Input Bar */
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
    borderWidth: 1.5,
    borderRadius: 22,
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
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 4, // Aligns center with the 52px tall input wrap
  },
  sendIcon: {
    fontWeight: '700',
    fontSize: 18,
    marginLeft: 3,
  },
});
