import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Animated } from 'react-native';
import { useOpenDome } from 'opendome';
import { GLOBAL_STYLES } from '../theme';

// ── Pulsing Dot Component ───────────────────────────────────────────────────────
// Three dots that pulse sequentially to indicate the agent is thinking.
const PulsingDots = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = createPulse(dot1, 0);
    const a2 = createPulse(dot2, 200);
    const a3 = createPulse(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim) => ({
    width: 5, height: 5, borderRadius: 2.5,
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

// ── Animated Message Wrapper ────────────────────────────────────────────────────
// Each message fades in + slides up 8px over 200ms.
const AnimatedMessage = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// ── Model Config ────────────────────────────────────────────────────────────────
const MODELS = [
  { id: 'fast-lite', label: '3.1 Flash-Lite', cost: '0.0001' },
  { id: 'fast',      label: '3.6 Flash', cost: '0.001' },
  { id: 'pro',       label: '3.1 Pro', cost: '0.01' },
];

export default function AgentView({ tokens, theme, username, t }) {
  const isDark = theme === 'dark';
  const { Agent } = useOpenDome();
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);
  const [selectedModel, setSelectedModel] = useState('fast');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState('base');
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `textarea::-webkit-scrollbar { display: none; }`;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, []);

  const activeModelLabel = MODELS.find(m => m.id === selectedModel)?.label || '2.5 Flash';

  const handleSend = () => {
    const text = prompt.trim();
    if (!text) return;
    
    const activeModel = MODELS.find(m => m.id === selectedModel) || MODELS[1];
    setPendingIntent({
      text,
      model: activeModel
    });
  };

  const executeSend = async () => {
    if (!pendingIntent) return;
    const { text, model } = pendingIntent;
    
    setPrompt('');
    setPendingIntent(null);
    
    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    setConversation(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await Agent.pay('http://localhost:8083/api/agent', model.cost, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-payment-network': selectedNetwork
        },
        body: JSON.stringify({ prompt: text, modelId: model.id })
      });
      const responseText = res.data?.response || res.response || JSON.stringify(res);
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'agent', content: responseText, cost: model.cost, model: model.label };
      setConversation(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = { id: (Date.now() + 1).toString(), role: 'system', content: `${err.message}` };
      setConversation(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendButtonActive = prompt.trim().length > 0 && !isTyping;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>

      {/* ── Pending Intent Overlay ──────────────────────────────────────── */}
      {pendingIntent && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
          zIndex: 100,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {})
        }}>
          <View style={{
            width: '100%', maxWidth: 320,
            backgroundColor: isDark ? tokens.SURFACE_ELEVATED : '#FFFFFF',
            borderRadius: 8,
            padding: 24,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.BORDER,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 32,
            elevation: 10,
          }}>
            <Text style={{ fontFamily: tokens.font.primary, color: tokens.FG_SECONDARY, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
              Payment Required
            </Text>
            
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontFamily: tokens.font.mono, fontSize: 32, fontWeight: '300', color: tokens.FG, letterSpacing: -1 }}>
                ${pendingIntent.model.cost}
              </Text>
              <Text style={{ fontFamily: tokens.font.primary, fontSize: 14, color: tokens.MUTED, marginTop: 4 }}>
                USDC • x402 Micro-transaction
              </Text>
            </View>

            <View style={{ marginBottom: 32, gap: 12, zIndex: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: tokens.font.primary, fontSize: 13, color: tokens.FG_SECONDARY }}>Target</Text>
                <Text style={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.FG }}>localhost:8083</Text>
              </View>
              <View style={{ flexDirection: 'column', gap: 12, position: 'relative', zIndex: 50 }}>
                <Text style={{ fontFamily: tokens.font.primary, fontSize: 13, color: tokens.FG_SECONDARY }}>Select Source Network</Text>
                
                {/* Custom Dropdown Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: networkDropdownOpen ? tokens.FG : tokens.BORDER,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: tokens.FG, fontFamily: tokens.font.primary, fontSize: 14, fontWeight: '500', textTransform: 'capitalize' }}>
                    {selectedNetwork}
                  </Text>
                  <Text style={{ color: tokens.MUTED, fontSize: 12, transform: [{ rotate: networkDropdownOpen ? '180deg' : '0deg' }] }}>
                    ▼
                  </Text>
                </TouchableOpacity>

                {/* Dropdown Options */}
                {networkDropdownOpen && (
                  <View style={{
                    position: 'absolute',
                    top: 80,
                    left: 0,
                    right: 0,
                    backgroundColor: tokens.SURFACE_ELEVATED,
                    borderRadius: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: tokens.BORDER,
                    maxHeight: 180,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    elevation: 15,
                    zIndex: 100,
                    overflow: 'hidden'
                  }}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {['base', 'arbitrum', 'optimism', 'polygon', 'avalanche', 'mainnet', 'solana', 'monad'].map((net, idx, arr) => (
                        <TouchableOpacity
                          key={net}
                          onPress={() => {
                            setSelectedNetwork(net);
                            setNetworkDropdownOpen(false);
                          }}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                            borderBottomColor: tokens.BORDER,
                            backgroundColor: selectedNetwork === net ? tokens.ACCENT_SOFT : 'transparent'
                          }}
                        >
                          <Text style={{ 
                            color: selectedNetwork === net ? tokens.ACCENT : tokens.FG, 
                            fontFamily: tokens.font.primary, 
                            fontSize: 14,
                            fontWeight: selectedNetwork === net ? '600' : '400',
                            textTransform: 'capitalize' 
                          }}>
                            {net}
                          </Text>
                          {selectedNetwork === net && (
                            <Text style={{ color: tokens.ACCENT, fontSize: 14 }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={executeSend}
                activeOpacity={0.8}
                style={{
                  width: '100%', backgroundColor: tokens.FG, paddingVertical: 14, borderRadius: 6, alignItems: 'center'
                }}
              >
                <Text style={{ color: tokens.BG, fontFamily: tokens.font.primary, fontWeight: '600', fontSize: 14 }}>Sign & Send</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPendingIntent(null)}
                activeOpacity={0.8}
                style={{
                  width: '100%', paddingVertical: 14, alignItems: 'center'
                }}
              >
                <Text style={{ color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontWeight: '500', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Conversation Area ─────────────────────────────────────────── */}
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Empty State */}
        {conversation.length === 0 && (
          <View style={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}>
            <Text style={{ 
              color: tokens.FG, 
              fontSize: 22, 
              fontWeight: '600', 
              fontFamily: tokens.font.primary, 
              letterSpacing: -0.6,
              marginBottom: 12
            }}>
              What can I help with?
            </Text>
            <Text style={{ 
              color: tokens.MUTED, 
              fontSize: 14, 
              fontFamily: tokens.font.primary, 
              lineHeight: 22,
              letterSpacing: -0.2 
            }}>
              Powered by Gemini · x402 micro‑transactions
            </Text>
          </View>
        )}
        
        {/* Messages */}
        {conversation.map((msg, idx) => (
          <AnimatedMessage key={msg.id}>
            <View style={{ 
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: 20,
              borderBottomWidth: idx !== conversation.length - 1 || isTyping ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: tokens.BORDER,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                {/* Role avatar dot */}
                <View style={{ 
                  width: 6, height: 6, borderRadius: 3, 
                  backgroundColor: msg.role === 'user' ? tokens.ACCENT : msg.role === 'agent' ? tokens.SUCCESS : tokens.DANGER 
                }} />
                <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {msg.role === 'user' ? username : msg.role === 'agent' ? 'Agent' : 'System'}
                </Text>
                {msg.role === 'agent' && msg.model && (
                  <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, opacity: 0.5 }}>
                    · {msg.model}
                  </Text>
                )}
              </View>
              <View style={{
                paddingLeft: msg.role === 'user' ? 16 : 0,
                borderLeftWidth: msg.role === 'user' ? 2 : 0,
                borderLeftColor: msg.role === 'user' ? tokens.BORDER : 'transparent',
              }}>
                <Text style={{ 
                  color: msg.role === 'system' ? tokens.DANGER : tokens.FG, 
                  fontSize: 15, 
                  lineHeight: 24, 
                  fontFamily: msg.role === 'system' ? tokens.font.mono : tokens.font.primary,
                  letterSpacing: -0.2
                }}>
                  {msg.content}
                </Text>
              </View>
              {/* Transaction Awareness Badge */}
              {msg.role === 'agent' && msg.cost && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: tokens.SUCCESS }} />
                  <Text style={{ color: tokens.MUTED, fontSize: 10, fontFamily: tokens.font.mono, letterSpacing: 0.3 }}>
                    ${msg.cost} USDC • x402
                  </Text>
                </View>
              )}
            </View>
          </AnimatedMessage>
        ))}

        {isTyping && (
          <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.SUCCESS }} />
              <Text style={{ color: tokens.MUTED, fontSize: 11, fontFamily: tokens.font.mono, textTransform: 'uppercase', letterSpacing: 0.5 }}>Agent</Text>
            </View>
            <PulsingDots color={tokens.MUTED} />
          </View>
        )}
      </ScrollView>

      {/* ── Model Selector Dropdown (positioned above input bar) ─────── */}
      {modelDropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setModelDropdownOpen(false)} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} 
          />
          <View style={{ 
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
          }}>
            {MODELS.map((model, idx) => (
              <TouchableOpacity
                key={model.id}
                onPress={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: idx < MODELS.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: tokens.BORDER,
                  backgroundColor: selectedModel === model.id ? tokens.ACCENT_SOFT : 'transparent',
                }}
              >
                <Text style={{ 
                  color: selectedModel === model.id ? tokens.ACCENT : tokens.FG, 
                  fontSize: 14, 
                  fontFamily: tokens.font.primary,
                  fontWeight: selectedModel === model.id ? '600' : '400',
                  letterSpacing: -0.2
                }}>
                  {model.label}
                </Text>
                {selectedModel === model.id && (
                  <Text style={{ color: tokens.ACCENT, fontSize: 14 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}


          </View>
        </>
      )}

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <View style={{ 
        backgroundColor: tokens.BG, 
        borderTopWidth: StyleSheet.hairlineWidth, 
        borderTopColor: tokens.BORDER,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12
      }}>
        {/* Model selector chip row */}
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
            <Text style={{ fontSize: 11, color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontWeight: '500' }}>
              {activeModelLabel}
            </Text>
            <Text style={{ fontSize: 8, color: tokens.MUTED }}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Text input + send */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minHeight: 48, position: 'relative', justifyContent: 'center' }}>
            {/* Shadow Text for exact height measurement */}
            <Text 
              style={{
                position: 'absolute', opacity: 0, zIndex: -1, top: 0, left: 0, right: 0,
                fontFamily: tokens.font.primary, fontSize: 15, lineHeight: 20, paddingTop: 14, paddingBottom: 14
              }}
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            >
              {prompt ? prompt + ' ' : ' '}
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
                outlineStyle: 'none'
              }}
              placeholder="Ask anything..."
              placeholderTextColor={tokens.MUTED}
              value={prompt}
              onChangeText={(text) => {
                setPrompt(text);
              }}
              onKeyPress={(e) => {
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault();
                  if (sendButtonActive) {
                    handleSend();
                  }
                }
              }}
              multiline
              maxLength={1000}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 8, marginLeft: 8 }}>
            <Text style={{ 
              color: prompt.length >= 1000 ? tokens.DANGER : (prompt.length > 800 ? tokens.WARNING : tokens.FG_SECONDARY), 
              fontSize: 10, 
              fontFamily: tokens.font.mono, 
              marginBottom: 6,
              opacity: prompt.length > 0 ? 1 : 0
            }}>
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
              <Text style={{ 
                color: !sendButtonActive ? tokens.MUTED : tokens.BG, 
                fontFamily: tokens.font.mono, 
                fontWeight: '600', 
                fontSize: 16,
                marginTop: -2
              }}>
                ➤
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
