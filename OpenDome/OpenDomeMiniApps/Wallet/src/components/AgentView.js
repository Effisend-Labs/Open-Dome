import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { useOpenDome } from 'opendome';
import { USE_NATIVE_DRIVER } from '../utils/styleCompat';
import { useAgentConversation } from '../features/agent/AgentConversationContext';
import { GEMINI_CHAT_MODELS, resolveGeminiChatModel } from '../config/agentSettings';

const PulsingDots = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      );
    const a1 = createPulse(dot1, 0);
    const a2 = createPulse(dot2, 200);
    const a3 = createPulse(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim) => ({
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: color,
    opacity: anim,
    marginHorizontal: 2,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
};

const AnimatedMessage = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

const QUICK_ACTIONS = [
  { id: 'balance', label: "What's my USDC balance?", prompt: "What's my USDC balance on Base?" },
  { id: 'wallets', label: 'List my Circle wallets', prompt: 'List my Circle wallets.' },
  { id: 'txs', label: 'Show recent transactions', prompt: 'Show my recent Circle transactions.' },
  { id: 'send', label: 'How do I send USDC?', prompt: 'How do I send USDC from my Circle wallet on Base?' },
];

export default function AgentView({
  tokens,
  username,
  t,
  isAuthorized,
  onGoToAccount,
}) {
  const { Agent } = useOpenDome();
  const {
    conversation,
    setConversation,
    selectedModel,
    setSelectedModel,
  } = useAgentConversation();
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `textarea::-webkit-scrollbar { display: none; }`;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [conversation.length]);

  const activeModelLabel = resolveGeminiChatModel(selectedModel).label;

  const executeSend = async (text) => {
    if (!text || isTyping) return;
    if (!isAuthorized) {
      onGoToAccount?.();
      return;
    }
    const model = resolveGeminiChatModel(selectedModel);
    setPrompt('');
    setConversation((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setIsTyping(true);

    try {
      const res = await Agent.prompt(text, { mode: 'wallet', modelId: model.id });
      const payload = typeof res === 'string' ? { response: res } : res?.data || res || {};
      const responseText =
        payload.response || (typeof res === 'string' ? res : JSON.stringify(res));
      setConversation((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: responseText,
          model: payload.modelLabel || model.label,
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'system', content: `${err.message}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    const text = prompt.trim();
    if (!text || isTyping) return;
    executeSend(text);
  };

  const sendButtonActive = prompt.trim().length > 0 && !isTyping;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG, overflow: 'hidden' }}>
      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {!isAuthorized ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.BORDER,
              backgroundColor: tokens.SURFACE,
            }}
          >
            <Text
              style={{
                color: tokens.FG_SECONDARY,
                fontSize: 13,
                fontFamily: tokens.font.primary,
                lineHeight: 18,
                textAlign: 'center',
              }}
            >
              {t?.authRequired?.description}
            </Text>
            {onGoToAccount ? (
              <TouchableOpacity
                onPress={onGoToAccount}
                activeOpacity={0.8}
                style={{ marginTop: 8, alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: tokens.ACCENT,
                    fontSize: 13,
                    fontWeight: '600',
                    fontFamily: tokens.font.primary,
                  }}
                >
                  {t?.authRequired?.cta}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {conversation.length === 0 ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}>
            <Text
              style={{
                color: tokens.FG,
                fontSize: 22,
                fontWeight: '600',
                fontFamily: tokens.font.primary,
                letterSpacing: -0.6,
                marginBottom: 12,
              }}
            >
              What can I help with?
            </Text>
            <Text
              style={{
                color: tokens.MUTED,
                fontSize: 14,
                fontFamily: tokens.font.primary,
                lineHeight: 22,
                letterSpacing: -0.2,
                marginBottom: 20,
              }}
            >
              {t?.agent?.poweredBy ||
                'Circle wallets, USDC, and transfers. Pick a Gemini model to chat.'}
            </Text>

            <View style={{ gap: 8 }}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  activeOpacity={0.85}
                  onPress={() => executeSend(action.prompt)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: tokens.BORDER,
                    backgroundColor: tokens.SURFACE,
                  }}
                >
                  <Text
                    style={{
                      color: tokens.FG,
                      fontSize: 14,
                      fontFamily: tokens.font.primary,
                      letterSpacing: -0.2,
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {conversation.map((msg, idx) => (
          <AnimatedMessage key={msg.id}>
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 20,
                paddingBottom: 20,
                borderBottomWidth:
                  idx !== conversation.length - 1 || isTyping ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: tokens.BORDER,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      msg.role === 'user'
                        ? tokens.ACCENT
                        : msg.role === 'agent'
                          ? tokens.SUCCESS
                          : tokens.DANGER,
                  }}
                />
                <Text
                  style={{
                    color: tokens.MUTED,
                    fontSize: 11,
                    fontFamily: tokens.font.mono,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {msg.role === 'user' ? username : msg.role === 'agent' ? 'Agent' : 'System'}
                </Text>
                {msg.role === 'agent' && msg.model ? (
                  <Text
                    style={{
                      color: tokens.MUTED,
                      fontSize: 10,
                      fontFamily: tokens.font.mono,
                      opacity: 0.5,
                    }}
                  >
                    · {msg.model}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  paddingLeft: msg.role === 'user' ? 16 : 0,
                  borderLeftWidth: msg.role === 'user' ? 2 : 0,
                  borderLeftColor: msg.role === 'user' ? tokens.BORDER : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: msg.role === 'system' ? tokens.DANGER : tokens.FG,
                    fontSize: 15,
                    lineHeight: 24,
                    fontFamily: msg.role === 'system' ? tokens.font.mono : tokens.font.primary,
                    letterSpacing: -0.2,
                  }}
                >
                  {msg.content}
                </Text>
              </View>
              {msg.role === 'agent' && msg.explorerUrl ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => Linking.openURL(msg.explorerUrl).catch(() => {})}
                  hitSlop={8}
                >
                  <Text
                    style={{
                      color: tokens.ACCENT,
                      fontSize: 10,
                      fontFamily: tokens.font.mono,
                      letterSpacing: 0.3,
                      textDecorationLine: 'underline',
                      marginTop: 12,
                    }}
                  >
                    View on BaseScan →
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </AnimatedMessage>
        ))}

        {isTyping ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.SUCCESS }} />
              <Text
                style={{
                  color: tokens.MUTED,
                  fontSize: 11,
                  fontFamily: tokens.font.mono,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Agent
              </Text>
            </View>
            <PulsingDots color={tokens.MUTED} />
          </View>
        ) : null}
      </ScrollView>

      {modelDropdownOpen ? (
        <>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setModelDropdownOpen(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 76,
              left: 16,
              right: 16,
              backgroundColor: tokens.SURFACE_ELEVATED,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.BORDER,
              zIndex: 20,
              overflow: 'hidden',
            }}
          >
            {GEMINI_CHAT_MODELS.map((model, idx) => (
              <TouchableOpacity
                key={model.id}
                onPress={() => {
                  setSelectedModel(model.id);
                  setModelDropdownOpen(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < GEMINI_CHAT_MODELS.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: tokens.BORDER,
                  backgroundColor: selectedModel === model.id ? tokens.ACCENT_SOFT : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: selectedModel === model.id ? tokens.ACCENT : tokens.FG,
                    fontSize: 14,
                    fontFamily: tokens.font.primary,
                    fontWeight: selectedModel === model.id ? '600' : '400',
                    letterSpacing: -0.2,
                  }}
                >
                  {model.label}
                </Text>
                {selectedModel === model.id ? (
                  <Text style={{ color: tokens.ACCENT, fontSize: 14 }}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <View
        style={{
          backgroundColor: tokens.BG,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tokens.BORDER,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setModelDropdownOpen(!modelDropdownOpen)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: tokens.SURFACE,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.BORDER,
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: tokens.FG_SECONDARY,
                fontFamily: tokens.font.primary,
                fontWeight: '500',
              }}
            >
              {activeModelLabel}
            </Text>
            <Text style={{ fontSize: 8, color: tokens.MUTED }}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minHeight: 48, position: 'relative', justifyContent: 'center' }}>
            <Text
              style={{
                position: 'absolute',
                opacity: 0,
                zIndex: -1,
                top: 0,
                left: 0,
                right: 0,
                fontFamily: tokens.font.primary,
                fontSize: 15,
                lineHeight: 20,
                paddingTop: 14,
                paddingBottom: 14,
              }}
              pointerEvents="none"
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            >
              {prompt ? `${prompt} ` : ' '}
            </Text>

            <TextInput
              style={{
                height: Math.max(48, Math.min(108, inputHeight)),
                color: tokens.FG,
                fontFamily: tokens.font.primary,
                fontSize: 15,
                lineHeight: 20,
                paddingTop: 14,
                paddingBottom: 14,
                textAlignVertical: 'top',
                outlineStyle: 'none',
              }}
              placeholder={t?.agent?.placeholder || 'Ask anything...'}
              placeholderTextColor={tokens.MUTED}
              value={prompt}
              onChangeText={setPrompt}
              onKeyPress={(e) => {
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault();
                  if (sendButtonActive) handleSend();
                }
              }}
              multiline
              maxLength={1000}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 8, marginLeft: 8 }}>
            <Text
              style={{
                color:
                  prompt.length >= 1000
                    ? tokens.DANGER
                    : prompt.length > 800
                      ? tokens.WARNING
                      : tokens.FG_SECONDARY,
                fontSize: 10,
                fontFamily: tokens.font.mono,
                marginBottom: 6,
                opacity: prompt.length > 0 ? 1 : 0,
              }}
            >
              {prompt.length}/1000
            </Text>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!sendButtonActive}
              style={{
                height: 32,
                width: 32,
                borderRadius: 16,
                backgroundColor: !sendButtonActive ? tokens.SURFACE_ELEVATED : tokens.FG,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: !sendButtonActive ? tokens.MUTED : tokens.BG,
                  fontFamily: tokens.font.mono,
                  fontWeight: '600',
                  fontSize: 16,
                  marginTop: -2,
                }}
              >
                ➤
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
